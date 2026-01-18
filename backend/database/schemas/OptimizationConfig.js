/**
 * OptimizationConfig Schema
 */
const mongoose = require('mongoose');

const optimizationConfigSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    user_id: { type: String, required: true, ref: 'User' },
    site_id: { type: String, ref: 'Site' },
    load_profile_id: { type: String, ref: 'LoadProfile' },
    planning_recommendation_id: { type: String, ref: 'PlanningRecommendation' },
    load_data: { type: mongoose.Schema.Types.Mixed, required: true }, // JSON object
    tariff_data: { type: mongoose.Schema.Types.Mixed, required: true }, // JSON object
    pv_parameters: { type: mongoose.Schema.Types.Mixed }, // JSON object
    battery_parameters: { type: mongoose.Schema.Types.Mixed }, // JSON object
    grid_parameters: { type: mongoose.Schema.Types.Mixed }, // JSON object
    objective: {
        type: String,
        enum: ['cost', 'co2', 'combination'],
        default: 'combination'
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes
optimizationConfigSchema.index({ user_id: 1 });
optimizationConfigSchema.index({ site_id: 1 });

module.exports = mongoose.model('OptimizationConfig', optimizationConfigSchema);
