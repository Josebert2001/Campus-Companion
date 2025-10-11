export class VoiceActivityDetector {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private frequencyData: Uint8Array | null = null;
  private stream: MediaStream | null = null;
  private animationFrame: number | null = null;
  private silenceTimeout: number | null = null;
  private lastCheckTime: number = 0;
  private speechStartTime: number = 0;

  private readonly SILENCE_THRESHOLD = 40;
  private readonly SILENCE_DURATION = 600;
  private readonly SPEECH_THRESHOLD = 50;
  private readonly MIN_SPEECH_DURATION = 300;
  private readonly CHECK_INTERVAL = 50;
  private readonly VOICE_FREQ_MIN = 85;
  private readonly VOICE_FREQ_MAX = 255;

  private onSpeechStart: (() => void) | null = null;
  private onSpeechEnd: (() => void) | null = null;
  private isSpeaking = false;
  private isActive = false;

  async initialize(
    stream: MediaStream,
    onSpeechStart: () => void,
    onSpeechEnd: () => void
  ): Promise<void> {
    if (!stream || !stream.active) {
      throw new Error("Invalid or inactive media stream");
    }

    this.stream = stream;
    this.onSpeechStart = onSpeechStart;
    this.onSpeechEnd = onSpeechEnd;
    this.isActive = true;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error("Web Audio API not supported");
      }

      this.audioContext = new AudioContextClass();

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.3;

      const source = this.audioContext.createMediaStreamSource(stream);
      source.connect(this.analyser);

      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);

      this.startDetection();
    } catch (error) {
      this.cleanup();
      throw error;
    }
  }

  private startDetection(): void {
    const checkAudioLevel = () => {
      if (!this.isActive || !this.analyser || !this.dataArray || !this.frequencyData) {
        return;
      }

      const now = Date.now();
      if (now - this.lastCheckTime < this.CHECK_INTERVAL) {
        this.animationFrame = requestAnimationFrame(checkAudioLevel);
        return;
      }
      this.lastCheckTime = now;

      try {
        this.analyser.getByteFrequencyData(this.frequencyData);

        const voiceLevel = this.getVoiceFrequencyLevel();

        if (voiceLevel > this.SPEECH_THRESHOLD && !this.isSpeaking) {
          if (this.silenceTimeout) {
            clearTimeout(this.silenceTimeout);
            this.silenceTimeout = null;
          }

          this.isSpeaking = true;
          this.speechStartTime = now;

          if (this.onSpeechStart && this.isActive) {
            this.onSpeechStart();
          }
        }

        if (voiceLevel < this.SILENCE_THRESHOLD && this.isSpeaking) {
          const speechDuration = now - this.speechStartTime;

          if (speechDuration >= this.MIN_SPEECH_DURATION) {
            if (!this.silenceTimeout) {
              this.silenceTimeout = window.setTimeout(() => {
                if (this.isSpeaking && this.isActive) {
                  this.isSpeaking = false;
                  if (this.onSpeechEnd) {
                    this.onSpeechEnd();
                  }
                }
                this.silenceTimeout = null;
              }, this.SILENCE_DURATION);
            }
          } else {
            this.isSpeaking = false;
            this.speechStartTime = 0;
          }
        } else if (voiceLevel > this.SILENCE_THRESHOLD && this.silenceTimeout) {
          clearTimeout(this.silenceTimeout);
          this.silenceTimeout = null;
        }
      } catch (error) {
        console.error("VAD detection error:", error);
      }

      if (this.isActive) {
        this.animationFrame = requestAnimationFrame(checkAudioLevel);
      }
    };

    checkAudioLevel();
  }

  private getVoiceFrequencyLevel(): number {
    if (!this.frequencyData || !this.analyser) return 0;

    const nyquist = this.audioContext!.sampleRate / 2;
    const binWidth = nyquist / this.frequencyData.length;

    const minBin = Math.floor(this.VOICE_FREQ_MIN / binWidth);
    const maxBin = Math.ceil(this.VOICE_FREQ_MAX / binWidth);

    let sum = 0;
    let count = 0;

    for (let i = minBin; i < maxBin && i < this.frequencyData.length; i++) {
      sum += this.frequencyData[i];
      count++;
    }

    return count > 0 ? sum / count : 0;
  }

  getCurrentLevel(): number {
    if (!this.frequencyData || !this.analyser || !this.isActive) return 0;

    try {
      return this.getVoiceFrequencyLevel();
    } catch (error) {
      return 0;
    }
  }

  isDetectionActive(): boolean {
    return this.isActive && this.isSpeaking;
  }

  stop(): void {
    this.isActive = false;
    this.cleanup();
  }

  private cleanup(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
      this.silenceTimeout = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch (error) {
        console.error("Error closing audio context:", error);
      }
      this.audioContext = null;
    }

    this.analyser = null;
    this.dataArray = null;
    this.frequencyData = null;
    this.stream = null;
    this.isSpeaking = false;
    this.speechStartTime = 0;
    this.lastCheckTime = 0;
  }
}
