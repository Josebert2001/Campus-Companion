import { useState } from "react";
import { MessageCircle, Send, Brain, Sparkles, Zap, Users, BookOpen, Calendar, Languages, FileText, GraduationCap } from "lucide-react";
import AIResponseFormatter from "./AIResponseFormatter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import VoiceInput from "@/components/voice/VoiceInput";
import VoiceOutput from "@/components/voice/VoiceOutput";
import ImageUpload from "@/components/vision/ImageUpload";

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  processingType?: 'student_multi_agent' | 'single_model' | 'error_fallback';
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
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      text: "Hi! I'm your Campus Companion AI, powered by specialized student-focused agents. I can help you with studying, research, assignments, time management, and academic success using advanced AI designed specifically for University of Uyo students! 🎓",
      isUser: false,
      timestamp: new Date(),
      processingType: 'student_multi_agent'
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          message: currentInput,
          context: "University of Uyo student seeking academic assistance through Campus Companion"
        }
      });

      if (error) throw error;

      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: data.response || "I'm having trouble helping you right now, but I'm here to support your academic success! Please try again.",
        isUser: false,
        timestamp: new Date(),
        processingType: data.processing_type || 'single_model',
        studentContext: data.student_context
      };
      
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      toast.error("I'm having trouble connecting right now. Please try again!");
      
      const errorResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: "I'm sorry, I'm having trouble connecting right now. But don't worry - I'm here to help you succeed! Please try again in a moment. 💪",
        isUser: false,
        timestamp: new Date(),
        processingType: 'error_fallback'
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    { 
      icon: Brain, 
      label: "Explain Concept", 
      action: "Help me understand a difficult concept by breaking it down step-by-step with examples",
      category: "study_help"
    },
    { 
      icon: BookOpen, 
      label: "Research Help", 
      action: "Help me find academic sources and create proper citations for my research project",
      category: "research"
    },
    { 
      icon: Calendar, 
      label: "Study Schedule", 
      action: "Create a personalized study schedule and help me manage my assignments and deadlines",
      category: "task_management"
    },
    { 
      icon: Languages, 
      label: "Simplify Text", 
      action: "Help me understand complex academic text by explaining it in simpler terms",
      category: "language"
    },
    { 
      icon: FileText, 
      label: "Citation Help", 
      action: "Show me how to properly cite sources and format my academic paper",
      category: "citation"
    },
    { 
      icon: GraduationCap, 
      label: "Exam Prep", 
      action: "Help me prepare for my upcoming exam with study strategies and practice questions",
      category: "study_help"
    },
  ];

  return (
    <div className="flex flex-col h-full w-full">
      {/* Chat Header - Fixed */}
      <div className="flex-shrink-0 p-4 sm:p-6 border-b bg-gradient-to-r from-primary/10 to-secondary/10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/20 rounded-lg">
              <div className="relative">
                <GraduationCap className="w-6 h-6 text-primary" />
                <Zap className="w-3 h-3 absolute -top-1 -right-1 text-yellow-500 animate-pulse" />
              </div>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Campus Companion AI</h1>
              <p className="text-sm text-muted-foreground">Student-focused AI agents for academic success</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="text-xs h-auto py-2 px-3 flex flex-col items-center gap-1 hover:bg-primary/10 hover:border-primary/30 transition-all"
                onClick={() => setInputValue(action.action)}
              >
                <action.icon className="w-4 h-4" />
                <span className="text-xs leading-tight text-center">{action.label}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Messages - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-4xl mx-auto space-y-4">
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

      {/* Input Area - Fixed */}
      <div className="flex-shrink-0 border-t bg-background/80 backdrop-blur-sm p-4 sm:p-6">
        <div className="max-w-4xl mx-auto space-y-3">
          {/* Vision Input */}
          <ImageUpload 
            onImageAnalyzed={(analysis, imageUrl) => {
              handleSendMessage(`Please help me understand this study material: ${analysis}`, imageUrl);
            }}
            disabled={isLoading}
          />

          {/* Text Input with Voice */}
          <div className="flex gap-2 items-end">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask about concepts, get study help, research assistance, or academic guidance..."
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1"
              disabled={isLoading}
            />
            
            <VoiceInput
              onTranscription={(text) => handleSendMessage(text, undefined, true)}
              disabled={isLoading}
            />
            
            <Button 
              onClick={() => handleSendMessage()} 
              size="icon" 
              disabled={isLoading || !inputValue.trim()}
              className="flex-shrink-0 hover:bg-primary/90 transition-all"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Student Success Message */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              💡 I'm here to help you succeed at University of Uyo!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}