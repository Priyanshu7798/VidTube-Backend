import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from '../utils/ApiError.js'
import { User } from '../models/user.models.js'
import { uploadOnCloudianry , deleteFromCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import { mongoose } from "mongoose";

// Generate tokens for Accessing user
const generateAccessAndRefreshToken = async (userId) =>{
    try {
        const user = await User.findById(userId)
    
        if(!user){
            throw new ApiError(400,'No User at this token');
        }
        // asign th etoken to the Specific user that is log in
        const accessToken = user.generateAccessTokens();
        const refreshToken = user.generateRefreshTokens();
    
        user.refreshTokens = refreshToken // chnage the refresh token in DB
        await user.save({validateBeforeSave: false})
        return {accessToken, refreshToken}

    } catch (error) {
        throw new ApiError(500 , "Went wrong generating access and refresh token")

    }
}

const registerUser = asyncHandler( async (req, res) => {
    const {fullname , email,username , password } = req.body

    // vaildation

    if( [fullname ,username ,email, password].some((field)=> field?.trim()==="") ){
        throw new ApiError(400,'Check All the Field')
    }

    // check if the user already exist
    const expectedUser = await User.findOne({
        $or: [{username},{email}]
    })

    if(expectedUser){
        throw new ApiError(409,'User all ready exists')
    }

    // image handling
    // console.warn(req.files)
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverLocalPath = req.files?.coverImage?.[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400,'Have to upload the avatar')
    }
    

    // upload on CLoudinray

    // const avatar = await uploadOnCloudianry(avatarLocalPath);
    // let coverImage = ''
    // if(coverLocalPath){
    //     coverImage = await uploadOnCloudianry(coverLocalPath)
    // }

    let avatar;
    try {
        avatar = await uploadOnCloudianry(avatarLocalPath)
        // console.log("Uploaded Avatar", avatar);
        
    } catch (error) {
        console.log("Error Uploading avatar",error);
        throw new ApiError(500,'Failed to upload avatar')
        
    }
    let coverImage;
    try {
        coverImage = await uploadOnCloudianry(coverLocalPath)
        // console.log("Uploaded coverImage", coverImage);
        
    } catch (error) {
        console.log("Error Uploading coverImage",error);
        throw new ApiError(500,'Failed to upload coverImage')
        
    }

    try {
        // create the user
    
        const user = await User.create({
            fullname,
            avatar: avatar.url,
            coverImage: coverImage?.url || '',
            email,
            password,
            username : username.toLowerCase()
        })
    
        // check the user
        const createdUser = await User.findById(user._id).select(
            "-password -refreshTokens"
        )
    
        if(!createdUser){
            throw new ApiError(500,'Something went wrong')
        }
    
        //  return to frontend
    
        return res
            .status(201)
            .json( new ApiResponse(
                200,
                createdUser,
                "The User created Successfully"
            )
        )
            
    } catch (error) {
        console.log('User creation failed')

        if(avatar){
            await deleteFromCloudinary(avatar.public_id)
        }
        if(coverImage){
            await deleteFromCloudinary(coverImage.public_id) 
        }
        throw new ApiError(500,
            'Something went wrong creating user and images were deleted'
        )

    }
})

const loginUser = asyncHandler( async (req,res)=>{
    // get data from the body
    const {email , username , password} = req.body

    // validation

    if(!email){
        throw new ApiError(400, "Email Required")
    }
    if(!username){
        throw new ApiError(400, "Username Required")
    }

    const user = await User.findOne({
        $or: [{username},{email}]
    })

    if(!user) {
        throw new ApiError(404, "User Not Found")
    }

    // validate password
    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401, "Invalid Credentials")
    }

    // Now we genreate the tokens
    const {accessToken ,refreshToken} = generateAccessAndRefreshToken(user._id);

    const loggedInUser = await User.findOne(user._id).select('-password -refreshTokens');

    if(!loggedInUser){
        throw new ApiError(404, "User Not Found")
    }

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV ==='production',
    }

    return res
        .status(200)
        .cookie('accessToken',accessToken,options)
        .cookie('refreshToken',refreshToken,options)
        .json( new ApiResponse(200,
            {user : loggedInUser ,accessToken ,refreshToken},
            'User LoggedIN suceessfully'
        ))

})

// generate the refresh Access Token
const refreshAccessToken = asyncHandler( async (req,res) =>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if(!incomingRefreshToken){
        throw new ApiError(401, "Refresh Token is Required")
    }

    try {
        // we get the id of the user from the refresh token
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET,
        )
    
        const user = await User.findById(decodedToken?._id)

        if(!user){
            throw new ApiError(401, 'Invalid Refresh Token')
        }

        // check the refresh token in database
        if(incomingRefreshToken !== user?.refreshTokens){
            throw new ApiError(401, 'Refresh Token Not EXIST OR refresh token expired')
        }

        const options = {
            httpOnly: true,
            secure: process.env.NODE_ENV ==='production'
        }

        // 
        const {accessToken ,refreshToken : newRefreshToken} = generateAccessAndRefreshToken(user._id)

        return res
            .status(200)
            .cookie('accessToken',accessToken,options)
            .cookie('refreshToken',newRefreshToken,options)
            .json(new ApiError(
                201,
                {accessToken ,
                    refreshToken : newRefreshToken 
                },
                'Access Token refreshed Successfully'
            ))

    } catch (error) {
        throw new ApiError(500, 'Something went Wrong in refreshing token')
    }

})

