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
      
      const { data, error } = await supabase.functions.invoke('enhanced-voice', {
        body: { 
          text: text.slice(0, 4000), // Limit text length
          action: 'synthesize',
          voice: voice,
          context: 'University of Uyo academic content'
        }
      });

      if (error) throw error;
      
      const audioContent = data?.audioContent;
      if (!audioContent) throw new Error('No audio content received');
      
      // Create audio blob and play
      const audioBlob = new Blob(
        [Uint8Array.from(atob(audioContent), c => c.charCodeAt(0))],
        { type: 'audio/mpeg' }
      );
      
      const audioUrl = URL.createObjectURL(audioBlob);
      const audioElement = new Audio(audioUrl);
      
      audioElement.onended = () => {
        setIsPlaying(false);
        setAudio(null);
        URL.revokeObjectURL(audioUrl);
      };
      
      audioElement.onerror = () => {
        setIsPlaying(false);
        setAudio(null);
        URL.revokeObjectURL(audioUrl);
        toast.error("Audio playback failed");
      };
      
      setAudio(audioElement);
      await audioElement.play();
      
      // Enhanced feedback
      const voiceUsed = data?.voice_used || voice;
      toast.success(`Playing with ${voiceUsed} voice`);
      
    } catch (error) {
      console.error('Text-to-speech error:', error);
      toast.error("Failed to generate speech. Please try again.");
      setIsPlaying(false);
    }
  };

  const stopSpeaking = () => {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      setAudio(null);
    }
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