import http from "node:http";
import { handleRequest } from "./index.mjs";

const port = Number(process.env.PORT || 8787);
http.createServer(async (req, res) => {
  const origin = `http://${req.headers.host || `localhost:${port}`}`;
  const request = new Request(new URL(req.url, origin), { method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : req });
  const response = await handleRequest(request);
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}).listen(port, () => console.log(`DekhoCampus AWS backend listening on ${port}`));
