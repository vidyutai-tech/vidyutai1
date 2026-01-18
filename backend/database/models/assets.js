/**
 * Asset Model - MongoDB/Mongoose version
 */
const Asset = require('../schemas/Asset');

class AssetModel {
  static async getAll() {
    return await Asset.find({}).sort({ created_at: -1 }).lean();
  }

  static async findById(id) {
    return await Asset.findById(id).lean();
  }

  static async findBySiteId(siteId) {
    return await Asset.find({ site_id: siteId }).sort({ name: 1 }).lean();
  }

  static async create(asset) {
    const newAsset = new Asset({
      _id: asset.id,
      site_id: asset.site_id,
      name: asset.name,
      type: asset.type,
      status: asset.status,
      health_score: asset.health_score || 100,
      manufacturer: asset.manufacturer,
      model: asset.model,
      capacity: asset.capacity,
      installed_date: asset.installed_date,
      last_maintenance: asset.last_maintenance
    });
    await newAsset.save();
    return { changes: 1 };
  }

  static async update(id, updates) {
    const result = await Asset.updateOne(
      { _id: id },
      { $set: updates }
    );
    return { changes: result.modifiedCount };
  }

  static async delete(id) {
    const result = await Asset.deleteOne({ _id: id });
    return { changes: result.deletedCount };
  }

  static async getDigitalTwinData(assetId) {
    const asset = await this.findById(assetId);

    if (!asset) return null;

    // Generate mock digital twin data points
    const dataPoints = [
      {
        label: 'Temperature',
        real_value: 78.5 + Math.random() * 5,
        predicted_value: 80,
        unit: '°C',
        x: 100,
        y: 50
      },
      {
        label: 'Vibration',
        real_value: 0.6 + Math.random() * 0.2,
        predicted_value: 0.5,
        unit: 'mm/s',
        x: 300,
        y: 50
      },
      {
        label: 'Efficiency',
        real_value: asset.health_score - 5 + Math.random() * 5,
        predicted_value: 94,
        unit: '%',
        x: 100,
        y: 150
      },
      {
        label: 'Power Output',
        real_value: (asset.capacity || 500) * (0.9 + Math.random() * 0.1),
        predicted_value: asset.capacity || 500,
        unit: 'kW',
        x: 300,
        y: 150
      }
    ];

    // Get anomalies from timeseries or predictions
    const anomalies = [];
    const now = Date.now();

    if (Math.random() > 0.3) {
      anomalies.push({
        id: '1',
        assetId,
        type: 'temperature_spike',
        severity: 'medium',
        timestamp: new Date(now - 15 * 60 * 1000).toISOString(),
        description: 'Temperature exceeded normal range by 8°C',
        value: 93.5,
        threshold: 85,
        confidence: 0.89
      });
    }

    if (Math.random() > 0.5) {
      anomalies.push({
        id: '2',
        assetId,
        type: 'efficiency_drop',
        severity: 'low',
        timestamp: new Date(now - 45 * 60 * 1000).toISOString(),
        description: 'Efficiency dropped below expected value',
        value: 82.3,
        threshold: 90,
        confidence: 0.76
      });
    }

    return { dataPoints, anomalies };
  }
}

module.exports = AssetModel;
