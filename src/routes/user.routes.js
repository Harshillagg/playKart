import { Router } from "express";
import { registerUser, loginUser, logoutUser, refreshAccessToken } from "../controllers/user.controller.js";
import upload from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"

const userRouter = Router()

// register
userRouter.route("/register").post(

    //multer middleware before the controller works for temp image uploading in backend server
    upload.fields([  
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    
    //passing to controller
    registerUser   
)

// login
userRouter.route("/login").post(loginUser)

// secured Routes
userRouter.route("/logout").post(verifyJWT, logoutUser)

userRouter.route("/refresh-token").post(refreshAccessToken)

export default userRouter