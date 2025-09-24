import { useState } from "react";
import { MessageCircle, Send, Brain, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export default function AIStudyCompanion() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      text: "Hi! I'm your AI study companion. Ask me anything about your courses, or I can help you with study materials!",
      isUser: false,
      timestamp: new Date(),
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
        text: data.response,
        isUser: false,
        timestamp: new Date(),
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
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    { icon: Brain, label: "Quiz Me", action: "Generate a quick quiz on my recent topics" },
    { icon: Sparkles, label: "Summarize", action: "Summarize my lecture notes from today" },
  ];

  return (
    <div className="glass-card p-0 overflow-hidden h-fit">
      <div className="p-4 bg-gradient-to-r from-primary to-secondary text-white">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold mobile-text">AI Study Companion</h3>
            <p className="text-xs opacity-90">Ask questions, get summaries, practice quizzes</p>
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
              className="text-xs flex-1 sm:flex-none"
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
            <div
              key={message.id}
              className={message.isUser ? "student-chat-bubble" : "ai-chat-bubble"}
            >
              <p className="text-xs sm:text-sm leading-relaxed">{message.text}</p>
            </div>
          ))}
          {isLoading && (
            <div className="ai-chat-bubble">
              <div className="flex items-center gap-2">
                <div className="loading-skeleton w-2 h-2 rounded-full"></div>
                <div className="loading-skeleton w-2 h-2 rounded-full"></div>
                <div className="loading-skeleton w-2 h-2 rounded-full"></div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex gap-2 items-end">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask me anything..."
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1 text-sm"
            disabled={isLoading}
          />
          <Button 
            onClick={handleSendMessage} 
            size="icon" 
            disabled={isLoading || !inputValue.trim()}
            className="flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}