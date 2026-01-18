/**
 * TimeseriesData Schema
 */
const mongoose = require('mongoose');

const timeseriesDataSchema = new mongoose.Schema({
    site_id: { type: String, required: true, ref: 'Site' },
    asset_id: { type: String, ref: 'Asset' },
    timestamp: { type: Date, default: Date.now },
    metric_type: { type: String, required: true },
    metric_value: { type: Number, required: true },
    unit: { type: String }
});

// Indexes for faster timeseries queries
timeseriesDataSchema.index({ site_id: 1, timestamp: -1 });
timeseriesDataSchema.index({ asset_id: 1, timestamp: -1 });

module.exports = mongoose.model('TimeseriesData', timeseriesDataSchema);
