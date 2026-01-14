import React from 'react';

const PeakDemandForecasting: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-8">
        Peak Demand Forecasting
      </h1>

      {/* Section 1: Gujarat Peak Demand */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <div className="flex flex-col">
          <div className="flex justify-center mb-4">
            <img
              src="/assets/CaseStudy4/Gujarat_forecast.png"
              alt="Gujarat Peak Demand Forecast"
              className="w-full h-auto rounded-lg shadow-md"
            />
          </div>
          <p className="text-gray-700 dark:text-gray-300 mt-4">
            The graph shows the peak power demand met during the day
            for the Gujarat state is forecasted in millions of watts
            (MW) from 2024 to 2026 based on the peak power demand met
            during the day from 2013 to 2023. Black dots represent the
            original peak power demand data, while blue lines
            represent forecasted peak power demand.
          </p>
        </div>
      </div>

      {/* Section 2: Maharashtra Peak Demand */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <div className="flex flex-col">
          <div className="flex justify-center mb-4">
            <img
              src="/assets/CaseStudy4/Maharashtra_forecast.png"
              alt="Maharashtra Peak Demand Forecast"
              className="w-full h-auto rounded-lg shadow-md"
            />
          </div>
          <p className="text-gray-700 dark:text-gray-300 mt-4">
            The graph shows the peak power demand met during the day
            for the Maharashtra state is forecasted in millions of
            watts (MW) from 2024 to 2026 based on the peak power
            demand met during the day from 2013 to 2023. Black dots
            represent the original peak power demand data, while blue
            lines represent forecasted peak power demand.
          </p>
        </div>
      </div>

      {/* Section 3: Tamil Nadu Peak Demand */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <div className="flex flex-col">
          <div className="flex justify-center mb-4">
            <img
              src="/assets/CaseStudy4/Tamil_Nadu_forecast.png"
              alt="Tamil Nadu Peak Demand Forecast"
              className="w-full h-auto rounded-lg shadow-md"
            />
          </div>
          <p className="text-gray-700 dark:text-gray-300 mt-4">
            The graph shows the peak power demand met during the day
            for the Tamil Nadu state is forecasted in millions of
            watts (MW) from 2024 to 2026 based on the peak power
            demand met during the day from 2013 to 2023. Black dots
            represent the original peak power demand data, while blue
            lines represent forecasted peak power demand.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PeakDemandForecasting;

