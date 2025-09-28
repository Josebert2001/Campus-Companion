import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

// Enhanced CORS configuration for production and development
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173", 
  "http://localhost:8080",
  "https://campus-companion-psi.vercel.app",
  "https://rirzudpvpjuzurztysui.supabase.co"
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400', // 24 hours
  };
}

interface VoiceRequest {
  audio?: string; // base64 encoded audio for transcription
  text?: string;  // text for speech synthesis
  action: 'transcribe' | 'synthesize';
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  language?: string;
  enhance_academic?: boolean;
  context?: string;
}

interface TranscriptionResult {
  text: string;
  confidence?: number;
  language?: string;
  academic_enhanced?: boolean;
  processing_info?: any;
  unified_response?: string;
}

interface SynthesisResult {
  audioContent: string; // base64 encoded
  voice_used: string;
  processing_info?: any;
}

interface VoiceRouting {
  selected_agent: 'academic_transcriber' | 'general_transcriber' | 'speech_synthesizer';
  confidence: number;
  reason: string;
}

// Multi-Agent Router for Voice Processing
function routeVoiceProcessing(request: VoiceRequest): VoiceRouting {
  if (request.action === 'synthesize') {
    return {
      selected_agent: 'speech_synthesizer',
      confidence: 1.0,
      reason: 'Speech synthesis requested'
    };
  }

  const context = (request.context || '').toLowerCase();
  const enhanceAcademic = request.enhance_academic || false;
  
  if (enhanceAcademic || context.includes('study') || context.includes('academic') || context.includes('lecture')) {
    return {
      selected_agent: 'academic_transcriber',
      confidence: 0.95,
      reason: 'Academic context detected - using enhanced academic transcription'
    };
  }
  
  return {
    selected_agent: 'general_transcriber',
    confidence: 0.85,
    reason: 'General transcription requested'
  };
}

// Enhanced Academic Transcription with Groq
async function transcribeWithGroq(request: VoiceRequest, routing: VoiceRouting): Promise<TranscriptionResult> {
  if (!request.audio) {
    throw new Error('Audio data required for transcription');
  }

  // For now, we'll use OpenAI Whisper as Groq doesn't have audio transcription yet
  // But we'll enhance the result with Groq for academic context
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  // Convert base64 to binary
  const binaryAudio = Uint8Array.from(atob(request.audio), c => c.charCodeAt(0));
  
  // Prepare form data for OpenAI Whisper
  const formData = new FormData();
  const blob = new Blob([binaryAudio], { type: 'audio/webm' });
  formData.append('file', blob, 'audio.webm');
  formData.append('model', 'whisper-1');
  formData.append('language', request.language || 'en');
  
  // Enhanced prompt for academic context
  if (routing.selected_agent === 'academic_transcriber') {
    formData.append('prompt', 'This is an academic question from a University of Uyo student. The audio may contain technical terms, course names, academic concepts, or study-related discussions. Please transcribe accurately with attention to academic vocabulary.');
  }

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI Whisper error:', response.status, errorText);
    throw new Error(`Speech recognition failed: ${response.status}`);
  }

  const result = await response.json();
  let transcribedText = result.text;

  // Enhance with Groq for academic context if needed
  if (routing.selected_agent === 'academic_transcriber' && transcribedText.length > 10) {
    try {
      transcribedText = await enhanceAcademicTranscription(transcribedText, request.context);
    } catch (error) {
      console.log('Academic enhancement failed, using original transcription:', error);
    }
  }

  return {
    text: transcribedText,
    confidence: 0.95,
    language: request.language || 'en',
    academic_enhanced: routing.selected_agent === 'academic_transcriber',
    processing_info: {
      agent_used: routing.selected_agent,
      routing_reason: routing.reason,
      original_text: result.text,
      enhanced: routing.selected_agent === 'academic_transcriber'
    }
  };
}

