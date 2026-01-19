/**
 * Alert Schema
 */
const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    site_id: { type: String, required: true, ref: 'Site' },
    asset_id: { type: String, ref: 'Asset' },
    severity: {
        type: String,
        required: true,
        enum: ['critical', 'high', 'medium', 'low']
    },
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    status: {
        type: String,
        required: true,
        enum: ['active', 'acknowledged', 'resolved'],
        default: 'active'
    },
    resolved_at: { type: Date }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes
alertSchema.index({ site_id: 1 });
alertSchema.index({ status: 1 });
alertSchema.index({ severity: 1 });
alertSchema.index({ created_at: -1 });

module.exports = mongoose.model('Alert', alertSchema);
