export class AudioAnalyser {
    private analyser: AnalyserNode;
    private dataArray: Uint8Array;
    private useTestData: boolean = false;
    private testOscillator: OscillatorNode | null = null;
    private testGain: GainNode | null = null;

    constructor(context: AudioContext) {
        this.analyser = context.createAnalyser();
        this.analyser.fftSize = 1024;
        this.analyser.smoothingTimeConstant = 0.8;
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        console.log(`Analyser created with fftSize: ${this.analyser.fftSize}, frequencyBinCount: ${this.analyser.frequencyBinCount}`);
    }

    connect(source: AudioNode) {
        source.connect(this.analyser);
        console.log('Analyser connected to audio source');
    }

    // New method to enable test oscillator
    enableTestMode(context: AudioContext) {
        if (this.testOscillator) return; // Already enabled
        
        console.log('Enabling test oscillator mode');
        this.useTestData = true;
        
        // Create oscillator
        this.testOscillator = context.createOscillator();
        this.testOscillator.type = 'sine';
        this.testOscillator.frequency.value = 440; // A4 note
        
        // Create gain node to control volume
        this.testGain = context.createGain();
        this.testGain.gain.value = 0.5;
        
        // Connect oscillator -> gain -> analyser
        this.testOscillator.connect(this.testGain);
        this.testGain.connect(this.analyser);
        
        // Start the oscillator
        this.testOscillator.start();
        
        // Create LFO to modulate the frequency for more interesting visuals
        const lfo = context.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.2; // Slow modulation
        
        const lfoGain = context.createGain();
        lfoGain.gain.value = 100; // Modulation depth
        
        lfo.connect(lfoGain);
        lfoGain.connect(this.testOscillator.frequency);
        lfo.start();
        
        console.log('Test oscillator started');
    }

    // New method to disable test oscillator
    disableTestMode() {
        if (!this.testOscillator) return;
        
        console.log('Disabling test oscillator mode');
        this.useTestData = false;
        this.testOscillator.stop();
        this.testOscillator.disconnect();
        this.testOscillator = null;
        
        if (this.testGain) {
            this.testGain.disconnect();
            this.testGain = null;
        }
    }

    isSoundDetected(): boolean {
        const intensity = this.getAudioIntensity();
        console.log('Sound detected:', intensity > 10, 'with intensity:', intensity);
        return intensity > 10;
    }
    
    getAudioIntensity(): number {
        this.analyser.getByteFrequencyData(this.dataArray);
        console.log('Sample frequency values:', this.dataArray[0], this.dataArray[1], this.dataArray[2], this.dataArray[3]);
        
        const average = this.dataArray.reduce((a, b) => a + b, 0) / this.dataArray.length;
        console.log('Audio intensity calculated:', average);
        return average;
    }
    
    getAnalyserNode(): AnalyserNode {
        return this.analyser;
    }
} 