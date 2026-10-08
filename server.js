// Custom Next.js server (Next 16: next({ dev }) + getRequestHandler) hosting
// a ws WebSocketServer at /ws on the same HTTP server, port 3000.
// Plain CommonJS; Node 24 type-strips the .ts imports natively.

const { createServer } = require("node:http");
const next = require("next");
const { WebSocketServer, WebSocket } = require("ws");
const chatStore = require("./src/lib/chat-store.ts");

const port = parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

/** room -> Set of connected clients in that room */
const socketsByRoom = new Map();

function sendFrame(ws, frame) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(frame));
}

function sendError(ws, message) {
  sendFrame(ws, { type: "error", message });
}

function broadcast(room, frame) {
  const clients = socketsByRoom.get(room);
  if (clients === undefined) return;
  const payload = JSON.stringify(frame);
  for (const client of clients) {
    if (client.ws.readyState === WebSocket.OPEN) client.ws.send(payload);
  }
}

function removeFromRoom(client) {
  const clients = socketsByRoom.get(client.room);
  if (clients !== undefined) {
    clients.delete(client);
    if (clients.size === 0) socketsByRoom.delete(client.room);
  }
}

function announceDeparture(client) {
  if (client.room === null) return;
  const room = client.room;
  const nickname = client.nickname;
  removeFromRoom(client);
  client.room = null;
  client.nickname = null;
  const members = chatStore.leaveRoom(room, nickname);
  if (members !== null) {
    broadcast(room, { type: "members", members });
    broadcast(room, { type: "system", text: `${nickname} left` });
  }
}

function handleJoin(client, frame) {
  if (client.room !== null) {
    sendError(client.ws, "you already joined a room; send leave first");
    return;
  }
  const roomError = chatStore.validateRoom(frame.room);
  if (roomError !== null) {
    sendError(client.ws, roomError);
    return;
  }
  const nicknameError = chatStore.validateNickname(frame.nickname);
  if (nicknameError !== null) {
    sendError(client.ws, nicknameError);
    return;
  }
  const result = chatStore.joinRoom(frame.room, frame.nickname);
  if (!result.ok) {
    sendError(client.ws, result.error);
    return;
  }
  client.room = frame.room;
  client.nickname = frame.nickname;
  let clients = socketsByRoom.get(frame.room);
  if (clients === undefined) {
    clients = new Set();
    socketsByRoom.set(frame.room, clients);
  }
  clients.add(client);
  sendFrame(client.ws, {
    type: "joined",
    room: frame.room,
    nickname: frame.nickname,
    members: result.members,
    history: result.history,
  });
  broadcast(frame.room, { type: "members", members: result.members });
  broadcast(frame.room, { type: "system", text: `${frame.nickname} joined` });
}

function handleMessage(client, frame) {
  if (client.room === null) {
    sendError(client.ws, "join a room before sending messages");
    return;
  }
  const textError = chatStore.validateText(frame.text);
  if (textError !== null) {
    sendError(client.ws, textError);
    return;
  }
  const message = chatStore.postMessage(client.room, client.nickname, frame.text);
  if (message === null) {
    sendError(client.ws, "you are no longer in that room");
    return;
  }
  broadcast(client.room, { type: "message", message });
}

function handleLeave(client) {
  if (client.room === null) {
    sendError(client.ws, "you have not joined a room");
    return;
  }
  announceDeparture(client);
}

function handleFrame(client, raw) {
  let frame;
  try {
    frame = JSON.parse(raw.toString());
  } catch {
    sendError(client.ws, "frames must be JSON text");
    return;
  }
  if (frame === null || typeof frame !== "object" || Array.isArray(frame)) {
    sendError(client.ws, "frames must be JSON objects");
    return;
  }
  switch (frame.type) {
    case "join":
      handleJoin(client, frame);
      break;
    case "message":
      handleMessage(client, frame);
      break;
    case "leave":
      handleLeave(client);
      break;
    default:
      sendError(client.ws, `unknown frame type: ${JSON.stringify(frame.type)}`);
  }
}

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res).catch((err) => {
      console.error(err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    });
  });

  const wss = new WebSocketServer({ noServer: true });
  const nextUpgrade = app.upgradeHandler;

  // getRequestHandler() otherwise installs Next's own upgrade listener on the
  // first HTTP request. We route upgrades explicitly so /ws and Next HMR can
  // share the same HTTP server without hijacking each other.
  app.didWebSocketSetup = true;

  server.on("upgrade", (req, socket, head) => {
    const { pathname } = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

    if (pathname === "/ws") {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
      return;
    }

    nextUpgrade(req, socket, head).catch((err) => {
      console.error(err);
      socket.destroy();
    });
  });

  wss.on("connection", (ws) => {
    const client = { ws, room: null, nickname: null };
    ws.on("message", (raw) => handleFrame(client, raw));
    ws.on("close", () => announceDeparture(client));
    ws.on("error", () => announceDeparture(client));
  });

  server.listen(port, () => {
    console.log(
      `> Server listening at http://localhost:${port} as ${
        dev ? "development" : process.env.NODE_ENV
      } (Next.js pages + ws://localhost:${port}/ws)`
    );
  });
});
