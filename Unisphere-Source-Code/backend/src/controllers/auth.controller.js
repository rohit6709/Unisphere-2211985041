import { Admin } from '../models/admin.model.js';
import { Faculty } from '../models/faculty.model.js';
import { Student } from '../models/student.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const cookieOptions = {
  httpOnly: true,
  secure: true,
};

const USER_MODEL_CONFIG = [
  { model: Admin, label: 'admin' },
  { model: Faculty, label: 'faculty' },
  { model: Student, label: 'student' },
];

const findUserByEmail = async (email) => {
  const users = await Promise.all(
    USER_MODEL_CONFIG.map(async ({ model, label }) => {
      const user = await model.findOne({ email });
      return user ? { user, label, model } : null;
    })
  );

  const matches = users.filter(Boolean);

  if (!matches.length) {
    return null;
  }

  if (matches.length > 1) {
    throw new ApiError(409, 'Multiple accounts found with this email. Please contact support.');
  }

  return matches[0];
};

export const loginWithEmail = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const found = await findUserByEmail(normalizedEmail);

  if (!found) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const { user, model } = found;

  if (!user.isActive) {
    throw new ApiError(403, 'Account is deactivated. Please contact administrator.');
  }

  const isPasswordCorrect = await user.isPasswordCorrect(password);
  if (!isPasswordCorrect) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;
  if (Object.prototype.hasOwnProperty.call(user.toObject(), 'lastLogin')) {
    user.lastLogin = new Date();
  }
  await user.save({ validateBeforeSave: false });

  const safeUser = await model.findById(user._id).select('-password -refreshToken');

  return res
    .status(200)
    .cookie('accessToken', accessToken, cookieOptions)
    .cookie('refreshToken', refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        {
          user: safeUser,
          role: safeUser.role,
          accessToken,
          forcePasswordChange: Boolean(safeUser.isFirstLogin),
        },
        'User logged in successfully'
      )
    );
});
