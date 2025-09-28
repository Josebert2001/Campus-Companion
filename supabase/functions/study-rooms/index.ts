import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface StudyRoomRequest {
  action: 'create' | 'join' | 'leave' | 'list' | 'send_message' | 'get_ice_servers';
  roomId?: string;
  roomName?: string;
  subject?: string;
  maxParticipants?: number;
  isPrivate?: boolean;
  password?: string;
  message?: string;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  iceCandidate?: RTCIceCandidateInit;
  participantId?: string;
}

interface StudyRoom {
  id: string;
  name: string;
  subject: string;
  createdBy: string;
  createdAt: string;
  maxParticipants: number;
  currentParticipants: number;
  isPrivate: boolean;
  password?: string;
  participants: RoomParticipant[];
  messages: ChatMessage[];
  activeStudySession?: StudySession;
}

interface RoomParticipant {
  userId: string;
  name: string;
  joinedAt: string;
  role: 'creator' | 'participant';
  isActive: boolean;
  lastSeen: string;
}

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: string;
  type: 'text' | 'system' | 'ai_response';
}

interface StudySession {
  topic: string;
  startedAt: string;
  participants: string[];
  aiModerator: boolean;
  sessionNotes: string[];
}

// In-memory storage (use Redis/Database for production)
const studyRooms = new Map<string, StudyRoom>();
const roomConnections = new Map<string, Map<string, any>>(); // WebRTC connections

// Free STUN servers for WebRTC
const FREE_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.relay.metered.ca:80' },
  { urls: 'stun:global.stun.twilio.com:3478' }
];

// Create a new study room
async function createStudyRoom(request: StudyRoomRequest, userId: string, userName: string): Promise<any> {
  const roomId = `room_${userId}_${Date.now()}`;
  const roomName = request.roomName || `${userName}'s Study Room`;

  const room: StudyRoom = {
    id: roomId,
    name: roomName,
    subject: request.subject || 'General Studies',
    createdBy: userId,
    createdAt: new Date().toISOString(),
    maxParticipants: Math.min(request.maxParticipants || 6, 10), // Max 10 for free tier
    currentParticipants: 1,
    isPrivate: request.isPrivate || false,
    password: request.password,
    participants: [{
      userId,
      name: userName,
      joinedAt: new Date().toISOString(),
      role: 'creator',
      isActive: true,
      lastSeen: new Date().toISOString()
    }],
    messages: [{
      id: `msg_${Date.now()}`,
      userId: 'system',
      userName: 'Campus Companion',
      message: `Welcome to ${roomName}! This study room is ready for collaborative learning.`,
      timestamp: new Date().toISOString(),
      type: 'system'
    }]
  };

  studyRooms.set(roomId, room);
  roomConnections.set(roomId, new Map());

  return {
    roomId,
    roomName,
    subject: room.subject,
    joinUrl: `${Deno.env.get('FRONTEND_URL') || 'http://localhost:3000'}/study-room/${roomId}`,
    iceServers: FREE_ICE_SERVERS,
    created: true,
    room: sanitizeRoom(room, userId)
  };
}

// Join existing study room
async function joinStudyRoom(request: StudyRoomRequest, userId: string, userName: string): Promise<any> {
  if (!request.roomId) {
    throw new Error('Room ID is required');
  }

  const room = studyRooms.get(request.roomId);
  if (!room) {
    throw new Error('Study room not found');
  }

  if (room.isPrivate && room.password !== request.password) {
    throw new Error('Invalid password for private room');
  }

  if (room.currentParticipants >= room.maxParticipants) {
    throw new Error('Study room is full');
  }

  // Check if user is already in room
  const existingParticipant = room.participants.find(p => p.userId === userId);
  if (existingParticipant) {
    existingParticipant.isActive = true;
    existingParticipant.lastSeen = new Date().toISOString();
  } else {
    // Add new participant
    room.participants.push({
      userId,
      name: userName,
      joinedAt: new Date().toISOString(),
      role: 'participant',
      isActive: true,
      lastSeen: new Date().toISOString()
    });
    room.currentParticipants++;

    // Add system message
    room.messages.push({
      id: `msg_${Date.now()}`,
      userId: 'system',
      userName: 'Campus Companion',
      message: `${userName} joined the study room`,
      timestamp: new Date().toISOString(),
      type: 'system'
    });
  }

  return {
    roomId: request.roomId,
    iceServers: FREE_ICE_SERVERS,
    joined: true,
    room: sanitizeRoom(room, userId),
    participants: room.participants.filter(p => p.isActive),
    recentMessages: room.messages.slice(-20)
  };
}

