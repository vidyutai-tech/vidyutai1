/**
 * SystemSetting Schema
 */
const mongoose = require('mongoose');

const systemSettingSchema = new mongoose.Schema({
    _id: { type: String, required: true }, // key field
    value: { type: String, required: true },
    description: { type: String }
}, {
    timestamps: { createdAt: false, updatedAt: 'updated_at' }
});

module.exports = mongoose.model('SystemSetting', systemSettingSchema);
