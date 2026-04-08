import { createServer } from "http";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { attachSocket } from "./socket.js";
import { setSocketServer } from "./socketHub.js";

const app = createApp();
const httpServer = createServer(app);
const io = attachSocket(httpServer);
setSocketServer(io);

io.engine.on("connection_error", (err) => {
  console.error("socket connection_error", err.message);
});

httpServer.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
});

export { io };
