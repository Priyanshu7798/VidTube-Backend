import express from 'express'
import cookieParser from 'cookie-parser'
import logger from "./logger.js";
import morgan from "morgan";
import cors from 'cors'

const app = express();

const morganFormat = ":method :url :status :response-time ms";
app.use(
    morgan(morganFormat, {
        stream: {
            write: (message) => {
                const logObject = {
                    method: message.split(" ")[0],
                    url: message.split(" ")[1],
                    status: message.split(" ")[2],
                    responseTime: message.split(" ")[3],
                };
                logger.info(JSON.stringify(logObject));
            },
        },
    })
);

app.use(
    cors({
        origin: process.env.CORS_ORIGIN,
        credentials: true
    })
)

// express common middlewares

app.use(express.json({limit:'16kb'})) // it defines the memory
app.use(express.urlencoded({extended:true , limit: '16kb'}))
app.use(express.static('public'))
app.use(cookieParser())

// route import
import healthCheckRouter from './routes/healthCheck.routes.js'
import userRouter from './routes/user.routes.js'
import { errorHandler } from './middlewares/error.middleware.js';


// routes handling
app.use('/api/v1/healthcheck',healthCheckRouter)
app.use('/api/v1/users',userRouter)


app.use(errorHandler)
export {app}