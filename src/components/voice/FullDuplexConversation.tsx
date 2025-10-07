import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Volume2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { VoiceActivityDetector } from "@/utils/voiceActivityDetection";

interface ConversationTurn {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: Date;
  isPlaying?: boolean;
}

interface FullDuplexConversationProps {
  sessionId?: string;
  onSessionChange?: (sessionId: string) => void;
}

export default function FullDuplexConversation({
  sessionId,
  onSessionChange,
}: FullDuplexConversationProps) {
  const [isActive, setIsActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [conversation, setConversation] = useState<ConversationTurn[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState(sessionId);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const vadRef = useRef<VoiceActivityDetector | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const levelCheckIntervalRef = useRef<number | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      stopConversation();
    };
  }, []);

  const startConversation = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });
      mediaRecorderRef.current = mediaRecorder;

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (audioChunksRef.current.length > 0) {
          processAudio();
        }

        if (isActive && mediaRecorderRef.current) {
          audioChunksRef.current = [];
          if (mediaRecorderRef.current.state === "inactive") {
            mediaRecorderRef.current.start();
          }
        }
      };

      const vad = new VoiceActivityDetector();
      vadRef.current = vad;

      await vad.initialize(
        stream,
        () => {
          console.log("Speech detected");
          setIsListening(true);
        },
        () => {
          console.log("Silence detected - processing audio");
          setIsListening(false);
          if (mediaRecorder.state === "recording" && !isSpeaking && !isProcessing) {
            mediaRecorder.stop();
          }
        }
      );

      levelCheckIntervalRef.current = window.setInterval(() => {
        const level = vad.getCurrentLevel();
        setAudioLevel(level);
      }, 100);

      mediaRecorder.start();
      setIsActive(true);
      toast.success("Voice conversation started - start speaking!");
    } catch (error) {
      console.error("Error starting conversation:", error);
      toast.error("Could not access microphone");
    }
  };

  const processAudio = async () => {
    if (audioChunksRef.current.length === 0) return;

    setIsProcessing(true);

    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      const reader = new FileReader();

      reader.onloadend = async () => {
        const base64Audio = reader.result?.toString().split(",")[1];
        if (!base64Audio) {
          toast.error("Failed to process audio");
          setIsProcessing(false);
          return;
        }

        const { data: transcriptionData, error: transcriptionError } =
          await supabase.functions.invoke("enhanced-voice", {
            body: {
              audio: base64Audio,
              action: "transcribe",
              enhance_academic: true,
              context: "University of Uyo student in voice conversation",
            },
          });

        if (transcriptionError || !transcriptionData?.success) {
          throw new Error("Transcription failed");
        }

        const userText = transcriptionData.text;

        const userTurn: ConversationTurn = {
          id: Date.now().toString(),
          role: "user",
          text: userText,
          timestamp: new Date(),
        };

        setConversation((prev) => [...prev, userTurn]);

        const conversationHistory = conversation.map((turn) => ({
          role: turn.role,
          content: turn.text,
        }));

        const { data: aiData, error: aiError } = await supabase.functions.invoke(
          "ai-chat",
          {
            body: {
              message: userText,
              context: "Voice conversation with University of Uyo student",
              session_id: currentSessionId,
              history: conversationHistory,
            },
          }
        );

        if (aiError || !aiData?.response) {
          throw new Error("AI response failed");
        }

        const aiText = aiData.response;
        const newSessionId = aiData.session_id || currentSessionId;

        if (newSessionId && newSessionId !== currentSessionId) {
          setCurrentSessionId(newSessionId);
          onSessionChange?.(newSessionId);
        }

        const aiTurn: ConversationTurn = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          text: aiText,
          timestamp: new Date(),
          isPlaying: true,
        };

        setConversation((prev) => [...prev, aiTurn]);

        await speakResponse(aiText, aiTurn.id);

        setIsProcessing(false);
      };

      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error("Error processing audio:", error);
      toast.error("Failed to process your speech");
      setIsProcessing(false);
    }
  };

  const speakResponse = async (text: string, turnId: string) => {
    setIsSpeaking(true);

    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.pause();
    }

    try {
      // Check if browser supports speech synthesis
      if (!('speechSynthesis' in window)) {
        throw new Error("Speech synthesis not supported in this browser");
      }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);

      // Configure voice settings
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Try to use a natural female voice
      const voices = window.speechSynthesis.getVoices();
      const femaleVoice = voices.find(voice =>
        voice.name.includes('Female') ||
        voice.name.includes('Samantha') ||
        voice.name.includes('Victoria') ||
        voice.lang.startsWith('en')
      );

      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }

      utterance.onend = () => {
        setIsSpeaking(false);
        setConversation((prev) =>
          prev.map((turn) =>
            turn.id === turnId ? { ...turn, isPlaying: false } : turn
          )
        );

        if (mediaRecorderRef.current?.state === "paused") {
          audioChunksRef.current = [];
          mediaRecorderRef.current.resume();
        }
      };

      utterance.onerror = (event) => {
        console.error("Speech synthesis error:", event);
        setIsSpeaking(false);
        toast.error("Failed to play audio response");

        if (mediaRecorderRef.current?.state === "paused") {
          audioChunksRef.current = [];
          mediaRecorderRef.current.resume();
        }
      };

      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error("Error speaking response:", error);
      setIsSpeaking(false);
      toast.error("Could not speak the response");

      if (mediaRecorderRef.current?.state === "paused") {
        audioChunksRef.current = [];
        mediaRecorderRef.current.resume();
      }
    }
  };

  const stopConversation = () => {
    // Stop any ongoing speech
    window.speechSynthesis.cancel();

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    if (mediaRecorderRef.current) {
      const stream = mediaRecorderRef.current.stream;
      if (mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      stream.getTracks().forEach((track) => track.stop());
      mediaRecorderRef.current = null;
    }

    if (vadRef.current) {
      vadRef.current.stop();
      vadRef.current = null;
    }

    if (levelCheckIntervalRef.current) {
      clearInterval(levelCheckIntervalRef.current);
      levelCheckIntervalRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsActive(false);
    setIsListening(false);
    setIsSpeaking(false);
    setIsProcessing(false);
    setAudioLevel(0);
  };

  const getStatusText = () => {
    if (!isActive) return "Start Voice Conversation";
    if (isSpeaking) return "AI is speaking...";
    if (isProcessing) return "Processing your speech...";
    if (isListening) return "Listening to you...";
    return "Waiting for you to speak...";
  };

  const getStatusIcon = () => {
    if (isSpeaking) return <Volume2 className="w-5 h-5 animate-pulse" />;
    if (isProcessing) return <Loader2 className="w-5 h-5 animate-spin" />;
    if (isListening) return <Mic className="w-5 h-5 animate-pulse text-red-500" />;
    return <Mic className="w-5 h-5" />;
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6 space-y-4">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div
              className={`relative p-6 rounded-full transition-all duration-300 ${
                isActive
                  ? "bg-primary/20"
                  : "bg-muted"
              }`}
            >
              {getStatusIcon()}
              {isActive && (
                <div
                  className="absolute inset-0 rounded-full border-4 border-primary transition-all duration-300"
                  style={{
                    transform: `scale(${1 + audioLevel / 100})`,
                    opacity: audioLevel / 100,
                  }}
                />
              )}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-lg">{getStatusText()}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {isActive
                ? "Speak naturally - I'll listen and respond automatically"
                : "Click to start a hands-free voice conversation"}
            </p>
          </div>

          <Button
            onClick={isActive ? stopConversation : startConversation}
            variant={isActive ? "destructive" : "default"}
            size="lg"
            className="w-full"
          >
            {isActive ? (
              <>
                <MicOff className="w-4 h-4 mr-2" />
                End Conversation
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 mr-2" />
                Start Voice Conversation
              </>
            )}
          </Button>
        </div>

        {conversation.length > 0 && (
          <div className="mt-6 space-y-3 max-h-96 overflow-y-auto">
            <h4 className="font-semibold text-sm text-muted-foreground">
              Conversation History
            </h4>
            {conversation.map((turn) => (
              <div
                key={turn.id}
                className={`p-3 rounded-lg ${
                  turn.role === "user"
                    ? "bg-primary/10 ml-8"
                    : "bg-muted mr-8"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {turn.role === "user" ? (
                    <Mic className="w-3 h-3" />
                  ) : (
                    <Volume2 className="w-3 h-3" />
                  )}
                  <span className="text-xs font-semibold">
                    {turn.role === "user" ? "You" : "AI"}
                  </span>
                  {turn.isPlaying && (
                    <span className="text-xs text-muted-foreground animate-pulse">
                      Playing...
                    </span>
                  )}
                </div>
                <p className="text-sm">{turn.text}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
