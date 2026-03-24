import express from "express";
import { register, login, logout, me } from "../controllers/developer.controller.js";
import { verifyDeveloper } from "../middleware/developer.middleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", verifyDeveloper, me);

export default router;