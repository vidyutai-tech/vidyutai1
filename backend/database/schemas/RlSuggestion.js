/**
 * RlSuggestion Schema (Reinforcement Learning)
 */
const mongoose = require('mongoose');

const rlSuggestionSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    site_id: { type: String, required: true, ref: 'Site' },
    suggestion_type: { type: String, required: true },
    current_config: { type: mongoose.Schema.Types.Mixed }, // JSON object
    suggested_config: { type: mongoose.Schema.Types.Mixed }, // JSON object
    expected_savings: { type: Number },
    confidence: { type: Number },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'expired']
    },
    expires_at: { type: Date },
    applied_at: { type: Date }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: false }
});

// Index
rlSuggestionSchema.index({ site_id: 1 });

module.exports = mongoose.model('RlSuggestion', rlSuggestionSchema);
