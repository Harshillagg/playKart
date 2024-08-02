import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import ApiError from "../utils/ApiError.js";
import User from "../models/user.model.js";
import jwt from "jsonwebtoken";

// To generate access and refresh tokens
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating tokens");
  }
};

// To register the User
const registerUser = asyncHandler(async (req, res) => {
  // To register user and save details and files in db
  // Step-1 : Get data from frontend
  // req.body gives all the form data or json data on submission or Api-call
  const { username, email, password, fullName } = req.body;

  // Step-2 : Check if fields are empty
  if (
    [username, email, password, fullName].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // Step-3 : check if user already exists
  const existingUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  // if any field matches throw error
  if (existingUser)
    throw new ApiError(409, "User with Username or email already exists");

  // Step-4 : check if files are given or not by user
  // these were uploaded by multer on backend
  // so if path is not present this means user didn't give the files
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  if (!avatarLocalPath) throw new ApiError(400, "Avatar is required");

  // Step-5 : Upload files to cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar)
    throw new ApiError(500, "Something went wrong while uploading avatar");

  // Step-6 : Create user entry in db
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  // Step-7 : Remove password and refreshToken from response for frontend
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // Step-8 : check if user creation
  if (!createdUser)
    throw new ApiError(500, "Something went wrong while registering user");

  // Step-9 : send response
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User created successfully"));
});

// To login the User
const loginUser = asyncHandler(async (req, res) => {
  // Step-1 : req.body = data sent by frontend
  const { email, username, password } = req.body;

  // console.log(req.body)

  // Step-2 : check if fields are empty
  if (!(username && email))
    throw new ApiError(400, "Username or Email is required");

  // Step-3 : validate email or username
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) throw new ApiError(401, "User does not exist");

  // Step-4 : validate password
  const isValidPassword = await user.isPasswordCorrect(password);

  if (!isValidPassword) throw new ApiError(401, "Invalid credentials");

  // Step-5 : generate tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );
  // console.log("token :", accessToken)

  // Step-6 : send response cookie
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});

// To logout the User
const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1, // this removes the field from document
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

// TO refresh the access token
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body.refreshToken;

  // console.log(incomingRefreshToken)

  if (!incomingRefreshToken) throw new ApiError(401, "Unauthorized Request");

  const decodedToken = jwt.verify(
    incomingRefreshToken,
    process.env.REFRESH_TOKEN_SECRET
  );

  const user = await User.findById(decodedToken?._id);

  if (!user) throw new ApiError(401, "Invalid Refresh Token");

  if (incomingRefreshToken !== user.refreshToken)
    throw new ApiError(401, "Token expired or used");

  const options = {
    httpOnly: true,
    secure: true,
  };

  // console.log(user)
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  console.log(accessToken, refreshToken);
  res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { accessToken: accessToken, refreshToken: refreshToken },
        "Access Token refreshed successfully"
      )
    );
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched successfully"));
});

// To change current password
const changeCurrentPasswword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) new ApiError(400, "Invalid Wrong password");

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed succssfully"));
});

// To update account details
const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!fullName || !email) throw new ApiError(400, "All fields are required");

  const user = User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) throw new ApiError(400, "Avatar is required");

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url)
    throw new ApiError(500, "Something went wrong while uploading avatar");

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) throw new ApiError(400, "Cover image is required");

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url)
    throw new ApiError(500, "Something went wrong while uploading cover image");

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover Image updated successfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  // get the username form the url (params)
  const { username } = req.params;

  if (!username?.trim()) throw new ApiError(400, "Username is required");

  //aggregation pipeline
  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      // saare subscribers ayenge unke channel vaale field se
      $lookup: {
        from: "subscriptions", // model name(that goes into mongodb)
        localfield: "_id", // name of field in the local model
        foreignField: "channel", // name of localfield in foreign model
        as: "subscribers", // alias of the data retreieved
      },
    },
    {
      // and subscribedTo ayenge unke subscriber vaale field se
      $lookup: {
        from: "subscriptions", // model name
        localfield: "_id", // identifier - can be used to join collections also
        foreignField: "subscriber", // field to take
        as: "subsribedTo", // alias
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        subscribedToCount: {
          $size: "$subsribedTo",
        },
        isSubscribed: {
          $cond: {
            // subscribers.subscriber ka mtlb h ki hm uske subscribers
            // ke lie id match krege loggedin user ki agar logged in user
            // and uske subscribers ke list se user dono match hote h
            // to subscribed hai varna nhi
            if: {
              $in: [req.user?._id, "$subscribers.subscriber"],
            },
            // subscribers hai list of all subscribers to a channel and
            // subscriber means jo user ko subscribe hue h and channel means jo usne subscibe kare h
            then: true,
            else: false,
          },
        },
      },
    },
    {
      // fields to show in response
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        subscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  if (!channel?.length) throw new ApiError(404, "Channel not found");

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "Channel profile fetched successfully")
    );
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localfield: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, user[0].watchHistory),
      "watch History fetched successfully"
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPasswword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};
