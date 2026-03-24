import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import prisma from "../utils/prisma.js";

export const createApp = async (req, res) => {
  const { name, redirectUrl } = req.body;

  if (!name || !redirectUrl) {
    return res.status(400).json({ message: "Name and redirectUrl are required" });
  }

  const clientId = uuidv4();
  const clientSecret = crypto.randomBytes(32).toString("hex");

  const app = await prisma.application.create({
    data: {
      name,
      clientId,
      clientSecret,
      redirectUrl,
      developerId: req.developer.userId,
    },
  });

  // Only time clientSecret is returned
  res.status(201).json({
    message: "Application created",
    app: {
      id: app.id,
      name: app.name,
      clientId: app.clientId,
      clientSecret: app.clientSecret,
      redirectUrl: app.redirectUrl,
      createdAt: app.createdAt,
    },
  });
};

export const listApps = async (req, res) => {
  const apps = await prisma.application.findMany({
    where: { developerId: req.developer.userId },
    select: {
      id: true,
      name: true,
      clientId: true,
      redirectUrl: true,
      createdAt: true,
      googleClientId: true,
      githubClientId: true,
    },
  });

  res.json({ apps });
};

export const getApp = async (req, res) => {
  const { id } = req.params;

  const app = await prisma.application.findUnique({ where: { id } });

  if (!app) {
    return res.status(404).json({ message: "Application not found" });
  }

  if (app.developerId !== req.developer.userId) {
    return res.status(403).json({ message: "Forbidden" });
  }

  res.json({
    app: {
      id: app.id,
      name: app.name,
      clientId: app.clientId,
      redirectUrl: app.redirectUrl,
      createdAt: app.createdAt,
      googleClientId: app.googleClientId,
      googleRedirectUri: app.googleRedirectUri,
      githubClientId: app.githubClientId,
      githubRedirectUri: app.githubRedirectUri,
    },
  });
};

export const updateProviders = async (req, res) => {
  const { id } = req.params;
  const {
    googleClientId,
    googleClientSecret,
    googleRedirectUri,
    githubClientId,
    githubClientSecret,
    githubRedirectUri,
  } = req.body;

  const app = await prisma.application.findUnique({ where: { id } });

  if (!app) {
    return res.status(404).json({ message: "Application not found" });
  }

  if (app.developerId !== req.developer.userId) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const updated = await prisma.application.update({
    where: { id },
    data: {
      ...(googleClientId && { googleClientId }),
      ...(googleClientSecret && { googleClientSecret }),
      ...(googleRedirectUri && { googleRedirectUri }),
      ...(githubClientId && { githubClientId }),
      ...(githubClientSecret && { githubClientSecret }),
      ...(githubRedirectUri && { githubRedirectUri }),
    },
  });

  res.json({
    message: "Providers updated",
    app: {
      id: updated.id,
      googleClientId: updated.googleClientId,
      googleRedirectUri: updated.googleRedirectUri,
      githubClientId: updated.githubClientId,
      githubRedirectUri: updated.githubRedirectUri,
    },
  });
};

export const deleteApp = async (req, res) => {
  const { id } = req.params;

  const app = await prisma.application.findUnique({ where: { id } });

  if (!app) {
    return res.status(404).json({ message: "Application not found" });
  }

  if (app.developerId !== req.developer.userId) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const users = await prisma.user.findMany({ where: { appId: id } });
  const userIds = users.map((u) => u.id);

  await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { appId: id } });
  await prisma.application.delete({ where: { id } });

  res.json({ message: "Application deleted" });
};

export const getAppUsers = async (req, res) => {
  const { id } = req.params;

  const app = await prisma.application.findUnique({ where: { id } });

  if (!app) {
    return res.status(404).json({ message: "Application not found" });
  }

  if (app.developerId !== req.developer.userId) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const users = await prisma.user.findMany({
    where: { appId: id },
    select: {
      id: true,
      email: true,
      provider: true,
      createdAt: true,
    },
  });

  res.json({ users, total: users.length });
};