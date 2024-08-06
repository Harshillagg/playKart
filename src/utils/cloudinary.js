import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs';
import cloud from './cloudconfig.js';

cloudinary.config(
    cloud   //cloudinary credentials here
)

const uploadOnCloudinary = async (localfilepath) => {
    try {
        if (!localfilepath) return null

        //upload on cloudinary
        const response = await cloudinary.uploader.upload(localfilepath, {
            resource_type: 'auto',
          });

        fs.unlinkSync(localfilepath)
        return response;
    } catch (error) {
        // console.log("err:", error );
        fs.unlinkSync(localfilepath) //remove the locally saved temporary file as the upload operation got failed
        return null;
    }
}

const deleteOnCloudinary = async (publicId) => {
    try {
        const response = await cloudinary.uploader.destroy(publicId)
        return response
    } catch (error) {
        return null
    }
}

export{
    uploadOnCloudinary , 
    deleteOnCloudinary
}