// Leave study room
async function leaveStudyRoom(request: StudyRoomRequest, userId: string, userName: string): Promise<any> {
  if (!request.roomId) {
    throw new Error('Room ID is required');
  }

  const room = studyRooms.get(request.roomId);
  if (!room) {
    throw new Error('Study room not found');
  }

  const participant = room.participants.find(p => p.userId === userId);
  if (participant) {
    participant.isActive = false;
    participant.lastSeen = new Date().toISOString();
    room.currentParticipants = Math.max(0, room.currentParticipants - 1);

    // Add leave message
    room.messages.push({
      id: `msg_${Date.now()}`,
      userId: 'system',
      userName: 'Campus Companion',
      message: `${userName} left the study room`,
      timestamp: new Date().toISOString(),
      type: 'system'
    });

    // Clean up WebRTC connections
    const connections = roomConnections.get(request.roomId);
    if (connections) {
      connections.delete(userId);
    }

    // Delete room if empty and creator left
    if (room.currentParticipants === 0 || (room.createdBy === userId && room.currentParticipants < 2)) {
      studyRooms.delete(request.roomId);
      roomConnections.delete(request.roomId);
    }
  }

  return {
    roomId: request.roomId,
    left: true,
    roomActive: studyRooms.has(request.roomId)
  };
}

// List active study rooms
async function listStudyRooms(userId: string): Promise<any> {
  const activeRooms = Array.from(studyRooms.values())
    .filter(room => !room.isPrivate && room.currentParticipants > 0)
    .map(room => ({
      id: room.id,
      name: room.name,
      subject: room.subject,
      currentParticipants: room.currentParticipants,
      maxParticipants: room.maxParticipants,
      createdAt: room.createdAt,
      canJoin: room.currentParticipants < room.maxParticipants
    }))
    .sort((a, b) => b.currentParticipants - a.currentParticipants);

  return {
    rooms: activeRooms,
    totalRooms: activeRooms.length,
    userRooms: activeRooms.filter(room => 
      studyRooms.get(room.id)?.participants.some(p => p.userId === userId && p.isActive)
    )
  };
}

// Send chat message to room
async function sendMessage(request: StudyRoomRequest, userId: string, userName: string): Promise<any> {
  if (!request.roomId || !request.message) {
    throw new Error('Room ID and message are required');
  }

  const room = studyRooms.get(request.roomId);
  if (!room) {
    throw new Error('Study room not found');
  }

  const participant = room.participants.find(p => p.userId === userId && p.isActive);
  if (!participant) {
    throw new Error('You are not an active participant in this room');
  }

  // Check if message is a study-related question for AI
  const isStudyQuestion = /^@ai\s+|^hey ai\s+|what is|how do|explain|help me/i.test(request.message);
  
  // Add user message
  const userMessage: ChatMessage = {
    id: `msg_${Date.now()}`,
    userId,
    userName,
    message: request.message,
    timestamp: new Date().toISOString(),
    type: 'text'
  };

  room.messages.push(userMessage);

  // Generate AI response if it's a study question
  let aiResponse = null;
  if (isStudyQuestion) {
    try {
      const aiReply = await generateAIStudyResponse(request.message, room.subject);
      const aiMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        userId: 'ai',
        userName: 'Study Assistant',
        message: aiReply,
        timestamp: new Date().toISOString(),
        type: 'ai_response'
      };
      room.messages.push(aiMessage);
      aiResponse = aiMessage;
    } catch (error) {
      console.error('AI response failed:', error);
    }
  }

  // Keep only last 100 messages
  if (room.messages.length > 100) {
    room.messages = room.messages.slice(-100);
  }

  return {
    messageSent: true,
    message: userMessage,
    aiResponse,
    totalMessages: room.messages.length
  };
}

