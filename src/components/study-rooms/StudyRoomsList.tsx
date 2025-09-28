import { useState, useEffect } from 'react';
import { Users, Clock, BookOpen, Plus, Lock, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { StudyRoom, studyRoomManager } from '@/utils/studyRooms';
import { toast } from 'sonner';

interface StudyRoomsListProps {
  onJoinRoom: (roomId: string) => void;
}

export default function StudyRoomsList({ onJoinRoom }: StudyRoomsListProps) {
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<StudyRoom | null>(null);
  
  // Create room form
  const [roomName, setRoomName] = useState('');
  const [subject, setSubject] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  
  // Join room form
  const [joinPassword, setJoinPassword] = useState('');

  useEffect(() => {
    loadRooms();
    
    // Refresh rooms every 30 seconds
    const interval = setInterval(loadRooms, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadRooms = async () => {
    try {
      setLoading(true);
      const roomsList = await studyRoomManager.listRooms();
      setRooms(roomsList);
    } catch (error) {
      console.error('Failed to load rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!roomName.trim() || !subject.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const result = await studyRoomManager.createRoom(
        roomName.trim(),
        subject.trim(),
        isPrivate,
        isPrivate ? password : undefined
      );
      
      if (result.success) {
        setIsCreateDialogOpen(false);
        setRoomName('');
        setSubject('');
        setIsPrivate(false);
        setPassword('');
        
        // Join the created room
        onJoinRoom(result.roomId);
        
        // Refresh rooms list
        loadRooms();
      }
    } catch (error) {
      console.error('Failed to create room:', error);
    }
  };

  const handleJoinRoom = async (room: StudyRoom, password?: string) => {
    try {
      await studyRoomManager.joinRoom(room.id, password);
      onJoinRoom(room.id);
      setIsJoinDialogOpen(false);
      setJoinPassword('');
      setSelectedRoom(null);
    } catch (error) {
      console.error('Failed to join room:', error);
    }
  };

  const openJoinDialog = (room: StudyRoom) => {
    setSelectedRoom(room);
    setIsJoinDialogOpen(true);
  };

  const getSubjectColor = (subject: string) => {
    const colors = {
      'Mathematics': 'bg-blue-100 text-blue-800',
      'Physics': 'bg-purple-100 text-purple-800',
      'Chemistry': 'bg-green-100 text-green-800',
      'Biology': 'bg-emerald-100 text-emerald-800',
      'Computer Science': 'bg-indigo-100 text-indigo-800',
      'Engineering': 'bg-orange-100 text-orange-800',
      'Literature': 'bg-pink-100 text-pink-800',
      'History': 'bg-yellow-100 text-yellow-800',
      'Economics': 'bg-teal-100 text-teal-800',
      'General Studies': 'bg-gray-100 text-gray-800'
    };
    return colors[subject as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="mobile-heading font-bold text-foreground">Study Rooms</h2>
          <p className="text-muted-foreground mobile-text">Join collaborative study sessions with voice chat</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="neuro-btn w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Create Room
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Study Room</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <Label htmlFor="roomName">Room Name *</Label>
                <Input
                  id="roomName"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="e.g., Math Study Group"
                  className="mobile-text"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="subject">Subject *</Label>
                <select
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full p-2 border rounded-md mobile-text"
                  required
                >
                  <option value="">Select subject</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Biology">Biology</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Literature">Literature</option>
                  <option value="History">History</option>
                  <option value="Economics">Economics</option>
                  <option value="General Studies">General Studies</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="private"
                  checked={isPrivate}
                  onCheckedChange={setIsPrivate}
                />
                <Label htmlFor="private">Private Room</Label>
              </div>
              
              {isPrivate && (
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter room password"
                    className="mobile-text"
                  />
                </div>
              )}
              
              <Button type="submit" className="w-full mobile-text">
                Create Study Room
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Rooms List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 sm:py-12 text-muted-foreground">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="mobile-text">Loading study rooms...</p>
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-8 sm:py-12 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="mobile-text">No active study rooms. Create one to get started!</p>
          </div>
        ) : (
          rooms.map((room) => (
            <div key={room.id} className="glass-card p-4 sm:p-6 hover:scale-[1.01] sm:hover:scale-[1.02] transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-foreground mobile-text truncate">{room.name}</h3>
                    {room.isPrivate && <Lock className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <Badge className={`${getSubjectColor(room.subject)} text-xs`}>
                      {room.subject}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="w-3 h-3" />
                      <span>{room.currentParticipants}/{room.maxParticipants}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(room.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    onClick={() => room.isPrivate ? openJoinDialog(room) : handleJoinRoom(room)}
                    disabled={!room.canJoin}
                    variant={room.canJoin ? "default" : "secondary"}
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    {room.canJoin ? 'Join Room' : 'Full'}
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Join Private Room Dialog */}
      <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Join Private Room</DialogTitle>
          </DialogHeader>
          
          {selectedRoom && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium">{selectedRoom.name}</h4>
                <p className="text-sm text-muted-foreground">{selectedRoom.subject}</p>
              </div>
              
              <div>
                <Label htmlFor="joinPassword">Password</Label>
                <Input
                  id="joinPassword"
                  type="password"
                  value={joinPassword}
                  onChange={(e) => setJoinPassword(e.target.value)}
                  placeholder="Enter room password"
                  className="mobile-text"
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={() => handleJoinRoom(selectedRoom, joinPassword)}
                  className="flex-1"
                >
                  Join Room
                </Button>
                <Button
                  onClick={() => {
                    setIsJoinDialogOpen(false);
                    setJoinPassword('');
                    setSelectedRoom(null);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}