import { Router } from "express";

import {
  askAssistant,
  getNotice,
  getNotices,
} from "../controllers/noticeController.js";

const router = Router();

router.get("/notices", getNotices);
router.get("/notices/:id", getNotice);
router.post("/chat", askAssistant);

export default router;
