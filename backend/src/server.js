require("dotenv").config();

const app = require("./app");
const socketService = require("./services/socketService");
const realtimeService = require("./services/realtimeEventService");

function startServer({ port, enableLogging = process.env.NODE_ENV !== "test", onReady } = {}) {
  const resolvedPort = port || process.env.PORT || 3001;
  const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

  const server = app.listen(resolvedPort, async () => {
    if (enableLogging) {
      console.log(`Servern körs på http://localhost:${resolvedPort}`);
      console.log(`Frontend: ${frontendOrigin}`);
      console.log(`Admin Panel: ${frontendOrigin}/admin`);
    }

    // Initialize WebSocket server
    socketService.initialize(server);

    // Initialize real-time event service
    await realtimeService.initialize();

    if (typeof onReady === "function") {
      onReady(server);
    }
  });

  server.on("error", (error) => {
    console.error("❌ HTTP server error:", error);
  });

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
