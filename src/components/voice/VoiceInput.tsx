import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Square, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface VoiceInputProps {
  onTranscription: (text: string) => void;
  disabled?: boolean;
}

export default function VoiceInput({ onTranscription, disabled }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [enhanceAcademic, setEnhanceAcademic] = useState(true);
  const [language, setLanguage] = useState('en');
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
            
            // Send to enhanced voice processing
            const { data, error } = await supabase.functions.invoke('enhanced-voice', {
              body: { 
                audio: base64Audio,
                action: 'transcribe',
                enhance_academic: enhanceAcademic,
                language: language,
                context: 'University of Uyo student voice input'
              }
            });
            
            if (error) throw error;
            
            const transcribedText = data?.text || '';
            onTranscription(transcribedText);
            
            // Enhanced feedback
            const processingType = data?.processing_type || 'standard';
            const agentUsed = data?.routing?.selected_agent || 'general';
            const wasEnhanced = data?.academic_enhanced || false;
            
            toast.success(
              wasEnhanced 
                ? `Voice enhanced with ${agentUsed}! (${processingType})`
                : "Voice transcribed successfully!"
            );
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
      {/* Voice Settings */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 opacity-70 hover:opacity-100"
            disabled={disabled || isRecording}
          >
            <Settings className="w-3 h-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" side="top">
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Voice Settings</h4>
            
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={enhanceAcademic}
                  onChange={(e) => setEnhanceAcademic(e.target.checked)}
                  className="w-3 h-3"
                />
                Academic Enhancement
              </label>
              <p className="text-xs text-muted-foreground">
                Improves recognition of academic terms and concepts
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-medium">Language:</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full text-xs px-2 py-1 rounded border bg-background"
              >
                <option value="en">English</option>
                <option value="en-NG">Nigerian English</option>
                <option value="auto">Auto-detect</option>
              </select>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      
      <Button
        size="icon"
        variant={isRecording ? "destructive" : "outline"}
        onClick={isRecording ? stopRecording : startRecording}
        disabled={disabled || isProcessing}
        className={`${isRecording ? 'animate-pulse neuro-btn' : 'neuro-btn'} transition-all`}
        title={isRecording ? 'Stop recording' : 'Start voice input'}
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
          {enhanceAcademic ? 'Recording (Enhanced)...' : 'Recording...'}
        </div>
      )}
    </div>
  );
}