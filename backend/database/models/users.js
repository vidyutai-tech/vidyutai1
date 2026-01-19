/**
 * User Model - MongoDB/Mongoose version
 */
const User = require('../schemas/User');

class UserModel {
  static async findByEmail(email) {
    return await User.findOne({ email }).lean();
  }

  static async findById(id) {
    // Use findOne with _id to properly query by custom string IDs
    return await User.findOne({ _id: id }).lean();
  }

  static async getAll() {
    return await User.find({}, 'email name role created_at').lean();
  }

  static async create(user) {
    const newUser = new User({
      _id: user.id,
      email: user.email,
      password: user.password,
      name: user.name,
      role: user.role
    });
    await newUser.save();
    return { changes: 1 };
  }

  static async update(id, updates) {
    const result = await User.updateOne(
      { _id: id },
      { $set: updates }
    );
    return { changes: result.modifiedCount };
  }

  static async delete(id) {
    const result = await User.deleteOne({ _id: id });
    return { changes: result.deletedCount };
  }
}

module.exports = UserModel;
