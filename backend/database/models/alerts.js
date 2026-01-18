/**
 * Alert Model - MongoDB/Mongoose version
 */
const Alert = require('../schemas/Alert');

class AlertModel {
  static async getAll() {
    return await Alert.find({}).sort({ created_at: -1 }).lean();
  }

  static async findById(id) {
    return await Alert.findById(id).lean();
  }

  static async findBySiteId(siteId) {
    // Sort by severity priority, then by created_at desc
    const severityOrder = { critical: 1, high: 2, medium: 3, low: 4 };
    const alerts = await Alert.find({ site_id: siteId }).lean();

    return alerts.sort((a, b) => {
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }

  static async getActive() {
    const severityOrder = { critical: 1, high: 2, medium: 3, low: 4 };
    const alerts = await Alert.find({ status: 'active' }).lean();

    return alerts.sort((a, b) => {
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }

  static async create(alert) {
    const newAlert = new Alert({
      _id: alert.id,
      site_id: alert.site_id,
      asset_id: alert.asset_id,
      severity: alert.severity,
      type: alert.type,
      title: alert.title,
      message: alert.message,
      status: alert.status || 'active'
    });
    await newAlert.save();
    return { changes: 1 };
  }

  static async update(id, updates) {
    const result = await Alert.updateOne(
      { _id: id },
      { $set: updates }
    );
    return { changes: result.modifiedCount };
  }

  static async acknowledge(id) {
    const result = await Alert.updateOne(
      { _id: id },
      { $set: { status: 'acknowledged' } }
    );
    return { changes: result.modifiedCount };
  }

  static async resolve(id) {
    const result = await Alert.updateOne(
      { _id: id },
      { $set: { status: 'resolved', resolved_at: new Date() } }
    );
    return { changes: result.modifiedCount };
  }

  static async delete(id) {
    const result = await Alert.deleteOne({ _id: id });
    return { changes: result.deletedCount };
  }

  static async getStats() {
    const stats = await Alert.aggregate([
      {
        $match: { status: { $in: ['active', 'acknowledged'] } }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          critical: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
          high: { $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] } },
          medium: { $sum: { $cond: [{ $eq: ['$severity', 'medium'] }, 1, 0] } },
          low: { $sum: { $cond: [{ $eq: ['$severity', 'low'] }, 1, 0] } }
        }
      }
    ]);

    return stats[0] || { total: 0, active: 0, critical: 0, high: 0, medium: 0, low: 0 };
  }
}

module.exports = AlertModel;
