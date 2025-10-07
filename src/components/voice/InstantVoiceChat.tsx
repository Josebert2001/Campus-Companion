import { useState, useRef, useEffect } from "react";
import { Mic, X, Volume2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { VoiceActivityDetector } from "@/utils/voiceActivityDetection";
import { useAuth } from "@/hooks/useAuth";

interface VoiceMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: Date;
}

interface InstantVoiceChatProps {
  onClose: () => void;
}

type VoiceState = "initializing" | "listening" | "processing" | "speaking" | "idle";

export default function InstantVoiceChat({ onClose }: InstantVoiceChatProps) {
  const { user } = useAuth();
  const [state, setState] = useState<VoiceState>("initializing");
  const [audioLevel, setAudioLevel] = useState(0);
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [continuousMode, setContinuousMode] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const vadRef = useRef<VoiceActivityDetector | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const levelIntervalRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    initializeVoiceMode();
    return () => cleanup();
  }, []);

  const initializeVoiceMode = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      if (user) {
        const { data } = await supabase
          .from("conversation_sessions")
          .insert({
            user_id: user.id,
            title: "Instant Voice Chat",
            type: "voice",
          })
          .select()
          .single();

        if (data) setSessionId(data.id);
      }

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
        if (audioChunksRef.current.length > 0 && state !== "speaking") {
          processAudio();
        }
        audioChunksRef.current = [];
      };

      const vad = new VoiceActivityDetector();
      vadRef.current = vad;

      await vad.initialize(
        stream,
        () => {
          if (state === "idle" || state === "initializing") {
            setState("listening");
            if (mediaRecorder.state === "inactive") {
              audioChunksRef.current = [];
              mediaRecorder.start();
            }
          }
        },
        () => {
          if (state === "listening" && mediaRecorder.state === "recording") {
            mediaRecorder.stop();
          }
        }
      );

      levelIntervalRef.current = window.setInterval(() => {
        const level = vad.getCurrentLevel();
        setAudioLevel(level);
      }, 50);

      setState("idle");
      toast.success("Voice mode ready - start speaking!");
    } catch (error) {
      console.error("Failed to initialize voice mode:", error);
      toast.error("Could not access microphone. Please check permissions.");
      onClose();
    }
  };

  const processAudio = async () => {
    if (audioChunksRef.current.length === 0) return;

    setState("processing");

    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      const reader = new FileReader();

      reader.onloadend = async () => {
        const base64Audio = reader.result?.toString().split(",")[1];
        if (!base64Audio) {
          toast.error("Failed to process audio");
          setState("idle");
          return;
        }

        const { data: transcriptionData, error: transcriptionError } =
          await supabase.functions.invoke("enhanced-voice", {
            body: {
              audio: base64Audio,
              action: "transcribe",
              enhance_academic: true,
              language: "en",
              context: "University of Uyo instant voice conversation",
            },
          });

        if (transcriptionError || !transcriptionData?.success) {
          throw new Error("Transcription failed");
        }

        const userText = transcriptionData.text.trim();

        if (!userText || userText.length < 2) {
          setState("idle");
          return;
        }

        const userMessage: VoiceMessage = {
          id: Date.now().toString(),
          role: "user",
          text: userText,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);

        const conversationHistory = messages.map((msg) => ({
          role: msg.role,
          content: msg.text,
        }));

        const { data: aiData, error: aiError } = await supabase.functions.invoke(
          "ai-chat",
          {
            body: {
              message: userText,
              context: "Instant voice conversation with University of Uyo student",
              session_id: sessionId,
              history: conversationHistory,
            },
          }
        );

        if (aiError || !aiData?.response) {
          throw new Error("AI response failed");
        }

        const aiText = aiData.response;

        const aiMessage: VoiceMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          text: aiText,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, aiMessage]);

        await speakResponse(aiText);
      };

      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error("Error processing audio:", error);
      toast.error("Failed to process your speech");
      setState("idle");
    }
  };

  const speakResponse = async (text: string) => {
    setState("speaking");

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
        if (continuousMode) {
          setState("idle");
        } else {
          setState("idle");
        }
      };

      utterance.onerror = (event) => {
        console.error("Speech synthesis error:", event);
        toast.error("Failed to play audio response");
        setState("idle");
      };

      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error("Error speaking response:", error);
      toast.error("Could not speak the response");
      setState("idle");
    }
  };

  const cleanup = () => {
    // Stop any ongoing speech
    window.speechSynthesis.cancel();

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (vadRef.current) {
      vadRef.current.stop();
      vadRef.current = null;
    }

    if (levelIntervalRef.current) {
      clearInterval(levelIntervalRef.current);
      levelIntervalRef.current = null;
    }
  };

  const handleClose = () => {
    cleanup();
    onClose();
  };

  const getStatusText = () => {
    switch (state) {
      case "initializing":
        return "Initializing microphone...";
      case "listening":
        return "Listening to you...";
      case "processing":
        return "Processing your speech...";
      case "speaking":
        return "AI is speaking...";
      case "idle":
        return "Start speaking anytime...";
      default:
        return "Voice mode active";
    }
  };

  const getStatusIcon = () => {
    switch (state) {
      case "initializing":
        return <Loader2 className="w-12 h-12 animate-spin text-primary" />;
      case "listening":
        return <Mic className="w-12 h-12 text-red-500 animate-pulse" />;
      case "processing":
        return <Loader2 className="w-12 h-12 animate-spin text-primary" />;
      case "speaking":
        return <Volume2 className="w-12 h-12 text-primary animate-pulse" />;
      case "idle":
        return <Mic className="w-12 h-12 text-muted-foreground" />;
      default:
        return <Mic className="w-12 h-12 text-primary" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-lg flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h2 className="text-lg font-semibold">Voice Chat</h2>
          <p className="text-xs text-muted-foreground">Speak naturally - I'm listening</p>
        </div>
        <Button variant="ghost" size="icon" onClick={handleClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="relative">
          <div
            className="p-8 rounded-full bg-primary/10 transition-all duration-300"
            style={{
              transform: `scale(${1 + audioLevel / 150})`,
            }}
          >
            {getStatusIcon()}
          </div>

          {state === "listening" && (
            <>
              <div
                className="absolute inset-0 rounded-full border-4 border-red-500 animate-ping"
                style={{ opacity: 0.5 }}
              />
              <div
                className="absolute inset-0 rounded-full border-4 border-red-500"
                style={{
                  transform: `scale(${1 + audioLevel / 100})`,
                  opacity: audioLevel / 100,
                }}
              />
            </>
          )}
        </div>

        <div className="mt-8 text-center space-y-2">
          <h3 className="text-xl font-semibold">{getStatusText()}</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {state === "idle" && "Just start talking - I'll automatically detect when you stop"}
            {state === "listening" && "Keep speaking, I'm capturing your voice..."}
            {state === "processing" && "Converting your speech to text..."}
            {state === "speaking" && "Listen to my response..."}
            {state === "initializing" && "Getting everything ready..."}
          </p>
        </div>

        {messages.length > 0 && (
          <div className="mt-8 w-full max-w-2xl max-h-64 overflow-y-auto space-y-3 px-4">
            {messages.slice(-4).map((message) => (
              <div
                key={message.id}
                className={`p-3 rounded-lg ${
                  message.role === "user"
                    ? "bg-primary/10 ml-12 text-right"
                    : "bg-muted mr-12"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {message.role === "user" ? (
                    <Mic className="w-3 h-3 ml-auto" />
                  ) : (
                    <Volume2 className="w-3 h-3" />
                  )}
                  <span className="text-xs font-semibold">
                    {message.role === "user" ? "You" : "AI"}
                  </span>
                </div>
                <p className="text-sm">{message.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t p-4 flex items-center justify-center gap-4">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={continuousMode}
            onChange={(e) => setContinuousMode(e.target.checked)}
            className="w-4 h-4"
          />
          Continuous conversation
        </label>
      </div>
    </div>
  );
}
