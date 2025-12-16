const dbAdapter = require('../db-adapter');

class LoadProfileModel {
  static async findById(id) {
    const result = await dbAdapter.get('SELECT * FROM load_profiles WHERE id = ?', [id]);
    if (result && result.appliances) {
      result.appliances = typeof result.appliances === 'string' ? JSON.parse(result.appliances) : result.appliances;
      result.category_totals = typeof result.category_totals === 'string' ? JSON.parse(result.category_totals) : result.category_totals;
    }
    return result;
  }

  static async findByUserId(userId) {
    const results = await dbAdapter.all('SELECT * FROM load_profiles WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    return results.map(r => ({
      ...r,
      appliances: typeof r.appliances === 'string' ? JSON.parse(r.appliances) : r.appliances,
      category_totals: typeof r.category_totals === 'string' ? JSON.parse(r.category_totals) : r.category_totals
    }));
  }

  static async findBySiteId(siteId) {
    const results = await dbAdapter.all('SELECT * FROM load_profiles WHERE site_id = ? ORDER BY created_at DESC', [siteId]);
    return results.map(r => ({
      ...r,
      appliances: typeof r.appliances === 'string' ? JSON.parse(r.appliances) : r.appliances,
      category_totals: typeof r.category_totals === 'string' ? JSON.parse(r.category_totals) : r.category_totals
    }));
  }

  static async create(profile) {
    const result = await dbAdapter.run(`
      INSERT INTO load_profiles (id, user_id, site_id, name, category_totals, total_daily_energy_kwh, appliances)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      profile.id,
      profile.user_id,
      profile.site_id || null,
      profile.name,
      JSON.stringify(profile.category_totals),
      profile.total_daily_energy_kwh,
      JSON.stringify(profile.appliances)
    ]);
    return result;
  }

  static async update(id, updates) {
    const fields = [];
    const values = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.category_totals !== undefined) {
      fields.push('category_totals = ?');
      values.push(JSON.stringify(updates.category_totals));
    }
    if (updates.total_daily_energy_kwh !== undefined) {
      fields.push('total_daily_energy_kwh = ?');
      values.push(updates.total_daily_energy_kwh);
    }
    if (updates.appliances !== undefined) {
      fields.push('appliances = ?');
      values.push(JSON.stringify(updates.appliances));
    }

    if (fields.length === 0) {
      return { changes: 0 };
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const result = await dbAdapter.run(`
      UPDATE load_profiles 
      SET ${fields.join(', ')}
      WHERE id = ?
    `, values);
    return result;
  }

  static async delete(id) {
    const result = await dbAdapter.run('DELETE FROM load_profiles WHERE id = ?', [id]);
    return result;
  }
}

module.exports = LoadProfileModel;

