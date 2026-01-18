/**
 * UserProfile Schema
 */
const mongoose = require('mongoose');

const userProfileSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    user_id: { type: String, required: true, unique: true, ref: 'User' },
    site_type: {
        type: String,
        enum: ['home', 'college', 'small_industry', 'large_industry', 'power_plant', 'other', null]
    },
    workflow_preference: {
        type: String,
        enum: ['plan_new', 'optimize_existing', null]
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Index
userProfileSchema.index({ user_id: 1 });

module.exports = mongoose.model('UserProfile', userProfileSchema);
