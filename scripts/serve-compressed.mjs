// Lean 1 (speed): a thin front for the built site that compresses the way Vercel does (brotli, quality 4, text types only)
// and sets the long cache header on hashed files. The plain Node server of `node .output/server/index.mjs` sends
// everything uncompressed, so Lighthouse in CI read every page about three times heavier than kabsi.co. Used by the
// speed check in CI and by hand:
//   PORT=4173 node .output/server/index.mjs &  node scripts/serve-compressed.mjs 4174 4173
import { createServer, request } from "node:http";
import { constants, createBrotliCompress, createGzip } from "node:zlib";

const listen = Number(process.argv[2] ?? 4174);
const upstream = Number(process.argv[3] ?? 4173);
const TEXT = /^(text\/|application\/(javascript|json|xml|manifest\+json)|image\/svg\+xml)/;

createServer((req, res) => {
  const headers = { ...req.headers, "accept-encoding": "identity" };
  const up = request(
    { host: "127.0.0.1", port: upstream, method: req.method, path: req.url, headers },
    (r) => {
      const out = { ...r.headers };
      const type = String(out["content-type"] ?? "");
      const accept = String(req.headers["accept-encoding"] ?? "");
      if (/^\/assets\//.test(req.url ?? "") && r.statusCode === 200)
        out["cache-control"] = "public, max-age=31536000, immutable";
      if (!out["content-encoding"] && TEXT.test(type) && /\b(br|gzip)\b/.test(accept)) {
        const br = /\bbr\b/.test(accept);
        delete out["content-length"];
        out["content-encoding"] = br ? "br" : "gzip";
        out["vary"] = "Accept-Encoding";
        res.writeHead(r.statusCode ?? 200, out);
        r.pipe(
          br
            ? createBrotliCompress({ params: { [constants.BROTLI_PARAM_QUALITY]: 4 } })
            : createGzip({ level: 6 }),
        ).pipe(res);
      } else {
        res.writeHead(r.statusCode ?? 200, out);
        r.pipe(res);
      }
    },
  );
  up.on("error", () => {
    res.writeHead(502);
    res.end("upstream down");
  });
  req.pipe(up);
}).listen(listen, () => console.log(`compressing front on ${listen} -> ${upstream}`));
