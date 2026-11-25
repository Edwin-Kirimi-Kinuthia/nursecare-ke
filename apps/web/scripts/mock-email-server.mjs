// Disposable CI transport: accepts email requests locally and never sends mail.
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
createServer((request, response) => {
  request.resume();
  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(JSON.stringify({ id: randomUUID() }));
}).listen(4319, "127.0.0.1");
