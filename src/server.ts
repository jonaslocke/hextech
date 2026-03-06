import { createServer } from "node:http";
import { createApp } from "./app.js";
import { registerSocketServer } from "./interfaces/socket/socket.server.js";

const PORT = Number(process.env.PORT ?? 3000);

const app = createApp();
const httpServer = createServer(app);

registerSocketServer(httpServer);

httpServer.listen(PORT, () => {
  console.log(`HTTP + WS server running on http://localhost:${PORT}`);
});
