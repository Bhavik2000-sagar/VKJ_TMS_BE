import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import * as notificationService from "../services/notification.service.js";

const router = Router();
router.use(authMiddleware);

router.get("/", async (req, res) => {
  const items = await notificationService.listNotifications(req.userId!);
  const unread = await notificationService.unreadCount(req.userId!);
  res.json({ notifications: items, unreadCount: unread });
});

router.post("/:id/read", async (req, res) => {
  await notificationService.markRead(req.userId!, req.params.id);
  res.json({ ok: true });
});

router.post("/read-all", async (req, res) => {
  await notificationService.markAllRead(req.userId!);
  res.json({ ok: true });
});

export default router;
