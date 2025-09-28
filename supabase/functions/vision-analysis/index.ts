import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { image, context = "Academic study material analysis" } = await req.json();
    
    if (!image) {
      throw new Error('No image data provided');
    }

    console.log('Analyzing image for Campus Companion...');

    // Use OpenAI GPT-4 Vision for image analysis
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a Vision Analysis Agent for Campus Companion, helping University of Uyo students understand visual study materials.

Your expertise:
- Analyze lecture slides, diagrams, handwritten notes, textbooks
- Extract key concepts and information
- Explain visual elements clearly
- Identify important formulas, equations, or data
- Provide study-focused summaries
- Help students understand visual content

Context: ${context}

Provide analysis that:
1. Describes what you see in academic terms
2. Extracts key concepts and information
3. Explains important visual elements
4. Identifies any text, formulas, or data
5. Offers study tips related to the content
6. Suggests how this material connects to broader topics

Focus on educational value and helping the student learn from this visual material.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please analyze this study material and help me understand it better.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${image}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI Vision API error:', response.status, errorText);
      throw new Error(`Vision analysis failed: ${response.status}`);
    }

    const result = await response.json();
    const analysis = result.choices[0].message.content;

    console.log('Vision analysis successful');

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Vision analysis error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Vision analysis failed' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});