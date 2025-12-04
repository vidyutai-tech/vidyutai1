const dbAdapter = require('../db-adapter');

class UserModel {
  static async findByEmail(email) {
    return await dbAdapter.get('SELECT * FROM users WHERE email = ?', [email]);
  }

  static async findById(id) {
    return await dbAdapter.get('SELECT * FROM users WHERE id = ?', [id]);
  }

  static async getAll() {
    return await dbAdapter.all('SELECT id, email, name, role, created_at FROM users');
  }

  static async create(user) {
    return await dbAdapter.run(
      `INSERT INTO users (id, email, password, name, role)
       VALUES (?, ?, ?, ?, ?)`,
      [user.id, user.email, user.password, user.name, user.role]
    );
  }

  static async update(id, updates) {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    return await dbAdapter.run(
      `UPDATE users SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [...values, id]
    );
  }

  static async delete(id) {
    return await dbAdapter.run('DELETE FROM users WHERE id = ?', [id]);
  }
}

module.exports = UserModel;

