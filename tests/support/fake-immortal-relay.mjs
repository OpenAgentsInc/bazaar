import { createServer } from "node:http"

import { WebSocketServer } from "ws"

const server = createServer((request, response) => {
  response.setHeader("access-control-allow-origin", "*")
  response.setHeader("access-control-allow-headers", "Accept, Content-Type")
  response.setHeader("access-control-allow-methods", "GET, OPTIONS")
  if (request.method === "OPTIONS") {
    response.writeHead(204).end()
    return
  }
  if (request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json" })
    response.end('{"state":"ready"}')
    return
  }
  if (request.headers.accept !== "application/nostr+json") {
    response.writeHead(406).end()
    return
  }
  response.writeHead(200, { "content-type": "application/nostr+json" })
  response.end(
    JSON.stringify({
      software: "https://github.com/OpenAgentsInc/immortal",
      version: "0.1.0",
      supported_nips: [11, 42, 59],
      supported_extensions: ["nip-mkt"],
    })
  )
})

const sockets = new WebSocketServer({ server })
sockets.on("connection", (socket) => {
  socket.send(JSON.stringify(["AUTH", "playwright-direct-relay"]))
  socket.on("message", (data) => {
    const message = JSON.parse(data.toString())
    if (message[0] === "AUTH") {
      socket.send(JSON.stringify(["OK", message[1].id, true, "authenticated"]))
    } else if (message[0] === "REQ") {
      socket.send(JSON.stringify(["EOSE", message[1]]))
    } else if (message[0] === "EVENT") {
      socket.send(JSON.stringify(["OK", message[1].id, true, "stored"]))
    }
  })
})

server.listen(18182, "127.0.0.1")

function close() {
  for (const client of sockets.clients) client.close()
  sockets.close(() => server.close(() => process.exit(0)))
}

process.once("SIGINT", close)
process.once("SIGTERM", close)
