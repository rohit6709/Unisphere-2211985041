import dotenv from 'dotenv';
dotenv.config({
    path: './.env'
});
import http from 'http';
import connectDB from './config/db.js';
import app, { initEventCron } from './app.js';
import { initDissolveWorker } from './queues/workers/dissolve.worker.js';
import { initSocketServer } from './sockets/socket.js';
import { initChatNotifyWorker } from './queues/workers/chatNotify.worker.js';
import { initFirebaseAdmin } from './config/firebase.js';

const httpServer = http.createServer(app);


const startServer = async () => {
    try{
        await connectDB();
        console.log("Database connected");

        await initFirebaseAdmin();
        
        initSocketServer(httpServer);

        initDissolveWorker();
        initChatNotifyWorker();

        initEventCron();

        httpServer.listen(process.env.PORT || 5000, () => {
            console.log(`Server running on port ${process.env.PORT || 5000}`);
        })
    }
    catch(err){
        console.log("Failed to start server: ", err);
        process.exit(1);
    }
}

startServer();