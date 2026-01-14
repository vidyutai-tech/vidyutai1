import React from 'react';

const CommunityMicrogridEMS: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-8">
        Energy Management System for Community Microgrid
      </h1>

      {/* Section 1: Village Details */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Village Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Village name — Katkenva, Motihari, Bihar</li>
            <li>Population — 2686 people, 512 Households</li>
            <li>Daily energy consumption — 13.01 kWh per household</li>
            <li>Daily Solar insolation available — 5.02 kWh</li>
          </ul>
          <div className="flex justify-center">
            <img
              src="/assets/CaseStudy3/village.jpg"
              alt="Village"
              className="w-full h-auto rounded-lg shadow-md"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Technical Ratings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Technical Ratings
        </h2>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            "Solar panel rating — 1719.28 kW",
            "Battery storage energy — 5526.24 kWh",
            "Battery nominal voltage — 12 V",
            "Battery capacity — 460.52 kAh",
            "Inverter rating — 2149.10 kVA",
            "DC-DC converter — 2149.10 kW",
          ].map((item, index) => (
            <li key={index} className="flex items-center text-gray-700 dark:text-gray-300">
              <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold mr-3">
                {index + 1}
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Section 3: Economic Analysis */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Economic Analysis
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700">
                <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-gray-900 dark:text-white font-semibold">
                  Section
                </th>
                <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center text-gray-900 dark:text-white font-semibold">
                  Total Price ON-Grid (₹ cr)
                </th>
                <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center text-gray-900 dark:text-white font-semibold">
                  Total Price Dual-Mod (₹ cr)
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                { section: "PV", onGrid: "5.16", dualMod: "5.16" },
                { section: "Battery", onGrid: "0.00", dualMod: "4.61" },
                { section: "Inverter", onGrid: "1.72", dualMod: "1.72" },
                { section: "DC-DC converter", onGrid: "0.00", dualMod: "0.29" },
                { section: "Installation (10%)", onGrid: "0.52", dualMod: "0.98" },
                { section: "Annual interest rate", onGrid: "10 %", dualMod: "10 %" },
                { section: "Annual O&M of PV and Battery (3%)", onGrid: "0.15", dualMod: "0.29" },
                { section: "Capital Cost", onGrid: "7.39", dualMod: "12.74", isBold: true },
              ].map((row, index) => (
                <tr
                  key={index}
                  className={index % 2 === 0 ? "bg-white dark:bg-gray-800" : "bg-gray-50 dark:bg-gray-700/50"}
                >
                  <td className={`border border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-900 dark:text-white ${row.isBold ? 'font-bold' : ''}`}>
                    {row.section}
                  </td>
                  <td className={`border border-gray-300 dark:border-gray-600 px-4 py-3 text-center text-gray-900 dark:text-white ${row.isBold ? 'font-bold' : ''}`}>
                    {row.onGrid}
                  </td>
                  <td className={`border border-gray-300 dark:border-gray-600 px-4 py-3 text-center text-gray-900 dark:text-white ${row.isBold ? 'font-bold' : ''}`}>
                    {row.dualMod}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 4: Cost of Energy and Grid Outage Effect */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Cost of Energy and Grid Outage Effect
        </h2>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          The Cost of Energy is the average cost to produce one unit of
          electricity from this system.
        </p>
        <p className="text-gray-700 dark:text-gray-300 mb-6">
          The installed Solar system is connected to the grid. When an outage
          happens, energy generation will be stopped. The amount of energy
          loss is related to grid outage time.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <img
            src="/assets/CaseStudy3/Cost of Energy Generation for Different DaytimeOutage Scenarios.png"
            alt="Daytime Outage Scenarios"
            className="w-full h-auto rounded-lg shadow-md"
          />
          <img
            src="/assets/CaseStudy3/Cost of Energy Generation for Different NighttimeOutage Scenarios.png"
            alt="Nighttime Outage Scenarios"
            className="w-full h-auto rounded-lg shadow-md"
          />
          <img
            src="/assets/CaseStudy3/Cost of Energy Generation for On-Grid in Different DaytimeOutage Scenarios.png"
            alt="On-Grid Daytime Outage Scenarios"
            className="w-full h-auto rounded-lg shadow-md"
          />
        </div>
      </div>

      {/* Section 5: Simple Payback Period */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Simple Payback Period
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              Simple payback period is the time it takes for an investment to
              generate an amount of money equal to the initial investment
              cost.
            </p>
          </div>
          <div className="flex justify-center">
            <img
              src="/assets/CaseStudy3/Simple Payback Period Comparison.png"
              alt="Payback Period Comparison"
              className="w-full h-auto rounded-lg shadow-md"
            />
          </div>
        </div>
      </div>

      {/* Section 6: Environment Effect */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Environment Effect
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              Using renewable resources to generate energy will reduce fossil
              fuel burning for energy generation, ultimately saving carbon
              emissions.
            </p>
          </div>
          <div className="flex justify-center">
            <img
              src="/assets/CaseStudy3/Carbon Emmission Comparison.png"
              alt="Carbon Emission Comparison"
              className="w-full h-auto rounded-lg shadow-md"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityMicrogridEMS;

