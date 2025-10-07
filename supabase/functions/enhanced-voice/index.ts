import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface VoiceRequest {
  audio?: string;
  text?: string;
  action: "transcribe" | "synthesize";
  voice?: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
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
}

interface SynthesisResult {
  audioContent: string;
  voice_used: string;
  processing_info?: any;
}

interface VoiceRouting {
  selected_agent: "academic_transcriber" | "general_transcriber" | "speech_synthesizer";
  confidence: number;
  reason: string;
}

function routeVoiceProcessing(request: VoiceRequest): VoiceRouting {
  if (request.action === "synthesize") {
    return {
      selected_agent: "speech_synthesizer",
      confidence: 1.0,
      reason: "Speech synthesis requested",
    };
  }

  const context = (request.context || "").toLowerCase();
  const enhanceAcademic = request.enhance_academic || false;

  if (enhanceAcademic || context.includes("study") || context.includes("academic") || context.includes("lecture")) {
    return {
      selected_agent: "academic_transcriber",
      confidence: 0.95,
      reason: "Academic context detected - using enhanced transcription",
    };
  }

  return {
    selected_agent: "general_transcriber",
    confidence: 0.85,
    reason: "General transcription requested",
  };
}

async function transcribeWithGroq(request: VoiceRequest, routing: VoiceRouting): Promise<TranscriptionResult> {
  if (!request.audio) {
    throw new Error("Audio data required for transcription");
  }

  const groqApiKey = Deno.env.get("GROQ_API_KEY");
  if (!groqApiKey) {
    throw new Error("GROQ_API_KEY not configured");
  }

  const binaryAudio = Uint8Array.from(atob(request.audio), (c) => c.charCodeAt(0));

  const formData = new FormData();
  const blob = new Blob([binaryAudio], { type: "audio/webm" });
  formData.append("file", blob, "audio.webm");
  formData.append("model", "whisper-large-v3-turbo");
  formData.append("language", request.language || "en");
  formData.append("temperature", "0");
  formData.append("response_format", "json");

  if (routing.selected_agent === "academic_transcriber") {
    formData.append(
      "prompt",
      "This is an academic question from a University of Uyo student. The audio may contain technical terms, course names, academic concepts, or study-related discussions. Please transcribe accurately with attention to academic vocabulary."
    );
  }

  const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${groqApiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Groq Whisper error:", response.status, errorText);
    throw new Error(`Speech recognition failed: ${response.status}`);
  }

  const result = await response.json();
  const transcribedText = result.text;

  return {
    text: transcribedText,
    confidence: 0.95,
    language: request.language || "en",
    academic_enhanced: routing.selected_agent === "academic_transcriber",
    processing_info: {
      agent_used: routing.selected_agent,
      routing_reason: routing.reason,
      model_used: "whisper-large-v3-turbo",
      enhanced: routing.selected_agent === "academic_transcriber",
    },
  };
}

async function synthesizeWithElevenLabs(request: VoiceRequest): Promise<SynthesisResult> {
  if (!request.text) {
    throw new Error("Text required for speech synthesis");
  }

  const elevenLabsApiKey = Deno.env.get("ELEVENLABS_API_KEY");
  if (!elevenLabsApiKey) {
    throw new Error("ELEVENLABS_API_KEY not configured");
  }

  let voiceId = "21m00Tcm4TlvDq8ikWAM";

  if (!request.voice) {
    const textLower = request.text.toLowerCase();
    if (textLower.includes("formula") || textLower.includes("equation") || textLower.includes("mathematics")) {
      voiceId = "pNInz6obpgDQGcFmaJgB";
    } else if (textLower.includes("explanation") || textLower.includes("concept")) {
      voiceId = "21m00Tcm4TlvDq8ikWAM";
    } else if (textLower.includes("encouragement") || textLower.includes("motivation")) {
      voiceId = "EXAVITQu4vr4xnSDxMaL";
    }
  }

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": elevenLabsApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: request.text.slice(0, 5000),
      model_id: "eleven_turbo_v2_5",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.5,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("ElevenLabs TTS error:", response.status, errorText);
    throw new Error(`ElevenLabs speech synthesis failed: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

  return {
    audioContent: base64Audio,
    voice_used: voiceId,
    processing_info: {
      model_used: "eleven_turbo_v2_5",
      text_length: request.text.length,
      voice_selection: request.voice ? "user_selected" : "auto_selected",
      academic_optimized: true,
      provider: "elevenlabs",
    },
  };
}

async function synthesizeWithGroqPlayAI(request: VoiceRequest): Promise<SynthesisResult> {
  if (!request.text) {
    throw new Error("Text required for speech synthesis");
  }

  const groqApiKey = Deno.env.get("GROQ_API_KEY");
  if (!groqApiKey) {
    throw new Error("GROQ_API_KEY not configured");
  }

  const response = await fetch("https://api.groq.com/openai/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${groqApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "playai-tts",
      input: request.text.slice(0, 4000),
      voice: "s3://voice-cloning-zero-shot/d9ff78ba-d016-47f6-b0ef-dd630f59414e/female-cs/manifest.json",
      response_format: "mp3",
      speed: 1.0,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Groq PlayAI TTS error:", response.status, errorText);
    throw new Error(`Groq PlayAI speech synthesis failed: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

  return {
    audioContent: base64Audio,
    voice_used: "playai-female",
    processing_info: {
      model_used: "playai-tts",
      text_length: request.text.length,
      academic_optimized: true,
      provider: "groq-playai",
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: authHeader ? { Authorization: authHeader } : {} },
    });

    let user = null;
    if (authHeader) {
      const { data: userData } = await supabase.auth.getUser();
      user = userData?.user || null;
    }

    const request: VoiceRequest = await req.json();

    if (!request.action) {
      throw new Error("Action (transcribe or synthesize) is required");
    }

    console.log("Processing enhanced voice request:", request.action);

    const routing = routeVoiceProcessing(request);
    console.log("Voice routing decision:", routing);

    let result: any;

    if (request.action === "transcribe") {
      const transcriptionResult = await transcribeWithGroq(request, routing);

      result = {
        success: true,
        text: transcriptionResult.text,
        raw_transcription: transcriptionResult.text,
        routing: {
          selected_agent: routing.selected_agent,
          confidence: routing.confidence,
          reason: routing.reason,
        },
        processing_info: transcriptionResult.processing_info,
        academic_enhanced: transcriptionResult.academic_enhanced,
        confidence: transcriptionResult.confidence,
        language: transcriptionResult.language,
      };
    } else {
      let synthesisResult: SynthesisResult;
      try {
        synthesisResult = await synthesizeWithElevenLabs(request);
      } catch (elevenLabsError) {
        console.warn("ElevenLabs failed, falling back to Groq PlayAI:", elevenLabsError);
        synthesisResult = await synthesizeWithGroqPlayAI(request);
      }

      result = {
        success: true,
        audioContent: synthesisResult.audioContent,
        voice_used: synthesisResult.voice_used,
        processing_info: synthesisResult.processing_info,
        routing: {
          selected_agent: routing.selected_agent,
          confidence: routing.confidence,
          reason: routing.reason,
        },
      };
    }

    result.processing_type = "multi_agent_voice";
    result.university_context = {
      institution: "University of Uyo",
      academic_optimized: true,
      nigerian_context: true,
    };
    result.timestamp = new Date().toISOString();

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Enhanced voice processing error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Voice processing failed",
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});