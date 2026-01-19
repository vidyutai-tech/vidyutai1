/**
 * OptimizationConfig Model - MongoDB/Mongoose version
 */
const OptimizationConfig = require('../schemas/OptimizationConfig');

class OptimizationConfigModel {
  static async findById(id) {
    return await OptimizationConfig.findById(id).lean();
  }

  static async findByUserId(userId) {
    return await OptimizationConfig.find({ user_id: userId })
      .sort({ created_at: -1 })
      .lean();
  }

  static async findBySiteId(siteId) {
    return await OptimizationConfig.find({ site_id: siteId })
      .sort({ created_at: -1 })
      .lean();
  }

  static async create(config) {
    const newConfig = new OptimizationConfig({
      _id: config.id,
      user_id: config.user_id,
      site_id: config.site_id || null,
      load_profile_id: config.load_profile_id || null,
      planning_recommendation_id: config.planning_recommendation_id || null,
      load_data: config.load_data,
      tariff_data: config.tariff_data,
      pv_parameters: config.pv_parameters || null,
      battery_parameters: config.battery_parameters || null,
      grid_parameters: config.grid_parameters || null,
      objective: config.objective || 'combination'
    });
    await newConfig.save();
    return { changes: 1 };
  }

  static async update(id, updates) {
    const updateFields = {};

    if (updates.load_data !== undefined) {
      updateFields.load_data = updates.load_data;
    }
    if (updates.tariff_data !== undefined) {
      updateFields.tariff_data = updates.tariff_data;
    }
    if (updates.pv_parameters !== undefined) {
      updateFields.pv_parameters = updates.pv_parameters;
    }
    if (updates.battery_parameters !== undefined) {
      updateFields.battery_parameters = updates.battery_parameters;
    }
    if (updates.grid_parameters !== undefined) {
      updateFields.grid_parameters = updates.grid_parameters;
    }
    if (updates.objective !== undefined) {
      updateFields.objective = updates.objective;
    }

    if (Object.keys(updateFields).length === 0) {
      return { changes: 0 };
    }

    const result = await OptimizationConfig.updateOne(
      { _id: id },
      { $set: updateFields }
    );
    return { changes: result.modifiedCount };
  }

  static async delete(id) {
    const result = await OptimizationConfig.deleteOne({ _id: id });
    return { changes: result.deletedCount };
  }
}

module.exports = OptimizationConfigModel;
