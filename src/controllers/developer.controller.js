import bcrypt from "bcryptjs";
import prisma from "../utils/prisma.js";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt.js";

export const register = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const existing = await prisma.developer.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ message: "Email already registered" });
  }

  const hashed = await bcrypt.hash(password, 10);

  const developer = await prisma.developer.create({
    data: { email, password: hashed },
  });

  res.status(201).json({
    message: "Developer account created",
    developer: { id: developer.id, email: developer.email },
  });
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const developer = await prisma.developer.findUnique({ where: { email } });
  if (!developer) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const isValid = await bcrypt.compare(password, developer.password);
  if (!isValid) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const accessToken = generateAccessToken(developer);
  const refreshToken = generateRefreshToken(developer);

  await prisma.developerRefreshToken.create({
    data: {
      token: refreshToken,
      developerId: developer.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

const isProd = process.env.NODE_ENV === "production";

res.cookie("dev_access_token", accessToken, {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "none" : "lax",
});

res.cookie("dev_refresh_token", refreshToken, {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "none" : "lax",
});

res.json({
    message: "Logged in successfully",
    developer: { id: developer.id, email: developer.email },
  });
};

export const logout = async (req, res) => {
  const token = req.cookies.dev_refresh_token;

  if (token) {
    await prisma.developerRefreshToken.deleteMany({ where: { token } });
  }

  res.clearCookie("dev_access_token");
  res.clearCookie("dev_refresh_token");

  res.json({ message: "Logged out" });
};

export const me = async (req, res) => {
  const developer = await prisma.developer.findUnique({
    where: { id: req.developer.userId },
    select: {
      id: true,
      email: true,
      createdAt: true,
      apps: {
        select: {
          id: true,
          name: true,
          clientId: true,
          createdAt: true,
        },
      },
    },
  });

  if (!developer) {
    return res.status(404).json({ message: "Developer not found" });
  }

  res.json({ developer });
};