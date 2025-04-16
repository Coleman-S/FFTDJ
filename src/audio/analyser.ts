export class AudioAnalyser {
    private analyser: AnalyserNode;
    private dataArray: Uint8Array;

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