// Enhance transcription with academic context using Groq
async function enhanceAcademicTranscription(text: string, context?: string): Promise<string> {
  const groqApiKey = Deno.env.get('GROQ_API_KEY');
  if (!groqApiKey) {
    return text; // Return original if no Groq key
  }

  const enhancementPrompt = `You are an Academic Transcription Enhancer for Campus Companion, helping University of Uyo students.

Your task: Review and improve this voice transcription for academic accuracy.

ORIGINAL TRANSCRIPTION: "${text}"
CONTEXT: ${context || 'Academic study session'}

ENHANCEMENT RULES:
1. Fix common academic term misrecognitions
2. Correct course names and technical terminology
3. Improve grammar while preserving meaning
4. Ensure Nigerian English context is respected
5. Keep the student's original intent and tone
6. Only make necessary corrections - don't rewrite completely

COMMON FIXES:
- "calculus" not "calculas"
- "algorithm" not "algorythm" 
- "University of Uyo" not "university of yo"
- Technical terms should be spelled correctly
- Course codes should be formatted properly

Return ONLY the enhanced transcription text, nothing else.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: enhancementPrompt },
          { role: 'user', content: 'Please enhance this transcription.' }
        ],
        max_tokens: 500,
        temperature: 0.1, // Low temperature for accuracy
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const enhancedText = data.choices[0].message.content.trim();
      
      // Only return enhanced version if it's reasonable (not too different)
      const similarity = calculateSimilarity(text, enhancedText);
      if (similarity > 0.7) { // 70% similarity threshold
        return enhancedText;
      }
    }
  } catch (error) {
    console.error('Academic enhancement error:', error);
  }

  return text; // Fallback to original
}

// Simple similarity calculation
function calculateSimilarity(str1: string, str2: string): number {
  const words1 = str1.toLowerCase().split(/\s+/);
  const words2 = str2.toLowerCase().split(/\s+/);
  
  const commonWords = words1.filter(word => words2.includes(word));
  const totalWords = Math.max(words1.length, words2.length);
  
  return commonWords.length / totalWords;
}

// Enhanced Speech Synthesis
async function synthesizeWithOpenAI(request: VoiceRequest): Promise<SynthesisResult> {
  if (!request.text) {
    throw new Error('Text required for speech synthesis');
  }

  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  // Select appropriate voice for academic content
  let voice = request.voice || 'alloy';
  
  // Auto-select voice based on content
  if (!request.voice) {
    const textLower = request.text.toLowerCase();
    if (textLower.includes('formula') || textLower.includes('equation') || textLower.includes('mathematics')) {
      voice = 'echo'; // Clear, precise voice for technical content
    } else if (textLower.includes('explanation') || textLower.includes('concept')) {
      voice = 'nova'; // Warm, educational voice
    } else if (textLower.includes('encouragement') || textLower.includes('motivation')) {
      voice = 'shimmer'; // Uplifting voice
    }
  }

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1-hd',
      input: request.text.slice(0, 4000), // Limit text length
      voice: voice,
      response_format: 'mp3',
      speed: 1.0
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI TTS error:', response.status, errorText);
    throw new Error(`Speech synthesis failed: ${response.status}`);
  }

  // Convert audio buffer to base64
  const arrayBuffer = await response.arrayBuffer();
  const base64Audio = btoa(
    String.fromCharCode(...new Uint8Array(arrayBuffer))
  );

  return {
    audioContent: base64Audio,
    voice_used: voice,
    processing_info: {
      model_used: 'tts-1-hd',
      text_length: request.text.length,
      voice_selection: request.voice ? 'user_selected' : 'auto_selected',
      academic_optimized: true
    }
  };
}

// Generate unified response for transcription
async function generateUnifiedTranscriptionResponse(result: TranscriptionResult, request: VoiceRequest): Promise<string> {
  const groqApiKey = Deno.env.get('GROQ_API_KEY');
  if (!groqApiKey || !result.academic_enhanced) {
    return result.text; // Return original if no enhancement needed
  }

  const unifierPrompt = `You are the Campus Companion Voice Response Unifier. A student just spoke to me and I transcribed their voice.

TRANSCRIBED TEXT: "${result.text}"
CONTEXT: ${request.context || 'Student voice input'}

Your task: Create a brief, friendly acknowledgment that shows I understood their voice input correctly, then seamlessly transition to helping them.

RESPONSE FORMAT:
"I heard you say: '[brief paraphrase]' - [helpful response or question]"

EXAMPLES:
- "I heard you say you need help with calculus - what specific topic are you working on?"
- "I heard you ask about assignment deadlines - let me help you organize those!"
- "I heard you mention studying for exams - would you like me to create a study schedule?"

Keep it conversational, encouraging, and focused on helping them learn.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: unifierPrompt },
          { role: 'user', content: 'Please create a unified response.' }
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.choices[0].message.content;
    }
  } catch (error) {
    console.error('Unifier error:', error);
  }

  return result.text; // Fallback
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
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

    const request: VoiceRequest = await req.json();
    
    if (!request.action) {
      throw new Error('Action (transcribe or synthesize) is required');
    }

    console.log('Processing enhanced voice request:', request.action);

    // Route to appropriate agent
    const routing = routeVoiceProcessing(request);
    console.log('Voice routing decision:', routing);

    let result: any;

    if (request.action === 'transcribe') {
      const transcriptionResult = await transcribeWithGroq(request, routing);
      
      // Generate unified response if academic enhancement was used
      if (transcriptionResult.academic_enhanced) {
        transcriptionResult.unified_response = await generateUnifiedTranscriptionResponse(transcriptionResult, request);
      }

      result = {
        success: true,
        text: transcriptionResult.unified_response || transcriptionResult.text,
        raw_transcription: transcriptionResult.text,
        routing: {
          selected_agent: routing.selected_agent,
          confidence: routing.confidence,
          reason: routing.reason
        },
        processing_info: transcriptionResult.processing_info,
        academic_enhanced: transcriptionResult.academic_enhanced,
        confidence: transcriptionResult.confidence,
        language: transcriptionResult.language
      };
    } else {
      const synthesisResult = await synthesizeWithOpenAI(request);
      
      result = {
        success: true,
        audioContent: synthesisResult.audioContent,
        voice_used: synthesisResult.voice_used,
        processing_info: synthesisResult.processing_info,
        routing: {
          selected_agent: routing.selected_agent,
          confidence: routing.confidence,
          reason: routing.reason
        }
      };
    }

    result.processing_type = 'multi_agent_voice';
    result.university_context = {
      institution: 'University of Uyo',
      academic_optimized: true,
      nigerian_context: true
    };
    result.timestamp = new Date().toISOString();

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Enhanced voice processing error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Voice processing failed',
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});