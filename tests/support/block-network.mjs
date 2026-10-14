import http from "node:http";
const server = http.createServer((request, response) => {
  response.writeHead(403);
  response.end("External network disabled in local tests");
});
server.on("connect", (request, socket) =>
  socket.end("HTTP/1.1 403 Forbidden\r\n\r\n"),
);
server.listen(4199, "127.0.0.1");
