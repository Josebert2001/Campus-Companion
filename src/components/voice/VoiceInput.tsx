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
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant={isRecording ? "destructive" : "outline"}
          disabled={disabled || isProcessing}
          className={isRecording ? "animate-pulse" : ""}
          title={isRecording ? 'Recording...' : 'Voice input'}
        >
          {isRecording ? (
            <Square className="w-4 h-4" />
          ) : isProcessing ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <Mic className="w-4 h-4" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 bg-popover z-50" side="top" align="end">
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Voice Input</h4>
          
          {/* Recording Controls */}
          <div className="flex flex-col gap-2">
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={disabled || isProcessing}
              className={`w-full ${isRecording ? 'bg-destructive hover:bg-destructive/90' : ''}`}
            >
              {isRecording ? (
                <>
                  <Square className="w-4 h-4 mr-2" />
                  Stop Recording
                </>
              ) : isProcessing ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 mr-2" />
                  Start Recording
                </>
              )}
            </Button>
            
            {isRecording && (
              <div className="text-center text-xs text-muted-foreground animate-pulse">
                🔴 Listening...
              </div>
            )}
          </div>

          {/* Voice Settings */}
          <div className="space-y-2 pt-2 border-t">
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={enhanceAcademic}
                onChange={(e) => setEnhanceAcademic(e.target.checked)}
                className="w-3 h-3"
              />
              Academic Enhancement
            </label>
            <p className="text-xs text-muted-foreground pl-5">
              Better recognition of academic terms
            </p>
            
            <div className="space-y-1 pt-1">
              <label className="text-xs font-medium">Language:</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full text-xs px-2 py-1.5 rounded border bg-background"
              >
                <option value="en">English</option>
                <option value="en-NG">Nigerian English</option>
                <option value="auto">Auto-detect</option>
              </select>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}