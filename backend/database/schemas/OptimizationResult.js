/**
 * OptimizationResult Schema
 */
const mongoose = require('mongoose');

const optimizationResultSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    user_id: { type: String, required: true, ref: 'User' },
    site_id: { type: String, ref: 'Site' },
    optimization_type: {
        type: String,
        required: true,
        enum: ['source', 'demand']
    },
    input_parameters: { type: mongoose.Schema.Types.Mixed, required: true }, // JSON object
    summary: { type: mongoose.Schema.Types.Mixed, required: true }, // JSON object
    chart_data: { type: mongoose.Schema.Types.Mixed, required: true } // JSON object
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes
optimizationResultSchema.index({ user_id: 1 });
optimizationResultSchema.index({ site_id: 1 });
optimizationResultSchema.index({ optimization_type: 1 });
optimizationResultSchema.index({ created_at: -1 });

module.exports = mongoose.model('OptimizationResult', optimizationResultSchema);
