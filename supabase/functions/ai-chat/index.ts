import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const AGENT_MODELS = {
  router: "mixtral-8x7b-32768",
  study_helper: "llama-3.3-70b-versatile",
  time_manager: "llama-3.1-70b-versatile",
  researcher: "llama-3.3-70b-versatile",
  motivator: "llama-3.1-8b-instant",
  unifier: "llama-3.1-70b-versatile",
};

interface RoutingDecision {
  selected_agent: "study_helper" | "time_manager" | "researcher" | "motivator";
  confidence: number;
  reason: string;
}

interface AgentResponse {
  content: string;
  agent_used: string;
  confidence: number;
}

async function callGroqModel(
  model: string,
  messages: any[],
  maxTokens: number = 400,
  temperature: number = 0.3
): Promise<string> {
  const groqApiKey = Deno.env.get("GROQ_API_KEY");
  if (!groqApiKey) {
    throw new Error("GROQ_API_KEY not configured");
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${groqApiKey}`,
      "Content-Type": "application/json",
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
    throw new Error("AI service temporarily unavailable");
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function streamGroqModel(
  model: string,
  messages: any[],
  temperature: number = 0.3
): Promise<ReadableStream<Uint8Array>> {
  const groqApiKey = Deno.env.get("GROQ_API_KEY");
  if (!groqApiKey) throw new Error("GROQ_API_KEY not configured");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${groqApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 2000,
      temperature,
      top_p: 0.9,
      stream: true,
    }),
  });

  if (!res.ok || !res.body) {
    const errTxt = await res.text().catch(() => "");
    throw new Error(`Groq streaming failed: ${res.status} ${errTxt}`);
  }

  return res.body;
}

async function routeUserQuery(query: string, context: string): Promise<RoutingDecision> {
  const systemPrompt = `You are the intelligent routing system for Campus Companion, an AI study assistant for University of Uyo students.

Your role is to analyze incoming student queries and route them to the most appropriate specialized agent.

AVAILABLE AGENTS:
- study_helper: Explains concepts, breaks down complex topics, teaches academic subjects
- time_manager: Creates schedules, manages deadlines, organizes study plans, prioritizes tasks
- researcher: Finds sources, helps with citations, guides research methodology
- motivator: Provides encouragement, helps with stress/anxiety, boosts academic confidence

OUTPUT FORMAT:
Respond with ONLY a JSON object:
{
  "selected_agent": "agent_name",
  "confidence": 0.0-1.0,
  "reason": "Brief explanation why this agent was chosen"
}

Student Query: "${query}"
Context: ${context}`;

  try {
    const response = await callGroqModel(
      AGENT_MODELS.router,
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: query },
      ],
      300,
      0.2
    );

    const cleanResponse = response.replace(/```json\n?|\n?```/g, "").trim();
    const routing = JSON.parse(cleanResponse);

    const validAgents = ["study_helper", "time_manager", "researcher", "motivator"];
    if (!validAgents.includes(routing.selected_agent)) {
      throw new Error("Invalid agent selection");
    }

    return routing;
  } catch (error) {
    console.error("Routing error:", error);
    const queryLower = query.toLowerCase();

    if (queryLower.includes("schedule") || queryLower.includes("deadline") || queryLower.includes("time")) {
      return { selected_agent: "time_manager", confidence: 0.7, reason: "Keyword-based routing to time management" };
    } else if (queryLower.includes("research") || queryLower.includes("find") || queryLower.includes("source")) {
      return { selected_agent: "researcher", confidence: 0.7, reason: "Keyword-based routing to research" };
    } else if (queryLower.includes("stress") || queryLower.includes("motivation") || queryLower.includes("help me focus")) {
      return { selected_agent: "motivator", confidence: 0.7, reason: "Keyword-based routing to motivation" };
    }

    return { selected_agent: "study_helper", confidence: 0.6, reason: "Default routing to study help" };
  }
}

async function studyHelperAgent(query: string, context: string, userName: string, profile?: any): Promise<AgentResponse> {
  const studentContext = profile
    ? `Student Name: ${userName}
University: ${profile.university || "University of Uyo"}
Course: ${profile.course || "Not specified"}
Year: ${profile.year_of_study || "Not specified"}`
    : `Student Name: ${userName}
University: University of Uyo`;

  const systemPrompt = `You are the Study Helper, a patient and knowledgeable academic tutor for University of Uyo students.

${studentContext}
Context: ${context}

Provide clear, helpful explanations using examples and step-by-step guidance. Be warm, encouraging, and conversational.`;

  const result = await callGroqModel(
    AGENT_MODELS.study_helper,
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: query },
    ],
    1000,
    0.5
  );

  return {
    content: result,
    agent_used: "study_helper",
    confidence: 0.9,
  };
}

async function timeManagerAgent(query: string, context: string, userName: string, profile?: any): Promise<AgentResponse> {
  const studentContext = profile
    ? `Student: ${userName}
University: ${profile.university || "University of Uyo"}
Course: ${profile.course || "Not specified"}
Year: ${profile.year_of_study || "Not specified"}`
    : `Student: ${userName}`;

  const systemPrompt = `You are the Time Manager, a productivity expert helping University of Uyo students organize their time and manage tasks.

${studentContext}
Context: ${context}

Create practical schedules, prioritize tasks, and provide realistic time management strategies.`;

  const result = await callGroqModel(
    AGENT_MODELS.time_manager,
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: query },
    ],
    1200,
    0.3
  );

  return {
    content: result,
    agent_used: "time_manager",
    confidence: 0.95,
  };
}

async function researcherAgent(query: string, context: string, userName: string, profile?: any): Promise<AgentResponse> {
  const studentContext = profile
    ? `Student: ${userName}
University: ${profile.university || "University of Uyo"}
Course: ${profile.course || "Not specified"}
Year: ${profile.year_of_study || "Not specified"}`
    : `Student: ${userName}`;

  const systemPrompt = `You are the Researcher, an academic research assistant helping University of Uyo students with research, sources, and citations.

${studentContext}
Context: ${context}

Guide research methodology, help find credible sources, and teach proper academic citation (APA, MLA, Chicago).`;

  const result = await callGroqModel(
    AGENT_MODELS.researcher,
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: query },
    ],
    1200,
    0.3
  );

  return {
    content: result,
    agent_used: "researcher",
    confidence: 0.85,
  };
}

async function motivatorAgent(query: string, context: string, userName: string, profile?: any): Promise<AgentResponse> {
  const studentContext = profile
    ? `Student: ${userName}
University: ${profile.university || "University of Uyo"}
Course: ${profile.course || "Not specified"}
Year: ${profile.year_of_study || "Not specified"}`
    : `Student: ${userName}`;

  const systemPrompt = `You are the Motivator, a compassionate support system for University of Uyo students facing academic stress.

${studentContext}
Context: ${context}

Provide emotional support, encouragement, and practical strategies to help students overcome obstacles and maintain mental wellness.`;

  const result = await callGroqModel(
    AGENT_MODELS.motivator,
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: query },
    ],
    800,
    0.7
  );

  return {
    content: result,
    agent_used: "motivator",
    confidence: 0.88,
  };
}

async function unifyResponse(agentResponse: AgentResponse, originalQuery: string, userName: string): Promise<string> {
  const systemPrompt = `You are the Unifier for Campus Companion. Refine responses into a warm, helpful, student-focused voice.

Student: ${userName}
Original Query: "${originalQuery}"
Agent Response: "${agentResponse.content}"
Agent Used: ${agentResponse.agent_used}

Keep the expertise, make it conversational and encouraging. Be clear and actionable.`;

  try {
    return await callGroqModel(
      AGENT_MODELS.unifier,
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Please unify this response into Campus Companion voice." },
      ],
      1500,
      0.6
    );
  } catch (error) {
    console.error("Unifier error:", error);
    return agentResponse.content;
  }
}

async function processWithRouting(
  query: string,
  context: string,
  userName: string,
  userProfile?: any
): Promise<{ response: string; routing: RoutingDecision; processing_type: string }> {
  try {
    console.log("Starting routed processing for:", userName);

    const routing = await routeUserQuery(query, context);
    console.log("Routing decision:", routing);

    let agentResponse: AgentResponse;

    switch (routing.selected_agent) {
      case "study_helper":
        agentResponse = await studyHelperAgent(query, context, userName, userProfile);
        break;
      case "time_manager":
        agentResponse = await timeManagerAgent(query, context, userName, userProfile);
        break;
      case "researcher":
        agentResponse = await researcherAgent(query, context, userName, userProfile);
        break;
      case "motivator":
        agentResponse = await motivatorAgent(query, context, userName, userProfile);
        break;
      default:
        agentResponse = await studyHelperAgent(query, context, userName, userProfile);
    }

    console.log("Agent processing completed");

    const unifiedResponse = await unifyResponse(agentResponse, query, userName);
    console.log("Response unified successfully");

    return {
      response: unifiedResponse,
      routing,
      processing_type: "routed_agent",
    };
  } catch (error) {
    console.error("Routed processing error:", error);

    const fallbackResponse = await callGroqModel(
      AGENT_MODELS.study_helper,
      [
        {
          role: "system",
          content: `You are Campus Companion, a helpful AI study assistant for University of Uyo students. Give ${userName} a brief, encouraging answer to: ${query}. Keep it to 2-3 sentences max.`,
        },
        { role: "user", content: query },
      ],
      250,
      0.5
    );

    return {
      response: fallbackResponse,
      routing: { selected_agent: "study_helper", confidence: 0.5, reason: "Fallback routing" },
      processing_type: "fallback",
    };
  }
}

Deno.serve(async (req: Request) => {
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

  const body = await req.json();
  const message = body.message;
  const context = body.context;
  const wantsStream = Boolean(body.stream) || (req.headers.get('accept') || '').includes('text/event-stream');

    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (message.length > 1000) {
      return new Response(JSON.stringify({ error: "Please keep your question shorter so I can help you better!" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  let profile: any = null;
    if (user) {
      const { data: profileData } = await supabase.from("profiles").select("full_name, course, year_of_study, university").eq("user_id", user.id).maybeSingle();
      profile = profileData;
    }

    const userName = profile?.full_name || "Student";
    const sanitizedMessage = message.trim();
    const sanitizedContext = context ? context.trim() : "University of Uyo student using Campus Companion";

    console.log("Processing routed request for:", user?.id || "guest");

    if (wantsStream) {
      const routing = await routeUserQuery(sanitizedMessage, sanitizedContext);

      let agentModel = AGENT_MODELS.study_helper;
      let systemPrompt = "";
      const profile = null;
      const studentContext = userName
        ? `Student Name: ${userName}\nUniversity: ${profile?.university || "University of Uyo"}`
        : `Student Name: Student\nUniversity: University of Uyo`;

      switch (routing.selected_agent) {
        case "study_helper":
          agentModel = AGENT_MODELS.study_helper;
          systemPrompt = `You are the Study Helper, a patient and knowledgeable academic tutor for University of Uyo students.\n\n${studentContext}\nContext: ${sanitizedContext}\n\nProvide clear, helpful explanations using examples and step-by-step guidance. Be warm, encouraging, and conversational.`;
          break;
        case "time_manager":
          agentModel = AGENT_MODELS.time_manager;
          systemPrompt = `You are the Time Manager, a productivity expert helping University of Uyo students organize their time and manage tasks.\n\n${studentContext}\nContext: ${sanitizedContext}\n\nCreate practical schedules, prioritize tasks, and provide realistic time management strategies.`;
          break;
        case "researcher":
          agentModel = AGENT_MODELS.researcher;
          systemPrompt = `You are the Researcher, an academic research assistant helping University of Uyo students with research, sources, and citations.\n\n${studentContext}\nContext: ${sanitizedContext}\n\nGuide research methodology, help find credible sources, and teach proper academic citation (APA, MLA, Chicago).`;
          break;
        case "motivator":
          agentModel = AGENT_MODELS.motivator;
          systemPrompt = `You are the Motivator, a compassionate support system for University of Uyo students facing academic stress.\n\n${studentContext}\nContext: ${sanitizedContext}\n\nProvide emotional support, encouragement, and practical strategies to help students overcome obstacles and maintain mental wellness.`;
          break;
        default:
          agentModel = AGENT_MODELS.study_helper;
          systemPrompt = `You are the Study Helper, a patient and knowledgeable academic tutor for University of Uyo students.\n\n${studentContext}\nContext: ${sanitizedContext}\n\nProvide clear, helpful explanations using examples and step-by-step guidance. Be warm, encouraging, and conversational.`;
      }

      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: sanitizedMessage },
      ];

      try {
        const modelStream = await streamGroqModel(agentModel, messages, 0.3);

        const forwardStream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const reader = modelStream.getReader();
            const decoder = new TextDecoder();
            try {
              while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                if (value) controller.enqueue(value);
              }
            } catch (e) {
              console.error('Error while streaming from model:', e);
            } finally {
              const meta = {
                finish: true,
                processing_type: 'routed_agent_stream',
                routing: {
                  selected_agent: routing.selected_agent,
                  confidence: routing.confidence,
                  reason: routing.reason,
                },
                timestamp: new Date().toISOString(),
                student_context: {
                  name: userName,
                  university: profile?.university || 'University of Uyo',
                },
              };
              const metaStr = '\n' + JSON.stringify(meta);
              controller.enqueue(new TextEncoder().encode(metaStr));
              controller.close();
            }
          }
        });

        return new Response(forwardStream, { headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' } });
      } catch (streamErr) {
        console.error('Streaming path failed, falling back to non-stream:', streamErr);
      }
    }

    const { response, routing, processing_type } = await processWithRouting(sanitizedMessage, sanitizedContext, userName, profile);

    return new Response(
      JSON.stringify({
        response,
        processing_type,
        routing: {
          selected_agent: routing.selected_agent,
          confidence: routing.confidence,
          reason: routing.reason,
        },
        timestamp: new Date().toISOString(),
        student_context: {
          name: userName,
          university: profile?.university || "University of Uyo",
          course: profile?.course,
          year: profile?.year_of_study,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in ai-chat function:", error);
    return new Response(
      JSON.stringify({
        response: "I'm having trouble right now, but I'm here to help you succeed! Please try again in a moment.",
        processing_type: "error_fallback",
        routing: { selected_agent: "study_helper", confidence: 0.1, reason: "Error fallback" },
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});