import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface StudyRoom {
  id: string;
  name: string;
  subject: string;
  currentParticipants: number;
  maxParticipants: number;
  createdAt: string;
  canJoin: boolean;
  isCreator?: boolean;
  isPrivate?: boolean;
}

export interface RoomParticipant {
  userId: string;
  name: string;
  joinedAt: string;
  role: 'creator' | 'participant';
  isActive: boolean;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: string;
  type: 'text' | 'system' | 'ai_response';
}

export class StudyRoomManager {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private roomId: string | null = null;
  private onMessageCallback?: (message: ChatMessage) => void;
  private onParticipantUpdateCallback?: (participants: RoomParticipant[]) => void;

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Handle page unload to clean up connections
    window.addEventListener('beforeunload', () => {
      this.leaveRoom();
    });
  }

  async createRoom(roomName: string, subject: string, isPrivate: boolean = false, password?: string): Promise<any> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('study-rooms', {
        body: {
          action: 'create',
          roomName,
          subject,
          maxParticipants: 6,
          isPrivate,
          password
        }
      });

      if (response.error) throw response.error;

      const data = response.data;
      if (data.success) {
        this.roomId = data.roomId;
        await this.setupWebRTC(data.iceServers);
        toast.success(`Study room "${roomName}" created successfully!`);
        return data;
      }
      throw new Error(data.error);
    } catch (error) {
      console.error('Failed to create room:', error);
      toast.error('Failed to create study room');
      throw error;
    }
  }

  async joinRoom(roomId: string, password?: string): Promise<any> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('study-rooms', {
        body: {
          action: 'join',
          roomId,
          password
        }
      });

      if (response.error) throw response.error;

      const data = response.data;
      if (data.success) {
        this.roomId = roomId;
        await this.setupWebRTC(data.iceServers);
        toast.success('Joined study room successfully!');
        
        // Notify about participants
        if (this.onParticipantUpdateCallback) {
          this.onParticipantUpdateCallback(data.participants);
        }
        
        // Load recent messages
        if (data.recentMessages && this.onMessageCallback) {
          data.recentMessages.forEach((msg: ChatMessage) => {
            this.onMessageCallback!(msg);
          });
        }
        
        return data;
      }
      throw new Error(data.error);
    } catch (error) {
      console.error('Failed to join room:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to join study room');
      throw error;
    }
  }

  async listRooms(): Promise<StudyRoom[]> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('study-rooms', {
        body: { action: 'list' }
      });

      if (response.error) throw response.error;

      const data = response.data;
      if (data.success) {
        return data.rooms;
      }
      throw new Error(data.error);
    } catch (error) {
      console.error('Failed to list rooms:', error);
      toast.error('Failed to load study rooms');
      return [];
    }
  }

  private async setupWebRTC(iceServers: RTCIceServer[]) {
    try {
      this.peerConnection = new RTCPeerConnection({
        iceServers,
        iceTransportPolicy: 'all'
      });

      // Get user media (audio only for study rooms)
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });

      // Add local stream to peer connection
      this.localStream.getTracks().forEach(track => {
        this.peerConnection!.addTrack(track, this.localStream!);
      });

      // Handle remote streams
      this.peerConnection.ontrack = (event) => {
        const remoteAudio = new Audio();
        remoteAudio.srcObject = event.streams[0];
        remoteAudio.play().catch(console.error);
      };

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          // Send ICE candidate to other peers via signaling server
          this.sendSignalingData({ iceCandidate: event.candidate });
        }
      };

      toast.success('Audio connection established');
    } catch (error) {
      console.error('Failed to setup WebRTC:', error);
      toast.error('Failed to setup audio connection');
    }
  }

  private async sendSignalingData(data: any) {
    if (!this.roomId) return;

    try {
      await supabase.functions.invoke('study-rooms', {
        body: {
          action: 'signaling',
          roomId: this.roomId,
          ...data
        }
      });
    } catch (error) {
      console.error('Signaling error:', error);
    }
  }

  async sendMessage(message: string): Promise<void> {
    if (!this.roomId || !message.trim()) return;

    try {
      const response = await supabase.functions.invoke('study-rooms', {
        body: {
          action: 'send_message',
          roomId: this.roomId,
          message: message.trim()
        }
      });

      if (response.error) throw response.error;

      const data = response.data;
      if (data.success) {
        // Notify about new message
        if (this.onMessageCallback) {
          this.onMessageCallback(data.message);
          
          // Also notify about AI response if present
          if (data.aiResponse) {
            this.onMessageCallback(data.aiResponse);
          }
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    }
  }

  async leaveRoom(): Promise<void> {
    if (!this.roomId) return;

    try {
      // Clean up WebRTC
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
        this.localStream = null;
      }
      
      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
      }

      // Notify server
      await supabase.functions.invoke('study-rooms', {
        body: {
          action: 'leave',
          roomId: this.roomId
        }
      });

      this.roomId = null;
      toast.success('Left study room');
    } catch (error) {
      console.error('Failed to leave room:', error);
    }
  }

  // Event handlers
  onMessage(callback: (message: ChatMessage) => void) {
    this.onMessageCallback = callback;
  }

  onParticipantUpdate(callback: (participants: RoomParticipant[]) => void) {
    this.onParticipantUpdateCallback = callback;
  }

  // Getters
  get isInRoom(): boolean {
    return this.roomId !== null;
  }

  get currentRoomId(): string | null {
    return this.roomId;
  }

  get hasAudio(): boolean {
    return this.localStream !== null;
  }

  // Audio controls
  toggleMute(): boolean {
    if (!this.localStream) return false;

    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      return !audioTrack.enabled; // Return muted state
    }
    return false;
  }
}

// Singleton instance
export const studyRoomManager = new StudyRoomManager();