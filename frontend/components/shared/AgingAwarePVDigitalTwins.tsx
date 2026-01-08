import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import Card from '../ui/Card';

const AgingAwarePVDigitalTwins: React.FC = () => {
  const [installedPower, setInstalledPower] = useState<string>('0');
  const [panelAge, setPanelAge] = useState<string>('0');
  const [response, setResponse] = useState<{ plot_image: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get API base URL
  const getApiBaseUrl = (): string => {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return 'http://localhost:5001/api/v1';
    }
    return import.meta.env.VITE_API_BASE_URL || '/api/v1';
  };

  const API_BASE_URL = getApiBaseUrl();

  useEffect(() => {
    // Retrieve the plot data from localStorage when the component mounts
    const savedPlot = localStorage.getItem('solarPanelPlot');
    if (savedPlot) {
      setResponse({ plot_image: savedPlot });
    }
  }, []);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const installedPowerFloat = parseFloat(installedPower);
      const panelAgeNumber = parseInt(panelAge);

      if (isNaN(installedPowerFloat) || installedPowerFloat <= 0) {
        throw new Error('Please enter a valid installed power value greater than 0');
      }

      if (isNaN(panelAgeNumber) || panelAgeNumber < 0) {
        throw new Error('Please enter a valid panel age (non-negative number)');
      }

      if (panelAgeNumber > 30) {
        throw new Error('Panel age cannot exceed 30 years (end of life)');
      }

      // Retry logic for 429 errors
      let res;
      let lastError;
      const maxRetries = 3;
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          res = await fetch(`${API_BASE_URL}/case-studies/solar-panel-degradation`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              installed_power: installedPowerFloat,
              panel_age: panelAgeNumber,
            }),
          });

          // If successful or non-429 error, break out of retry loop
          if (res.ok || res.status !== 429) {
            break;
          }

          // If 429 and not last attempt, wait and retry
          if (res.status === 429 && attempt < maxRetries - 1) {
            const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s, 4s
            console.log(`Rate limited (429), retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        } catch (err) {
          lastError = err;
          if (attempt === maxRetries - 1) {
            throw err;
          }
          // Wait before retry
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      if (!res) {
        throw lastError || new Error('Failed to get response from server');
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ 
          error: 'Unknown error occurred',
          message: res.status === 429 
            ? 'Rate limit exceeded. Please try again in a few moments.'
            : `Server error: ${res.status}`
        }));
        throw new Error(errorData.message || errorData.detail || errorData.error || `Server error: ${res.status}`);
      }

      const data = await res.json();

      // Save the plot image data to localStorage
      if (data.plot_image) {
        localStorage.setItem('solarPanelPlot', data.plot_image);
      }

      setResponse(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred while calculating degradation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Input Card */}
      <Card>
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            Aging Aware PV Digital Twins
          </h2>

          <div className="space-y-4 max-w-2xl mx-auto">
            <div>
              <label
                htmlFor="installed-power"
                className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
              >
                Installed power:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  id="installed-power"
                  value={installedPower}
                  onChange={(e) => setInstalledPower(e.target.value)}
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  min={0}
                  step="0.01"
                  placeholder="Enter installed power"
                />
                <span className="text-gray-700 dark:text-gray-300 font-medium">W</span>
              </div>
            </div>

            <div>
              <label
                htmlFor="panel-age"
                className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
              >
                Panel Age:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  id="panel-age"
                  value={panelAge}
                  onChange={(e) => setPanelAge(e.target.value)}
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  min={0}
                  max={30}
                  placeholder="Enter panel age"
                />
                <span className="text-gray-700 dark:text-gray-300 font-medium">Years</span>
              </div>
            </div>

            <div className="flex justify-center pt-4">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Calculating...</span>
                  </>
                ) : (
                  <span>Calculate</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800 dark:text-red-300">Error</p>
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
          >
            ×
          </button>
        </div>
      )}

      {/* Plot Card */}
      {response && (
        <Card>
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
              Solar Panel Degradation Plot
            </h2>
            <div className="flex justify-center">
              <img
                src={`data:image/png;base64,${response.plot_image}`}
                alt="Solar Panel Degradation Plot"
                className="w-full h-auto rounded-lg shadow-lg max-w-4xl"
              />
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AgingAwarePVDigitalTwins;

