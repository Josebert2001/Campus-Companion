import { useState, useRef, useEffect } from "react";
import { Mic, Volume2, PhoneOff, History, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { VoiceActivityDetector } from "@/utils/voiceActivityDetection";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isVoice: boolean;
}

export default function VoiceConversation() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const vadRef = useRef<VoiceActivityDetector | null>(null);
  const silenceTimerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (user) {
      startNewSession();
    }
  }, [user]);

  const startNewSession = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("conversation_sessions")
      .insert({
        user_id: user.id,
        title: "Voice Conversation",
        type: "voice",
      })
      .select()
      .single();

    if (data && !error) {
      setSessionId(data.id);
      setMessages([]);
      toast.success("New voice conversation started");
    }
  };

  const startRecording = async () => {
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

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      vadRef.current = new VoiceActivityDetector();
      await vadRef.current.initialize(
        stream,
        () => {
          console.log("Speech detected");
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        },
        () => {
          console.log("Silence detected - auto stopping");
          silenceTimerRef.current = window.setTimeout(() => {
            stopRecording();
          }, 1000);
        }
      );

      mediaRecorderRef.current.onstop = async () => {
        setIsProcessing(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

        try {
          const reader = new FileReader();
          reader.onload = async () => {
            const base64Audio = (reader.result as string).split(",")[1];

            // Transcribe
            const { data: transcribeData, error: transcribeError } = await supabase.functions.invoke(
              "enhanced-voice",
              {
                body: {
                  audio: base64Audio,
                  action: "transcribe",
                  enhance_academic: true,
                  language: "en",
                  context: "University of Uyo student voice conversation",
                },
              }
            );

            if (transcribeError) throw transcribeError;

            const transcribedText = transcribeData?.text || "";

            // Add user message
            const userMessage: Message = {
              id: Date.now().toString(),
              role: "user",
              content: transcribedText,
              timestamp: new Date(),
              isVoice: true,
            };
            setMessages((prev) => [...prev, userMessage]);

            // Get AI response
            const { data: aiData, error: aiError } = await supabase.functions.invoke("ai-chat", {
              body: {
                message: transcribedText,
                session_id: sessionId,
                context: "Voice conversation with University of Uyo student",
              },
            });

            if (aiError) throw aiError;

            const aiResponse = aiData?.response || "I'm having trouble responding right now.";
            const newSessionId = aiData?.session_id || sessionId;

            if (newSessionId !== sessionId) {
              setSessionId(newSessionId);
            }

            // Add AI message
            const aiMessage: Message = {
              id: (Date.now() + 1).toString(),
              role: "assistant",
              content: aiResponse,
              timestamp: new Date(),
              isVoice: false,
            };
            setMessages((prev) => [...prev, aiMessage]);

            // Auto-speak response
            if (autoSpeak) {
              await speakText(aiResponse);
            }

            toast.success("Message processed!");
          };
          reader.readAsDataURL(audioBlob);
        } catch (error) {
          console.error("Voice processing error:", error);
          toast.error("Failed to process voice. Please try again.");
        } finally {
          setIsProcessing(false);
        }

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        if (vadRef.current) {
          vadRef.current.stop();
          vadRef.current = null;
        }

        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      toast.info("Listening... Will auto-stop when you finish speaking");
    } catch (error) {
      console.error("Microphone access error:", error);
      toast.error("Cannot access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const speakText = async (text: string) => {
    if (isSpeaking) {
      stopSpeaking();
      return;
    }

    try {
      setIsSpeaking(true);

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

      // Try to use a female voice if available
      const voices = window.speechSynthesis.getVoices();
      const femaleVoice = voices.find(voice =>
        voice.name.includes('Female') ||
        voice.name.includes('Samantha') ||
        voice.name.includes('Victoria') ||
        voice.gender === 'female'
      );

      if (femaleVoice) {
        utterance.voice = femaleVoice;
      } else {
        // Use default voice
        const englishVoice = voices.find(voice => voice.lang.startsWith('en'));
        if (englishVoice) utterance.voice = englishVoice;
      }

      utterance.onend = () => {
        setIsSpeaking(false);
      };

      utterance.onerror = (event) => {
        console.error("Speech synthesis error:", event);
        setIsSpeaking(false);
        toast.error("Failed to speak response");
      };

      window.speechSynthesis.speak(utterance);
      toast.success("Speaking...");
    } catch (error) {
      console.error("Text-to-speech error:", error);
      toast.error("Failed to generate speech.");
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const clearConversation = () => {
    setMessages([]);
    startNewSession();
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-4 sm:p-6">
      <Card className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isRecording ? "bg-red-500 animate-pulse" : isSpeaking ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
            <h2 className="text-lg font-semibold">
              {isRecording ? "Listening..." : isSpeaking ? "Speaking..." : "Voice Chat"}
            </h2>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={clearConversation} title="Clear conversation">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <Mic className="w-16 h-16 text-muted-foreground opacity-20" />
              <div>
                <h3 className="text-xl font-semibold mb-2">Start a Voice Conversation</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Click the microphone to start speaking. The system will automatically detect when you stop talking and process your message. The AI will respond with natural voice.
                </p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  <div className="flex items-center justify-between mt-2 gap-2">
                    <span className="text-xs opacity-60">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                    {message.role === "assistant" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => speakText(message.content)}
                        disabled={isSpeaking}
                      >
                        <Volume2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Controls */}
        <div className="p-4 border-t space-y-3">
          <div className="flex items-center justify-center gap-4">
            <Button
              size="lg"
              variant={isRecording ? "destructive" : "default"}
              className={`rounded-full w-20 h-20 ${isRecording ? "animate-pulse" : ""}`}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing || isSpeaking}
            >
              {isProcessing ? (
                <div className="w-8 h-8 border-4 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Mic className="w-8 h-8" />
              )}
            </Button>
          </div>

          <div className="flex items-center justify-center gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={autoSpeak}
                onChange={(e) => setAutoSpeak(e.target.checked)}
                className="w-4 h-4"
              />
              Auto-speak responses
            </label>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            {isRecording
              ? "Speaking... (auto-stops on silence)"
              : "Click to start speaking"}
          </p>
        </div>
      </Card>
    </div>
  );
}
