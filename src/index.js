import dotenv from 'dotenv'
import { app } from "./app.js"
import connectDB from './db/index.js';

dotenv.config({
    path: './.env'
})

const PORT = process.env.PORT ||7000;

connectDB()
    .then( ()=>{
        app.listen(PORT ,()=>{
            console.log(`the server is running at the port ${PORT}`)
        })
    })
    .catch((err)=>{
        console.log("MongoDb Not connected",err);
        
    })