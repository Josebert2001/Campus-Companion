export class VoiceActivityDetector {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private stream: MediaStream | null = null;
  private animationFrame: number | null = null;
  private silenceTimeout: number | null = null;

  private readonly SILENCE_THRESHOLD = 30;
  private readonly SILENCE_DURATION = 1500;
  private readonly SPEECH_THRESHOLD = 40;

  private onSpeechStart: (() => void) | null = null;
  private onSpeechEnd: (() => void) | null = null;
  private isSpeaking = false;

  async initialize(
    stream: MediaStream,
    onSpeechStart: () => void,
    onSpeechEnd: () => void
  ): Promise<void> {
    this.stream = stream;
    this.onSpeechStart = onSpeechStart;
    this.onSpeechEnd = onSpeechEnd;

    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;

    const source = this.audioContext.createMediaStreamSource(stream);
    source.connect(this.analyser);

    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    this.startDetection();
  }

  private startDetection(): void {
    const checkAudioLevel = () => {
      if (!this.analyser || !this.dataArray) return;

      this.analyser.getByteFrequencyData(this.dataArray);

      const average = this.dataArray.reduce((sum, value) => sum + value, 0) / this.dataArray.length;

      if (average > this.SPEECH_THRESHOLD && !this.isSpeaking) {
        this.isSpeaking = true;
        if (this.silenceTimeout) {
          clearTimeout(this.silenceTimeout);
          this.silenceTimeout = null;
        }
        this.onSpeechStart?.();
      }

      if (average < this.SILENCE_THRESHOLD && this.isSpeaking) {
        if (!this.silenceTimeout) {
          this.silenceTimeout = window.setTimeout(() => {
            this.isSpeaking = false;
            this.onSpeechEnd?.();
            this.silenceTimeout = null;
          }, this.SILENCE_DURATION);
        }
      } else if (average > this.SILENCE_THRESHOLD && this.silenceTimeout) {
        clearTimeout(this.silenceTimeout);
        this.silenceTimeout = null;
      }

      this.animationFrame = requestAnimationFrame(checkAudioLevel);
    };

    checkAudioLevel();
  }

  getCurrentLevel(): number {
    if (!this.analyser || !this.dataArray) return 0;

    this.analyser.getByteFrequencyData(this.dataArray);
    return this.dataArray.reduce((sum, value) => sum + value, 0) / this.dataArray.length;
  }

  stop(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
      this.silenceTimeout = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.analyser = null;
    this.dataArray = null;
    this.stream = null;
    this.isSpeaking = false;
  }
}
