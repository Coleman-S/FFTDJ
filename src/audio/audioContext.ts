export class AudioManager {
    private context: AudioContext;
    private mediaStream: MediaStream | null = null;

    constructor() {
        this.context = new AudioContext();
    }

    async initialize() {
        try {
            console.log('Requesting microphone access...');
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                } 
            });
            console.log('Microphone access granted!');
            
            const source = this.context.createMediaStreamSource(this.mediaStream);
            return source;
        } catch (error) {
            console.error('Error accessing microphone:', error);
            throw error;
        }
    }

    async loadAudioFile(file: File): Promise<AudioBuffer> {
        const arrayBuffer = await file.arrayBuffer();
        return await this.context.decodeAudioData(arrayBuffer);
    }

    getContext(): AudioContext {
        return this.context;
    }
} 