import { useState } from "react";
import { MessageCircle, Send, Brain, Sparkles, Zap, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  processingType?: 'multi_agent' | 'single_model';
}

export default function AIStudyCompanion() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      text: "Hi! I'm your AI study companion powered by a multi-agent system. I can help with complex questions, research, problem-solving, and study materials using specialized AI agents working together!",
      isUser: false,
      timestamp: new Date(),
      processingType: 'multi_agent'
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
          context: "University student using Campus Companion app"
        }
      });

      if (error) throw error;

      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: data.response || "I'm having trouble responding right now. Please try again.",
        isUser: false,
        timestamp: new Date(),
        processingType: data.processing_type || 'single_model'
      };
      
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      toast.error("Failed to get AI response. Please try again.");
      
      const errorResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: "I'm sorry, I'm having trouble responding right now. Please try again later.",
        isUser: false,
        timestamp: new Date(),
        processingType: 'single_model'
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    { icon: Brain, label: "Quiz Me", action: "Create a comprehensive quiz with explanations on my recent study topics" },
    { icon: Sparkles, label: "Research", action: "Help me research and analyze a complex academic topic with multiple perspectives" },
    { icon: Users, label: "Study Plan", action: "Create a detailed study plan breaking down complex subjects into manageable parts" },
  ];

  return (
    <div className="glass-card p-0 overflow-hidden h-fit">
      <div className="p-4 bg-gradient-to-r from-primary to-secondary text-white">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <div className="relative">
              <MessageCircle className="w-5 h-5" />
              <Zap className="w-2 h-2 absolute -top-1 -right-1 text-yellow-300" />
            </div>
          </div>
          <div>
            <h3 className="font-semibold mobile-text">Multi-Agent AI Companion</h3>
            <p className="text-xs opacity-90">Powered by specialized AI agents for complex reasoning</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 mb-4">
          {quickActions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              className="text-xs flex-1 sm:flex-none hover:bg-primary/10"
              onClick={() => setInputValue(action.action)}
            >
              <action.icon className="w-3 h-3 mr-1" />
              {action.label}
            </Button>
          ))}
        </div>

        {/* Chat Messages */}
        <div className="space-y-3 max-h-48 sm:max-h-64 overflow-y-auto mb-4 scroll-smooth">
          {messages.map((message) => (
            <div key={message.id}>
              <div className={message.isUser ? "student-chat-bubble" : "ai-chat-bubble"}>
                <p className="text-xs sm:text-sm leading-relaxed">{message.text}</p>
                {!message.isUser && message.processingType === 'multi_agent' && (
                  <div className="flex items-center gap-1 mt-2 opacity-70">
                    <Users className="w-3 h-3" />
                    <span className="text-xs">Multi-agent response</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="ai-chat-bubble">
              <div className="flex items-center gap-2 mb-2">
                <div className="loading-skeleton w-2 h-2 rounded-full"></div>
                <div className="loading-skeleton w-2 h-2 rounded-full"></div>
                <div className="loading-skeleton w-2 h-2 rounded-full"></div>
              </div>
              <p className="text-xs opacity-70">AI agents are collaborating on your response...</p>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex gap-2 items-end">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask complex questions, request research, or get detailed explanations..."
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1 text-sm"
            disabled={isLoading}
          />
          <Button 
            onClick={handleSendMessage} 
            size="icon" 
            disabled={isLoading || !inputValue.trim()}
            className="flex-shrink-0 hover:bg-primary/90"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}