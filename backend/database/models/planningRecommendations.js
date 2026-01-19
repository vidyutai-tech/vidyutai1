/**
 * PlanningRecommendation Model - MongoDB/Mongoose version
 */
const PlanningRecommendation = require('../schemas/PlanningRecommendation');

class PlanningRecommendationModel {
  static async findById(id) {
    const result = await PlanningRecommendation.findById(id).lean();
    if (result) {
      // Ensure primary_goal is always an array for consistency
      if (result.primary_goal && !Array.isArray(result.primary_goal)) {
        result.primary_goal = [result.primary_goal];
      }
    }
    return result;
  }

  static async findByUserId(userId) {
    const results = await PlanningRecommendation.find({ user_id: userId })
      .sort({ created_at: -1 })
      .lean();
    return results.map(r => ({
      ...r,
      primary_goal: r.primary_goal && !Array.isArray(r.primary_goal) ? [r.primary_goal] : r.primary_goal
    }));
  }

  static async findBySiteId(siteId) {
    const results = await PlanningRecommendation.find({ site_id: siteId })
      .sort({ created_at: -1 })
      .lean();
    return results.map(r => ({
      ...r,
      primary_goal: r.primary_goal && !Array.isArray(r.primary_goal) ? [r.primary_goal] : r.primary_goal
    }));
  }

  static async findByLoadProfileId(loadProfileId) {
    const results = await PlanningRecommendation.find({ load_profile_id: loadProfileId })
      .sort({ created_at: -1 })
      .lean();
    return results.map(r => ({
      ...r,
      primary_goal: r.primary_goal && !Array.isArray(r.primary_goal) ? [r.primary_goal] : r.primary_goal
    }));
  }

  static async create(recommendation) {
    try {
      console.log('📝 Creating planning recommendation:', {
        id: recommendation.id,
        user_id: recommendation.user_id,
        load_profile_id: recommendation.load_profile_id
      });

      // Support both primary_goals (array) and primary_goal (single) for backward compatibility
      const primaryGoals = recommendation.primary_goals ||
        (recommendation.primary_goal ?
          (Array.isArray(recommendation.primary_goal) ? recommendation.primary_goal : [recommendation.primary_goal])
          : ['savings']);

      const newRecommendation = new PlanningRecommendation({
        _id: recommendation.id,
        user_id: recommendation.user_id,
        site_id: recommendation.site_id || null,
        load_profile_id: recommendation.load_profile_id,
        preferred_sources: recommendation.preferred_sources,
        primary_goal: primaryGoals,
        allow_diesel: !!recommendation.allow_diesel,
        technical_sizing: recommendation.technical_sizing,
        economic_analysis: recommendation.economic_analysis,
        emissions_analysis: recommendation.emissions_analysis,
        scenario_link: recommendation.scenario_link || null,
        status: recommendation.status || 'draft'
      });

      await newRecommendation.save();

      console.log('✅ Planning recommendation created successfully:', {
        id: recommendation.id
      });

      return { changes: 1 };
    } catch (error) {
      console.error('❌ Error creating planning recommendation:', error);
      console.error('Recommendation data:', {
        id: recommendation.id,
        user_id: recommendation.user_id,
        load_profile_id: recommendation.load_profile_id,
        has_technical_sizing: !!recommendation.technical_sizing,
        has_economic_analysis: !!recommendation.economic_analysis
      });
      throw error;
    }
  }

  static async update(id, updates) {
    const updateFields = {};

    if (updates.preferred_sources !== undefined) {
      updateFields.preferred_sources = updates.preferred_sources;
    }
    if (updates.primary_goals !== undefined || updates.primary_goal !== undefined) {
      const goals = updates.primary_goals ||
        (updates.primary_goal ?
          (Array.isArray(updates.primary_goal) ? updates.primary_goal : [updates.primary_goal])
          : null);
      if (goals) updateFields.primary_goal = goals;
    }
    if (updates.allow_diesel !== undefined) {
      updateFields.allow_diesel = !!updates.allow_diesel;
    }
    if (updates.technical_sizing !== undefined) {
      updateFields.technical_sizing = updates.technical_sizing;
    }
    if (updates.economic_analysis !== undefined) {
      updateFields.economic_analysis = updates.economic_analysis;
    }
    if (updates.emissions_analysis !== undefined) {
      updateFields.emissions_analysis = updates.emissions_analysis;
    }
    if (updates.scenario_link !== undefined) {
      updateFields.scenario_link = updates.scenario_link;
    }
    if (updates.status !== undefined) {
      updateFields.status = updates.status;
    }

    if (Object.keys(updateFields).length === 0) {
      return { changes: 0 };
    }

    const result = await PlanningRecommendation.updateOne(
      { _id: id },
      { $set: updateFields }
    );
    return { changes: result.modifiedCount };
  }

  static async delete(id) {
    const result = await PlanningRecommendation.deleteOne({ _id: id });
    return { changes: result.deletedCount };
  }
}

module.exports = PlanningRecommendationModel;
