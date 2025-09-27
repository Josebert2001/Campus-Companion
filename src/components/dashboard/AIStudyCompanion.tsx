import { useState } from "react";
import { MessageCircle, Send, Brain, Sparkles, Zap, Users, BookOpen, Calendar, Languages, FileText, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  processingType?: 'student_multi_agent' | 'single_model' | 'error_fallback';
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

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputValue,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue("");
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
    <div className="glass-card p-0 overflow-hidden h-fit">
      <div className="p-4 bg-gradient-to-r from-primary to-secondary text-white">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <div className="relative">
              <GraduationCap className="w-5 h-5" />
              <Zap className="w-2 h-2 absolute -top-1 -right-1 text-yellow-300 animate-pulse" />
            </div>
          </div>
          <div>
            <h3 className="font-semibold mobile-text">Campus Companion AI</h3>
            <p className="text-xs opacity-90">Student-focused AI agents for academic success</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          {quickActions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              className="text-xs h-auto py-2 px-2 flex flex-col items-center gap-1 hover:bg-primary/10 hover:border-primary/30 transition-all"
              onClick={() => setInputValue(action.action)}
            >
              <action.icon className="w-3 h-3" />
              <span className="text-xs leading-tight text-center">{action.label}</span>
            </Button>
          ))}
        </div>

        {/* Chat Messages */}
        <div className="space-y-3 max-h-48 sm:max-h-64 overflow-y-auto mb-4 scroll-smooth">
          {messages.map((message) => (
            <div key={message.id}>
              <div className={message.isUser ? "student-chat-bubble" : "ai-chat-bubble"}>
                <p className="text-xs sm:text-sm leading-relaxed">{message.text}</p>
                {!message.isUser && message.processingType === 'student_multi_agent' && (
                  <div className="flex items-center gap-1 mt-2 opacity-70">
                    <GraduationCap className="w-3 h-3" />
                    <span className="text-xs">Student-focused AI response</span>
                  </div>
                )}
                {!message.isUser && message.studentContext && (
                  <div className="flex items-center gap-1 mt-2 opacity-60">
                    <Users className="w-3 h-3" />
                    <span className="text-xs">
                      {message.studentContext.course && `${message.studentContext.course} • `}
                      {message.studentContext.university || 'University of Uyo'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="ai-chat-bubble">
              <div className="flex items-center gap-2 mb-2">
                <div className="loading-skeleton w-2 h-2 rounded-full animate-pulse"></div>
                <div className="loading-skeleton w-2 h-2 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                <div className="loading-skeleton w-2 h-2 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
              </div>
              <p className="text-xs opacity-70">Student-focused AI agents are working on your response...</p>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex gap-2 items-end">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask about concepts, get study help, research assistance, or academic guidance..."
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1 text-sm"
            disabled={isLoading}
          />
          <Button 
            onClick={handleSendMessage} 
            size="icon" 
            disabled={isLoading || !inputValue.trim()}
            className="flex-shrink-0 hover:bg-primary/90 transition-all"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Student Success Message */}
        <div className="mt-3 text-center">
          <p className="text-xs text-muted-foreground">
            💡 I'm here to help you succeed at University of Uyo!
          </p>
        </div>
      </div>
    </div>
  );
}