// Generate AI study response using Groq
async function generateAIStudyResponse(userMessage: string, subject: string): Promise<string> {
  const groqApiKey = Deno.env.get('GROQ_API_KEY');
  if (!groqApiKey) {
    return "I'm here to help with your studies, but I'm having technical difficulties right now. Please try asking again!";
  }

  const systemPrompt = `You are a Study Assistant in a Campus Companion study room for University of Uyo students.

Subject Context: ${subject}
Room Setting: Group study environment

Provide helpful, concise responses (1-2 sentences) that:
1. Answer the study question clearly
2. Encourage group discussion
3. Suggest ways other participants can contribute
4. Stay focused on learning

Keep responses conversational and engaging for a group setting.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant', // Fast response for chat
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage.replace(/^@ai\s+|^hey ai\s+/i, '') }
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error('AI response failed');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Groq AI response error:', error);
    return "I'm having trouble right now, but keep the discussion going! What do others think about this question?";
  }
}

// Get ICE servers for WebRTC
function getIceServers(): any {
  return {
    iceServers: FREE_ICE_SERVERS,
    configuration: {
      iceTransportPolicy: 'all',
      bundlePolicy: 'balanced',
      rtcpMuxPolicy: 'require',
      iceCandidatePoolSize: 10
    }
  };
}

// WebRTC signaling support
async function handleWebRTCSignaling(request: StudyRoomRequest, userId: string): Promise<any> {
  if (!request.roomId) {
    throw new Error('Room ID required for signaling');
  }

  const room = studyRooms.get(request.roomId);
  if (!room) {
    throw new Error('Study room not found');
  }

  let connections = roomConnections.get(request.roomId);
  if (!connections) {
    connections = new Map();
    roomConnections.set(request.roomId, connections);
  }

  // Store signaling data
  const signalingData = {
    userId,
    timestamp: new Date().toISOString(),
    offer: request.offer,
    answer: request.answer,
    iceCandidate: request.iceCandidate
  };

  connections.set(userId, signalingData);

  return {
    signaling: 'received',
    roomId: request.roomId,
    participantCount: connections.size,
    iceServers: FREE_ICE_SERVERS
  };
}

// Sanitize room data for client
function sanitizeRoom(room: StudyRoom, userId: string): any {
  return {
    id: room.id,
    name: room.name,
    subject: room.subject,
    createdAt: room.createdAt,
    maxParticipants: room.maxParticipants,
    currentParticipants: room.currentParticipants,
    isPrivate: room.isPrivate,
    isCreator: room.createdBy === userId,
    activeStudySession: room.activeStudySession
  };
}

// Clean up inactive rooms (run periodically)
function cleanupInactiveRooms(): void {
  const now = new Date().getTime();
  const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

  for (const [roomId, room] of studyRooms.entries()) {
    const allInactive = room.participants.every(p => {
      const lastSeen = new Date(p.lastSeen).getTime();
      return !p.isActive || (now - lastSeen) > TIMEOUT_MS;
    });

    if (allInactive) {
      studyRooms.delete(roomId);
      roomConnections.delete(roomId);
      console.log(`Cleaned up inactive room: ${roomId}`);
    }
  }
}

// Run cleanup every 10 minutes
setInterval(cleanupInactiveRooms, 10 * 60 * 1000);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user profile for name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .maybeSingle();

    const userName = profile?.full_name || `Student-${user.id.slice(-4)}`;
    const request: StudyRoomRequest = await req.json();

    if (!request.action) {
      return new Response(JSON.stringify({ error: 'Action is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let result: any;

    switch (request.action) {
      case 'create':
        result = await createStudyRoom(request, user.id, userName);
        break;
      case 'join':
        result = await joinStudyRoom(request, user.id, userName);
        break;
      case 'leave':
        result = await leaveStudyRoom(request, user.id, userName);
        break;
      case 'list':
        result = await listStudyRooms(user.id);
        break;
      case 'send_message':
        result = await sendMessage(request, user.id, userName);
        break;
      case 'get_ice_servers':
        result = getIceServers();
        break;
      default:
        // Handle WebRTC signaling
        result = await handleWebRTCSignaling(request, user.id);
    }

    return new Response(JSON.stringify({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
      activeRooms: studyRooms.size
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Study rooms error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Study room operation failed',
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});