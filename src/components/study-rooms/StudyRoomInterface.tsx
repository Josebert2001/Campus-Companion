import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Users, MessageSquare, Send, Phone, PhoneOff, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ChatMessage, RoomParticipant, studyRoomManager } from '@/utils/studyRooms';
import { toast } from 'sonner';

interface StudyRoomInterfaceProps {
  roomId: string;
  onLeaveRoom: () => void;
}

export default function StudyRoomInterface({ roomId, onLeaveRoom }: StudyRoomInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Set up event listeners
    studyRoomManager.onMessage((message) => {
      setMessages(prev => [...prev, message]);
    });

    studyRoomManager.onParticipantUpdate((participantList) => {
      setParticipants(participantList);
    });

    setIsConnected(studyRoomManager.isInRoom);

    return () => {
      // Cleanup listeners would go here if we had removeListener methods
    };
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await studyRoomManager.sendMessage(newMessage);
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleToggleMute = () => {
    const muted = studyRoomManager.toggleMute();
    setIsMuted(muted);
    toast.success(muted ? 'Microphone muted' : 'Microphone unmuted');
  };

  const handleLeaveRoom = async () => {
    try {
      await studyRoomManager.leaveRoom();
      onLeaveRoom();
    } catch (error) {
      console.error('Failed to leave room:', error);
      onLeaveRoom(); // Leave anyway
    }
  };

  const getMessageTypeStyle = (type: string) => {
    switch (type) {
      case 'system':
        return 'bg-muted text-muted-foreground text-center italic';
      case 'ai_response':
        return 'bg-secondary/10 border-l-4 border-secondary';
      default:
        return 'bg-background';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="glass-card p-4 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <div>
              <h2 className="font-semibold mobile-text">Study Room</h2>
              <p className="text-xs text-muted-foreground">Room ID: {roomId.slice(-8)}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {participants.length}
            </Badge>
            
            <Button
              onClick={handleToggleMute}
              variant={isMuted ? "destructive" : "outline"}
              size="icon"
              className="h-8 w-8"
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
            
            <Button
              onClick={handleLeaveRoom}
              variant="destructive"
              size="sm"
            >
              <PhoneOff className="w-4 h-4 mr-2" />
              Leave
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0">
        {/* Chat Area */}
        <div className="lg:col-span-3 glass-card p-4 flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h3 className="font-semibold mobile-text">Chat</h3>
          </div>
          
          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-0">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`p-3 rounded-lg ${getMessageTypeStyle(message.type)}`}
                >
                  {message.type !== 'system' && (
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">
                        {message.userName}
                      </span>
                      {message.type === 'ai_response' && (
                        <Badge variant="secondary" className="text-xs">AI</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                  <p className="text-sm leading-relaxed">{message.message}</p>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Message Input */}
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message or @ai ask a question..."
              className="flex-1 text-sm"
              disabled={!isConnected}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!newMessage.trim() || !isConnected}
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
          
          <p className="text-xs text-muted-foreground mt-2 text-center">
            💡 Type "@ai" followed by your question to get AI study help!
          </p>
        </div>

        {/* Participants Panel */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="font-semibold mobile-text">Participants</h3>
          </div>
          
          <div className="space-y-2">
            {participants.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Loading participants...
              </p>
            ) : (
              participants.map((participant) => (
                <div
                  key={participant.userId}
                  className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                >
                  <div className={`w-2 h-2 rounded-full ${participant.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  <span className="text-sm font-medium truncate flex-1">
                    {participant.name}
                  </span>
                  {participant.role === 'creator' && (
                    <Badge variant="outline" className="text-xs">Host</Badge>
                  )}
                </div>
              ))
            )}
          </div>
          
          {/* Audio Status */}
          <div className="mt-6 p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Volume2 className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Audio Status</span>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>🎤 Microphone: {isMuted ? 'Muted' : 'Active'}</p>
              <p>🔊 Connection: {isConnected ? 'Connected' : 'Disconnected'}</p>
              <p>📡 Audio: {studyRoomManager.hasAudio ? 'Enabled' : 'Disabled'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}