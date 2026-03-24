import jwt from "jsonwebtoken";
import prisma from "../utils/prisma.js";
import { generateAccessToken } from "../utils/jwt.js";

export const verifyAuth = async (req, res, next) => {
  const accessToken = req.cookies.access_token;
  const refreshToken = req.cookies.refresh_token;

 
  if (!accessToken && !refreshToken) {
    return res.status(401).json({ message: "Unauthorized" });
  }

 
  if (accessToken) {
    try {
      const decoded = jwt.verify(
        accessToken,
        process.env.ACCESS_TOKEN_SECRET
      );

      req.user = decoded;
      return next();
    } catch (err) {
      console.log("[AUTH] Access token expired, trying refresh...");
    }
  }

  
  if (!refreshToken) {
    return res.status(401).json({ message: "No refresh token" });
  }

 
  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

   
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    
    
    if (!storedToken) {
        return res.status(403).json({ message: "Invalid refresh token" });
    }
    
    if (storedToken.expiresAt < new Date()) {
   return res.status(403).json({ message: "Refresh token expired" });
   }
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const newAccessToken = generateAccessToken(user);

    res.cookie("access_token", newAccessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });

   
    req.user = {
      userId: user.id,
      appId: user.appId,
    };

    return next();

  } catch (err) {
    console.log("[AUTH ERROR] Refresh failed:", err.message);
    return res.status(403).json({ message: "Session expired" });
  }
};