const logoutUser = asyncHandler( async (req,res)=>{

    // we have to delete the refresh token from DB first!!!!
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshTokens: undefined,
            }
        },
        {new: true}
    )
    
    const options = {
        httpOnly:  true,
        secure : process.env.NODE_ENV ==='production'
    }

    return res 
        .status(200)
        .clearCookie("accessToken",options)
        .clearCookie("refreshToken",options)
        .json( new ApiError(
            200,
            {},
            "User Logged Out SuccessFully"
        ))
})

const changeCurrentPassowrd = asyncHandler( async (req,res)=> {
    const {oldPassword ,newPassword} = req.body

    const user = await User.findById(user?._id) // gets the user

    const isPasswordValid = await user.isPasswordCorrect(oldPassword) // check the password of the user

    if(!isPasswordValid){
        throw new ApiError(401, "The Old Password is invalid")
    }

    user.password = newPassword // update the password
    user.save({validateBeforeSave: false})

    return res  
        .status(200)
        .json(new ApiError(
            200,
            {},
            "The Password is change"
        ))
})


const getCurrentUser = asyncHandler( async (req,res)=> {
    return res
        .status(200)
        .json( new ApiError(
            200,
            req.user,
            "Current User details"
        ))
})

const updateAccountDetails = asyncHandler( async (req,res)=> {

    /*                                                  MY LOGIC 

    const {oldPassword, newUsername , newFullname} = req.body

    const user = await User.findById(user?._id);

    const isPasswordValid = await user.isPasswordCorrect(oldPassword);

    if(!isPasswordValid){
        throw new ApiError(400, "Incorrect Password")
    }

    user.username = newUsername
    user.fullname = newFullname

    user.save({validateBeforeSave: false})

    return res
        .status(200)
        .json(new ApiError(
            200,
            {},
            "The fields are updated"
        ))
    
    */

    const {fullname , email} = req.body

    if(!fullname || !email){
        throw new ApiError(402, "Fullname and email is required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname,
                email: email
            }
        },
        {new: true}
    ).select('-password -refreshTokens')

    return res
        .status(200)
        .json(new ApiError(
            200,
            user,
            "The fields are updated"
        ))


})

const changeUserAvatar = asyncHandler( async (req,res)=> {
    const avatarLocalPath = req.file?.path;

    if(!avatarLocalPath){
        throw new ApiError(401,"File is required")
    }

    const avatar = await uploadOnCloudianry(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(500,"Avatar file not uplaoded")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar : avatar.url
            }
        },
        {new: true}
    ).select('-password refreshTokens')

    return res
    .status(200)
    .json(new ApiError(
        200,
        user,
        "The fields are updated"
    ))

})

const changeUserCoverImage = asyncHandler( async (req,res)=> {
    const coverImageLocalPath = req.file?.path;

    if(!coverImageLocalPath){
        throw new ApiError(401, "File is Required")
    }

    const cover = await uploadOnCloudianry(coverImageLocalPath)

    if(!cover.url){
        throw new ApiError(401, "Cover Image Not Uploaded")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: cover.url
            }
        },
        {new: true}
    ).select('-password -refreshTokens')

    return res
    .status(200)
    .json(new ApiError(
        200,
        user,
        "The fields are updated"
    ))

})


const getUserChannelProfile =asyncHandler( async (req ,res) => {

    const {userName} = req.params;

    if(!userName.trim()){
        throw new ApiError(400, "User doesnt exist")
    }

    //  Aggregagation to get the data
    const channel = await User.aggregate(
        [
            {
                $match:{
                    username: userName?.toLowerCase()
                }
            },
            {
                $lookup: {
                    from: "subscription",
                    localField: "_id",
                    foreignField:"channel",
                    as: "subscribers"
                }
            },
            {
                $lookup:{
                    from: "subscription",
                    localField: "_id",
                    foreignField: "subscriber",
                    as: "subscribedTo"
                }
            },
            {
                $addFields:{
                    subscribersCount:{
                        $size: "$subscribers"
                    },
                    channelSubscribedToCount:{
                        $size: "$subscribedTo"
                    },
                    isSubscribed:{
                        $cond:{
                            $if: {$in:[req.user?._id, "$subscribers.subscriber"]},
                            then: true,
                            else: false,
                        },
                    }
                }
            },
            {
                // project necces
                $project:{
                    fullname:1,
                    username:1,
                    avatar:1,
                    coverImage:1,
                    email:1,
                    isSubscribed:1,
                    subscribersCount:1,
                    channelSubscribedToCount:1,
                }
            }
        ]
    )

    if(!channel?.length){
        throw new ApiError(400,"Channel Not Found")
    }


    return res
        .status(200)
        .json(new ApiResponse(
            200,
            channel[0],
            "Channel Profile fetched Successfully"
        ))
})


const getUserWatchHistory =asyncHandler( async (req ,res) => {
    
    const user = await User.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(req.user?._id)
            },
        },
        {
            $lookup:{
                from :"video",
                localField: "watchHistory",
                foreignField:"_id",
                as: "Watched -- History",

                pipeline: [
                    {
                        $lookup:{
                            from: "user",
                            localField: "owner",
                            foreignField: "_id",
                            as: "Owner",
                            pipeline: [
                                {
                                   $project:{
                                    fullname:1,
                                    username:1,
                                    avatar:1,
                                   } 
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $arrayElemAt : ["$owner",0]
                            }
                        }
                    }
                ]
            }
        },
    ])

    if(!user?.length){
        throw new ApiError(400,"No History Found")
    }

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            user[0]?.watchHistory,
            "Watch History fetched Successfully"
        ))
})


export { 
    registerUser,
    loginUser,
    refreshAccessToken,
    logoutUser,
    changeCurrentPassowrd,
    getCurrentUser,
    updateAccountDetails,
    changeUserAvatar,
    changeUserCoverImage,
    getUserWatchHistory,
    getUserChannelProfile,
}