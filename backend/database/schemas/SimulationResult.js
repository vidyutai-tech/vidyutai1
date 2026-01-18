/**
 * SimulationResult Schema
 */
const mongoose = require('mongoose');

const simulationResultSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    site_id: { type: String, required: true, ref: 'Site' },
    simulation_type: { type: String, required: true },
    parameters: { type: mongoose.Schema.Types.Mixed, required: true }, // JSON object
    results: { type: mongoose.Schema.Types.Mixed, required: true } // JSON object
}, {
    timestamps: { createdAt: 'created_at', updatedAt: false }
});

// Index
simulationResultSchema.index({ site_id: 1 });

module.exports = mongoose.model('SimulationResult', simulationResultSchema);
