/**
 * Asset Schema
 */
const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    site_id: { type: String, required: true, ref: 'Site' },
    name: { type: String, required: true },
    type: {
        type: String,
        required: true,
        enum: ['solar', 'battery', 'inverter', 'meter', 'transformer', 'ev_charger', 'motor']
    },
    status: {
        type: String,
        required: true,
        enum: ['online', 'offline', 'maintenance', 'warning', 'error']
    },
    health_score: { type: Number, default: 100 },
    manufacturer: { type: String },
    model: { type: String },
    capacity: { type: Number },
    installed_date: { type: Date },
    last_maintenance: { type: Date }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes
assetSchema.index({ site_id: 1 });
assetSchema.index({ type: 1 });
assetSchema.index({ status: 1 });

module.exports = mongoose.model('Asset', assetSchema);
