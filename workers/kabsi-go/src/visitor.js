// Ready 2 part C: the key go.kabsi.co counts a visitor by for VISITOR_LIMIT. Nothing is stored; Cloudflare keeps the count
// in memory for the minute.
// One IPv6 visitor holds a whole /64 and could change address inside it, so IPv6 counts by its first four groups.
export function visitorKey(ip) {
  if (!ip.includes(":")) return ip;
  const [head, tail = ""] = ip.toLowerCase().split("::");
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  const groups = ip.includes("::") ? [...left, ...Array(Math.max(0, 8 - left.length - right.length)).fill("0"), ...right] : left;
  return `${groups.slice(0, 4).map((g) => g.replace(/^0+(?=.)/, "")).join(":")}::/64`;
}
