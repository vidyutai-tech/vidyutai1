/**
 * Site Model - MongoDB/Mongoose version
 */
const Site = require('../schemas/Site');
const TimeseriesData = require('../schemas/TimeseriesData');
const Asset = require('../schemas/Asset');

class SiteModel {
  static async getAll() {
    return await Site.find({}).sort({ created_at: -1 }).lean();
  }

  static async findById(id) {
    return await Site.findById(id).lean();
  }

  static async create(site) {
    const newSite = new Site({
      _id: site.id,
      name: site.name,
      location: site.location,
      latitude: site.latitude,
      longitude: site.longitude,
      capacity: site.capacity,
      status: site.status,
      energy_saved: site.energy_saved || 0,
      cost_reduced: site.cost_reduced || 0
    });
    await newSite.save();
    return { changes: 1 };
  }

  static async update(id, updates) {
    const result = await Site.updateOne(
      { _id: id },
      { $set: updates }
    );
    return { changes: result.modifiedCount };
  }

  static async delete(id) {
    const result = await Site.deleteOne({ _id: id });
    return { changes: result.deletedCount };
  }

  static async getHealthStatus(siteId) {
    // Get assets health for this site
    const assets = await Asset.find({ site_id: siteId }, 'type health_score').lean();

    const healthStatus = {
      siteId,
      timestamp: new Date().toISOString(),
      site_health: 92 + Math.random() * 8,
      pv_health: 92 + Math.random() * 8,
      battery_soh: 88 + Math.random() * 10,
      battery_soc: 75 + Math.random() * 15,
      inverter_health: 95 + Math.random() * 5,
      ev_charger_health: 90 + Math.random() * 8,
      motor_health: 85 + Math.random() * 12,
      grid_draw: 150 + Math.random() * 100,
      pv_generation_today: 850 + Math.random() * 200,
      overall_health: 90 + Math.random() * 8
    };

    // Use actual asset health scores if available
    assets.forEach(asset => {
      if (asset.type === 'solar') healthStatus.pv_health = asset.health_score;
      if (asset.type === 'battery') healthStatus.battery_soh = asset.health_score;
      if (asset.type === 'inverter') healthStatus.inverter_health = asset.health_score;
      if (asset.type === 'ev_charger') healthStatus.ev_charger_health = asset.health_score;
      if (asset.type === 'motor') healthStatus.motor_health = asset.health_score;
    });

    return healthStatus;
  }

  static async getTimeseries(siteId, range = 'last_6h') {
    // Calculate time range
    const now = new Date();
    let hoursBack = 6;
    if (range === 'last_24h') hoursBack = 24;
    if (range === 'last_7d') hoursBack = 24 * 7;

    const startTime = new Date(now - hoursBack * 60 * 60 * 1000);

    // Query timeseries data from MongoDB
    const data = await TimeseriesData.find({
      site_id: siteId,
      timestamp: { $gte: startTime }
    }).sort({ timestamp: 1 }).lean();

    // Group by timestamp
    const grouped = {};
    data.forEach(row => {
      const ts = row.timestamp.toISOString();
      if (!grouped[ts]) {
        grouped[ts] = { timestamp: ts, metrics: {} };
      }
      grouped[ts].metrics[row.metric_type] = row.metric_value;
    });

    return Object.values(grouped);
  }
}

module.exports = SiteModel;
