/**
 * Mongoose Schemas Index
 * Exports all schemas for easy importing
 */

module.exports = {
    User: require('./User'),
    Site: require('./Site'),
    Asset: require('./Asset'),
    Alert: require('./Alert'),
    TimeseriesData: require('./TimeseriesData'),
    Prediction: require('./Prediction'),
    MaintenanceRecord: require('./MaintenanceRecord'),
    EnergyFlow: require('./EnergyFlow'),
    RlSuggestion: require('./RlSuggestion'),
    SimulationResult: require('./SimulationResult'),
    ChatbotConversation: require('./ChatbotConversation'),
    SystemSetting: require('./SystemSetting'),
    UserProfile: require('./UserProfile'),
    LoadProfile: require('./LoadProfile'),
    PlanningRecommendation: require('./PlanningRecommendation'),
    OptimizationConfig: require('./OptimizationConfig'),
    OptimizationResult: require('./OptimizationResult')
};
