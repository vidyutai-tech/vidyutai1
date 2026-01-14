const express = require('express');
const router = express.Router();
const UserModel = require('../database/models/users');
const UserProfileModel = require('../database/models/userProfiles');
const dbAdapter = require('../database/db-adapter');
const { getUserId } = require('./wizard');

/**
 * GDPR Compliance Routes
 * Implements user rights under GDPR:
 * - Right to Access (Article 15)
 * - Right to Data Portability (Article 20)
 * - Right to Erasure (Article 17)
 * - Right to Rectification (Article 16)
 */

// GET /api/v1/gdpr/my-data - Right to Access
// Returns all personal data associated with the user
router.get('/my-data', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User authentication required'
      });
    }

    // Collect all user data
    const user = await UserModel.findById(userId);
    const profile = await UserProfileModel.findByUserId(userId);
    
    // Get user's sites
    const sites = await dbAdapter.all(
      'SELECT * FROM sites WHERE id IN (SELECT site_id FROM user_sites WHERE user_id = ?)',
      [userId]
    );
    
    // Get user's load profiles
    const loadProfiles = await dbAdapter.all(
      'SELECT * FROM load_profiles WHERE user_id = ?',
      [userId]
    );
    
    // Get user's planning recommendations
    const planningRecs = await dbAdapter.all(
      'SELECT * FROM planning_recommendations WHERE user_id = ?',
      [userId]
    );
    
    // Get chatbot conversations
    const conversations = await dbAdapter.all(
      'SELECT * FROM chatbot_conversations WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    const userData = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        created_at: user.created_at,
        updated_at: user.updated_at
      },
      profile: profile || null,
      sites: sites || [],
      load_profiles: loadProfiles || [],
      planning_recommendations: planningRecs || [],
      chatbot_conversations: conversations || [],
      export_date: new Date().toISOString(),
      data_categories: [
        'Personal identification (email, name)',
        'User preferences (site type, workflow)',
        'Site and asset data',
        'Load profiles and energy consumption data',
        'Planning recommendations',
        'AI assistant conversation history'
      ]
    };

    res.json({
      success: true,
      data: userData,
      message: 'Your personal data export'
    });
  } catch (error) {
    console.error('Error exporting user data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export user data',
      message: error.message
    });
  }
});

// GET /api/v1/gdpr/export - Right to Data Portability
// Returns data in machine-readable format (JSON)
router.get('/export', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    // Get all user data (same as /my-data)
    const user = await UserModel.findById(userId);
    const profile = await UserProfileModel.findByUserId(userId);
    const loadProfiles = await dbAdapter.all(
      'SELECT * FROM load_profiles WHERE user_id = ?',
      [userId]
    );
    const planningRecs = await dbAdapter.all(
      'SELECT * FROM planning_recommendations WHERE user_id = ?',
      [userId]
    );
    const conversations = await dbAdapter.all(
      'SELECT * FROM chatbot_conversations WHERE user_id = ?',
      [userId]
    );

    const exportData = {
      format_version: '1.0',
      export_date: new Date().toISOString(),
      user_id: userId,
      personal_data: {
        account: {
          email: user.email,
          name: user.name,
          role: user.role,
          account_created: user.created_at
        },
        preferences: profile || {},
        load_profiles: loadProfiles || [],
        planning_data: planningRecs || [],
        conversations: conversations || []
      }
    };

    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="vidyutai-data-export-${userId}-${Date.now()}.json"`);
    
    res.json(exportData);
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export data',
      message: error.message
    });
  }
});

// DELETE /api/v1/gdpr/delete-account - Right to Erasure
// Deletes user account and all associated data
router.delete('/delete-account', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    // Confirm deletion (should be done via frontend confirmation)
    const { confirm } = req.body;
    if (confirm !== 'DELETE_MY_ACCOUNT') {
      return res.status(400).json({
        success: false,
        error: 'Confirmation required',
        message: 'Please confirm account deletion by sending confirm: "DELETE_MY_ACCOUNT"'
      });
    }

    // Delete user (CASCADE will handle related data)
    // But we should also explicitly clean up:
    
    // 1. Delete chatbot conversations
    await dbAdapter.run('DELETE FROM chatbot_conversations WHERE user_id = ?', [userId]);
    
    // 2. Delete load profiles
    await dbAdapter.run('DELETE FROM load_profiles WHERE user_id = ?', [userId]);
    
    // 3. Delete planning recommendations
    await dbAdapter.run('DELETE FROM planning_recommendations WHERE user_id = ?', [userId]);
    
    // 4. Delete user profile
    await dbAdapter.run('DELETE FROM user_profiles WHERE user_id = ?', [userId]);
    
    // 5. Delete user account (this should cascade to user_sites if that table exists)
    await UserModel.delete(userId);

    res.json({
      success: true,
      message: 'Your account and all associated data have been permanently deleted',
      deleted_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete account',
      message: error.message
    });
  }
});

// PUT /api/v1/gdpr/update-data - Right to Rectification
// Allows users to update their personal data
router.put('/update-data', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const { name, email } = req.body;
    const updates = {};

    if (name) updates.name = name;
    if (email) updates.email = email;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No updates provided',
        message: 'Please provide at least one field to update (name or email)'
      });
    }

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({
          success: false,
          error: 'Email already in use',
          message: 'This email is already registered to another account'
        });
      }
    }

    await UserModel.update(userId, updates);

    res.json({
      success: true,
      message: 'Your data has been updated',
      updated_fields: Object.keys(updates)
    });
  } catch (error) {
    console.error('Error updating user data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update data',
      message: error.message
    });
  }
});

module.exports = router;

