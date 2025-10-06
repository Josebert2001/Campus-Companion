import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { audio } = await req.json();

    if (!audio) {
      throw new Error("No audio data provided");
    }

    console.log("Processing voice input with Groq Whisper...");

    const groqApiKey = Deno.env.get("GROQ_API_KEY");
    if (!groqApiKey) {
      throw new Error("Groq API key not configured");
    }

    const binaryAudio = Uint8Array.from(atob(audio), (c) => c.charCodeAt(0));

    const formData = new FormData();
    const blob = new Blob([binaryAudio], { type: "audio/webm" });
    formData.append("file", blob, "audio.webm");
    formData.append("model", "whisper-large-v3-turbo");
    formData.append("language", "en");
    formData.append("temperature", "0");
    formData.append("response_format", "json");
    formData.append(
      "prompt",
      "This is an academic question from a University of Uyo student seeking help with their studies. The audio may contain technical terms, course names, and academic concepts."
    );

    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq Whisper API error:", response.status, errorText);
      throw new Error(`Speech recognition failed: ${response.status}`);
    }

    const result = await response.json();
    console.log("Groq voice transcription successful:", result.text);

    return new Response(JSON.stringify({ text: result.text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Voice-to-text error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Voice processing failed",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
