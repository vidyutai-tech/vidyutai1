import React from 'react';
import { DigitalTwinDataPoint } from '../../types';
import { Thermometer, Zap, BarChart, Rss, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface DigitalTwinGridProps {
    dataPoints: DigitalTwinDataPoint[];
}

const DigitalTwinGrid: React.FC<DigitalTwinGridProps> = ({ dataPoints }) => {
    const getIcon = (label: string) => {
        const labelLower = (label || '').toLowerCase();
        if (labelLower.includes('temp')) return <Thermometer className="w-5 h-5" />;
        if (labelLower.includes('speed')) return <Rss className="w-5 h-5" />;
        if (labelLower.includes('vib')) return <BarChart className="w-5 h-5" />;
        return <Zap className="w-5 h-5" />;
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {dataPoints.map((point) => {
                const deviation = point.predicted_value !== 0 
                    ? ((point.real_value - point.predicted_value) / point.predicted_value) * 100 
                    : 0;

                let borderColor = 'border-green-500';
                let bgColor = 'bg-green-500/10';
                let textColor = 'text-green-600 dark:text-green-400';
                
                if (Math.abs(deviation) > 10) {
                    borderColor = 'border-yellow-500';
                    bgColor = 'bg-yellow-500/10';
                    textColor = 'text-yellow-600 dark:text-yellow-400';
                }
                if (Math.abs(deviation) > 25) {
                    borderColor = 'border-red-500';
                    bgColor = 'bg-red-500/10';
                    textColor = 'text-red-600 dark:text-red-400';
                }

                const TrendIcon = Math.abs(deviation) < 0.1 
                    ? Minus 
                    : deviation > 0 
                        ? TrendingUp 
                        : TrendingDown;

                return (
                    <div
                        key={point.id || point.label}
                        className={`${bgColor} ${borderColor} border-2 rounded-lg p-4 shadow-lg transition-all duration-300 hover:shadow-xl`}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                <div className={textColor}>
                                    {getIcon(point.label || '')}
                                </div>
                                <span className="text-sm font-semibold">{point.label || 'Unknown'}</span>
                            </div>
                            <TrendIcon className={`w-4 h-4 ${textColor}`} />
                        </div>

                        {/* Main Value */}
                        <div className="mb-2">
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {point.real_value.toFixed(2)}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {point.unit || ''}
                                </span>
                            </div>
                        </div>

                        {/* Predicted Value */}
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                            <span>Predicted: </span>
                            <span className="font-medium">{point.predicted_value.toFixed(2)} {point.unit || ''}</span>
                        </div>

                        {/* Deviation */}
                        <div className={`text-xs font-bold ${textColor} flex items-center gap-1`}>
                            {deviation > 0 ? '▲' : deviation < 0 ? '▼' : '●'} 
                            <span>{Math.abs(deviation).toFixed(2)}%</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-3 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className={`h-full ${textColor.replace('text-', 'bg-').replace('600', '500').replace('400', '500')} transition-all duration-300`}
                                style={{
                                    width: `${Math.min(100, Math.abs(deviation) * 2)}%`
                                }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default DigitalTwinGrid;

