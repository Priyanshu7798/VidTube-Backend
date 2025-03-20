import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from '../utils/ApiError.js'

const registerUser = asyncHandler( async (req, res) => {
    // will do it now
    const {fullName , email,username ,password } = req.body

    // vaildation

    if( [fullName ,username ,email, password].some((field)=> field.trim()==="") ){
        throw new ApiError(400,'Check All the Field')
    }
})

export {
    registerUser
}