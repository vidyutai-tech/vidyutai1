const dbAdapter = require('../db-adapter');

class PlanningRecommendationModel {
  static async findById(id) {
    const result = await dbAdapter.get('SELECT * FROM planning_recommendations WHERE id = ?', [id]);
    if (result) {
      result.preferred_sources = typeof result.preferred_sources === 'string' ? JSON.parse(result.preferred_sources) : result.preferred_sources;
      // Handle both primary_goals (JSON array) and primary_goal (single value) for backward compatibility
      if (result.primary_goal) {
        try {
          result.primary_goal = typeof result.primary_goal === 'string' && result.primary_goal.startsWith('[') 
            ? JSON.parse(result.primary_goal) 
            : [result.primary_goal];
        } catch {
          result.primary_goal = [result.primary_goal];
        }
      }
      result.technical_sizing = typeof result.technical_sizing === 'string' ? JSON.parse(result.technical_sizing) : result.technical_sizing;
      result.economic_analysis = typeof result.economic_analysis === 'string' ? JSON.parse(result.economic_analysis) : result.economic_analysis;
      result.emissions_analysis = typeof result.emissions_analysis === 'string' ? JSON.parse(result.emissions_analysis) : result.emissions_analysis;
    }
    return result;
  }

  static async findByUserId(userId) {
    const results = await dbAdapter.all('SELECT * FROM planning_recommendations WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    return results.map(r => {
      // Handle both primary_goals (JSON array) and primary_goal (single value) for backward compatibility
      let primaryGoal = r.primary_goal;
      if (primaryGoal) {
        try {
          primaryGoal = typeof primaryGoal === 'string' && primaryGoal.startsWith('[') 
            ? JSON.parse(primaryGoal) 
            : [primaryGoal];
        } catch {
          primaryGoal = [primaryGoal];
        }
      }
      return {
        ...r,
        preferred_sources: typeof r.preferred_sources === 'string' ? JSON.parse(r.preferred_sources) : r.preferred_sources,
        primary_goal: primaryGoal,
        technical_sizing: typeof r.technical_sizing === 'string' ? JSON.parse(r.technical_sizing) : r.technical_sizing,
        economic_analysis: typeof r.economic_analysis === 'string' ? JSON.parse(r.economic_analysis) : r.economic_analysis,
        emissions_analysis: typeof r.emissions_analysis === 'string' ? JSON.parse(r.emissions_analysis) : r.emissions_analysis
      };
    });
  }

  static async findBySiteId(siteId) {
    const results = await dbAdapter.all('SELECT * FROM planning_recommendations WHERE site_id = ? ORDER BY created_at DESC', [siteId]);
    return results.map(r => {
      // Handle both primary_goals (JSON array) and primary_goal (single value) for backward compatibility
      let primaryGoal = r.primary_goal;
      if (primaryGoal) {
        try {
          primaryGoal = typeof primaryGoal === 'string' && primaryGoal.startsWith('[') 
            ? JSON.parse(primaryGoal) 
            : [primaryGoal];
        } catch {
          primaryGoal = [primaryGoal];
        }
      }
      return {
        ...r,
        preferred_sources: typeof r.preferred_sources === 'string' ? JSON.parse(r.preferred_sources) : r.preferred_sources,
        primary_goal: primaryGoal,
        technical_sizing: typeof r.technical_sizing === 'string' ? JSON.parse(r.technical_sizing) : r.technical_sizing,
        economic_analysis: typeof r.economic_analysis === 'string' ? JSON.parse(r.economic_analysis) : r.economic_analysis,
        emissions_analysis: typeof r.emissions_analysis === 'string' ? JSON.parse(r.emissions_analysis) : r.emissions_analysis
      };
    });
  }

  static async findByLoadProfileId(loadProfileId) {
    const results = await dbAdapter.all('SELECT * FROM planning_recommendations WHERE load_profile_id = ? ORDER BY created_at DESC', [loadProfileId]);
    return results.map(r => {
      // Handle both primary_goals (JSON array) and primary_goal (single value) for backward compatibility
      let primaryGoal = r.primary_goal;
      if (primaryGoal) {
        try {
          primaryGoal = typeof primaryGoal === 'string' && primaryGoal.startsWith('[') 
            ? JSON.parse(primaryGoal) 
            : [primaryGoal];
        } catch {
          primaryGoal = [primaryGoal];
        }
      }
      return {
        ...r,
        preferred_sources: typeof r.preferred_sources === 'string' ? JSON.parse(r.preferred_sources) : r.preferred_sources,
        primary_goal: primaryGoal,
        technical_sizing: typeof r.technical_sizing === 'string' ? JSON.parse(r.technical_sizing) : r.technical_sizing,
        economic_analysis: typeof r.economic_analysis === 'string' ? JSON.parse(r.economic_analysis) : r.economic_analysis,
        emissions_analysis: typeof r.emissions_analysis === 'string' ? JSON.parse(r.emissions_analysis) : r.emissions_analysis
      };
    });
  }

  static async create(recommendation) {
    try {
      console.log('📝 Creating planning recommendation:', {
        id: recommendation.id,
        user_id: recommendation.user_id,
        load_profile_id: recommendation.load_profile_id
      });
      
      // Support both primary_goals (array) and primary_goal (single) for backward compatibility
      const primaryGoals = recommendation.primary_goals || (recommendation.primary_goal ? [recommendation.primary_goal] : []);
      
      const result = await dbAdapter.run(`
      INSERT INTO planning_recommendations (
        id, user_id, site_id, load_profile_id, preferred_sources, primary_goal, 
        allow_diesel, technical_sizing, economic_analysis, emissions_analysis, 
        scenario_link, status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
      recommendation.id,
      recommendation.user_id,
      recommendation.site_id || null,
      recommendation.load_profile_id,
      JSON.stringify(recommendation.preferred_sources),
      JSON.stringify(primaryGoals), // Store as JSON array
      recommendation.allow_diesel ? 1 : 0,
      JSON.stringify(recommendation.technical_sizing),
      JSON.stringify(recommendation.economic_analysis),
      JSON.stringify(recommendation.emissions_analysis),
      recommendation.scenario_link || null,
      recommendation.status || 'draft'
      ]);
      
      console.log('✅ Planning recommendation created successfully:', {
        id: recommendation.id,
        changes: result.changes
      });
      
      return result;
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
    const fields = [];
    const values = [];

    if (updates.preferred_sources !== undefined) {
      fields.push('preferred_sources = ?');
      values.push(JSON.stringify(updates.preferred_sources));
    }
    if (updates.primary_goals !== undefined || updates.primary_goal !== undefined) {
      fields.push('primary_goal = ?');
      // Support both primary_goals (array) and primary_goal (single) for backward compatibility
      const goals = updates.primary_goals || (updates.primary_goal ? [updates.primary_goal] : []);
      values.push(JSON.stringify(goals));
    }
    if (updates.allow_diesel !== undefined) {
      fields.push('allow_diesel = ?');
      values.push(updates.allow_diesel ? 1 : 0);
    }
    if (updates.technical_sizing !== undefined) {
      fields.push('technical_sizing = ?');
      values.push(JSON.stringify(updates.technical_sizing));
    }
    if (updates.economic_analysis !== undefined) {
      fields.push('economic_analysis = ?');
      values.push(JSON.stringify(updates.economic_analysis));
    }
    if (updates.emissions_analysis !== undefined) {
      fields.push('emissions_analysis = ?');
      values.push(JSON.stringify(updates.emissions_analysis));
    }
    if (updates.scenario_link !== undefined) {
      fields.push('scenario_link = ?');
      values.push(updates.scenario_link);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }

    if (fields.length === 0) {
      return { changes: 0 };
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const result = await dbAdapter.run(`
      UPDATE planning_recommendations 
      SET ${fields.join(', ')}
      WHERE id = ?
    `, values);
    return result;
  }

  static async delete(id) {
    const result = await dbAdapter.run('DELETE FROM planning_recommendations WHERE id = ?', [id]);
    return result;
  }
}

module.exports = PlanningRecommendationModel;

