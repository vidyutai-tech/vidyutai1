/**
 * EnergyFlow Schema
 */
const mongoose = require('mongoose');

const energyFlowSchema = new mongoose.Schema({
    site_id: { type: String, required: true, ref: 'Site' },
    timestamp: { type: Date, default: Date.now },
    from_component: { type: String, required: true },
    to_component: { type: String, required: true },
    power_kw: { type: Number, required: true },
    is_active: { type: Boolean, default: true }
});

// Index
energyFlowSchema.index({ site_id: 1 });

module.exports = mongoose.model('EnergyFlow', energyFlowSchema);
