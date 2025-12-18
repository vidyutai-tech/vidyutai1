import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, AlertTriangle, CheckCircle, XCircle, Loader } from 'lucide-react';
import Card from '../components/ui/Card';
import { AppContext } from '../contexts/AppContext';
import { getBatteryRULDashboard, getSolarDegradationDashboard, getEnergyLossDashboard } from '../services/api';

interface RootCause {
  id: string;
  category: 'battery' | 'solar' | 'loss' | 'system';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  recommendations: string[];
  confidence: number;
}

const RootCauseAnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedSite } = useContext(AppContext)!;
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [rootCauses, setRootCauses] = useState<RootCause[]>([]);

  const analyzeRootCauses = async () => {
    setAnalyzing(true);
    setLoading(true);
    
    try {
      // Load all prediction data
      const [batteryData, solarData, lossData] = await Promise.all([
        getBatteryRULDashboard().catch(() => null),
        getSolarDegradationDashboard().catch(() => null),
        getEnergyLossDashboard().catch(() => null)
      ]);

      // Analyze and identify root causes
      const causes: RootCause[] = [];

      // Battery RUL Analysis
      if (batteryData && batteryData.predictions) {
        const lastRUL = batteryData.predictions[batteryData.predictions.length - 1]?.rul_hours || 0;
        if (lastRUL < 500) {
          causes.push({
            id: 'battery-critical',
            category: 'battery',
            severity: 'critical',
            title: 'Critical Battery Degradation',
            description: `Battery RUL has dropped to ${lastRUL.toFixed(0)} hours, indicating severe degradation.`,
            impact: 'Risk of unexpected battery failure and system downtime.',
            recommendations: [
              'Schedule immediate battery replacement',
              'Reduce high discharge cycles',
              'Maintain optimal temperature (20-30°C)',
              'Implement battery health monitoring alerts'
            ],
            confidence: 0.95
          });
        } else if (lastRUL < 1000) {
          causes.push({
            id: 'battery-high',
            category: 'battery',
            severity: 'high',
            title: 'Accelerated Battery Degradation',
            description: `Battery RUL is ${lastRUL.toFixed(0)} hours, showing faster than expected degradation.`,
            impact: 'Battery replacement needed within 6-12 months.',
            recommendations: [
              'Plan battery replacement within next quarter',
              'Optimize charge/discharge patterns',
              'Review temperature management',
              'Increase monitoring frequency'
            ],
            confidence: 0.85
          });
        }
      }

      // Solar Degradation Analysis
      if (solarData && solarData.predictions) {
        const firstEff = solarData.predictions[0]?.efficiency_current || 100;
        const lastEff = solarData.predictions[solarData.predictions.length - 1]?.efficiency_current || 100;
        const degradationRate = ((firstEff - lastEff) / firstEff) * 100;
        
        if (degradationRate > 0.8) {
          causes.push({
            id: 'solar-high',
            category: 'solar',
            severity: 'high',
            title: 'High Solar Panel Degradation Rate',
            description: `Solar panels showing ${degradationRate.toFixed(2)}% degradation rate, exceeding normal 0.5-0.8% range.`,
            impact: 'Reduced energy generation and ROI.',
            recommendations: [
              'Inspect panels for physical damage',
              'Schedule professional cleaning',
              'Check for shading issues',
              'Review inverter performance'
            ],
            confidence: 0.80
          });
        }
      }

      // Energy Loss Analysis
      if (lossData && lossData.predictions) {
        const avgLoss = lossData.predictions.reduce((sum: number, p: any) => sum + (p.loss_percent || 0), 0) / lossData.predictions.length;
        if (avgLoss > 8) {
          causes.push({
            id: 'loss-high',
            category: 'loss',
            severity: 'high',
            title: 'Excessive Energy Loss',
            description: `Average energy loss is ${avgLoss.toFixed(2)}%, exceeding optimal 2-8% range.`,
            impact: 'Increased operational costs and reduced efficiency.',
            recommendations: [
              'Inspect transformer connections',
              'Check cable integrity and resistance',
              'Optimize load distribution',
              'Review power quality metrics'
            ],
            confidence: 0.75
          });
        }
      }

      // System-level analysis
      if (causes.length > 2) {
        causes.push({
          id: 'system-multiple',
          category: 'system',
          severity: 'critical',
          title: 'Multiple System Issues Detected',
          description: `Multiple critical issues detected across ${causes.length} subsystems, indicating systemic problems.`,
          impact: 'Overall system reliability and efficiency compromised.',
          recommendations: [
            'Conduct comprehensive system audit',
            'Prioritize critical issues first',
            'Implement preventive maintenance schedule',
            'Consider system-wide optimization'
          ],
          confidence: 0.90
        });
      }

      setRootCauses(causes);
    } catch (err: any) {
      console.error('Root cause analysis error:', err);
    } finally {
      setAnalyzing(false);
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 dark:bg-red-900/20 border-red-300 dark:border-red-800';
      case 'high': return 'bg-orange-100 dark:bg-orange-900/20 border-orange-300 dark:border-orange-800';
      case 'medium': return 'bg-yellow-100 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-800';
      case 'low': return 'bg-blue-100 dark:bg-blue-900/20 border-blue-300 dark:border-blue-800';
      default: return 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="w-6 h-6 text-red-600" />;
      case 'high': return <AlertTriangle className="w-6 h-6 text-orange-600" />;
      case 'medium': return <AlertTriangle className="w-6 h-6 text-yellow-600" />;
      case 'low': return <CheckCircle className="w-6 h-6 text-blue-600" />;
      default: return <AlertTriangle className="w-6 h-6 text-gray-600" />;
    }
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 -m-4 md:-m-6 lg:-m-8 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/ai-ml-insights')}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to AI/ML Insights
          </button>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Root Cause Analysis
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            AI-powered analysis of system issues and their root causes
          </p>
        </div>

        {/* Analysis Control */}
        <Card className="mb-6">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  System Analysis
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Analyze all prediction models to identify root causes and system issues
                </p>
              </div>
              <button
                onClick={analyzeRootCauses}
                disabled={analyzing}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {analyzing ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    Run Analysis
                  </>
                )}
              </button>
            </div>
          </div>
        </Card>

        {/* Results */}
        {rootCauses.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Identified Root Causes ({rootCauses.length})
            </h2>
            {rootCauses.map((cause) => (
              <Card key={cause.id} className={`border-2 ${getSeverityColor(cause.severity)}`}>
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      {getSeverityIcon(cause.severity)}
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                            {cause.title}
                          </h3>
                          <span className="px-2 py-1 text-xs font-semibold rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 uppercase">
                            {cause.severity}
                          </span>
                          <span className="px-2 py-1 text-xs font-semibold rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                            {cause.category}
                          </span>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 mb-2">
                          {cause.description}
                        </p>
                        <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3">
                          Impact: {cause.impact}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Confidence</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {(cause.confidence * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                      Recommendations:
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                      {cause.recommendations.map((rec, idx) => (
                        <li key={idx}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {!loading && rootCauses.length === 0 && !analyzing && (
          <Card>
            <div className="p-12 text-center">
              <Search className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No Analysis Performed Yet
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Click "Run Analysis" to analyze all prediction models and identify root causes
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default RootCauseAnalysisPage;

