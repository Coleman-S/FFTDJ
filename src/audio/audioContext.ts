export class AudioManager {
    private context: AudioContext;
    private mediaStream: MediaStream | null = null;
    private isActive: boolean = false;

    constructor() {
        // Create the audio context with appropriate options
        this.context = new (window.AudioContext || (window as any).webkitAudioContext)({
            latencyHint: 'interactive',
            sampleRate: 44100
        });
        console.log('Audio context created:', this.context.state);
        
        // Add event listeners to various user interactions to activate audio
        this.setupActivationEvents();
    }
    
    private setupActivationEvents() {
        const activateAudio = () => {
            if (this.context.state === 'suspended' && !this.isActive) {
                this.context.resume().then(() => {
                    console.log('Audio context resumed by user interaction!');
                    this.isActive = true;
                    
                    // Re-initialize if we already have a stream but audio wasn't active
                    if (this.mediaStream) {
                        console.log('Re-activating existing audio stream');
                        const source = this.context.createMediaStreamSource(this.mediaStream);
                        const event = new CustomEvent('audioSourceCreated', { detail: { source } });
                        document.dispatchEvent(event);
                    }
                });
            }
        };
        
        // Add listeners to common user interactions
        const events = ['click', 'touchstart', 'keydown'];
        events.forEach(event => {
            document.addEventListener(event, activateAudio, { once: false });
        });
        
        console.log('Audio activation events registered');
    }

    async initialize() {
        try {
            console.log('Requesting microphone access...');
            
            // First check if user media is available
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('getUserMedia is not supported in this browser');
            }
            
            // Request microphone with specific constraints for better audio quality
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                    channelCount: 1
                } 
            });
            
            console.log('Microphone access granted!');
            console.log('Media stream tracks:', this.mediaStream.getAudioTracks().length);
            
            const track = this.mediaStream.getAudioTracks()[0];
            if (track) {
                console.log('Using audio track:', track.label, 'enabled:', track.enabled);
                // Ensure track is enabled
                track.enabled = true;
            }
            
            // Try to resume the context if needed
            await this.tryResumeContext();
            
            // Check if we can create the audio source now
            if (this.isContextReady()) {
                const source = this.context.createMediaStreamSource(this.mediaStream);
                console.log('Media stream source created, state:', this.context.state);
                this.isActive = true;
                return source;
            } else {
                console.log('Audio context is not ready. First interact with the page to enable audio.');
                // Return a dummy source, will be replaced when context is activated
                return this.context.createBufferSource();
            }
        } catch (error) {
            console.error('Error accessing microphone:', error);
            throw error;
        }
    }
    
    private isContextReady(): boolean {
        // Safe way to check if context is in running state
        return this.context.state === 'running';
    }
    
    private async tryResumeContext(): Promise<void> {
        // Only try to resume if in suspended state
        if (this.context.state === 'suspended') {
            try {
                await this.context.resume();
                console.log('Audio context resumed programmatically');
            } catch (e) {
                console.warn('Could not resume audio context', e);
            }
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