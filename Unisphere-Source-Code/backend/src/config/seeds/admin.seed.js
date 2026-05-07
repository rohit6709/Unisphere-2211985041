import { Admin } from "../../models/admin.model.js";

const adminSeed = async () => {
    const existing = await Admin.findOne({ email : process.env.SUPERADMIN_EMAIL });

    if(existing){
        console.log("Superadmin already exist, skipping...");
        return;
    }


    await Admin.create({
        name: process.env.SUPERADMIN_NAME,
        email: process.env.SUPERADMIN_EMAIL,
        password: process.env.SUPERADMIN_PASSWORD,
        role: "superadmin",
        isFirstLogin: false,
        permissions:{
            manageStudents: true,
            manageFaculty: true,
            manageGroups: true,
            viewReports: true,
            manageAdmins: true,
        },
        createdBy: null
    })

    console.log("Superadmin seeded: ", process.env.SUPERADMIN_EMAIL);
}

export default adminSeed;