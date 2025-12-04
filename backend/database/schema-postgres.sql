-- VidyutAI Database Schema
-- PostgreSQL Database Schema for the entire application

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK(role IN ('admin', 'operator', 'viewer')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sites table
CREATE TABLE IF NOT EXISTS sites (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    capacity DOUBLE PRECISION NOT NULL,
    status VARCHAR(50) NOT NULL CHECK(status IN ('online', 'offline', 'maintenance')),
    energy_saved DOUBLE PRECISION DEFAULT 0,
    cost_reduced DOUBLE PRECISION DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Assets table
CREATE TABLE IF NOT EXISTS assets (
    id VARCHAR(255) PRIMARY KEY,
    site_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK(type IN ('solar', 'battery', 'inverter', 'meter', 'transformer', 'ev_charger', 'motor')),
    status VARCHAR(50) NOT NULL CHECK(status IN ('online', 'offline', 'maintenance', 'warning', 'error')),
    health_score DOUBLE PRECISION DEFAULT 100,
    manufacturer VARCHAR(255),
    model VARCHAR(255),
    capacity DOUBLE PRECISION,
    installed_date DATE,
    last_maintenance DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
    id VARCHAR(255) PRIMARY KEY,
    site_id VARCHAR(255) NOT NULL,
    asset_id VARCHAR(255),
    severity VARCHAR(50) NOT NULL CHECK(severity IN ('critical', 'high', 'medium', 'low')),
    type VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(50) NOT NULL CHECK(status IN ('active', 'acknowledged', 'resolved')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE SET NULL
);

-- Timeseries data table (for metrics like voltage, current, power, etc.)
CREATE TABLE IF NOT EXISTS timeseries_data (
    id SERIAL PRIMARY KEY,
    site_id VARCHAR(255) NOT NULL,
    asset_id VARCHAR(255),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metric_type VARCHAR(255) NOT NULL,
    metric_value DOUBLE PRECISION NOT NULL,
    unit VARCHAR(50),
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
);

-- Create index for faster timeseries queries
CREATE INDEX IF NOT EXISTS idx_timeseries_site_time ON timeseries_data(site_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_timeseries_asset_time ON timeseries_data(asset_id, timestamp DESC);

-- Predictions table
CREATE TABLE IF NOT EXISTS predictions (
    id VARCHAR(255) PRIMARY KEY,
    site_id VARCHAR(255) NOT NULL,
    asset_id VARCHAR(255),
    prediction_type VARCHAR(255) NOT NULL,
    predicted_value DOUBLE PRECISION,
    confidence DOUBLE PRECISION,
    prediction_data TEXT, -- JSON string for complex predictions
    prediction_date TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
);

-- Maintenance records table
CREATE TABLE IF NOT EXISTS maintenance_records (
    id VARCHAR(255) PRIMARY KEY,
    asset_id VARCHAR(255) NOT NULL,
    maintenance_type VARCHAR(255) NOT NULL,
    description TEXT,
    performed_by VARCHAR(255),
    performed_at TIMESTAMP NOT NULL,
    next_scheduled DATE,
    cost DOUBLE PRECISION,
    status VARCHAR(50) CHECK(status IN ('scheduled', 'completed', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
);

-- Energy flow data (for power flow visualization)
CREATE TABLE IF NOT EXISTS energy_flows (
    id SERIAL PRIMARY KEY,
    site_id VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    from_component VARCHAR(255) NOT NULL,
    to_component VARCHAR(255) NOT NULL,
    power_kw DOUBLE PRECISION NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

-- RL Suggestions table (for reinforcement learning optimization suggestions)
CREATE TABLE IF NOT EXISTS rl_suggestions (
    id VARCHAR(255) PRIMARY KEY,
    site_id VARCHAR(255) NOT NULL,
    suggestion_type VARCHAR(255) NOT NULL,
    current_config TEXT, -- JSON string
    suggested_config TEXT, -- JSON string
    expected_savings DOUBLE PRECISION,
    confidence DOUBLE PRECISION,
    status VARCHAR(50) CHECK(status IN ('pending', 'accepted', 'rejected', 'expired')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    applied_at TIMESTAMP,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

-- Simulation results table
CREATE TABLE IF NOT EXISTS simulation_results (
    id VARCHAR(255) PRIMARY KEY,
    site_id VARCHAR(255) NOT NULL,
    simulation_type VARCHAR(255) NOT NULL,
    parameters TEXT NOT NULL, -- JSON string
    results TEXT NOT NULL, -- JSON string
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

-- Chatbot conversations table (for AI assistant history)
CREATE TABLE IF NOT EXISTS chatbot_conversations (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    site_id VARCHAR(255),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL
);

-- System settings table
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Profile table (extends users with site type and preferences)
CREATE TABLE IF NOT EXISTS user_profiles (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL UNIQUE,
    site_type VARCHAR(50) CHECK(site_type IN ('home', 'college', 'small_industry', 'large_industry', 'power_plant', 'other')),
    workflow_preference VARCHAR(50) CHECK(workflow_preference IN ('plan_new', 'optimize_existing')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Load Profile table (for appliance and load data)
CREATE TABLE IF NOT EXISTS load_profiles (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    site_id VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    category_totals TEXT NOT NULL, -- JSON string: {lighting: {...}, fans: {...}, etc.}
    total_daily_energy_kwh DOUBLE PRECISION NOT NULL,
    appliances TEXT NOT NULL, -- JSON string: array of appliance objects
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL
);

-- Planning Recommendation table (output from planning wizard)
CREATE TABLE IF NOT EXISTS planning_recommendations (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    site_id VARCHAR(255),
    load_profile_id VARCHAR(255) NOT NULL,
    preferred_sources TEXT NOT NULL, -- JSON string: array of sources
    primary_goal VARCHAR(50) CHECK(primary_goal IN ('savings', 'self_sustainability', 'reliability', 'carbon_reduction')),
    allow_diesel BOOLEAN DEFAULT FALSE,
    technical_sizing TEXT NOT NULL, -- JSON string
    economic_analysis TEXT NOT NULL, -- JSON string
    emissions_analysis TEXT NOT NULL, -- JSON string
    scenario_link VARCHAR(255), -- Link to optimization scenario
    status VARCHAR(50) CHECK(status IN ('draft', 'saved', 'applied')) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL,
    FOREIGN KEY (load_profile_id) REFERENCES load_profiles(id) ON DELETE CASCADE
);

-- Optimization Config table (for optimization setup)
CREATE TABLE IF NOT EXISTS optimization_configs (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    site_id VARCHAR(255),
    load_profile_id VARCHAR(255),
    planning_recommendation_id VARCHAR(255),
    load_data TEXT NOT NULL, -- JSON string
    tariff_data TEXT NOT NULL, -- JSON string
    pv_parameters TEXT, -- JSON string
    battery_parameters TEXT, -- JSON string
    grid_parameters TEXT, -- JSON string
    objective VARCHAR(50) CHECK(objective IN ('cost', 'co2', 'combination')) DEFAULT 'combination',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL,
    FOREIGN KEY (load_profile_id) REFERENCES load_profiles(id) ON DELETE SET NULL,
    FOREIGN KEY (planning_recommendation_id) REFERENCES planning_recommendations(id) ON DELETE SET NULL
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_load_profiles_user_id ON load_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_planning_recommendations_user_id ON planning_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_optimization_configs_user_id ON optimization_configs(user_id);

