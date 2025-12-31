import React, { useState } from 'react';
import { DigitalTwinDataPoint } from '../../types';
import { Thermometer, Zap, BarChart, Rss, Grid3x3, Table, Network } from 'lucide-react';
import DigitalTwinGrid from './DigitalTwinGrid';
import DigitalTwinTable from './DigitalTwinTable';

interface DigitalTwinProps {
    dataPoints: DigitalTwinDataPoint[];
}

type ViewMode = 'network' | 'grid' | 'table';

const DataPoint: React.FC<{ point: DigitalTwinDataPoint }> = ({ point }) => {
    const deviation = point.predicted_value !== 0 ? ((point.real_value - point.predicted_value) / point.predicted_value) * 100 : 0;

    let colorClass = 'text-green-500';
    let bgClass = 'bg-green-500/10';
    if (Math.abs(deviation) > 10) {
      colorClass = 'text-yellow-500';
      bgClass = 'bg-yellow-500/10';
    }
    if (Math.abs(deviation) > 25) {
      colorClass = 'text-red-500';
      bgClass = 'bg-red-500/10';
    }

    const getIcon = (label: string) => {
        const labelLower = (label || '').toLowerCase();
        if (labelLower.includes('temp')) return <Thermometer className="w-4 h-4 text-gray-500 dark:text-gray-400" />;
        if (labelLower.includes('speed')) return <Rss className="w-4 h-4 text-gray-500 dark:text-gray-400" />;
        if (labelLower.includes('vib')) return <BarChart className="w-4 h-4 text-gray-500 dark:text-gray-400" />;
        return <Zap className="w-4 h-4 text-gray-500 dark:text-gray-400" />;
    };

    return (
        <g transform={`translate(${point.x}, ${point.y})`} className="transition-transform duration-500">
            <foreignObject x="-75" y="-35" width="150" height="70">
                <div className={`w-full h-full p-2 rounded-lg shadow-lg flex flex-col justify-center items-center 
                                 border-2 transition-colors duration-300 ${colorClass.replace('text-', 'border-')} ${bgClass}`}>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {getIcon(point.label || '')}
                        <span>{point.label || 'Unknown'}</span>
                    </div>
                    <div className="flex items-baseline font-mono">
                        <span className="text-xl font-bold text-gray-900 dark:text-white">{point.real_value.toFixed(2)}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">/{point.predicted_value.toFixed(2)} {point.unit || ''}</span>
                    </div>
                    <div className={`text-xs font-bold ${colorClass}`}>
                        {deviation > 0 ? '▲' : '▼'} {Math.abs(deviation).toFixed(2)}%
                    </div>
                </div>
            </foreignObject>
        </g>
    );
};

