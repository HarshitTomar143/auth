import express from "express"
import {signup, login, logout, me} from "../controllers/auth.controller.js";
import { verifyAuth } from "../middleware/auth.middleware.js";
import { googleLogin, googleCallback } from "../controllers/auth.controller.js";
import { githubLogin, githubCallback } from "../controllers/auth.controller.js";
const router = express.Router()

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", verifyAuth, me);
router.get("/google/login", googleLogin);
router.get("/google/callback", googleCallback);
router.get("/github/login", githubLogin);
router.get("/github/callback", githubCallback);

export default router;