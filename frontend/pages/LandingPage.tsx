import React, { useState, useEffect } from 'react';
import { ArrowRight, Zap, Battery, Sun, Building2, Network, Fuel, CheckCircle, Home, TrendingUp, FileText } from 'lucide-react';
import ImpactPage from './ImpactPage';
import AgingAwarePVDigitalTwins from '../components/shared/AgingAwarePVDigitalTwins';
import CommunityMicrogridEMS from '../components/shared/CommunityMicrogridEMS';
import PeakDemandForecasting from '../components/shared/PeakDemandForecasting';

interface LandingPageProps {
  onGetStarted: () => void;
}

interface PowerFlow {
  from: string;
  to: string;
  active: boolean;
  value?: number;
}

const ComponentNode: React.FC<{ 
  icon: React.ReactNode; 
  label: string; 
  color: string;
  id: string;
}> = ({ icon, label, color, id }) => (
  <div 
    id={id}
    className={`flex flex-col items-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border-2 ${color} relative z-10`}
  >
    <div className="mb-2">{icon}</div>
    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</span>
  </div>
);

const PowerFlowLine: React.FC<{
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  active: boolean;
  label?: string;
}> = ({ fromX, fromY, toX, toY, active, label }) => {
  const strokeColor = active ? '#ef4444' : '#9ca3af';
  const markerId = active ? 'arrowhead-red' : 'arrowhead-gray';
  
  return (
    <g>
      <line
        x1={fromX}
        y1={fromY}
        x2={toX}
        y2={toY}
        stroke={strokeColor}
        strokeWidth={active ? 3 : 2}
        strokeDasharray={active ? '0' : '5,5'}
        className={active ? 'animate-pulse' : ''}
        markerEnd={`url(#${markerId})`}
      />
      {label && (
        <text
          x={(fromX + toX) / 2}
          y={(fromY + toY) / 2 - 10}
          fill={strokeColor}
          fontSize="11"
          fontWeight="600"
          textAnchor="middle"
        >
          {label}
        </text>
      )}
    </g>
  );
};

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  const [activeTab, setActiveTab] = useState<'home' | 'impact' | 'case-studies'>('home');
  const [activeCaseStudy, setActiveCaseStudy] = useState<'aging-aware-pv' | 'community-microgrid' | 'peak-demand'>('aging-aware-pv');


  // Component positions (relative to SVG viewport)
  const componentPositions = {
    renewable: { x: 150, y: 100 },
    ems: { x: 400, y: 200 },
    battery: { x: 650, y: 100 },
    grid: { x: 150, y: 350 },
    load: { x: 400, y: 350 },
    diesel: { x: 650, y: 350 },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center mb-4">
            {/* Logos */}
            <div className="flex items-center space-x-4">
              <img src="/Spel.png" alt="SPEL" className="h-12 w-auto" />
              <span className="text-2xl text-gray-400 dark:text-gray-600">|</span>
              <img src="/VidyutAI Logo.png" alt="VidyutAI" className="h-11 w-auto" />
            </div>
            
            {/* Get Started Button */}
            <button
              onClick={onGetStarted}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-all hover:shadow-lg"
            >
              <span>Get Started</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex items-center space-x-1 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('home')}
              className={`flex items-center space-x-2 px-6 py-3 font-medium transition-all border-b-2 ${
                activeTab === 'home'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Home className="w-5 h-5" />
              <span>Home</span>
            </button>
            <button
              onClick={() => setActiveTab('impact')}
              className={`flex items-center space-x-2 px-6 py-3 font-medium transition-all border-b-2 ${
                activeTab === 'impact'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <TrendingUp className="w-5 h-5" />
              <span>Impact</span>
            </button>
            <button
              onClick={() => setActiveTab('case-studies')}
              className={`flex items-center space-x-2 px-6 py-3 font-medium transition-all border-b-2 ${
                activeTab === 'case-studies'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-5 h-5" />
              <span>Case Studies</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {activeTab === 'home' && (
          <>
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-extrabold text-gray-900 dark:text-white mb-4">
            Energy Management System
          </h1>
          <div className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto space-y-2">
            <p>
              Intelligent power flow optimization for renewable energy systems.
            </p>
            <p>
              Real-time monitoring.
            </p>
            <p>
              AI-powered decision making for maximum efficiency.
            </p>
          </div>
        </div>
          </>
        )}
        
        {activeTab === 'impact' && (
          <ImpactPage />
        )}
        
        {activeTab === 'case-studies' && (
          <>
            <div className="text-center mb-8">
              <h1 className="text-5xl font-extrabold text-gray-900 dark:text-white mb-4">
                Case Studies
              </h1>
              <div className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto space-y-2">
                <p>
                  Real-world implementations and success stories.
                </p>
              </div>
            </div>

            {/* Case Study Subtabs */}
            <div className="flex justify-center mb-8">
              <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-1">
                <button
                  onClick={() => setActiveCaseStudy('aging-aware-pv')}
                  className={`px-6 py-2 rounded-md font-medium transition-all ${
                    activeCaseStudy === 'aging-aware-pv'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  Aging Aware PV Digital Twins
                </button>
                <button
                  onClick={() => setActiveCaseStudy('community-microgrid')}
                  className={`px-6 py-2 rounded-md font-medium transition-all ${
                    activeCaseStudy === 'community-microgrid'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  EMS for Community Microgrid
                </button>
                <button
                  onClick={() => setActiveCaseStudy('peak-demand')}
                  className={`px-6 py-2 rounded-md font-medium transition-all ${
                    activeCaseStudy === 'peak-demand'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  Peak Demand Forecasting
                </button>
              </div>
            </div>

            {/* Case Study Content */}
            <div className="space-y-6">
              {activeCaseStudy === 'aging-aware-pv' && (
                <AgingAwarePVDigitalTwins />
              )}

              {activeCaseStudy === 'community-microgrid' && (
                <CommunityMicrogridEMS />
              )}

              {activeCaseStudy === 'peak-demand' && (
                <PeakDemandForecasting />
              )}
            </div>
          </>
        )}

        {activeTab === 'home' && (
          <>
        {/* Power Flow Visualization - Both Modes Side by Side */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            Energy Management System (EMS) Modes
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Grid Connected Mode Video */}
            <div className="flex flex-col">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 text-center">
                Grid Connected Mode EMS
              </h3>
              <div className="relative bg-gray-50 dark:bg-gray-900 rounded-lg p-4 overflow-hidden">
                <video
                  src="/assets/2nd_tab_big.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-auto rounded-lg shadow-lg"
                  style={{ maxHeight: '600px' }}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>

            {/* Island Mode Video */}
            <div className="flex flex-col">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 text-center">
                Island Mode EMS
              </h3>
              <div className="relative bg-gray-50 dark:bg-gray-900 rounded-lg p-4 overflow-hidden">
                <video
                  src="/assets/Island_Mode_EMS_controled_power_flow_animation.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-auto rounded-lg shadow-lg"
                  style={{ maxHeight: '600px' }}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-12">
          <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
            This visualization demonstrates the flow of power in an Energy Management System (EMS). 
            All the components in the EMS are connected to the EMS device, which decides the power flow 
            from each component depending on availability and the cost associated with it. If the cost 
            associated with the power is high, then the power flow will be from other available sources 
            with low cost. The charge and discharge of the battery is also shown in the animation. 
            The battery is charged when the cost of the power is low and discharged when the cost of 
            the power is high. We can also see power flows from Renewable and Diesel to the grid, 
            which indicates that the power is being sold to the grid and making a profit.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Key Features */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Key Features</h3>
            <ul className="space-y-4">
              <li className="flex items-start">
                <CheckCircle className="w-6 h-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Smart Power Routing</h4>
                  <p className="text-gray-600 dark:text-gray-400">Optimizes power flow based on availability and cost</p>
                </div>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-6 h-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Dynamic Storage Management</h4>
                  <p className="text-gray-600 dark:text-gray-400">Charges during low-cost periods, discharges when costs are high</p>
                </div>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-6 h-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Renewable Integration</h4>
                  <p className="text-gray-600 dark:text-gray-400">Prioritizes clean energy sources for sustainability</p>
                </div>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-6 h-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Cost Optimization</h4>
                  <p className="text-gray-600 dark:text-gray-400">Minimizes energy costs through intelligent decision-making</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Power Flow Dynamics */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Power Flow Dynamics</h3>
            <ul className="space-y-3">
              <li className="flex items-center text-gray-700 dark:text-gray-300">
                <ArrowRight className="w-5 h-5 text-blue-500 mr-3" />
                <span><strong>EMS to Grid:</strong> Excess power sold for profit</span>
              </li>
              <li className="flex items-center text-gray-700 dark:text-gray-300">
                <ArrowRight className="w-5 h-5 text-blue-500 mr-3" />
                <span><strong>Renewables to EMS:</strong> Clean energy prioritized</span>
              </li>
              <li className="flex items-center text-gray-700 dark:text-gray-300">
                <ArrowRight className="w-5 h-5 text-blue-500 mr-3" />
                <span><strong>Battery to EMS:</strong> Discharge during peak demand</span>
              </li>
              <li className="flex items-center text-gray-700 dark:text-gray-300">
                <ArrowRight className="w-5 h-5 text-blue-500 mr-3" />
                <span><strong>Diesel to EMS:</strong> Backup power during emergencies</span>
              </li>
              <li className="flex items-center text-gray-700 dark:text-gray-300">
                <ArrowRight className="w-5 h-5 text-blue-500 mr-3" />
                <span><strong>EMS to Load:</strong> Efficient power distribution to devices</span>
              </li>
              <li className="flex items-center text-gray-700 dark:text-gray-300">
                <ArrowRight className="w-5 h-5 text-blue-500 mr-3" />
                <span><strong>EMS to Storage:</strong> Energy stored for future use</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl shadow-2xl p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Optimize Your Energy?</h2>
          <p className="text-lg mb-8 opacity-90">
            Access real-time monitoring, AI-powered insights, and advanced energy management features.
          </p>
          <button
            onClick={onGetStarted}
            className="inline-flex items-center space-x-2 px-8 py-4 bg-white text-blue-600 font-bold rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
          >
            <span>Access Dashboard</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
          </>
        )}
        
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-3 md:space-y-0">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              © {new Date().getFullYear()} VidyutAI. All rights reserved.
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Developed at
              </span>
              <img 
                src="/IITGN_logo.webp" 
                alt="IIT Gandhinagar" 
                className="h-8 w-auto opacity-80 hover:opacity-100 transition-opacity"
              />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

