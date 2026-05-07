import { Club } from '../models/club.model.js';
import { Student } from '../models/student.model.js';
import { Faculty } from '../models/faculty.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notificationService } from '../services/notificationService.js';
import { model } from 'mongoose';
import { INTEREST_CATEGORIES, CUSTOM_TAG_MAX_LENGTH, CUSTOM_TAG_MAX_COUNT } from '../constants/interests.js';

const resolveFaculty = async (employeeId) => {
    if(!employeeId){
        throw new ApiError(400, "Employee ID is required");
    }
    const faculty = await Faculty.findOne({ employeeId });
    if(!faculty){
        throw new ApiError(404, `No faculty found with employee Id: ${employeeId}`);
    }
    if(!faculty.isActive){
        throw new ApiError(403, "Faculty account is inactive");
    }
    return faculty;
}

const resolveStudent = async (rollNo) => {
    if(!rollNo){
        throw new ApiError(400, "Roll number is required");
    }
    const student = await Student.findOne({ rollNo });
    if(!student){
        throw new ApiError(404, `No student found with roll number: ${rollNo}`);
    }
    return student;
}

const verifyClubAdvisor = (club, userId) => {
    const isAdvisor = club.advisors.map(id => id.toString()).includes(userId.toString());
    if(!isAdvisor){
        throw new ApiError(403, 'You must be an advisor of this club to perform this action');
    }
}

const sanitizeCustomTag = (tag) => {
    if (typeof tag !== 'string') {
        return null;
    }

    const cleaned = tag
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9_\s]/g, '')
        .replace(/\s+/g, '_')
        .slice(0, CUSTOM_TAG_MAX_LENGTH);

    return cleaned.length > 0 ? cleaned : null;
};

const normalizeClubTags = (tags) => {
    const predefined = Array.isArray(tags?.predefined)
        ? tags.predefined.filter((tag) => INTEREST_CATEGORIES.includes(tag))
        : [];

    const custom = Array.isArray(tags?.custom)
        ? tags.custom
            .map(sanitizeCustomTag)
            .filter(Boolean)
            .filter((value, index, array) => array.indexOf(value) === index)
            .slice(0, CUSTOM_TAG_MAX_COUNT)
        : [];

    return { predefined, custom };
};

// Admin creates club directly with an advisor

const createClub = asyncHandler(async (req, res) => {
    const { name, description, department, advisorEmployeeId, logoUrl, bannerUrl } = req.body;
    const tags = normalizeClubTags(req.body.tags);
    if(!name){
        throw new ApiError(400, "Club name is required");
    }
    if(!advisorEmployeeId){
        throw new ApiError(400, "Advisor employee ID is required to create a club");
    }
    const advisor = await resolveFaculty(advisorEmployeeId);

    const existingClub = await Club.findOne({ name: name.trim() });
    if(existingClub){
        throw new ApiError(409, "A club with the same name already exists");
    }

    const newClub = new Club({
        name: name.trim(),
        description: description ? description.trim() : null,
        department: department ? department.trim() : null,
        logoUrl: logoUrl ? logoUrl.trim() : null,
        bannerUrl: bannerUrl ? bannerUrl.trim() : null,
        advisors: [advisor._id],
        status: "active",
        approvedBy: req.user._id,
        approvedAt: new Date(),
        tags,
    });
    await newClub.save();

    return res.status(201)
    .json(new ApiResponse(201, newClub, "Club created successfully"));
})

//Faculty/HOD: request a new club
const requestClub = asyncHandler(async (req, res) => {
    const { name, description, department, logoUrl, bannerUrl } = req.body;
    const tags = normalizeClubTags(req.body.tags);
    if(!name){
        throw new ApiError(400, "Club name is required");
    }
    if(!description){
        throw new ApiError(400, "Club description is required");
    }

    const normalizedName = name.trim();
    const existingClub = await Club.findOne({ name: normalizedName });
    if(existingClub){
        if (existingClub.status === 'rejected') {
            await Club.findByIdAndDelete(existingClub._id);
        } else {
            throw new ApiError(409, "A club with the same name already exists");
        }
    }
    const newClub = new Club({
        name: normalizedName,
        description: description.trim(),
        department: department ? department.trim() : null,
        logoUrl: logoUrl ? logoUrl.trim() : null,
        bannerUrl: bannerUrl ? bannerUrl.trim() : null,
        status: "pending",
        requestedBy: req.user._id,
        tags,
    });
    await newClub.save();

    return res.status(201)
    .json(new ApiResponse(201, newClub, "Club request submitted. Waiting for admin approval"));
})

