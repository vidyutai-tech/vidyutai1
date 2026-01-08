const dbAdapter = require('../db-adapter');

class OptimizationResultsModel {
  /**
   * Create a new optimization result
   */
  static async create(result) {
    const id = result.id || `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return await dbAdapter.run(
      `INSERT INTO optimization_results (
        id, user_id, site_id, optimization_type, 
        input_parameters, summary, chart_data, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        id,
        result.user_id,
        result.site_id || null,
        result.optimization_type, // 'source' or 'demand'
        JSON.stringify(result.input_parameters),
        JSON.stringify(result.summary),
        JSON.stringify(result.chart_data)
      ]
    );
  }

  /**
   * Get all optimization results for a user
   */
  static async getByUserId(userId, options = {}) {
    const { optimizationType, limit = 50, offset = 0 } = options;
    
    let query = `
      SELECT * FROM optimization_results 
      WHERE user_id = ?
    `;
    const params = [userId];
    
    if (optimizationType) {
      query += ` AND optimization_type = ?`;
      params.push(optimizationType);
    }
    
    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    const results = await dbAdapter.all(query, params);
    
    // Parse JSON fields
    return results.map(row => ({
      ...row,
      input_parameters: JSON.parse(row.input_parameters || '{}'),
      summary: JSON.parse(row.summary || '{}'),
      chart_data: JSON.parse(row.chart_data || '{}')
    }));
  }

  /**
   * Get optimization results for a site
   */
  static async getBySiteId(siteId, options = {}) {
    const { optimizationType, limit = 50, offset = 0 } = options;
    
    let query = `
      SELECT * FROM optimization_results 
      WHERE site_id = ?
    `;
    const params = [siteId];
    
    if (optimizationType) {
      query += ` AND optimization_type = ?`;
      params.push(optimizationType);
    }
    
    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    const results = await dbAdapter.all(query, params);
    
    // Parse JSON fields
    return results.map(row => ({
      ...row,
      input_parameters: JSON.parse(row.input_parameters || '{}'),
      summary: JSON.parse(row.summary || '{}'),
      chart_data: JSON.parse(row.chart_data || '{}')
    }));
  }

  /**
   * Get a single optimization result by ID
   */
  static async getById(id) {
    const result = await dbAdapter.get(
      'SELECT * FROM optimization_results WHERE id = ?',
      [id]
    );
    
    if (!result) return null;
    
    // Parse JSON fields
    return {
      ...result,
      input_parameters: JSON.parse(result.input_parameters || '{}'),
      summary: JSON.parse(result.summary || '{}'),
      chart_data: JSON.parse(result.chart_data || '{}')
    };
  }

  /**
   * Get latest optimization result for a user
   */
  static async getLatestByUserId(userId, optimizationType = null) {
    let query = `
      SELECT * FROM optimization_results 
      WHERE user_id = ?
    `;
    const params = [userId];
    
    if (optimizationType) {
      query += ` AND optimization_type = ?`;
      params.push(optimizationType);
    }
    
    query += ` ORDER BY created_at DESC LIMIT 1`;
    
    const result = await dbAdapter.get(query, params);
    
    if (!result) return null;
    
    // Parse JSON fields
    return {
      ...result,
      input_parameters: JSON.parse(result.input_parameters || '{}'),
      summary: JSON.parse(result.summary || '{}'),
      chart_data: JSON.parse(result.chart_data || '{}')
    };
  }

  /**
   * Delete an optimization result
   */
  static async delete(id) {
    return await dbAdapter.run(
      'DELETE FROM optimization_results WHERE id = ?',
      [id]
    );
  }

  /**
   * Delete all results for a user
   */
  static async deleteByUserId(userId) {
    return await dbAdapter.run(
      'DELETE FROM optimization_results WHERE user_id = ?',
      [userId]
    );
  }

  /**
   * Count results for a user
   */
  static async countByUserId(userId, optimizationType = null) {
    let query = 'SELECT COUNT(*) as count FROM optimization_results WHERE user_id = ?';
    const params = [userId];
    
    if (optimizationType) {
      query += ` AND optimization_type = ?`;
      params.push(optimizationType);
    }
    
    const result = await dbAdapter.get(query, params);
    return result ? result.count : 0;
  }
}

module.exports = OptimizationResultsModel;

