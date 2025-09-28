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

// Simplified Agent Models for focused responses
const AGENT_MODELS = {
  router: 'llama-3.1-8b-instant',      // Fast routing decisions
  study_helper: 'llama-3.1-8b-instant', // Quick concept explanations
  time_manager: 'llama-3.1-8b-instant', // Scheduling and organization
  researcher: 'llama-3.1-70b-versatile', // Research and references
  motivator: 'llama-3.1-8b-instant',    // Encouragement and mindset
  unifier: 'llama-3.1-8b-instant',     // Consistent voice
};

interface RoutingDecision {
  selected_agent: 'study_helper' | 'time_manager' | 'researcher' | 'motivator';
  confidence: number;
  reason: string;
}

interface AgentResponse {
  content: string;
  agent_used: string;
  confidence: number;
}

// Enhanced Groq API call with better error handling
async function callGroqModel(model: string, messages: any[], maxTokens: number = 400, temperature: number = 0.3): Promise<string> {
  const groqApiKey = Deno.env.get('GROQ_API_KEY');
  if (!groqApiKey) {
    throw new Error('GROQ_API_KEY not configured');
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${groqApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
      top_p: 0.9,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error(`Groq API error for model ${model}:`, response.status, errorData);
    throw new Error(`AI service temporarily unavailable`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Smart Router - Decides which agent to use
async function routeUserQuery(query: string, context: string): Promise<RoutingDecision> {
  const systemPrompt = `You are the Campus Companion Router. Analyze the student's query and decide which agent should handle it.

Available Agents:
- study_helper: Explain concepts, solve problems, answer academic questions
- time_manager: Create schedules, manage deadlines, organize tasks
- researcher: Find sources, summarize content, provide references
- motivator: Encourage, reduce stress, provide mindset support

Student Query: "${query}"
Context: ${context}

Respond with ONLY this JSON format:
{
  "selected_agent": "agent_name",
  "confidence": 0.85,
  "reason": "brief explanation"
}`;

  try {
    const response = await callGroqModel(AGENT_MODELS.router, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query }
    ], 200, 0.1);

    const cleanResponse = response.replace(/```json\n?|\n?```/g, '').trim();
    const routing = JSON.parse(cleanResponse);
    
    // Validate routing decision
    const validAgents = ['study_helper', 'time_manager', 'researcher', 'motivator'];
    if (!validAgents.includes(routing.selected_agent)) {
      throw new Error('Invalid agent selection');
    }
    
    return routing;
  } catch (error) {
    console.error('Routing error:', error);
    // Intelligent fallback based on keywords
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('schedule') || queryLower.includes('deadline') || queryLower.includes('time')) {
      return { selected_agent: 'time_manager', confidence: 0.7, reason: 'Keyword-based routing to time management' };
    } else if (queryLower.includes('research') || queryLower.includes('find') || queryLower.includes('source')) {
      return { selected_agent: 'researcher', confidence: 0.7, reason: 'Keyword-based routing to research' };
    } else if (queryLower.includes('stress') || queryLower.includes('motivation') || queryLower.includes('help me focus')) {
      return { selected_agent: 'motivator', confidence: 0.7, reason: 'Keyword-based routing to motivation' };
    }
    
    return { selected_agent: 'study_helper', confidence: 0.6, reason: 'Default routing to study help' };
  }
}

// Study Helper Agent - Concise concept explanations
async function studyHelperAgent(query: string, context: string, userName: string): Promise<AgentResponse> {
  const systemPrompt = `You are the Study Helper for Campus Companion. Help University of Uyo students understand concepts quickly.

Student: ${userName}
Context: ${context}

Provide CONCISE help that:
- Answers the question directly (2-3 sentences max)
- Explains concepts simply
- Gives one practical tip
- Stays focused and brief

Keep responses short, clear, and immediately helpful.`;

  const result = await callGroqModel(AGENT_MODELS.study_helper, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: query }
  ], 300, 0.4);

  return {
    content: result,
    agent_used: 'study_helper',
    confidence: 0.90
  };
}

// Time Manager Agent - Quick scheduling help
async function timeManagerAgent(query: string, context: string, userName: string): Promise<AgentResponse> {
  const systemPrompt = `You are the Time Manager for Campus Companion. Help University of Uyo students organize their time efficiently.

Student: ${userName}
Context: ${context}

Provide CONCISE scheduling help that:
- Gives direct, actionable advice (2-3 sentences)
- Focuses on immediate next steps
- Provides simple time management tips
- Stays practical and brief

Keep responses short and immediately actionable.`;

  const result = await callGroqModel(AGENT_MODELS.time_manager, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: query }
  ], 300, 0.3);

  return {
    content: result,
    agent_used: 'time_manager',
    confidence: 0.95
  };
}

// Researcher Agent - Quick research assistance
async function researcherAgent(query: string, context: string, userName: string): Promise<AgentResponse> {
  const systemPrompt = `You are the Researcher for Campus Companion. Help University of Uyo students find information quickly.

Student: ${userName}
Context: ${context}

Provide CONCISE research help that:
- Points to specific sources or search strategies (2-3 sentences)
- Gives immediate actionable steps
- Focuses on the most relevant information
- Stays brief and targeted

Keep responses short and immediately useful for research.`;

  const result = await callGroqModel(AGENT_MODELS.researcher, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: query }
  ], 400, 0.3);

  return {
    content: result,
    agent_used: 'researcher',
    confidence: 0.85
  };
}