//Admin: update club details
const updateClub = asyncHandler(async (req, res) => {
    const { clubId } = req.params;
    const allowedFields = ['name', 'description', 'department', 'logoUrl', 'bannerUrl'];

    const updates = {};
    for(const field of allowedFields){
        if(req.body[field] !== undefined){
            updates[field] = req.body[field];
        }
    }

    if(!Object.keys(updates).length){
        throw new ApiError(400, "No valid fields provided for update");
    }

    const club = await Club.findById(clubId);

    if(!club){
        throw new ApiError(404, "Club not found");
    }

    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    if(!isAdmin){
        verifyClubAdvisor(club, req.user._id);
    }

    if(updates.name){
        const existing = await Club.findOne({ name: updates.name.trim(), _id: { $ne: clubId } });
        if(existing){
            throw new ApiError(409, "Another club with the same name already exists");
        }
        updates.name = updates.name.trim();
    }
    if(updates.description){
        updates.description = updates.description.trim();
    }
    if(updates.department){
        updates.department = updates.department.trim();
    }
    if(updates.logoUrl){
        updates.logoUrl = updates.logoUrl.trim();
    }
    if(updates.bannerUrl){
        updates.bannerUrl = updates.bannerUrl.trim();
    }

    const updatedClub = await Club.findByIdAndUpdate(
        clubId,
        { $set: updates },
        { new: true, runValidators: true }
    ).populate('advisors', 'name email employeeId department')
    .populate('president', 'name email rollNo')
    .populate('vicePresident', 'name email rollNo');

    return res.status(200)
    .json(new ApiResponse(200, updatedClub, "Club details updated successfully"));
})

//Admin: review club requests (approve/reject)
const reviewClubRequest = asyncHandler(async (req, res) => {
    const { clubId } = req.params;
    const { action, rejectionReason, advisorEmployeeId } = req.body;

    if(!action || !["approve", "reject"].includes(action)){
        throw new ApiError(400, "Action must be either 'approve' or 'reject'");
    }

    const club = await Club.findById(clubId);
    if(!club){
        throw new ApiError(404, "Club not found");
    }
    if(club.status !== "pending"){
        throw new ApiError(400, `Club is already ${club.status}`);
    }

    if(action === "approve"){
        if (!club.advisors?.length) {
            if (!advisorEmployeeId) {
                throw new ApiError(400, "Advisor employee ID is required when approving a club request");
            }

            const advisor = await resolveFaculty(advisorEmployeeId);
            club.advisors = [advisor._id];
        }
        club.status = "active";
        club.approvedBy = req.user._id;
        club.approvedAt = new Date();
        club.rejectionReason = null;
    }
    else{
        if(!rejectionReason || rejectionReason.trim() === ""){
            throw new ApiError(400, "Rejection reason is required when rejecting a club request");
        }
    }

    if (action === 'approve') {
        await club.save();
    }

    if(club.requestedBy){
        if(action === "approve"){
            notificationService.notifyClubRequestApproved({
                clubName: club.name,
                recipients: [{ id: club.requestedBy, model: 'Faculty' }]
            }).catch(err => console.error("Failed to send club approval notification", err));
        }
        else{
            notificationService.notifyClubRequestRejected({
                clubName: club.name,
                reason: rejectionReason.trim(),
                recipients: [{ id: club.requestedBy, model: 'Faculty' }]
            }).catch(err => console.error("Failed to send club rejection notification", err));
        }
    }

    if (action === 'reject') {
        await Club.findByIdAndDelete(club._id);
    }

    return res.status(200)
    .json(new ApiResponse(200, null, `Club request ${action === "approve" ? "approved" : "rejected and removed"} successfully`));
})

