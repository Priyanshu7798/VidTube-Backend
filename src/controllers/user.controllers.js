import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from '../utils/ApiError.js'
import { User } from '../models/user.models.js'
import { uploadOnCloudianry ,deleteFromCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

// Generate tokens for Accessing user
const generateAccessAndRefreshToken = async (userId) =>{
    try {
        const user = await User.findById(userId)
    
        if(!user){
            throw new ApiError(400,'No User at this token');
        }
    
        const accessToken = user.generateAccessTokens();
        const refreshToken = user.generateRefreshTokens();
    
        user.refreshTokens = refreshToken
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
            .json( new ApiResponse(200,createdUser,"The User created Successfully"))
            
    } catch (error) {
        console.log('User creation failed')

        if(avatar){
            await deleteFromCloudinary(avatar.public_id)
        }
        if(coverImage){
            await deleteFromCloudinary(coverImage.public_id) 
        }
        throw new ApiError(500,'Something went wrong creating user and images were deleted')

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

export { 
    registerUser,
    loginUser,
    refreshAccessToken,
    logoutUser
}