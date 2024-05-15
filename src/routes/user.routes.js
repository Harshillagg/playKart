import { Router } from "express";
import registerUser from "../controllers/user.controller.js";
import upload from "../middlewares/multer.middleware.js"

const userRouter = Router()

//route for registering user and sending post request
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

export default userRouter