//Faculty advisor: assign/revoke club president
const assignPresident = asyncHandler(async (req, res) => {
    const { clubId } = req.params;
    const { rollNo } = req.body;

    const student = await resolveStudent(rollNo);

    const club = await Club.findById(clubId);
    if(!club){
        throw new ApiError(404, "Club not found");
    }
    if(club.status !== 'active'){
        throw new ApiError(400, "Club is not active");
    }

    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    if(!isAdmin){
        verifyClubAdvisor(club, req.user._id);
    }
    if(club.vicePresident?.toString() === student._id.toString()){
        throw new ApiError(400, "Student is already vice president . Reassign before promoting to president");
    }

    if(club.president){
        await Student.findByIdAndUpdate(club.president, { role: 'student' });
    }

    club.president = student._id;
    if(!club.members.map(
        id => id.toString()).includes(student._id.toString())
    ){
        club.members.push(student._id);
    }
    await club.save();

    await Student.findByIdAndUpdate(student._id, { role: 'club_president', club: club._id });

    const updatedClub = await Club.findById(clubId)
    .populate("president", "name email rollNo")
    .populate("vicePresident", "name email rollNo")
    .populate("advisors", "name email employeeId");

    notificationService.notifyRoleAssigned({
        clubName: club.name,
        role: "President",
        recipients: [{ id: student._id, model: 'Student' }],
        data: { clubId: clubId.toString() }
    }).catch(err => console.error("Failed to send role assignment notification", err));

    return res.status(200)
    .json(new ApiResponse(200, updatedClub, "Club president assigned successfully"));
})

//Faculty advisor: assign/revoke club vice president
const assignVicePresident = asyncHandler(async (req, res) => {
    const { clubId } = req.params;
    const { rollNo } = req.body;

    const student = await resolveStudent(rollNo);

    const club = await Club.findById(clubId);
    if(!club){
        throw new ApiError(404, "Club not found");
    }
    if(club.status !== 'active'){
        throw new ApiError(400, "Club is not active");
    }

    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    if(!isAdmin){
        verifyClubAdvisor(club, req.user._id);
    }
    if(club.president?.toString() === student._id.toString()){
        throw new ApiError(400, "Student is already president . Reassign before demoting to vice president");
    }
    if(club.vicePresident){
        await Student.findByIdAndUpdate(club.vicePresident, { role: 'student' });
    }

    club.vicePresident = student._id;
    if(!club.members.map(
    id => id.toString()).includes(student._id.toString())
    ){
        club.members.push(student._id);
    }
    await club.save();

    await Student.findByIdAndUpdate(student._id, { role: 'club_vice_president', club: club._id });

    const updatedClub = await Club.findById(clubId)
    .populate("president", "name email rollNo")
    .populate("vicePresident", "name email rollNo")
    .populate("advisors", "name email employeeId");

    notificationService.notifyRoleAssigned({
        clubName: club.name,
        role: "Vice President",
        recipients: [{ id: student._id, model: 'Student' }],
        data: { clubId: clubId.toString() }
    }).catch(err => console.error("Failed to send role assignment notification", err));

    return res.status(200)
    .json(new ApiResponse(200, updatedClub, "Club vice president assigned successfully"));
})

//Admin: assign a faculty advisor
const assignAdvisor = asyncHandler(async (req, res) => {
    const { clubId } = req.params;
    const { employeeId } = req.body;

    const faculty = await resolveFaculty(employeeId);

    const club = await Club.findById(clubId);
    if(!club){
        throw new ApiError(404, "Club not found");
    }
    if(club.status !== 'active'){
        throw new ApiError(400, "Club is not active");
    }
    if(club.advisors.map(id => id.toString()).includes(faculty._id.toString())){
        throw new ApiError(400, "Faculty is already an advisor of this club");
    }

    club.advisors.push(faculty._id);
    await club.save();

    const updatedClub = await Club.findById(clubId)
    .populate('advisors', 'name email employeeId department');

    return res.status(200)
    .json(new ApiResponse(200, updatedClub, "Faculty advisor assigned successfully"));
})

//Admin: remove a faculty advisor
const removeAdvisor = asyncHandler(async (req, res) => {
    const { clubId } = req.params;
    const { employeeId } = req.body;

    if(!employeeId){
        throw new ApiError(400, "Employee ID is required");
    }
    const faculty = await Faculty.findOne({ employeeId });
    if(!faculty){
        throw new ApiError(404, `No faculty found with employee Id: ${employeeId}`);
    }

    const club = await Club.findById(clubId);
    if(!club){
        throw new ApiError(404, "Club not found");
    }

    const isLinked = club.advisors.map(id => id.toString()).includes(faculty._id.toString());

    if(!isLinked){
        throw new ApiError(400, "Faculty is not an advisor of this club");
    }

    if(club.advisors.length === 1){
        throw new ApiError(400, "Cannot remove the only advisor of the club. Assign another advisor before removing");
    }

    club.advisors = club.advisors.filter(id => id.toString() !== faculty._id.toString());
    await club.save();

    const updatedClub = await Club.findById(clubId)
    .populate('advisors', 'name email employeeId department');

    return res.status(200)
    .json(new ApiResponse(200, updatedClub, "Faculty advisor removed successfully"));
})

