/**
 * UserProfile Model - MongoDB/Mongoose version
 */
const UserProfile = require('../schemas/UserProfile');

class UserProfileModel {
  static async findByUserId(userId) {
    return await UserProfile.findOne({ user_id: userId }).lean();
  }

  static async create(profile) {
    const newProfile = new UserProfile({
      _id: profile.id,
      user_id: profile.user_id,
      site_type: profile.site_type || null,
      workflow_preference: profile.workflow_preference || null
    });
    await newProfile.save();
    return { changes: 1 };
  }

  static async update(userId, updates) {
    const updateFields = {};

    if (updates.site_type !== undefined) {
      updateFields.site_type = updates.site_type;
    }
    if (updates.workflow_preference !== undefined) {
      updateFields.workflow_preference = updates.workflow_preference;
    }

    if (Object.keys(updateFields).length === 0) {
      return { changes: 0 };
    }

    const result = await UserProfile.updateOne(
      { user_id: userId },
      { $set: updateFields }
    );
    return { changes: result.modifiedCount };
  }

  static async upsert(profile) {
    const existing = await this.findByUserId(profile.user_id);
    if (existing) {
      return await this.update(profile.user_id, profile);
    } else {
      return await this.create(profile);
    }
  }
}

module.exports = UserProfileModel;
