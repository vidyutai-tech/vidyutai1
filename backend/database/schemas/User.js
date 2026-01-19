/**
 * User Schema
 */
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    _id: { type: String, required: true }, // Using string ID for compatibility
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    role: {
        type: String,
        required: true,
        enum: ['admin', 'operator', 'viewer']
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Index for faster email lookups
userSchema.index({ email: 1 });

module.exports = mongoose.model('User', userSchema);
