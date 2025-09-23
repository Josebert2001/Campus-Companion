import { useState } from "react";
import { MessageCircle, Send, Brain, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputValue,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: "I'd be happy to help you with that! Could you provide more details about what you're studying?",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  const quickActions = [
    { icon: Brain, label: "Quiz Me", action: "Generate a quick quiz on my recent topics" },
    { icon: Sparkles, label: "Summarize", action: "Summarize my lecture notes from today" },
  ];

  return (
    <div className="glass-card p-0 overflow-hidden">
      <div className="p-4 bg-gradient-to-r from-primary to-secondary text-white">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold">AI Study Companion</h3>
            <p className="text-xs opacity-90">Ask questions, get summaries, practice quizzes</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Quick Actions */}
        <div className="flex gap-2 mb-4">
          {quickActions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setInputValue(action.action)}
            >
              <action.icon className="w-3 h-3 mr-1" />
              {action.label}
            </Button>
          ))}
        </div>

        {/* Chat Messages */}
        <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={message.isUser ? "student-chat-bubble" : "ai-chat-bubble"}
            >
              <p className="text-sm">{message.text}</p>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask me anything..."
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1"
          />
          <Button onClick={handleSendMessage} size="icon">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}