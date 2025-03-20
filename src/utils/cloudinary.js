import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs'

// configure the cloudinary
cloudinary.config({ 
    cloud_name:  process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY , 
    api_secret: process.env.CLOUDINARY_API_SECRET  
});

//  upload on cloudinary
const uploadOnCloudianry = async (localFilePath) => {
    try {
        const response = await cloudinary.uploader.upload(
            localFilePath,{
                resource_type: 'auto'
            }
        )
        
        console.log("File uploaded on cloudinary. the url is" + response.url);

        // once uplaoded delete from server to not keep the copy
        fs.unlinkSync(localFilePath);
        
    } catch (error) {
        // delete the file from the server
        fs.unlinkSync(localFilePath);
        return null;
    }
}