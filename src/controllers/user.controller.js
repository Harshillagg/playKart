import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import ApiError from "../utils/ApiError.js";
import User from "../models/user.model.js";

const registerUser = asyncHandler (async (req,res) => {
    
    // To register user and save details and files in db
    // Step-1 : Get data from frontend
    // req.body gives all the form data or json data on submission or Api-call
    const {username, email, password, fullName} = req.body 
    
    // Step-2 : Check if fields are empty
    if( 
        [username, email, password, fullName ].some( (field) => field?.trim() === "" ) 
    ){
        throw new ApiError(400, "All fields are required")
    }

    // Step-3 : check if user already exists
    const existingUser = await User.findOne({
        $or: [ { username } , { email } ]
    })

    // if any field matches throw error
    if(existingUser) throw new ApiError(409, "User with Username or email already exists")

    // Step-4 : check if files are given or not by user
    // these were uploaded by multer on backend
    // so if path is not present this means user didn't give the files
    const avatarLocalPath = req.files?.avatar[0]?.path;   
    const coverImageLocalPath = req.files?.coverImage[0]?.path; 

    if(!avatarLocalPath) throw new ApiError(400, "Avatar is required")
    
    // Step-5 : Upload files to cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    
    if(!avatar) throw new ApiError(500, "Something went wrong while uploading avatar")
    if(!coverImage) throw new ApiError(500, "Something went wrong while uploading cover image")

    // Step-6 : Create user entry in db
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    // Step-7 : Remove password and refreshToken from response for frontend
    const createdUser = await User.findById(user._id).select( "-password -refreshToken" )

    // Step-8 : check if user creation
    if(!createdUser) throw new ApiError(500, "Something went wrong while registering user")
    
    // Step-9 : send response
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User created successfully")
    )

})

export default registerUser