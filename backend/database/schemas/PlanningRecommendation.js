/**
 * PlanningRecommendation Schema
 */
const mongoose = require('mongoose');

const planningRecommendationSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    user_id: { type: String, required: true, ref: 'User' },
    site_id: { type: String, ref: 'Site' },
    load_profile_id: { type: String, required: true, ref: 'LoadProfile' },
    preferred_sources: { type: mongoose.Schema.Types.Mixed, required: true }, // JSON array
    primary_goal: { type: mongoose.Schema.Types.Mixed, required: true }, // Can be string or array
    allow_diesel: { type: Boolean, default: false },
    technical_sizing: { type: mongoose.Schema.Types.Mixed, required: true }, // JSON object
    economic_analysis: { type: mongoose.Schema.Types.Mixed, required: true }, // JSON object
    emissions_analysis: { type: mongoose.Schema.Types.Mixed, required: true }, // JSON object
    scenario_link: { type: String },
    status: {
        type: String,
        enum: ['draft', 'saved', 'applied'],
        default: 'draft'
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes
planningRecommendationSchema.index({ user_id: 1 });
planningRecommendationSchema.index({ site_id: 1 });
planningRecommendationSchema.index({ load_profile_id: 1 });

module.exports = mongoose.model('PlanningRecommendation', planningRecommendationSchema);
