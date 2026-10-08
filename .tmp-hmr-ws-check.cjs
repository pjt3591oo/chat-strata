const { WebSocket } = require("ws");

const url = "ws://localhost:3000/_next/hmr?id=check";
const ws = new WebSocket(url);

const timeout = setTimeout(() => {
  console.log(JSON.stringify({ ok: false, reason: "timeout" }));
  process.exit(1);
}, 5000);

ws.on("open", () => {
  clearTimeout(timeout);
  console.log(JSON.stringify({ ok: true, event: "open" }));
  ws.close();
});

ws.on("error", (err) => {
  clearTimeout(timeout);
  console.log(JSON.stringify({ ok: false, event: "error", message: err.message }));
  process.exit(1);
});

ws.on("close", (code, reason) => {
  clearTimeout(timeout);
  console.log(JSON.stringify({ ok: false, event: "close", code, reason: reason.toString() }));
  process.exit(1);
});
