import { databaseConnection } from "./database.js"
import { start } from "./server.js";
import express from 'express';
const app = express();

const init = async()=>{
    await databaseConnection();
    const chatChannel = await start(app);
    return chatChannel;
}



const chatChannel = await init();


export{chatChannel};