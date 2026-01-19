/**
 * OptimizationResults Model - MongoDB/Mongoose version
 */
const OptimizationResult = require('../schemas/OptimizationResult');

class OptimizationResultsModel {
  /**
   * Create a new optimization result
   */
  static async create(result) {
    const id = result.id || `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newResult = new OptimizationResult({
      _id: id,
      user_id: result.user_id,
      site_id: result.site_id || null,
      optimization_type: result.optimization_type,
      input_parameters: result.input_parameters,
      summary: result.summary,
      chart_data: result.chart_data
    });

    await newResult.save();
    return { changes: 1 };
  }

  /**
   * Get all optimization results for a user
   */
  static async getByUserId(userId, options = {}) {
    const { optimizationType, limit = 50, offset = 0 } = options;

    const query = { user_id: userId };

    if (optimizationType) {
      query.optimization_type = optimizationType;
    }

    return await OptimizationResult.find(query)
      .sort({ created_at: -1 })
      .skip(offset)
      .limit(limit)
      .lean();
  }

  /**
   * Get optimization results for a site
   */
  static async getBySiteId(siteId, options = {}) {
    const { optimizationType, limit = 50, offset = 0 } = options;

    const query = { site_id: siteId };

    if (optimizationType) {
      query.optimization_type = optimizationType;
    }

    return await OptimizationResult.find(query)
      .sort({ created_at: -1 })
      .skip(offset)
      .limit(limit)
      .lean();
  }

  /**
   * Get a single optimization result by ID
   */
  static async getById(id) {
    return await OptimizationResult.findById(id).lean();
  }

  /**
   * Get latest optimization result for a user
   */
  static async getLatestByUserId(userId, optimizationType = null) {
    const query = { user_id: userId };

    if (optimizationType) {
      query.optimization_type = optimizationType;
    }

    return await OptimizationResult.findOne(query)
      .sort({ created_at: -1 })
      .lean();
  }

  /**
   * Delete an optimization result
   */
  static async delete(id) {
    const result = await OptimizationResult.deleteOne({ _id: id });
    return { changes: result.deletedCount };
  }

  /**
   * Delete all results for a user
   */
  static async deleteByUserId(userId) {
    const result = await OptimizationResult.deleteMany({ user_id: userId });
    return { changes: result.deletedCount };
  }

  /**
   * Count results for a user
   */
  static async countByUserId(userId, optimizationType = null) {
    const query = { user_id: userId };

    if (optimizationType) {
      query.optimization_type = optimizationType;
    }

    return await OptimizationResult.countDocuments(query);
  }
}

module.exports = OptimizationResultsModel;
