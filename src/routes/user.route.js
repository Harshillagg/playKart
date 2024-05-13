import { Router } from "express";
import registerUser from "../controllers/user.controller.js";

const userRouter = Router()

//route for registering user and sending post request
userRouter.route("/register").post(registerUser)

export default userRouter