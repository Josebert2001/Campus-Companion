import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface VoiceInputProps {
  onTranscription: (text: string) => void;
  disabled?: boolean;
}

export default function VoiceInput({ onTranscription, disabled }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorderRef.current.onstop = async () => {
        setIsProcessing(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        try {
          // Convert to base64
          const reader = new FileReader();
          reader.onload = async () => {
            const base64Audio = (reader.result as string).split(',')[1];
            
            // Send to voice-to-text edge function
            const { data, error } = await supabase.functions.invoke('voice-to-text', {
              body: { audio: base64Audio }
            });
            
            if (error) throw error;
            
            onTranscription(data?.text || '');
            toast.success("Voice transcribed successfully!");
          };
          reader.readAsDataURL(audioBlob);
        } catch (error) {
          console.error('Voice processing error:', error);
          toast.error("Failed to process voice. Please try again.");
        } finally {
          setIsProcessing(false);
        }
        
        // Clean up stream
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
      toast.info("Recording started - speak now!");
    } catch (error) {
      console.error('Microphone access error:', error);
      toast.error("Cannot access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast.info("Processing voice...");
    }
  };

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isRecording]);

  return (
    <div className="flex items-center gap-2">
      <Button
        size="icon"
        variant={isRecording ? "destructive" : "outline"}
        onClick={isRecording ? stopRecording : startRecording}
        disabled={disabled || isProcessing}
        className={`${isRecording ? 'animate-pulse' : ''} transition-all`}
      >
        {isRecording ? (
          <Square className="w-4 h-4" />
        ) : isProcessing ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <Mic className="w-4 h-4" />
        )}
      </Button>
      
      {isRecording && (
        <div className="flex items-center gap-1 text-sm text-destructive animate-pulse">
          <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
          Recording...
        </div>
      )}
    </div>
  );
}