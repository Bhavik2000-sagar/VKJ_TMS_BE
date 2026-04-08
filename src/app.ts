import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import { env } from "./config/env.js";
import { csrfBootstrap, csrfProtect } from "./middleware/csrf.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import platformRoutes from "./routes/platform.routes.js";
import taskRoutes from "./routes/task.routes.js";
import meetingRoutes from "./routes/meeting.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import reportRoutes from "./routes/report.routes.js";
import tenantAdminRoutes from "./routes/tenantAdmin.routes.js";
import teamRoutes from "./routes/team.routes.js";
import orgRoutes from "./routes/org.routes.js";
import eodRoutes from "./routes/eod.routes.js";
import {
  apiErrorHandler,
  notFoundHandler,
} from "./middleware/error.middleware.js";

export function createApp() {
  const app = express();
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(
    cors({
      origin: env.FRONTEND_ORIGIN,
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: "10mb" }));

  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  app.get("/api/csrf", csrfBootstrap);
  app.use("/api", csrfProtect);

  app.use("/api/auth", authRoutes);
  app.use("/api/platform", platformRoutes);
  app.use("/api/tasks", taskRoutes);
  app.use("/api/meetings", meetingRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/reports", reportRoutes);
  app.use("/api/tenant", tenantAdminRoutes);
  app.use("/api/team", teamRoutes);
  app.use("/api/org", orgRoutes);
  app.use("/api/eod", eodRoutes);

  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  app.use(notFoundHandler);
  app.use(apiErrorHandler);

  return app;
}
