import bcrypt from "bcryptjs";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt.js";
import prisma from "../utils/prisma.js";

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