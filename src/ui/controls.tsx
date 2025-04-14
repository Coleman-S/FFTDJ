import React from 'react';

interface ControlsProps {
    onSimulationSpeedChange: (speed: number) => void;
    onParticleCountChange: (count: number) => void;
    onVisualizationModeChange: (mode: '2D' | '3D') => void;
}

export const Controls: React.FC<ControlsProps> = ({
    onSimulationSpeedChange,
    onParticleCountChange,
    onVisualizationModeChange
}) => {
    return (
        <div className="controls">
            <div className="control-group">
                <label>Simulation Speed</label>
                <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    defaultValue="1"
                    onChange={(e) => onSimulationSpeedChange(parseFloat(e.target.value))}
                />
            </div>
            
            <div className="control-group">
                <label>Particle Count</label>
                <input
                    type="range"
                    min="100"
                    max="10000"
                    step="100"
                    defaultValue="1000"
                    onChange={(e) => onParticleCountChange(parseInt(e.target.value))}
                />
            </div>
            
            <div className="control-group">
                <label>Visualization Mode</label>
                <select onChange={(e) => onVisualizationModeChange(e.target.value as '2D' | '3D')}>
                    <option value="2D">2D</option>
                    <option value="3D">3D</option>
                </select>
            </div>
        </div>
    );
}; 