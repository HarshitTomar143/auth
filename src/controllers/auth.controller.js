import bcrypt from "bcryptjs";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt.js";
import prisma from "../utils/prisma.js";
import axios from "axios";

export const signup = async (req, res)=> {
    const {email, password, clientId} = req.body;

    const app = await prisma.application.findUnique({
        where: { clientId },
    });

    if(!app){
        console.log("The app is invalid, prisma cannot find the application");
        return res.status(400).json({message : "Invalid Application"});
    }

    if (!password) {
        return res.status(400).json({ message: "Password is required" });
    }    

    const existingUser = await prisma.user.findFirst({
        where : {
            email, 
            appId: app.id,
        },
    });

    if(existingUser){
        console.log("A user already already exists with this email");
        return res.status(400).json({message: "User already exists with the same email"});
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data : {
            email,
            password : hashed,
            provider : "local",
            appId : app.id,
        },
    });
    
    res.json({
        message: "User created",
        user: {
            id: user.id,
            email: user.email,
        },
    });
};

export const login = async(req, res)=>{
    const {email, password, clientId} = req.body;

    const app = await prisma.application.findUnique({
        where: { clientId },
    });

    if(!app){
        console.log("The app is invalid, prisma cannot find the application");
        return res.status(400).json({message : "Invalid Application"});
    }

    const user = await prisma.user.findFirst({
            where: {
            email,
            appId: app.id,
            },
        });

    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }    

    if (!user.password) {
        return res.status(400).json({ message: "Use social login" });
    }

    if (!password) {
        return res.status(400).json({ message: "Password is required" });
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
        console.log("The credentials are not valid , either email or password is incorrect")
        return res.status(401).json({ message: "Invalid credentials" });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await prisma.refreshToken.create({
    data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    });

    

    res.cookie("access_token", accessToken, { httpOnly: true, secure : true, sameSite: "none"});
    res.cookie("refresh_token", refreshToken, { httpOnly: true , secure : true, sameSite: "none"});

    res.json({
    message: "User authenticated",
    user: {
        id: user.id,
        email: user.email,
    },
    });
}

export const logout = async(req, res)=> {

    const token = req.cookies.refresh_token;

    if(token){
        await prisma.refreshToken.deleteMany({
            where: {token},
        });
    }

    res.clearCookie("access_token");
    res.clearCookie("refresh_token");

    res.json({message: "Logged out"});
};

export const me= async(req, res)=>{
    const user  = await prisma.user.findUnique({
        where : {id : req.user.userId},
    });

    if(!user){
        return res.status(404).json({message : "User not found"});
    }

    res.json({
        id: user.id,
        email : user.email,
    })
}

export const googleLogin = async (req, res) => {
  const { clientId } = req.query;

  const app = await prisma.application.findUnique({
    where: { clientId },
  });

  if (!app || !app.googleClientId) {
    return res.status(400).json({ message: "Google not configured" });
  }

  const redirectUri = app.googleRedirectUri;

  const url =
    "https://accounts.google.com/o/oauth2/v2/auth?" +
    `client_id=${app.googleClientId}` +
    `&redirect_uri=${redirectUri}` +
    `&response_type=code` +
    `&scope=openid email profile` +
    `&state=${clientId}`;

  res.redirect(url);
};

export const googleCallback = async (req, res) => {
  const { code, state } = req.query;

  const clientId = state;

  const app = await prisma.application.findUnique({
    where: { clientId },
  });

  console.log("App found:", app);
  console.log("googleClientId:", app?.googleClientId);
  console.log("googleRedirectUri:", app?.googleRedirectUri);

  if (!app) {
    return res.status(400).json({ message: "Invalid app" });
  }

  const redirectUri = app.googleRedirectUri;

  
  const tokenRes = await axios.post(
    "https://oauth2.googleapis.com/token",
    {
      code,
      client_id: app.googleClientId,
      client_secret: app.googleClientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }
  );

  const { access_token } = tokenRes.data;

  
  const userInfo = await axios.get(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    }
  );

  const { email, sub } = userInfo.data;

  let user = await prisma.user.findFirst({
    where: {
      email,
      appId: app.id,
    },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        provider: "google",
        providerId: sub,
        appId: app.id,
      },
    });
  }

  
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const isProd = process.env.NODE_ENV === "production";

  res.cookie("access_token", accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
  });

  res.cookie("refresh_token", refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "none",
  });

  
  res.redirect(app.redirectUrl);
};

export const githubLogin = async (req, res) => {
  const { clientId } = req.query;

  const app = await prisma.application.findUnique({
    where: { clientId },
  });

  if (!app || !app.githubClientId) {
    return res.status(400).json({ message: "GitHub not configured" });
  }

  const redirectUri = app.githubRedirectUri;

  const url =
    "https://github.com/login/oauth/authorize?" +
    `client_id=${app.githubClientId}` +
    `&redirect_uri=${redirectUri}` +
    `&scope=user:email` +
    `&state=${clientId}`;

  res.redirect(url);
};

export const githubCallback = async (req, res) => {
  const { code, state } = req.query;

  const clientId = state;

  const app = await prisma.application.findUnique({
    where: { clientId },
  });

  if (!app) {
    return res.status(400).json({ message: "Invalid app" });
  }

  const redirectUri = app.githubRedirectUri;

  
  const tokenRes = await axios.post(
    "https://github.com/login/oauth/access_token",
    {
      client_id: app.githubClientId,
      client_secret: app.githubClientSecret,
      code,
      redirect_uri: redirectUri,
    },
    {
      headers: {
        Accept: "application/json",
      },
    }
  );

  const accessTokenGitHub = tokenRes.data.access_token;

  
  const userRes = await axios.get("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessTokenGitHub}`,
    },
  });

  const { id: githubId, email } = userRes.data;

  
  let userEmail = email;

  if (!userEmail) {
    const emailRes = await axios.get(
      "https://api.github.com/user/emails",
      {
        headers: {
          Authorization: `Bearer ${accessTokenGitHub}`,
        },
      }
    );

    const primaryEmail = emailRes.data.find(e => e.primary);

    userEmail = primaryEmail?.email;
  }

  if (!userEmail) {
    return res.status(400).json({ message: "Email not available" });
  }

  
  let user = await prisma.user.findFirst({
    where: {
      email: userEmail,
      appId: app.id,
    },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: userEmail,
        provider: "github",
        providerId: githubId.toString(),
        appId: app.id,
      },
    });
  }

 
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  
  const isProd = process.env.NODE_ENV === "production";

  res.cookie("access_token", accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
  });

  res.cookie("refresh_token", refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
  });

 
  res.redirect(app.redirectUrl);
};