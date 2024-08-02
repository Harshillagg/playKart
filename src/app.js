import express, { urlencoded } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

// Basic config
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

// Middleware to parse incoming requests with JSON payloads
app.use(express.json({ limit: "16kb" }));

// Middleware to parse URL-encoded payloads
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

// Middleware to serve static files from the "public" directory
app.use(express.static("public"));

// Middleware to parse cookies
app.use(cookieParser());

//route import
import userRouter from "./routes/user.routes.js"

//api route declaration
app.use("/api/v1/users", userRouter) //this will go as localhost:8000/api/v1/user/... rest will be from userRouter

export default app