//Student: join a club
const joinClub = asyncHandler(async (req, res) => {
    const { clubId } = req.params;

    const club = await Club.findById(clubId);
    if(!club){
        throw new ApiError(404, "Club not found");
    }
    if(club.status !== 'active'){
        throw new ApiError(400, "Club is not active");
    }

    const alreadyMember = club.members.map(id => id.toString()).includes(req.user._id.toString());
    if(alreadyMember){
        throw new ApiError(400, 'You are already a member of this club');
    }
    club.members.push(req.user._id);
    await club.save();

    return res.status(200)
    .json(new ApiResponse(200, {}, "Joined club successfully"));
})

//Student: leave a club
const leaveClub = asyncHandler(async (req, res) => {
    const { clubId } = req.params;

    const club = await Club.findById(clubId);
    if(!club){
        throw new ApiError(404, "Club not found");
    }
    if(club.status !== 'active'){
        throw new ApiError(400, "Club is not active");
    }

    const isMember = club.members.map(id => id.toString()).includes(req.user._id.toString());
    if(!isMember){
        throw new ApiError(400, 'You are not a member of this club');
    }
    if(club.president?.toString() === req.user._id.toString()){
        throw new ApiError(400, "President cannot leave the club. Reassign president before leaving");
    }
    if(club.vicePresident?.toString() === req.user._id.toString()){
        throw new ApiError(400, "Vice president cannot leave the club. Reassign vice president before leaving");
    }

    club.members = club.members.filter(id => id.toString() !== req.user._id.toString());
    await club.save();

    return res.status(200)
    .json(new ApiResponse(200, {}, "Left club successfully"));
})

//Faculty advisor: remove a member
const removeMember = asyncHandler(async (req, res) => {
    const { clubId, rollNo } = req.params;

    const student = await resolveStudent(rollNo);

    const club = await Club.findById(clubId);
    if(!club){
        throw new ApiError(404, "Club not found");
    }
    if(club.status !== 'active'){
        throw new ApiError(400, "Club is not active");
    }
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    const isAdvisor = club.advisors.map(id => id.toString()).includes(req.user._id.toString());
    const isPresident = club.president?.toString() === req.user._id.toString();

    if(!isAdmin && !isAdvisor && !isPresident){
        throw new ApiError(403, 'Only club advisors, president or admins can remove members');
    }
    if(club.president?.toString() === student._id.toString()){
        throw new ApiError(400, "Cannot remove the president. Reassign president before removing");
    }
    if(club.vicePresident?.toString() === student._id.toString()){
        throw new ApiError(400, "Cannot remove the vice president. Reassign vice president before removing");
    }

    const isMember = club.members.map(id => id.toString()).includes(student._id.toString());
    if(!isMember){
        throw new ApiError(400, 'Student is not a member of this club');
    }
    club.members = club.members.filter(id => id.toString() !== student._id.toString());

    await club.save();

    notificationService.notifyMemberRemoved({
        clubName: club.name,
        recipients: [{ id: student._id, model: 'Student' }]
    }).catch(err => console.error("Failed to send member removal notification", err));

    return res.status(200)
    .json(new ApiResponse(200, {}, "Member removed from club successfully"));
})

//Admin, Faculty, Student: list all clubs
const getAllClubs = asyncHandler(async (req, res)=> {
    const { page = 1, limit = 10, status, department, search } = req.query;

    const filter = {};
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);

    // Enforce active status for non-admins
    if(!isAdmin) {
        filter.status = 'active';
    } else if(status) {
        filter.status = status;
    }

    if(department){
        filter.department = department;
    }
    if(search){
        filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
        ];
    }

    const skips = (Number(page) - 1) * Number(limit);

    const [clubs, total] = await Promise.all([
        Club.find(filter)
        .populate('president', 'name email rollNo')
        .populate('vicePresident', 'name email rollNo')
        .populate('advisors', 'name email employeeId department')
        .sort({ createdAt: -1 })
        .skip(skips)
        .limit(Number(limit)),
        Club.countDocuments(filter),
    ])
    return res.status(200)
    .json(new ApiResponse(200, {
        clubs,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
    }, "Clubs retrieved successfully"));

})

