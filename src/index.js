import dotenv from "dotenv";
import connectDB from "./db/index.js";
import app from "./app.js";

dotenv.config();

connectDB().then(() => {
    // listen for errors
    app.on("error",(error)=>{
        console.log("error : ",error);
        throw error;
    })

    //start the app if successful connection
    app.listen(process.env.PORT, () => {
        console.log(`⚙️ Server is running on port : ${process.env.PORT}`);
    }) 
}).catch((error) => {
    console.log("MONGODB connection FAILED : ",error);
})