import "dotenv/config";
import { Queue, QueueEvents } from "bullmq";
import Redis from "ioredis";

const redisConnectionOptions = {
    maxRetriesPerRequest: null,
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    }
};

export const redisConnection = process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL, redisConnectionOptions)
    : new Redis({
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
        password: process.env.REDIS_PASSWORD || undefined,
        ...redisConnectionOptions
    });

redisConnection.on("connect", () => {
    console.log("Redis connected");
});
redisConnection.on("error", (err) => {
    console.error("Redis Connection error:", err.message);
});


export const dissolveGroupQueue = new Queue("dissolveGroup", {
    connection: redisConnection,
    defaultJobOptions: {
        removeOnComplete: {
            age: 24 * 60 * 60,  
            count: 100           
        },
        removeOnFail: {
            age: 7 * 24 * 60 * 60, 
        },
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 5000
        }
    }
});

export const dissolveGroupQueueEvents = new QueueEvents("dissolveGroup", {
    connection: redisConnection
});

dissolveGroupQueueEvents.on("completed", ({ jobId }) => {
    console.log("Dissolve group job completed:", jobId);
});
dissolveGroupQueueEvents.on("failed", ({ jobId, failedReason }) => {
    console.error("Dissolve group job failed:", jobId, failedReason);
});

export const scheduleGroupDissolution = async ({ eventGroupId, eventId, clubId, endsAt }) => {
    const now = Date.now();
    const delay = new Date(endsAt).getTime() - now;

    if(delay <= 0){
        console.warn(`Event ${eventId} already ended, dissolving group immediately`);
        const job = await dissolveGroupQueue.add(
            "dissolveGroup",
            { eventGroupId, eventId, clubId },
            { delay: 0 }
        );
        return job.id;
    }

    const job = await dissolveGroupQueue.add(
        "dissolveGroup",
        { eventGroupId, eventId, clubId },
        {
            delay,
            jobId: `dissolve-${eventId}`
        }
    );

    console.log(
        `Scheduled dissolution of group ${eventGroupId} for event ${eventId} in ${Math.round(delay / 1000)} seconds (job ID: ${job.id})`
    );

    return job.id;
};


export const cancelGroupDissolution = async (jobId) => {
    if(!jobId) return;
    try {
        const job = await dissolveGroupQueue.getJob(jobId);
        if(job){
            await job.remove();
            console.log(`Cancelled dissolution job ${jobId}`);
        }
    } catch (err) {
        console.error(`Error cancelling dissolution job ${jobId}:`, err.message);
    }
};

export const chatNotifyQueue = new Queue("chatNotify", {
    connection: redisConnection,
    defaultJobOptions: {
        removeOnComplete: { age: 24 * 60 * 60, count: 100 },
        removeOnFail: { age: 7 * 24 * 60 * 60 },
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 }
    }
})

export const scheduleGroupClosingWarning = async ({ eventGroupId, roomId, endsAt }) => {
    const warningTime = new Date(endsAt).getTime() - (24 * 60 * 60 * 1000); // 24 hours before end
    const now = Date.now();
    const delay = warningTime - now;

    if(delay <= 0){
        console.warn(`Event group ${eventGroupId} is closing within 24 hours, sending warning immediately`);
        return null;
    }

    const job = await chatNotifyQueue.add(
        "groupClosingWarning",
        {
            eventGroupId,
            roomType: "EventGroup",
            roomId,
            content: "This group will be dissolved in 24 hours as the event is ending."
        },
        {
            delay, jobId: `warning-${eventGroupId}`
        }
    )
    console.log(`Scheduled group closing warning for group ${eventGroupId} in ${Math.round(delay / 3600000)} hours (job ID: ${job.id})`);
    return job.id;
}

export const cancelGroupClosingWarning = async (jobId) => {
    if (!jobId) return;
    try {
        const job = await chatNotifyQueue.getJob(jobId);
        if(job){
            await job.remove();
            console.log(`Cancelled group closing warning job ${jobId}`);
        }
    } catch (error) {
        console.error(`Error cancelling group closing warning job ${jobId}:`, error.message);
    }
}