//Faculty advisor / Student: get a single club 
const getClub = asyncHandler(async (req, res) => {
    const { clubId } = req.params;
    const club = await Club.findById(clubId)
    .populate('president', 'name email rollNo department')
    .populate('vicePresident', 'name email rollNo department')
    .populate('advisors', 'name email employeeId department designation')
    .populate('members', 'name email rollNo department')
    .populate('approvedBy', 'name email')
    .populate('requestedBy', 'name email employeeId');

    if(!club){
        throw new ApiError(404, "Club not found");
    }

    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    const isAdvisor = club.advisors.some(a => a._id.toString() === req.user._id.toString());
    const isMember = club.members.some(m => m._id.toString() === req.user._id.toString());
    const isStudentRole = ['student', 'club_president', 'club_vice_president'].includes(req.user.role);

    if(!isAdmin && !isAdvisor && !isMember && !isStudentRole){
        throw new ApiError(403, "You do not have permission to view this club");
    }

    return res.status(200)
    .json(new ApiResponse(200, club, "Club details retrieved successfully"));
})

//Admin: get pending club requests
const getPendingClubs = asyncHandler(async (req, res) => {
    const clubs = await Club.find({ status: "pending" })
    .populate('requestedBy', 'name email employeeId department')
    .sort({ createdAt: -1 });

    return res.status(200)
    .json(new ApiResponse(200, clubs, "Pending club requests retrieved successfully"));
})

//Student: get their own clubs 
const getMyClubs = asyncHandler(async (req, res)=> {
    const clubs = await Club.find({ members: req.user._id })
    .populate('president', 'name email rollNo')
    .populate('advisors', 'name email employeeId department');

    return res.status(200)
    .json(new ApiResponse(200, { clubs }, "Your clubs retrieved successfully"));
});

//Faculty advisor: get their own clubs 
const getMyAdvisedClubs = asyncHandler(async (req, res)=> {
    const clubs = await Club.find({ advisors: req.user._id })
    .populate('president', 'name email rollNo')
    .populate('vicePresident', 'name email rollNo')
    .populate('advisors', 'name email employeeId department');

    return res.status(200)
    .json(new ApiResponse(200, { clubs }, "Your advised clubs retrieved successfully"));
});

//Faculty advisor / Admin: get members
const getClubMembers = asyncHandler(async (req, res) => {
    const { clubId } = req.params;
    const { page = 1, limit = 20, search } = req.query;

    const club = await Club.findById(clubId);
    if(!club){
        throw new ApiError(404, "Club not found");
    }

    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    if(!isAdmin){
        verifyClubAdvisor(club, req.user._id);
    }

    const memberFilter = { _id: { $in: club.members } };
    if(search){
        memberFilter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { rollNo: { $regex: search, $options: 'i' } },
        ]
    }
    const skip = (Number(page) -1) * Number(limit);

    const [members, total] = await Promise.all([
        Student.find(memberFilter)
        .select('name email rollNo department')
        .sort({ name: 1 })
        .skip(skip)
        .limit(Number(limit)),
        Student.countDocuments(memberFilter)
    ]);

    return res.status(200)
    .json(new ApiResponse(200, {
        clubId,
        totalMembers: club.members.length,
        members,
        pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / Number(limit))
        }
    }, "Club members retrieved successfully"));
})

//Admin: toggle club active/inactive
const toggleClubStatus = asyncHandler(async (req, res) => {
    const { clubId } = req.params;
    
    const club = await Club.findById(clubId);
    if(!club){
        throw new ApiError(404, "Club not found");
    }
    if(['pending', 'rejected'].includes(club.status)){
        throw new ApiError(400, `Cannot change status of a ${club.status} club`);
    }

    club.status = club.status === 'active' ? 'inactive' : 'active';
    await club.save();

    return res.status(200)
    .json(new ApiResponse(200, club, `Club ${club.status === 'active' ? 'activated' : 'deactivated'} successfully`));
})

export {
    createClub,
    requestClub,
    updateClub,
    reviewClubRequest,
    assignPresident,
    assignVicePresident,
    assignAdvisor,
    removeAdvisor,
    joinClub,
    leaveClub,
    removeMember,
    getAllClubs,
    getClub,
    getPendingClubs,
    getMyClubs,
    getMyAdvisedClubs,
    getClubMembers,
    toggleClubStatus
}
