const dbAdapter = require('../db-adapter');

class UserProfileModel {
  static async findByUserId(userId) {
    const result = await dbAdapter.get(
      'SELECT * FROM user_profiles WHERE user_id = ?',
      [userId]
    );
    return result;
  }

  static async create(profile) {
    const result = await dbAdapter.run(
      `INSERT INTO user_profiles (id, user_id, site_type, workflow_preference)
       VALUES (?, ?, ?, ?)`,
      [
      profile.id,
      profile.user_id,
      profile.site_type || null,
      profile.workflow_preference || null
      ]
    );
    return result;
  }

  static async update(userId, updates) {
    const fields = [];
    const values = [];

    if (updates.site_type !== undefined) {
      fields.push('site_type = ?');
      values.push(updates.site_type);
    }
    if (updates.workflow_preference !== undefined) {
      fields.push('workflow_preference = ?');
      values.push(updates.workflow_preference);
    }

    if (fields.length === 0) {
      return { changes: 0 };
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(userId);

    const result = await dbAdapter.run(
      `UPDATE user_profiles 
      SET ${fields.join(', ')}
       WHERE user_id = ?`,
      values
    );
    return result;
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

