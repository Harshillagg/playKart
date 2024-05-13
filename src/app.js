import express, { urlencoded } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

//basic config
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))
app.use(express.json({limit:"16kb"}))
app.use(urlencoded({extended: true, limit:"16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

//route import
import userRouter from "./routes/user.route.js"

//api route declaration
app.use("/api/v1/users", userRouter) //this will go as localhost:8000/api/vi/user/... rest will be from userRouter

export default app