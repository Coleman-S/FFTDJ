export class AudioAnalyser {
    private analyser: AnalyserNode;
    private dataArray: Uint8Array;

    constructor(context: AudioContext) {
        this.analyser = context.createAnalyser();
        this.analyser.fftSize = 1024;
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    }

    connect(source: AudioNode) {
        source.connect(this.analyser);
        console.log('Analyser connected to audio source');
    }

    isSoundDetected(): boolean {
        return this.getAudioIntensity() > 10;
    }
    
    getAudioIntensity(): number {
        this.analyser.getByteFrequencyData(this.dataArray);
        const average = this.dataArray.reduce((a, b) => a + b, 0) / this.dataArray.length;
        return average;
    }
} 