import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function generateWithElevenLabs(text: string, voice: string): Promise<string> {
  const elevenLabsApiKey = Deno.env.get("ELEVENLABS_API_KEY");
  if (!elevenLabsApiKey) {
    throw new Error("ElevenLabs API key not configured");
  }

  const voiceMap: Record<string, string> = {
    alloy: "21m00Tcm4TlvDq8ikWAM",
    echo: "pNInz6obpgDQGcFmaJgB",
    fable: "XrExE9yKIg1WjnnlVkGX",
    onyx: "ODq5zmih8GrVes37Dizd",
    nova: "EXAVITQu4vr4xnSDxMaL",
    shimmer: "ThT5KcBeYPX3keUQqHPh",
  };

  const voiceId = voiceMap[voice] || voiceMap.alloy;

  console.log("Generating speech with ElevenLabs:", { textLength: text.length, voiceId });

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": elevenLabsApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: text.slice(0, 5000),
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("ElevenLabs TTS error:", response.status, errorText);
    throw new Error(`ElevenLabs TTS failed: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

  console.log("ElevenLabs speech generation successful");
  return base64Audio;
}

async function generateWithGroqPlayTTS(text: string): Promise<string> {
  const groqApiKey = Deno.env.get("GROQ_API_KEY");
  if (!groqApiKey) {
    throw new Error("Groq API key not configured");
  }

  console.log("Generating speech with Groq PlayTTS:", { textLength: text.length });

  const response = await fetch("https://api.groq.com/openai/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${groqApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "distil-whisper-large-v3-en",
      input: text.slice(0, 4000),
      voice: "alloy",
      response_format: "mp3",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Groq PlayTTS error:", response.status, errorText);
    throw new Error(`Groq PlayTTS failed: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

  console.log("Groq PlayTTS generation successful");
  return base64Audio;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { text, voice = "alloy", provider = "elevenlabs" } = await req.json();

    if (!text || text.trim().length === 0) {
      throw new Error("No text provided for speech synthesis");
    }

    let audioContent: string;
    let usedProvider: string;

    try {
      if (provider === "elevenlabs") {
        audioContent = await generateWithElevenLabs(text, voice);
        usedProvider = "elevenlabs";
      } else if (provider === "groq") {
        audioContent = await generateWithGroqPlayTTS(text);
        usedProvider = "groq";
      } else {
        audioContent = await generateWithElevenLabs(text, voice);
        usedProvider = "elevenlabs";
      }
    } catch (primaryError) {
      console.warn(`Primary TTS provider (${provider}) failed, trying fallback:`, primaryError);

      if (provider !== "groq") {
        try {
          audioContent = await generateWithGroqPlayTTS(text);
          usedProvider = "groq-fallback";
        } catch (fallbackError) {
          console.error("Fallback to Groq also failed:", fallbackError);
          throw primaryError;
        }
      } else {
        try {
          audioContent = await generateWithElevenLabs(text, voice);
          usedProvider = "elevenlabs-fallback";
        } catch (fallbackError) {
          console.error("Fallback to ElevenLabs also failed:", fallbackError);
          throw primaryError;
        }
      }
    }

    return new Response(
      JSON.stringify({
        audioContent,
        provider: usedProvider
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Text-to-speech error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Speech synthesis failed",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});