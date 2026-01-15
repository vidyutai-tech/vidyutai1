const db = require('../db-adapter');

class OptimizationUploadsModel {
  static async create(upload) {
    const sql = `
      INSERT INTO optimization_uploads (
        id, user_id, site_id, file_name, mime_type, size_bytes, content_base64
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    return db.run(sql, [
      upload.id,
      upload.user_id,
      upload.site_id || null,
      upload.file_name,
      upload.mime_type || null,
      upload.size_bytes || null,
      upload.content_base64
    ]);
  }

  static async getByUserId(userId, siteId) {
    if (siteId) {
      return db.all(
        'SELECT id, user_id, site_id, file_name, mime_type, size_bytes, created_at FROM optimization_uploads WHERE user_id = ? AND site_id = ? ORDER BY created_at DESC',
        [userId, siteId]
      );
    }
    return db.all(
      'SELECT id, user_id, site_id, file_name, mime_type, size_bytes, created_at FROM optimization_uploads WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
  }

  static async getById(id) {
    return db.get('SELECT * FROM optimization_uploads WHERE id = ?', [id]);
  }
}

module.exports = OptimizationUploadsModel;
