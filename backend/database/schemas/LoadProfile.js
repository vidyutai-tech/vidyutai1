/**
 * LoadProfile Schema
 */
const mongoose = require('mongoose');

const loadProfileSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    user_id: { type: String, required: true, ref: 'User' },
    site_id: { type: String, ref: 'Site' },
    name: { type: String, required: true },
    category_totals: { type: mongoose.Schema.Types.Mixed, required: true }, // JSON object
    total_daily_energy_kwh: { type: Number, required: true },
    appliances: { type: mongoose.Schema.Types.Mixed, required: true } // JSON array
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes
loadProfileSchema.index({ user_id: 1 });
loadProfileSchema.index({ site_id: 1 });

module.exports = mongoose.model('LoadProfile', loadProfileSchema);
