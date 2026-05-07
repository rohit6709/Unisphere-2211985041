import mongoose from "mongoose";
import dotenv from 'dotenv';
import adminSeed from "./admin.seed.js";

dotenv.config();

const SEEDS = {
    admin: adminSeed, // add more seeds here as needed
}

const runSeeds = async () => {
    let hasError = false;
    try{
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB, running seeds...");

        const target = process.argv[2] || 'admin';
        if(target){
            if(!SEEDS[target]){
                console.error(`Unknown seed target: ${target}`);
                console.log(`Available seeds: ${Object.keys(SEEDS).join(', ')}`);
                process.exit(1);
            }
            console.log(`Running seed: ${target}`);
            await SEEDS[target]();
        }
        else{
            for(const [name, seed] of Object.entries(SEEDS)){
                console.log(`Running seed: ${name}`);
                await seed();
            }
        }
        console.log("All seeds completed successfully");
    }
    catch(error){
        console.error("Error running seeds: ", error.message);
        hasError = true;
    }
    finally{
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB, exiting...");
        process.exit(hasError ? 1 : 0);
    }
}

runSeeds();