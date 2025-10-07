import { useState } from "react";
import { Volume2, VolumeX, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface VoiceOutputProps {
  text: string;
  disabled?: boolean;
}

export default function VoiceOutput({ text, disabled }: VoiceOutputProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [voice, setVoice] = useState<'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'>('nova');

  const speakText = async () => {
    if (isPlaying) {
      stopSpeaking();
      return;
    }

    try {
      setIsPlaying(true);

      // Check if browser supports speech synthesis
      if (!('speechSynthesis' in window)) {
        throw new Error("Speech synthesis not supported in this browser");
      }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text.slice(0, 4000));

      // Configure voice settings
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Try to use a voice based on preference
      const voices = window.speechSynthesis.getVoices();
      let selectedVoice = null;

      // Map voice preference to browser voice names
      if (voice === 'nova' || voice === 'shimmer') {
        selectedVoice = voices.find(v =>
          v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Victoria')
        );
      } else if (voice === 'onyx') {
        selectedVoice = voices.find(v =>
          v.name.includes('Male') || v.name.includes('Daniel') || v.name.includes('Alex')
        );
      }

      if (!selectedVoice) {
        selectedVoice = voices.find(v => v.lang.startsWith('en'));
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.onend = () => {
        setIsPlaying(false);
        setAudio(null);
      };

      utterance.onerror = (event) => {
        console.error("Speech synthesis error:", event);
        setIsPlaying(false);
        setAudio(null);
        toast.error("Audio playback failed");
      };

      window.speechSynthesis.speak(utterance);
      toast.success("Playing...");

    } catch (error) {
      console.error('Text-to-speech error:', error);
      toast.error("Failed to generate speech. Please try again.");
      setIsPlaying(false);
    }
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setAudio(null);
    setIsPlaying(false);
  };

  return (
    <div className="flex items-center gap-1">
      {/* Voice Settings */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 opacity-50 hover:opacity-100 transition-opacity"
            disabled={disabled || isPlaying}
          >
            <Settings className="w-2 h-2" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-3" side="top">
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Voice Settings</h4>
            
            <div className="space-y-2">
              <label className="text-xs font-medium">Voice:</label>
              <select
                value={voice}
                onChange={(e) => setVoice(e.target.value as any)}
                className="w-full text-xs px-2 py-1 rounded border bg-background"
              >
                <option value="nova">Nova (Warm)</option>
                <option value="alloy">Alloy (Neutral)</option>
                <option value="echo">Echo (Clear)</option>
                <option value="fable">Fable (Expressive)</option>
                <option value="onyx">Onyx (Deep)</option>
                <option value="shimmer">Shimmer (Bright)</option>
              </select>
            </div>
            
            <p className="text-xs text-muted-foreground">
              Voice is auto-selected based on content type
            </p>
          </div>
        </PopoverContent>
      </Popover>
      
      <Button
        size="sm"
        variant="ghost"
        onClick={speakText}
        disabled={disabled || !text.trim()}
        className="h-6 w-6 p-0 opacity-70 hover:opacity-100 transition-opacity neuro-btn"
        title={isPlaying ? 'Stop playback' : 'Listen to response'}
      >
        {isPlaying ? (
          <VolumeX className="w-3 h-3" />
        ) : (
          <Volume2 className="w-3 h-3" />
        )}
      </Button>
    </div>
  );
}