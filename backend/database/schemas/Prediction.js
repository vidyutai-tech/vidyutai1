/**
 * Prediction Schema
 */
const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    site_id: { type: String, required: true, ref: 'Site' },
    asset_id: { type: String, ref: 'Asset' },
    prediction_type: { type: String, required: true },
    predicted_value: { type: Number },
    confidence: { type: Number },
    prediction_data: { type: mongoose.Schema.Types.Mixed }, // JSON object
    prediction_date: { type: Date, required: true }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: false }
});

// Indexes
predictionSchema.index({ site_id: 1 });
predictionSchema.index({ asset_id: 1 });
predictionSchema.index({ prediction_date: -1 });

module.exports = mongoose.model('Prediction', predictionSchema);
