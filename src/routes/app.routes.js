import express from "express";
import {
  createApp,
  listApps,
  getApp,
  updateProviders,
  deleteApp,
  getAppUsers,
} from "../controllers/app.controller.js";
import { verifyDeveloper } from "../middleware/developer.middleware.js";

const router = express.Router();

router.use(verifyDeveloper);

router.post("/create", createApp);
router.get("/list", listApps);
router.get("/:id", getApp);
router.patch("/:id/providers", updateProviders);
router.delete("/:id", deleteApp);
router.get("/:id/users", getAppUsers);

export default router;