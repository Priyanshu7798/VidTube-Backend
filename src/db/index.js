import mongoose from 'mongoose';
import { DB_NAME } from '../constants.js';

const connectDB = async ()=>{
    try {
        const session = await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)

        console.log(`\n MongoDB connected ! DB host : ${session.connection.host}`);
        
    } catch (error) {
        console.log("There is a error", error)
        process.exit(1);
    }
}

export default connectDB