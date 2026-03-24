import jwt from "jsonwebtoken"


export const generateAccessToken = (user) => {
  return jwt.sign(
    { userId: user.id, appId: user.appId },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "15m" }
  );
};

export const generateRefreshToken = (user) => {
  return jwt.sign(
    { userId: user.id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" }
  );
};