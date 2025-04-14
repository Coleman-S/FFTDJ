export interface Preset {
    name: string;
    simulationSpeed: number;
    particleCount: number;
    visualizationMode: '2D' | '3D';
}

export const defaultPresets: Preset[] = [
    {
        name: 'Default',
        simulationSpeed: 1.0,
        particleCount: 1000,
        visualizationMode: '2D'
    },
    {
        name: 'High Performance',
        simulationSpeed: 0.5,
        particleCount: 500,
        visualizationMode: '2D'
    },
    {
        name: 'Visual Quality',
        simulationSpeed: 1.0,
        particleCount: 5000,
        visualizationMode: '3D'
    }
];

export const savePreset = (preset: Preset): void => {
    const presets = loadPresets();
    presets.push(preset);
    localStorage.setItem('visualizer-presets', JSON.stringify(presets));
};

export const loadPresets = (): Preset[] => {
    const saved = localStorage.getItem('visualizer-presets');
    if (saved) {
        return JSON.parse(saved);
    }
    return defaultPresets;
}; 