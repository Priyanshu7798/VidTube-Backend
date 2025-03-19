import express from 'express'

import logger from "./logger.js";
import morgan from "morgan";
import cors from 'cors'
import healthCheckRouter from './routes/healthCheck.routes.js'

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

// routes handling

app.use('/api/v1/healthcheck',healthCheckRouter)
export {app}