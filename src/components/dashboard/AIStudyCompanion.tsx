import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, Sparkles, Zap, Users, GraduationCap, ChevronDown, Mic } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import AIResponseFormatter from "./AIResponseFormatter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "@/integrations/supabase/client";
import { toast } from "sonner";
import VoiceInput from "@/components/voice/VoiceInput";
import VoiceOutput from "@/components/voice/VoiceOutput";
import ImageUpload from "@/components/vision/ImageUpload";
import InstantVoiceChat from "@/components/voice/InstantVoiceChat";

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  // Allow server-side to return other processing_type strings (e.g. routed_agent, multi_agent_voice)
  // while still keeping common literal types for local usage.
  processingType?: string | 'student_multi_agent' | 'single_model' | 'error_fallback';
  imageUrl?: string;
  isVoiceInput?: boolean;
  studentContext?: {
    name?: string;
    university?: string;
    course?: string;
    year?: number;
  };
}

export default function AIStudyCompanion() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showInstantVoice, setShowInstantVoice] = useState(false);

  const handleSendMessage = async (message?: string, imageUrl?: string, isVoice?: boolean) => {
    const textToSend = message || inputValue;
    if (!textToSend.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: textToSend,
      isUser: true,
      timestamp: new Date(),
      imageUrl,
      isVoiceInput: isVoice,
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = textToSend;
    if (!message) setInputValue("");
    setIsLoading(true);

    // Try streaming first (optimistic partial responses). If streaming fails, fallback to supabase.functions.invoke
    try {
      // Create optimistic AI message that we'll append partial chunks to
      const optimisticId = (Date.now() + 1).toString();
      const optimisticMessage: ChatMessage = {
        id: optimisticId,
        text: "",
        isUser: false,
        timestamp: new Date(),
        processingType: 'student_multi_agent'
      };

      setMessages(prev => [...prev, optimisticMessage]);

      // Use fetch to call edge function directly for streaming (requires edge function to support chunked responses)
      const endpoint = `${SUPABASE_URL}/functions/v1/ai-chat`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
      };

      // If user is authenticated, pass auth token through global supabase client
      try {
        const session = (await supabase.auth.getSession()).data?.session;
        if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
      } catch (e) {
        // ignore - not critical
      }

      const controller = new AbortController();
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: currentInput, context: "University of Uyo student seeking academic assistance through Campus Companion" }),
        signal: controller.signal,
      }).catch(err => {
        console.error('Fetch error:', err);
        throw new Error(`Failed to send a request to the Edge Function: ${err.message}`);
      });

      if (!res.ok || !res.body) {
        throw new Error(`Streaming not available (status: ${res.status}), falling back`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let accumulated = '';

      while (!done) {
        const { value, done: rDone } = await reader.read();
        done = rDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          accumulated += chunk;

          // Update the optimistic message with new partial content
          setMessages(prev => prev.map(m => m.id === optimisticId ? { ...m, text: accumulated } : m));
        }
      }

      // Finalize optimistic message (parsing JSON if the function wraps the final output)
      let finalText = accumulated;
      try {
        // Some edge functions stream JSON pieces; try to parse last JSON object
        const lastJsonMatch = accumulated.match(/\{[\s\S]*\}$/);
        if (lastJsonMatch) {
          const parsed = JSON.parse(lastJsonMatch[0]);
          finalText = parsed.response || parsed.data?.response || finalText;
        }
      } catch (e) {
        // ignore; use accumulated text
      }

      setMessages(prev => prev.map(m => m.id === optimisticId ? { ...m, text: finalText } : m));
    } catch (streamError) {
      // Streaming failed; fallback to existing supabase.functions.invoke behavior
      console.warn('Streaming failed, falling back to invoke:', streamError);

      try {
        type AiChatResponse = {
          response?: string;
          processing_type?: string;
          student_context?: { name?: string; university?: string; course?: string; year?: number } | null;
          routing?: { selected_agent?: string } | null;
        } | null;

        const result = (await supabase.functions.invoke('ai-chat', {
          body: {
            message: currentInput,
            context: "University of Uyo student seeking academic assistance through Campus Companion"
          }
        })) as { data: AiChatResponse; error: any };

        if (result.error) throw result.error;

        const data = result.data || {};

        const aiResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: data.response || "I'm having trouble helping you right now, but I'm here to support your academic success! Please try again.",
          isUser: false,
          timestamp: new Date(),
          processingType: data.processing_type || 'single_model',
          studentContext: data.student_context || undefined,
        };

        setMessages(prev => [...prev, aiResponse]);
      } catch (error: any) {
        console.error('Error getting AI response:', error);
        toast.error(error?.message || "I'm having trouble connecting right now. Please try again!");

        const errorResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: "I'm sorry, I'm having trouble connecting right now. But don't worry - I'm here to help you succeed! Please try again in a moment. \ud83d\udcaa",
          isUser: false,
          timestamp: new Date(),
          processingType: 'error_fallback'
        };
        setMessages(prev => [...prev, errorResponse]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // Use a small timeout to allow rendering to complete
    const t = setTimeout(() => {
      el.scrollTop = el.scrollHeight;
    }, 50);
    return () => clearTimeout(t);
  }, [messages, isLoading]);

  const quickActions = [
    { label: "📚 Explain a concept", prompt: "Help me understand a difficult concept by breaking it down step-by-step with examples" },
    { label: "🔍 Research help", prompt: "Help me find academic sources and create proper citations for my research project" },
    { label: "📅 Create study schedule", prompt: "Create a personalized study schedule and help me manage my assignments and deadlines" },
    { label: "✏️ Simplify text", prompt: "Help me understand complex academic text by explaining it in simpler terms" },
    { label: "📖 Citation help", prompt: "Show me how to properly cite sources and format my academic paper" },
    { label: "🎓 Exam preparation", prompt: "Help me prepare for my upcoming exam with study strategies and practice questions" },
  ];

  return (
    <div className="flex flex-col h-full w-full">
      {/* Simplified Header */}
      <div className="flex-shrink-0 px-4 sm:px-6 py-4 border-b">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <GraduationCap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Campus Companion AI</h1>
              <p className="text-xs text-muted-foreground">Ask me anything about your studies</p>
            </div>
          </div>
          
          {/* Quick Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">Suggestions</span>
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 bg-popover z-50">
              {quickActions.map((action, index) => (
                <DropdownMenuItem
                  key={index}
                  onClick={() => setInputValue(action.prompt)}
                  className="cursor-pointer py-2"
                >
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Chat Messages - Scrollable */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Welcome Message */}
          {showWelcome && messages.length === 0 && (
            <div className="text-center py-8 space-y-4">
              <div className="inline-flex p-4 bg-primary/5 rounded-full mb-2">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">Welcome to Campus Companion AI</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                I'm here to help with studying, research, assignments, and academic success. 
                Ask me anything or use the suggestions above to get started!
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] sm:max-w-[75%] ${message.isUser ? "student-chat-bubble" : "ai-chat-bubble"}`}>
                {message.imageUrl && (
                  <img 
                    src={message.imageUrl} 
                    alt="Study material" 
                    className="max-w-full h-auto rounded mb-2" 
                  />
                )}
                
                {message.isUser ? (
                  <div className="space-y-1">
                    <p className="text-sm sm:text-base leading-relaxed">{message.text}</p>
                    {message.isVoiceInput && (
                      <div className="flex items-center gap-1 text-xs opacity-60">
                        <MessageCircle className="w-3 h-3" />
                        Voice input
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <AIResponseFormatter content={message.text} />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {message.processingType === 'student_multi_agent' && (
                          <div className="flex items-center gap-1 opacity-70">
                            <GraduationCap className="w-3 h-3" />
                            <span className="text-xs">Multi-agent AI</span>
                          </div>
                        )}
                        {message.studentContext && (
                          <div className="flex items-center gap-1 opacity-60">
                            <Users className="w-3 h-3" />
                            <span className="text-xs">
                              {message.studentContext.course && `${message.studentContext.course} • `}
                              {message.studentContext.university || 'University of Uyo'}
                            </span>
                          </div>
                        )}
                      </div>
                      <VoiceOutput text={message.text} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="ai-chat-bubble max-w-[85%] sm:max-w-[75%]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="loading-skeleton w-2 h-2 rounded-full animate-pulse"></div>
                  <div className="loading-skeleton w-2 h-2 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                  <div className="loading-skeleton w-2 h-2 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                </div>
                <p className="text-xs opacity-70">Student-focused AI agents are working on your response...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Simplified Input Area */}
      <div className="flex-shrink-0 border-t bg-background p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-2 items-end">
            <div className="flex-1 flex flex-col gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask me anything about your studies..."
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                className="flex-1"
                disabled={isLoading}
              />
            </div>
            
            {/* Compact feature buttons */}
            <ImageUpload 
              onImageAnalyzed={(analysis, imageUrl) => {
                setShowWelcome(false);
                handleSendMessage(`Please help me understand this study material: ${analysis}`, imageUrl);
              }}
              disabled={isLoading}
            />
            
            <VoiceInput
              onTranscription={(text) => {
                setShowWelcome(false);
                handleSendMessage(text, undefined, true);
              }}
              disabled={isLoading}
            />
            
            <Button 
              onClick={() => {
                setShowWelcome(false);
                handleSendMessage();
              }} 
              size="icon" 
              disabled={isLoading || !inputValue.trim()}
              className="flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {showInstantVoice && (
        <InstantVoiceChat onClose={() => setShowInstantVoice(false)} />
      )}

      <Button
        onClick={() => setShowInstantVoice(true)}
        size="lg"
        className="fixed bottom-20 right-6 h-16 w-16 rounded-full shadow-2xl hover:scale-110 transition-transform z-40 bg-gradient-to-br from-primary to-primary/80"
        title="Start instant voice chat"
      >
        <Mic className="w-7 h-7" />
      </Button>
    </div>
  );
}