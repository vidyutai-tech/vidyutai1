/**
 * MaintenanceRecord Schema
 */
const mongoose = require('mongoose');

const maintenanceRecordSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    asset_id: { type: String, required: true, ref: 'Asset' },
    maintenance_type: { type: String, required: true },
    description: { type: String },
    performed_by: { type: String },
    performed_at: { type: Date, required: true },
    next_scheduled: { type: Date },
    cost: { type: Number },
    status: {
        type: String,
        enum: ['scheduled', 'completed', 'cancelled']
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: false }
});

// Index
maintenanceRecordSchema.index({ asset_id: 1 });

module.exports = mongoose.model('MaintenanceRecord', maintenanceRecordSchema);
