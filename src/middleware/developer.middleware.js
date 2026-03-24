import jwt from "jsonwebtoken";
import prisma from "../utils/prisma.js";
import { generateAccessToken } from "../utils/jwt.js";

export const verifyDeveloper = async (req, res, next) => {
  const accessToken = req.cookies.dev_access_token;
  const refreshToken = req.cookies.dev_refresh_token;

  if (!accessToken && !refreshToken) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (accessToken) {
    try {
      const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
      req.developer = decoded;
      return next();
    } catch (err) {
      console.log("[DEV AUTH] Access token expired, trying refresh...");
    }
  }

  if (!refreshToken) {
    return res.status(401).json({ message: "No refresh token" });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    const storedToken = await prisma.developerRefreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!storedToken) {
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    if (storedToken.expiresAt < new Date()) {
      return res.status(403).json({ message: "Refresh token expired" });
    }

    const developer = await prisma.developer.findUnique({
      where: { id: decoded.userId },
    });

    if (!developer) {
      return res.status(404).json({ message: "Developer not found" });
    }

    const newAccessToken = generateAccessToken(developer);

    res.cookie("dev_access_token", newAccessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });

    req.developer = {
      userId: developer.id,
      email: developer.email,
    };

    return next();
  } catch (err) {
    console.log("[DEV AUTH ERROR] Refresh failed:", err.message);
    return res.status(403).json({ message: "Session expired" });
  }
};