const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const http = require("http");
const { Server } = require("socket.io");
const { connectDB } = require("./config/db");
const alertRoutes = require("./routes/alertRoutes");
const authRoutes = require("./routes/authRoutes");
const feedbackRoutes = require("./routes/feedbackRoutes");

const app = express();
const port = process.env.BACKEND_PORT || 5000;

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://127.0.0.1:3000", process.env.FRONTEND_URL || "https://argus-frontend.vercel.app"],
    methods: ["GET", "POST", "PATCH"],
    credentials: true
  },
});

app.set("io", io);

io.on("connection", (socket) => {
  console.log(`[socket] Client connected: ${socket.id}`);
  
  socket.on("ping_latency", (callback) => {
    if (typeof callback === "function") callback();
  });

  socket.on("disconnect", () => {
    console.log(`[socket] Client disconnected: ${socket.id}`);
  });
});

app.use(helmet());
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", limiter);
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ success: true, message: "ARGUS backend is running." });
});

app.use("/api/auth", authRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/analyst-feedback", feedbackRoutes);

// Start the Express WebSocket server irrespective of MongoDB Atlas Network Timeouts
connectDB()
  .then(() => console.log("✅ MongoDB successfully connected"))
  .catch((error) => console.error("⚠️ [db-warning] MongoDB connection timeout:", error.message));

server.listen(port, () => {
  console.log(`[server] Backend listening on port ${port}.`);
  console.log("Socket server running");
});
