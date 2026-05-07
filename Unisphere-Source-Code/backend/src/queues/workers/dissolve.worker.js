import { Worker } from "bullmq";
import { redisConnection } from "../queue.js";
import { EventGroup } from "../../models/eventGroup.model.js";
import { ApprovalLog } from "../../models/approvalLog.model.js";

export const processDissolveGroup = async (job) => {
    const { eventGroupId, eventId, clubId } = job.data;
    console.log(`Processing dissolution of group ${eventGroupId} for event ${eventId}`);
    
        const group = await EventGroup.findById(eventGroupId);
        if(!group){
            console.warn(`Event group ${eventGroupId} not found, skipping dissolution`);
            return;
        }

        if(group.status === "dissolved"){
            console.warn(`Event group ${eventGroupId} is already dissolved, skipping dissolution`);
            return;
        }

        group.status = "dissolved";
        group.dissolvedAt = new Date();
        group.dissolveJobId = null;
        await group.save();
    
        try {
            await ApprovalLog.create({
                event: eventId,
                club: clubId,
                action: "auto_archived",
                performedBy: null,
                performedByModel: null,
                fromStatus: "live",
                toStatus: "completed",
                metadata: {
                    eventGroupId,
                    dissolvedAt: group.dissolvedAt,
                    memberCount: group.members.length
                }
            });
             console.log(`Logged dissolution of group ${eventGroupId} for event ${eventId} in approval log`);
                }
        catch (error) {
            console.error(`Error occurred while logging dissolution of group ${eventGroupId} for event ${eventId}:`, error);
        }

        console.log(`Successfully dissolved group ${eventGroupId} for event ${eventId}`);
}

export const initDissolveWorker = () => {
    const worker  = new Worker(
        "dissolveGroup",
        processDissolveGroup,
        {
            connection: redisConnection,
            concurrency: 1,
        }
    )

    worker.on("completed", (job) => {
        console.log(`Dissolve group job ${job.id} completed successfully`);
    })

    worker.on("failed", (job, err) => {
        console.error(`Dissolve group job ${job.id} failed:`, err);
    })

    worker.on("error", (err) => {
        console.error("Error in dissolve group worker:", err.message);
    })

    console.log("Dissolve group worker initialized and listening for jobs");
    
    return worker;
}