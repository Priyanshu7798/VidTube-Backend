import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs'
import dotenv from 'dotenv'

dotenv.config()

// configure the cloudinary
cloudinary.config({ 
    cloud_name:  process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY , 
    api_secret: process.env.CLOUDINARY_API_SECRET  
});

//  upload on cloudinary
const uploadOnCloudianry = async (localFilePath) => {
    try {

        if (!localFilePath) return null

        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        
        // console.log("File uploaded on cloudinary. the url is" + response.url);

        // once uplaoded delete from server to not keep the copy
        fs.unlinkSync(localFilePath);
        return response;

    } catch (error) {
        // delete the file from the server
        // console.log("Error in cloudinary",error);
        
        fs.unlinkSync(localFilePath);
        return null;
    }
}

// delete from cloudinary

const deleteFromCloudinary = async (publicId) =>{
    try {
        const result = await cloudinary.uploader.destroy(publicId)
        console.log("The file is deleted from cloudinary",publicId)

    } catch (error) {
        console.log("error deleting from cloudinary" ,error)
        return null
    }
}

export {uploadOnCloudianry , deleteFromCloudinary}