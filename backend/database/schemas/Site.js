/**
 * Site Schema
 */
const mongoose = require('mongoose');

const siteSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    name: { type: String, required: true },
    location: { type: String, required: true },
    latitude: { type: Number },
    longitude: { type: Number },
    capacity: { type: Number, required: true },
    status: {
        type: String,
        required: true,
        enum: ['online', 'offline', 'maintenance']
    },
    energy_saved: { type: Number, default: 0 },
    cost_reduced: { type: Number, default: 0 }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Index for status queries
siteSchema.index({ status: 1 });

module.exports = mongoose.model('Site', siteSchema);
