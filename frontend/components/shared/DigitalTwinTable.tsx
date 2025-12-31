import React from 'react';
import { DigitalTwinDataPoint } from '../../types';
import { Thermometer, Zap, BarChart, Rss } from 'lucide-react';

interface DigitalTwinTableProps {
    dataPoints: DigitalTwinDataPoint[];
}

const DigitalTwinTable: React.FC<DigitalTwinTableProps> = ({ dataPoints }) => {
    const getIcon = (label: string) => {
        const labelLower = (label || '').toLowerCase();
        if (labelLower.includes('temp')) return <Thermometer className="w-4 h-4" />;
        if (labelLower.includes('speed')) return <Rss className="w-4 h-4" />;
        if (labelLower.includes('vib')) return <BarChart className="w-4 h-4" />;
        return <Zap className="w-4 h-4" />;
    };

    const getStatusBadge = (deviation: number) => {
        if (Math.abs(deviation) < 1) {
            return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">Normal</span>;
        } else if (Math.abs(deviation) < 10) {
            return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">Warning</span>;
        } else {
            return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">Alert</span>;
        }
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse">
                <thead>
                    <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Metric</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Real Value</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Predicted Value</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Deviation</th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                    </tr>
                </thead>
                <tbody>
                    {dataPoints.map((point, index) => {
                        const deviation = point.predicted_value !== 0 
                            ? ((point.real_value - point.predicted_value) / point.predicted_value) * 100 
                            : 0;

                        const deviationColor = Math.abs(deviation) > 25 
                            ? 'text-red-600 dark:text-red-400' 
                            : Math.abs(deviation) > 10 
                                ? 'text-yellow-600 dark:text-yellow-400' 
                                : 'text-green-600 dark:text-green-400';

                        return (
                            <tr 
                                key={point.id || point.label || index}
                                className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                            >
                                <td className="py-4 px-4">
                                    <div className="flex items-center gap-2">
                                        <div className="text-gray-500 dark:text-gray-400">
                                            {getIcon(point.label || '')}
                                        </div>
                                        <span className="font-medium text-gray-900 dark:text-white">{point.label || 'Unknown'}</span>
                                    </div>
                                </td>
                                <td className="py-4 px-4 text-right">
                                    <span className="font-semibold text-gray-900 dark:text-white">
                                        {point.real_value.toFixed(2)}
                                    </span>
                                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">{point.unit || ''}</span>
                                </td>
                                <td className="py-4 px-4 text-right">
                                    <span className="text-gray-700 dark:text-gray-300">
                                        {point.predicted_value.toFixed(2)}
                                    </span>
                                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">{point.unit || ''}</span>
                                </td>
                                <td className={`py-4 px-4 text-right font-semibold ${deviationColor}`}>
                                    {deviation > 0 ? '▲' : deviation < 0 ? '▼' : '●'} {Math.abs(deviation).toFixed(2)}%
                                </td>
                                <td className="py-4 px-4 text-center">
                                    {getStatusBadge(deviation)}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default DigitalTwinTable;

