import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from '../utils/ApiError.js'
import {User} from '../models/user.models.js'
import { uploadOnCloudianry ,deleteFromCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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

export { 
    registerUser
}