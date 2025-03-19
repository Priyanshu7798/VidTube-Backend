import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";


const healthCheckup = asyncHandler( async (req , res) => {
    return res
            .status(200)
            .json(new ApiResponse(200, 'OK' ,'Health Check Passes'))
})

export {healthCheckup}