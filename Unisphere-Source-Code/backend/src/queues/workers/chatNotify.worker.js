import { Worker } from 'bullmq';
import { redisConnection } from '../queue.js';
import { EventGroup } from '../../models/eventGroup.model.js';

export const initChatNotifyWorker = () => {
    const processChatNotify = async (job) => {
        const { eventGroupId, roomType, roomId, content } = job.data;

        console.log(`Processing chat notification for group ${eventGroupId}, room ${roomType}:${roomId}`);

        const group = await EventGroup.findById(eventGroupId);
        if(!group){
            console.warn(`Event group ${eventGroupId} not found, skipping chat notification`);
            return;
        }
        if(group.status === "dissolved"){
            console.warn(`Event group ${eventGroupId} is dissolved, skipping chat notification`);
            return;
        }

        const { emitSystemMessage } = await import("../../sockets/chat.socket.js");
        
        await emitSystemMessage({ roomType, roomId, content });
        console.log(`Successfully emitted chat notification for group ${eventGroupId}, room ${roomType}:${roomId}`);
    }

    const worker = new Worker(
        "chatNotify",
        processChatNotify,
        {
            connection: redisConnection,
            concurrency: 2,
        }
    )

    worker.on("completed", (job) => {
        console.log(`Chat notification job ${job.id} completed successfully`);
    })
    worker.on("failed", (job, err) => {
        console.error(`Chat notification job ${job.id} failed:`, err);
    })
    worker.on("error", (err) => {
        console.error("Chat notify worker error:", err);
    })

    console.log("Chat notify worker initialized");
    return worker;
}