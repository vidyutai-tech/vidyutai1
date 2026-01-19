/**
 * ChatbotConversation Schema
 */
const mongoose = require('mongoose');

const chatbotConversationSchema = new mongoose.Schema({
    user_id: { type: String, required: true, ref: 'User' },
    site_id: { type: String, ref: 'Site' },
    question: { type: String, required: true },
    answer: { type: String, required: true }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: false }
});

// Indexes
chatbotConversationSchema.index({ user_id: 1 });
chatbotConversationSchema.index({ site_id: 1 });

module.exports = mongoose.model('ChatbotConversation', chatbotConversationSchema);
