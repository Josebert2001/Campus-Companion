import { useState } from 'react';
import StudyRoomsList from '@/components/study-rooms/StudyRoomsList';
import StudyRoomInterface from '@/components/study-rooms/StudyRoomInterface';

export default function StudyRooms() {
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);

  const handleJoinRoom = (roomId: string) => {
    setCurrentRoomId(roomId);
  };

  const handleLeaveRoom = () => {
    setCurrentRoomId(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-secondary/10 pb-safe">
      <div className="max-w-7xl mx-auto mobile-padding py-4 md:py-6 h-screen flex flex-col">
        {currentRoomId ? (
          <StudyRoomInterface
            roomId={currentRoomId}
            onLeaveRoom={handleLeaveRoom}
          />
        ) : (
          <StudyRoomsList onJoinRoom={handleJoinRoom} />
        )}
      </div>
    </div>
  );
}