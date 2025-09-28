import { useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface VoiceOutputProps {
  text: string;
  disabled?: boolean;
}

export default function VoiceOutput({ text, disabled }: VoiceOutputProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  const speakText = async () => {
    if (isPlaying) {
      stopSpeaking();
      return;
    }

    try {
      setIsPlaying(true);
      
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { 
          text: text.slice(0, 4000), // Limit text length
          voice: 'alloy'
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
    <Button
      size="sm"
      variant="ghost"
      onClick={speakText}
      disabled={disabled || !text.trim()}
      className="h-6 w-6 p-0 opacity-70 hover:opacity-100 transition-opacity"
    >
      {isPlaying ? (
        <VolumeX className="w-3 h-3" />
      ) : (
        <Volume2 className="w-3 h-3" />
      )}
    </Button>
  );
}