// Motivator Agent - Quick encouragement
async function motivatorAgent(query: string, context: string, userName: string): Promise<AgentResponse> {
  const systemPrompt = `You are the Motivator for Campus Companion. Encourage University of Uyo students with quick, uplifting support.

Student: ${userName}
Context: ${context}

Provide CONCISE motivation that:
- Acknowledges their feelings (1 sentence)
- Gives encouraging perspective (1-2 sentences)
- Suggests one practical action
- Stays positive and brief

Keep responses short, warm, and immediately encouraging.`;

  const result = await callGroqModel(AGENT_MODELS.motivator, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: query }
  ], 250, 0.6);

  return {
    content: result,
    agent_used: 'motivator',
    confidence: 0.88
  };
}

// Unifier Agent - Creates consistent Campus Companion voice
async function unifyResponse(agentResponse: AgentResponse, originalQuery: string, userName: string): Promise<string> {
  const systemPrompt = `You are the Campus Companion Voice Unifier. Transform agent responses into a consistent, friendly Campus Companion voice.

Student: ${userName}
Original Query: "${originalQuery}"
Agent Response: "${agentResponse.content}"
Agent Used: ${agentResponse.agent_used}

Transform this into Campus Companion's voice:
- Friendly and encouraging tone
- Keep the same information but make it conversational
- Add appropriate emoji (1-2 max)
- Stay concise (2-3 sentences)
- Sound like a helpful study buddy

Make it feel like Campus Companion is speaking directly to the student.`;

  try {
    return await callGroqModel(AGENT_MODELS.unifier, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Please unify this response.' }
    ], 300, 0.5);
  } catch (error) {
    console.error('Unifier error:', error);
    return agentResponse.content; // Fallback to original
  }
}

// Main processing function with routing
async function processWithRouting(query: string, context: string, userName: string, userProfile?: any): Promise<{ response: string; routing: RoutingDecision; processing_type: string }> {
  try {
    console.log('Starting routed processing for:', userName);

    // Step 1: Route to appropriate agent
    const routing = await routeUserQuery(query, context);
    console.log('Routing decision:', routing);

    // Step 2: Execute selected agent
    let agentResponse: AgentResponse;
    
    switch (routing.selected_agent) {
      case 'study_helper':
        agentResponse = await studyHelperAgent(query, context, userName);
        break;
      case 'time_manager':
        agentResponse = await timeManagerAgent(query, context, userName);
        break;
      case 'researcher':
        agentResponse = await researcherAgent(query, context, userName);
        break;
      case 'motivator':
        agentResponse = await motivatorAgent(query, context, userName);
        break;
      default:
        agentResponse = await studyHelperAgent(query, context, userName);
    }

    console.log('Agent processing completed');

    // Step 3: Unify into Campus Companion voice
    const unifiedResponse = await unifyResponse(agentResponse, query, userName);
    console.log('Response unified successfully');

    return {
      response: unifiedResponse,
      routing,
      processing_type: 'routed_agent'
    };
  } catch (error) {
    console.error('Routed processing error:', error);
    // Simple fallback
    const fallbackResponse = await callGroqModel(AGENT_MODELS.study_helper, [
      { 
        role: 'system', 
        content: `You are Campus Companion, a helpful AI study assistant for University of Uyo students. Give ${userName} a brief, encouraging answer to: ${query}. Keep it to 2-3 sentences max.` 
      },
      { role: 'user', content: query }
    ], 250, 0.5);

    return {
      response: fallbackResponse,
      routing: { selected_agent: 'study_helper', confidence: 0.5, reason: 'Fallback routing' },
      processing_type: 'fallback'
    };
  }
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

    const { message, context } = await req.json();
    
    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (message.length > 1000) {
      return new Response(JSON.stringify({ error: 'Please keep your question shorter so I can help you better! 😊' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch student profile for personalized assistance
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, course, year_of_study, university')
      .eq('user_id', user.id)
      .maybeSingle();

    const userName = profile?.full_name || 'Student';
    const sanitizedMessage = message.trim();
    const sanitizedContext = context ? context.trim() : 'University of Uyo student using Campus Companion';

    console.log('Processing routed request for:', user.id);

    // Process using smart routing system
    const { response, routing, processing_type } = await processWithRouting(sanitizedMessage, sanitizedContext, userName, profile);

    return new Response(JSON.stringify({ 
      response,
      processing_type,
      routing: {
        selected_agent: routing.selected_agent,
        confidence: routing.confidence,
        reason: routing.reason
      },
      timestamp: new Date().toISOString(),
      student_context: {
        name: userName,
        university: profile?.university || 'University of Uyo',
        course: profile?.course,
        year: profile?.year_of_study
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-chat function:', error);
    return new Response(JSON.stringify({ 
      response: 'I\'m having trouble right now, but I\'m here to help you succeed! 💪 Please try again in a moment.',
      processing_type: 'error_fallback',
      routing: { selected_agent: 'study_helper', confidence: 0.1, reason: 'Error fallback' }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});