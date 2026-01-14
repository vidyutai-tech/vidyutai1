import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lightbulb, TrendingUp, Zap } from 'lucide-react';
import Card from '../components/ui/Card';

const AIRecommendationsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-full bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 -m-4 md:-m-6 lg:-m-8 p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </button>
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Actionable Insights
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              AI-powered recommendations for your energy system
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Energy Advisory Insights */}
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-5">
                <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Energy Advisory Insights
                </h3>
              </div>
              
              <div className="space-y-4">
                <div className="bg-white dark:bg-gray-700 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-600">
                  <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                    Insights and recommendations related to energy planning, consumption patterns, and system design will appear here.
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Optimization Insights */}
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-5">
                <div className="p-3 rounded-lg bg-gradient-to-br from-green-500 to-green-600">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Optimization Insights
                </h3>
              </div>
              
              <div className="space-y-4">
                <div className="bg-white dark:bg-gray-700 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-600">
                  <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                    Optimization recommendations for cost savings, efficiency improvements, and performance enhancements will appear here.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AIRecommendationsPage;
