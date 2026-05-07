import fs from 'fs';
import crypto from 'crypto';
import { Student } from '../models/student.model.js';
import { sendCredentialsMail } from '../utils/sendMail.js';
import { readCSV } from '../utils/readCSV.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const uploadStudents = asyncHandler( async (req, res) => {
    try {
        if(!req.file){
            throw new ApiError(400, 'No file uploaded');
        }

        const csvData = await readCSV(req.file.path);        
        const students = [];
        const errors = [];
        const duplicates = [];
        const inserted = [];
        const createdUsers = [];

        for(let user of csvData){
            if(!user.name || !user.email || !user.rollNo || !user.department){
                errors.push({data: user, error: 'Missing required fields'});
                continue;
            }
            const existingUser = await Student.findOne({
                $or: [{ email: user.email }, { rollNo: user.rollNo }]
            });
            if(existingUser){
                duplicates.push({
                    ...user,
                    reason: existingUser.email === user.email ? 'Email already exists' : 'Roll number already exists'
                });
                continue;
            }

            const password = crypto.randomBytes(8).toString('hex');
            const newUser = new Student({
                name: user.name,
                email: user.email,
                rollNo: user.rollNo,
                department: user.department,
                password: password,
                role: 'student',
                refreshToken: undefined
            })
            await newUser.save();
            inserted.push(newUser);
            createdUsers.push({
                name: user.name,
                email: user.email,
                rollNo: user.rollNo,
                department: user.department,
                tempPassword: password
            });
            
            try {
                await sendCredentialsMail({name: user.name, email: user.email, password: password, role: 'student'});
            } catch (error) {
                throw new ApiError(500, 'Failed to send credentials email.');
            }
        }

        fs.unlinkSync(req.file.path);

        return res.status(200).json(
            new ApiResponse(200, { insertedCount: inserted.length, duplicates, errors, createdUsers }, 'Students uploaded successfully')
        );
    } catch (error) {
        throw new ApiError(500, 'Failed to upload students');
    }
})
