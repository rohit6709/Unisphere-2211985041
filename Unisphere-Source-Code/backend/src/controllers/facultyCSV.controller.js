import fs from 'fs';
import crypto from 'crypto';
import { Faculty } from '../models/faculty.model.js';
import { sendCredentialsMail } from '../utils/sendMail.js';
import { readCSV } from '../utils/readCSV.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const uploadFaculty = asyncHandler( async (req, res)=> {
    try {
        if(!req.file){
            throw new ApiError(400, 'No file uploaded');
        }

        const csvData = await readCSV(req.file.path);
        const faculty = [];
        const duplicates = [];
        const inserted = [];
        const errors = [];
        const createdUsers = [];

        for(let ft of csvData){
            if(!ft.name || !ft.email || !ft.employeeId ||!ft.department || !ft.designation){
                errors.push({data: ft, error: 'Missing required fields'});
                continue;
            }
            const existingFaculty = await Faculty.findOne({
                $or: [{ email: ft.email }, { employeeId: ft.employeeId }]
            });
            if(existingFaculty){
                duplicates.push({
                    ...ft,
                    reason: existingFaculty.email === ft.email ? 'Email already exists' : 'Employee ID already exists'
                });
                continue;
            }

            const password = crypto.randomBytes(8).toString('hex');
            const newFaculty = new Faculty ({
                name: ft.name,
                email: ft.email,
                employeeId: ft.employeeId,
                department: ft.department,
                designation: ft.designation,
                phone: ft.phone || null,
                password: password,
                role: 'faculty',
                isFirstLogin: true,
                refreshToken: undefined
            })

            await newFaculty.save();
            inserted.push(newFaculty);
            createdUsers.push({
                name: ft.name,
                email: ft.email,
                employeeId: ft.employeeId,
                department: ft.department,
                designation: ft.designation,
                tempPassword: password
            });

            try {
                await sendCredentialsMail({name: ft.name, email: ft.email, password: password, role: "faculty"});
            } catch (error) {
                throw new ApiError(400, "Failed to send credentials email.");
            }
        }
        fs.unlinkSync(req.file.path);
        return res.status(200).json(
            new ApiResponse(200, { insertedCount: inserted.length, duplicates, errors, createdUsers }, 'Faculty data uploaded successfully')
        );

    } catch (error) {
        throw new ApiError(500, 'Failed to upload faculty data');
    }
})
