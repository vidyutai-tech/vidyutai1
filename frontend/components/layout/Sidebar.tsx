import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, AlertTriangle, AreaChart, Wrench, SlidersHorizontal, Settings, X, Bolt, Building, HardDrive, TrendingUp, Zap, Lightbulb, MessageSquare, Battery, Search } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  setSidebarOpen: (isOpen: boolean) => void;
}

// Organized by main pipelines
const planningNavItems = [
  { name: 'Energy Advisory Assistance', path: '/planning-wizard', icon: Bolt },
];

const optimizationNavItems = [
  { name: 'Optimization Configuration', path: '/optimization-setup', icon: Settings },
];

// AI/ML Insights items - moved to dashboard section as they're navigation utilities
const aiMlNavItems = [
  { name: 'Energy Forecasting', path: '/energy-forecasting', icon: TrendingUp },
  { name: 'Battery RUL Prediction', path: '/battery-rul', icon: Battery },
  { name: 'Solar Degradation Prediction', path: '/solar-degradation', icon: Zap },
  { name: 'Energy Loss Prediction', path: '/energy-loss', icon: AlertTriangle },
  { name: 'Root Cause Analysis', path: '/root-cause-analysis', icon: Search },
  { name: 'AI Interpretations', path: '/ai-explanations', icon: MessageSquare },
];

const dashboardNavItems = [
  { name: 'Unified Dashboard', path: '/unified-dashboard', icon: LayoutDashboard },
  { name: 'Operations Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Site Detail', path: '/site-detail', icon: AreaChart },
  { name: 'Simulator', path: '/simulator', icon: SlidersHorizontal },
  { name: 'Alerts', path: '/alerts', icon: AlertTriangle },
  { name: 'Maintenance', path: '/maintenance', icon: Wrench },
];

const impactActionsNavItems = [
  { name: 'Actionable Insights', path: '/ai-recommendations', icon: Lightbulb },
];

const managementNavItems = [
  { name: 'Sites', path: '/manage-sites', icon: Building },
  { name: 'Assets', path: '/manage-assets', icon: HardDrive },
  { name: 'Settings', path: '/settings', icon: Settings },
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setSidebarOpen }) => {
  const location = useLocation();
  const currentPath = location.pathname;

  // Determine which pipeline section is active
  const isPlanningActive = currentPath.includes('/planning-wizard');
  const isOptimizationActive = currentPath.includes('/optimization-setup');
  const isImpactActionsActive = currentPath.includes('/ai-recommendations');

  const NavItem: React.FC<{ item: { name: string; path: string; icon: any } }> = ({ item }) => (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        `flex items-center px-4 py-3 text-sm font-medium transition-colors duration-150 ${
          isActive
            ? 'bg-blue-600 text-white'
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
        }`
      }
      onClick={() => { if (window.innerWidth < 768) setSidebarOpen(false); }}
    >
      <item.icon className="w-5 h-5 mr-3" />
      <span>{item.name}</span>
    </NavLink>
  );

  const NavSection: React.FC<{ title: string; items: typeof planningNavItems; isActive: boolean }> = ({ title, items, isActive }) => (
    <div className={`mb-6 ${isActive ? 'border-l-4 border-blue-600 pl-2' : ''}`}>
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 mb-2">{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item.name}>
            <NavItem item={item} />
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <>
      <div
        className={`fixed inset-0 z-20 bg-black bg-opacity-50 transition-opacity md:hidden ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setSidebarOpen(false)}
      ></div>
      <aside
        className={`fixed top-0 left-0 z-30 h-full w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col flex-shrink-0 transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Sidebar"
      >
        <div className="flex items-center justify-between p-4 h-20 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center w-full">
            <img src="/VidyutAI Logo.png" className="h-16 w-auto" alt="VidyutAI" />
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          <nav className="mt-4">
            <div className="px-4 mb-4">
              <NavLink
                to="/main-options"
                className="flex items-center px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                onClick={() => { if (window.innerWidth < 768) setSidebarOpen(false); }}
              >
                <LayoutDashboard className="w-5 h-5 mr-2" />
                <span>Main Options</span>
              </NavLink>
            </div>
            
            <NavSection title="1. Energy Advisory Assistance" items={planningNavItems} isActive={isPlanningActive} />
            <NavSection title="2. Energy Optimization" items={optimizationNavItems} isActive={isOptimizationActive} />
            <NavSection title="3. Actionable Insights" items={impactActionsNavItems} isActive={isImpactActionsActive} />
          </nav>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
