import { SystemConfig } from '../models/systemConfig.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const getConfigs = asyncHandler(async (req, res) => {
    const configs = await SystemConfig.find({});
    return res.status(200).json(new ApiResponse(200, configs, "System configurations retrieved"));
});

const updateConfig = asyncHandler(async (req, res) => {
    const { key, value } = req.body;
    
    if (!key) throw new ApiError(400, "Key is required");

    const config = await SystemConfig.findOneAndUpdate(
        { key },
        { value, updatedBy: req.user._id },
        { new: true, upsert: true }
    );

    return res.status(200).json(new ApiResponse(200, config, "Configuration updated successfully"));
});

const getConfigsAsObject = async () => {
    const configs = await SystemConfig.find({});
    return configs.reduce((acc, curr) => {
        acc[curr.key] = curr.value;
        return acc;
    }, {});
};

export { getConfigs, updateConfig, getConfigsAsObject };
