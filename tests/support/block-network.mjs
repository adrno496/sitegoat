import process from "node:process";
import http from "node:http";
const server = http.createServer((request, response) => {
  response.writeHead(403);
  response.end("External network disabled in local tests");
});
server.on("connect", (request, socket) =>
  socket.end("HTTP/1.1 403 Forbidden\r\n\r\n"),
);
server.listen(Number(process.env.JOURNAL360_BLOCK_PORT || 4199), "127.0.0.1");
