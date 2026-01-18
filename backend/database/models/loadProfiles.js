/**
 * LoadProfile Model - MongoDB/Mongoose version
 */
const LoadProfile = require('../schemas/LoadProfile');

class LoadProfileModel {
  static async findById(id) {
    return await LoadProfile.findById(id).lean();
  }

  static async findByUserId(userId) {
    return await LoadProfile.find({ user_id: userId })
      .sort({ created_at: -1 })
      .lean();
  }

  static async findBySiteId(siteId) {
    return await LoadProfile.find({ site_id: siteId })
      .sort({ created_at: -1 })
      .lean();
  }

  static async create(profile) {
    const newProfile = new LoadProfile({
      _id: profile.id,
      user_id: profile.user_id,
      site_id: profile.site_id || null,
      name: profile.name,
      category_totals: profile.category_totals,
      total_daily_energy_kwh: profile.total_daily_energy_kwh,
      appliances: profile.appliances
    });
    await newProfile.save();
    return { changes: 1 };
  }

  static async update(id, updates) {
    const updateFields = {};

    if (updates.name !== undefined) {
      updateFields.name = updates.name;
    }
    if (updates.category_totals !== undefined) {
      updateFields.category_totals = updates.category_totals;
    }
    if (updates.total_daily_energy_kwh !== undefined) {
      updateFields.total_daily_energy_kwh = updates.total_daily_energy_kwh;
    }
    if (updates.appliances !== undefined) {
      updateFields.appliances = updates.appliances;
    }

    if (Object.keys(updateFields).length === 0) {
      return { changes: 0 };
    }

    const result = await LoadProfile.updateOne(
      { _id: id },
      { $set: updateFields }
    );
    return { changes: result.modifiedCount };
  }

  static async delete(id) {
    const result = await LoadProfile.deleteOne({ _id: id });
    return { changes: result.deletedCount };
  }
}

module.exports = LoadProfileModel;
