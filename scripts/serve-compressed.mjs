// Lean 1 (speed): a thin front for the built site that compresses the way Vercel does (brotli, quality 4, text types only)
// and sets the long cache header on hashed files. The plain Node server of `node .output/server/index.mjs` sends
// everything uncompressed, so Lighthouse in CI read every page about three times heavier than kabsi.co. Used by the
// speed check in CI and by hand:
//   PORT=4173 node .output/server/index.mjs &  node scripts/serve-compressed.mjs 4174 4173
// With TLS_KEY and TLS_CERT (paths to a PEM key and certificate) it speaks HTTP/2 over TLS, as Vercel does: a plain HTTP/1.1
// server opens six connections and loads a page's many small chunks one after another, which Lighthouse's throttling model
// punishes and kabsi.co does not suffer. Chrome then needs --ignore-certificate-errors for the self-signed certificate.
import { readFileSync } from "node:fs";
import { createServer, request } from "node:http";
import { createSecureServer } from "node:http2";
import { constants, createBrotliCompress, createGzip } from "node:zlib";

const listen = Number(process.argv[2] ?? 4174);
const upstream = Number(process.argv[3] ?? 4173);
const TEXT = /^(text\/|application\/(javascript|json|xml|manifest\+json)|image\/svg\+xml)/;

const HOP = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "proxy-connection",
  "host",
]);
const handler = (req, res) => {
  const headers = {
    "accept-encoding": "identity",
    host: String(req.headers[":authority"] ?? req.headers["host"] ?? ""),
  };
  for (const [k, v] of Object.entries(req.headers))
    if (!k.startsWith(":") && !HOP.has(k) && k !== "accept-encoding") headers[k] = v;
  const up = request(
    { host: "127.0.0.1", port: upstream, method: req.method, path: req.url, headers },
    (r) => {
      const out = {};
      for (const [k, v] of Object.entries(r.headers)) if (!HOP.has(k)) out[k] = v;
      const type = String(out["content-type"] ?? "");
      const accept = String(req.headers["accept-encoding"] ?? "");
      if (/^\/assets\//.test(req.url ?? "") && r.statusCode === 200)
        out["cache-control"] = "public, max-age=31536000, immutable";
      const whole = r.statusCode === 200 && req.method !== "HEAD";
      // An upstream that stops half way ends the client's response too, so Lighthouse never waits on a stalled one.
      r.on("aborted", () => res.destroy());
      r.on("error", () => res.destroy());
      if (whole && !out["content-encoding"] && TEXT.test(type) && /\b(br|gzip)\b/.test(accept)) {
        const br = /\bbr\b/.test(accept);
        delete out["content-length"];
        out["content-encoding"] = br ? "br" : "gzip";
        out["vary"] = out["vary"] ? `${out["vary"]}, Accept-Encoding` : "Accept-Encoding";
        res.writeHead(r.statusCode ?? 200, out);
        r.pipe(
          br
            ? createBrotliCompress({
                flush: constants.BROTLI_OPERATION_FLUSH, // streamed HTML reaches the browser as it is written, as on Vercel
                params: { [constants.BROTLI_PARAM_QUALITY]: 4 },
              })
            : createGzip({ level: 6, flush: constants.Z_SYNC_FLUSH }),
        ).pipe(res);
      } else {
        res.writeHead(r.statusCode ?? 200, out);
        r.pipe(res);
      }
    },
  );
  up.on("error", () => {
    if (res.headersSent) return res.destroy();
    res.writeHead(502);
    res.end("upstream down");
  });
  req.pipe(up);
};
const server =
  process.env.TLS_KEY && process.env.TLS_CERT
    ? createSecureServer(
        {
          key: readFileSync(process.env.TLS_KEY),
          cert: readFileSync(process.env.TLS_CERT),
          allowHTTP1: true,
        },
        handler,
      )
    : createServer(handler);
server.listen(listen, () => console.log(`compressing front on ${listen} -> ${upstream}`));