const DigitalTwin: React.FC<DigitalTwinProps> = ({ dataPoints }) => {
    const [viewMode, setViewMode] = useState<ViewMode>('network');
    // Central asset is smaller and centered in the canvas
    const asset = { x: 175, y: 150, width: 100, height: 50 };
    
    // Card dimensions (matching foreignObject dimensions)
    const cardWidth = 150;
    const cardHeight = 70;
    const cardHalfWidth = cardWidth / 2;
    const cardHalfHeight = cardHeight / 2;

    const getAnchorPoint = (point: DigitalTwinDataPoint) => {
        const cx = asset.x + asset.width / 2;
        const cy = asset.y + asset.height / 2;
        const dx = point.x - cx;
        const dy = point.y - cy;
        
        let anchorX = cx + (asset.width / 2) * (Math.abs(dx) > asset.width / 2 ? Math.sign(dx) : dx / (asset.width / 2));
        let anchorY = cy + (asset.height / 2) * (Math.abs(dy) > asset.height / 2 ? Math.sign(dy) : dy / (asset.height / 2));

        anchorX = Math.max(asset.x, Math.min(asset.x + asset.width, anchorX));
        anchorY = Math.max(asset.y, Math.min(asset.y + asset.height, anchorY));
        
        return { x: anchorX, y: anchorY };
    };

    const getCardEdgePoint = (point: DigitalTwinDataPoint, anchor: { x: number, y: number }) => {
        // Calculate direction from anchor to card center
        const dx = point.x - anchor.x;
        const dy = point.y - anchor.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Normalize direction
        const nx = dx / distance;
        const ny = dy / distance;
        
        // Find the intersection point on the card edge
        // Card is positioned at (point.x - 75, point.y - 35) with dimensions 150x70
        const cardLeft = point.x - cardHalfWidth;
        const cardRight = point.x + cardHalfWidth;
        const cardTop = point.y - cardHalfHeight;
        const cardBottom = point.y + cardHalfHeight;
        
        // Calculate intersection with card edges
        // Check which edge the ray intersects first
        let intersectX = point.x;
        let intersectY = point.y;
        
        if (Math.abs(nx) > Math.abs(ny)) {
            // Horizontal intersection first
            if (nx > 0) {
                // Coming from left
                intersectX = cardRight;
                intersectY = point.y + (nx !== 0 ? (ny / nx) * (cardRight - point.x) : 0);
            } else {
                // Coming from right
                intersectX = cardLeft;
                intersectY = point.y + (nx !== 0 ? (ny / nx) * (cardLeft - point.x) : 0);
            }
        } else {
            // Vertical intersection first
            if (ny > 0) {
                // Coming from top
                intersectY = cardBottom;
                intersectX = point.x + (ny !== 0 ? (nx / ny) * (cardBottom - point.y) : 0);
            } else {
                // Coming from bottom
                intersectY = cardTop;
                intersectX = point.x + (ny !== 0 ? (nx / ny) * (cardTop - point.y) : 0);
            }
        }
        
        // Clamp to card boundaries
        intersectX = Math.max(cardLeft, Math.min(cardRight, intersectX));
        intersectY = Math.max(cardTop, Math.min(cardBottom, intersectY));
        
        return { x: intersectX, y: intersectY };
    };

    // View switcher
    const viewModes: { mode: ViewMode; icon: React.ReactNode; label: string }[] = [
        { mode: 'network', icon: <Network className="w-4 h-4" />, label: 'Network View' },
        { mode: 'grid', icon: <Grid3x3 className="w-4 h-4" />, label: 'Grid View' },
        { mode: 'table', icon: <Table className="w-4 h-4" />, label: 'Table View' },
    ];

    // Render different views
    if (viewMode === 'grid') {
        return (
            <div className="flex flex-col h-full">
                <div className="flex justify-end mb-4 flex-shrink-0">
                    <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-1">
                        {viewModes.map(({ mode, icon, label }) => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                                    viewMode === mode
                                        ? 'bg-blue-600 text-white'
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                            >
                                {icon}
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
                <DigitalTwinGrid dataPoints={dataPoints} />
            </div>
        );
    }

    if (viewMode === 'table') {
        return (
            <div className="flex flex-col h-full">
                <div className="flex justify-end mb-4 flex-shrink-0">
                    <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-1">
                        {viewModes.map(({ mode, icon, label }) => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                                    viewMode === mode
                                        ? 'bg-blue-600 text-white'
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                            >
                                {icon}
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
                <DigitalTwinTable dataPoints={dataPoints} />
            </div>
        );
    }

    // Network view (original SVG view)
    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-end mb-4 flex-shrink-0">
                <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-1">
                    {viewModes.map(({ mode, icon, label }) => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                                viewMode === mode
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                            {icon}
                            {label}
                        </button>
                    ))}
                </div>
            </div>
            <div className="flex-1 min-h-0">
                <svg width="100%" height="100%" viewBox="0 0 450 350" preserveAspectRatio="xMidYMid meet">
            <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" className="fill-current text-gray-400 dark:text-gray-500" />
                </marker>
            </defs>

            {/* Render arrows first (behind cards) */}
            <g style={{ opacity: 0.6 }}>
                {dataPoints.map((point, index) => {
                    const anchor = getAnchorPoint(point);
                    const cardEdge = getCardEdgePoint(point, anchor);
                    
                    // Create a curved path that goes around the card
                    const midX = (anchor.x + cardEdge.x) / 2;
                    const midY = (anchor.y + cardEdge.y) / 2;
                    
                    // Adjust control point to create a smoother curve that avoids card content
                    const controlX = midX + (cardEdge.y - anchor.y) * 0.3;
                    const controlY = midY - (cardEdge.x - anchor.x) * 0.3;
                    
                    const pathData = `M ${anchor.x} ${anchor.y} Q ${controlX} ${controlY}, ${cardEdge.x} ${cardEdge.y}`;
                    
                    return (
                        <path
                            key={`line-${point.id || point.label || index}`}
                            d={pathData}
                            className="stroke-current text-gray-400 dark:text-gray-500"
                            strokeWidth="1.5"
                            fill="none"
                            markerEnd="url(#arrowhead)"
                        />
                    );
                })}
            </g>

            {/* Central asset */}
            <g>
                <rect x={asset.x} y={asset.y} width={asset.width} height={asset.height} rx="5" className="fill-current text-gray-200 dark:text-gray-700" />
                <rect x={asset.x + 5} y={asset.y + 5} width={asset.width - 10} height={asset.height - 10} rx="3" className="fill-current text-gray-300 dark:text-gray-600" />
            </g>
            
            {/* Render cards last (on top of arrows) */}
            <g>
                {dataPoints.map((point, index) => (
                    <DataPoint key={point.id || point.label || `point-${index}`} point={point} />
                ))}
            </g>
        </svg>
            </div>
        </div>
    );
};

export default DigitalTwin;