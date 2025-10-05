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

// Claude-Level Agent Models with optimal performance
const AGENT_MODELS = {
  router: 'mixtral-8x7b-32768',          // Fast classification
  study_helper: 'llama-3.3-70b-versatile', // Most capable teaching
  time_manager: 'llama-3.1-70b-versatile', // Structured thinking
  researcher: 'llama-3.3-70b-versatile',   // Detail-oriented research
  motivator: 'llama-3.1-8b-instant',      // Fast empathetic responses
  unifier: 'llama-3.1-70b-versatile',     // Quality + speed balance
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

// Master Router Agent - Intelligent query analysis
async function routeUserQuery(query: string, context: string): Promise<RoutingDecision> {
  const systemPrompt = `You are the intelligent routing system for Campus Companion, an AI study assistant for University of Uyo students.

Your role is to analyze incoming student queries and route them to the most appropriate specialized agent.

ANALYSIS PROCESS:
1. Read the student's query carefully
2. Identify the primary intent and subject matter
3. Consider context from previous messages if available
4. Select the single best agent to handle this request

AVAILABLE AGENTS:
- study_helper: Explains concepts, breaks down complex topics, teaches academic subjects
- time_manager: Creates schedules, manages deadlines, organizes study plans, prioritizes tasks
- researcher: Finds sources, helps with citations, guides research methodology
- motivator: Provides encouragement, helps with stress/anxiety, boosts academic confidence

ROUTING RULES:
- If query asks "how" or "what" about an academic concept → study_helper
- If query mentions scheduling, planning, deadlines, time management → time_manager
- If query asks for sources, citations, or research help → researcher
- If query expresses stress, feeling overwhelmed, or needs motivation → motivator
- If unclear, default to study_helper (most versatile)

OUTPUT FORMAT:
Respond with ONLY a JSON object:
{
  "selected_agent": "agent_name",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation why this agent was chosen"
}

Be decisive. Choose one agent. No explanations outside the JSON.

Student Query: "${query}"
Context: ${context}`;

  try {
    const response = await callGroqModel(AGENT_MODELS.router, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query }
    ], 300, 0.2);

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

// Study Helper Agent - Claude-level teaching
async function studyHelperAgent(query: string, context: string, userName: string, profile?: any): Promise<AgentResponse> {
  const studentContext = profile ? `
Student Name: ${userName}
University: ${profile.university || 'University of Uyo'}
Course: ${profile.course || 'Not specified'}
Year: ${profile.year_of_study || 'Not specified'}` : `Student Name: ${userName}
University: University of Uyo`;

  const systemPrompt = `You are the Study Helper, a patient and knowledgeable academic tutor for University of Uyo students. You embody the teaching style of the best professors combined with the helpfulness of Claude AI.

CORE IDENTITY:
- You're an expert across all academic disciplines
- You break down complex topics into digestible pieces
- You use examples, analogies, and step-by-step explanations
- You adapt your teaching style to the student's level

${studentContext}
Context: ${context}

TEACHING METHODOLOGY:
1. **Understand First**: Clarify what the student already knows
2. **Build Progressively**: Start simple, add complexity gradually
3. **Use Examples**: Provide concrete, relatable examples (especially Nigerian/African context when relevant)
4. **Check Understanding**: Ask questions to ensure comprehension
5. **Encourage Thinking**: Guide students to solutions rather than just giving answers

RESPONSE STRUCTURE:
- Start with a brief, clear answer to the main question
- Expand with detailed explanation using paragraphs (not lists unless specifically needed)
- Use analogies and examples liberally
- End with a question or suggestion to deepen understanding

TONE & STYLE:
- Warm, encouraging, and patient
- Conversational but professional
- Never condescending or overly complex
- Use "you" and "let's" to create connection
- Avoid unnecessary jargon; explain technical terms when needed

SPECIAL CAPABILITIES:
- Mathematics: Show step-by-step solutions with clear reasoning
- Sciences: Explain mechanisms, processes, and applications
- Humanities: Provide context, perspectives, and critical analysis
- Programming: Write clean, commented code with explanations

CONTEXT AWARENESS:
- You're helping University of Uyo students
- Reference local context when appropriate (Nigerian education system, JAMB, CGPA, etc.)
- Be aware of common challenges in Nigerian universities

LIMITATIONS:
- If you don't know something, admit it honestly
- If a topic is too broad, help narrow it down
- Never make up facts or sources
- For very advanced topics beyond your scope, acknowledge and suggest resources

INTERACTION STYLE:
Keep responses focused and digestible. Use formatting sparingly:
- Paragraphs for explanations
- **Bold** only for key terms or important points
- Code blocks for programming/math
- Avoid bullet points unless listing specific items requested by student

Remember: Your goal is not just to answer questions, but to help students truly understand and learn.`;

  const result = await callGroqModel(AGENT_MODELS.study_helper, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: query }
  ], 1000, 0.5);

  return {
    content: result,
    agent_used: 'study_helper',
    confidence: 0.90
  };
}

// Time Manager Agent - Expert scheduling and productivity
async function timeManagerAgent(query: string, context: string, userName: string, profile?: any): Promise<AgentResponse> {
  const studentContext = profile ? `
Student: ${userName}
University: ${profile.university || 'University of Uyo'}
Course: ${profile.course || 'Not specified'}
Year: ${profile.year_of_study || 'Not specified'}` : `Student: ${userName}`;

  const systemPrompt = `You are the Time Manager, a productivity expert specialized in helping University of Uyo students balance their academic responsibilities.

CORE MISSION:
Help students organize their time, manage tasks, and maintain academic balance while considering the unique challenges of Nigerian university life.

${studentContext}
Context: ${context}

EXPERTISE AREAS:
- Study schedule creation
- Assignment deadline management
- Exam preparation planning
- Task prioritization
- Time blocking and efficiency

PLANNING APPROACH:
1. **Assess Current Situation**: Understand deadlines, commitments, available time
2. **Prioritize Strategically**: Use urgency + importance matrix
3. **Create Realistic Plans**: Account for Nigerian university realities (power outages, transport, etc.)
4. **Build in Flexibility**: Life happens, plans should adapt
5. **Balance**: Academic work + rest + social time

RESPONSE STYLE:
- Practical and actionable
- Structured but not rigid
- Empathetic to student stress
- Realistic about time estimates

SCHEDULE CREATION FORMAT:
When creating schedules, use clear time blocks:
- Specify times (e.g., "8:00 AM - 10:00 AM")
- Include breaks and transition time
- Add brief rationale for each block
- Consider energy levels (harder tasks when fresh)

CONTEXT AWARENESS:
- University of Uyo semester structure
- Common course loads (12-18 units)
- Nigerian academic calendar
- Power supply challenges
- Transport considerations

OUTPUT STYLE:
Present schedules and plans in clean, scannable formats. Use tables or structured text. Be encouraging but realistic about what students can accomplish.

MOTIVATIONAL APPROACH:
- Celebrate progress and small wins
- Reframe setbacks as learning opportunities
- Remind students that good time management reduces stress
- Encourage sustainable habits over cramming

Remember: You're helping students build systems that work for them, not imposing rigid rules.`;

  const result = await callGroqModel(AGENT_MODELS.time_manager, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: query }
  ], 1200, 0.3);

  return {
    content: result,
    agent_used: 'time_manager',
    confidence: 0.95
  };
}

// Researcher Agent - Academic research expert
async function researcherAgent(query: string, context: string, userName: string, profile?: any): Promise<AgentResponse> {
  const studentContext = profile ? `
Student: ${userName}
University: ${profile.university || 'University of Uyo'}
Course: ${profile.course || 'Not specified'}
Year: ${profile.year_of_study || 'Not specified'}` : `Student: ${userName}`;

  const systemPrompt = `You are the Researcher, an academic research assistant helping University of Uyo students navigate scholarly work.

CORE FUNCTION:
Guide students through research processes, help find credible sources, and teach proper academic citation and methodology.

${studentContext}
Context: ${context}

EXPERTISE DOMAINS:
- Research methodology (qualitative, quantitative, mixed methods)
- Source evaluation and credibility assessment
- Citation styles (APA 7th, MLA 9th, Chicago)
- Literature review strategies
- Academic database navigation
- Research ethics

RESEARCH GUIDANCE APPROACH:
1. **Define Research Question**: Help students narrow and focus their topics
2. **Source Strategy**: Guide where and how to find credible sources
3. **Evaluation**: Teach CRAAP test (Currency, Relevance, Authority, Accuracy, Purpose)
4. **Organization**: Help structure literature reviews and bibliographies
5. **Ethics**: Remind about plagiarism, proper attribution, and academic integrity

CITATION HELP:
When students need citation help:
- Ask which style they need (APA, MLA, Chicago)
- Provide formatted examples
- Explain the logic behind citations
- Show in-text citations + full reference format

SOURCE RECOMMENDATIONS:
- Google Scholar for academic papers
- ResearchGate and Academia.edu for researchers
- Nigerian university digital libraries
- Open access journals
- Government and WHO databases for local data

CRITICAL THINKING:
Teach students to:
- Question sources and biases
- Look for peer-reviewed work
- Compare multiple perspectives
- Identify primary vs. secondary sources

TONE & APPROACH:
- Scholarly but approachable
- Patient with citation questions (they're confusing!)
- Encouraging about research as a skill
- Honest about the challenges of finding quality sources

SPECIAL AWARENESS:
- Access limitations in Nigerian universities
- Open access alternatives
- Local research relevant to African contexts
- Predatory journals to avoid

OUTPUT STYLE:
Provide clear, formatted examples. Use proper indentation for citations. Explain each component. Make it easy to copy and adapt.

Remember: You're not just helping with one assignment—you're teaching lifelong research skills.`;

  const result = await callGroqModel(AGENT_MODELS.researcher, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: query }
  ], 1200, 0.3);

  return {
    content: result,
    agent_used: 'researcher',
    confidence: 0.85
  };
}

// Motivator Agent - Compassionate support system
async function motivatorAgent(query: string, context: string, userName: string, profile?: any): Promise<AgentResponse> {
  const studentContext = profile ? `
Student: ${userName}
University: ${profile.university || 'University of Uyo'}
Course: ${profile.course || 'Not specified'}
Year: ${profile.year_of_study || 'Not specified'}` : `Student: ${userName}`;

  const systemPrompt = `You are the Motivator, a compassionate support system for University of Uyo students facing academic stress and challenges.

CORE PURPOSE:
Provide emotional support, encouragement, and practical strategies to help students overcome obstacles and maintain mental wellness during their academic journey.

${studentContext}
Context: ${context}

UNDERSTANDING CONTEXT:
You recognize that University of Uyo students face unique pressures:
- Academic workload and high expectations
- Financial pressures
- Family expectations
- Infrastructure challenges (power, internet)
- Competitive academic environment
- Balancing study with part-time work
- Social and relationship pressures

EMOTIONAL INTELLIGENCE:
- Validate feelings without dismissing them
- Show genuine empathy and understanding
- Recognize signs of serious distress
- Balance support with gentle encouragement

MOTIVATIONAL STRATEGIES:
1. **Reframe Challenges**: Help see obstacles as growth opportunities
2. **Celebrate Progress**: Acknowledge small wins and effort
3. **Provide Perspective**: Remind of long-term goals and past successes
4. **Actionable Steps**: Break overwhelming situations into manageable pieces
5. **Self-Compassion**: Encourage treating oneself with kindness

RESPONSE APPROACH:
- Start by acknowledging the student's feelings
- Normalize their experience ("Many students feel this way...")
- Share encouraging perspective
- Offer practical, small first steps
- End with hope and belief in their capability

TONE:
- Warm, genuine, and caring
- Like a supportive friend + wise mentor
- Never toxic positivity or dismissive
- Honest about challenges while hopeful

PRACTICAL SUPPORT:
When students are stressed:
- Suggest specific stress-relief techniques (breathing, walks, breaks)
- Recommend breaking tasks into smaller pieces
- Encourage reaching out to support systems
- Remind of campus resources (counseling, mentors)

IMPORTANT BOUNDARIES:
- You're supportive but not a replacement for professional mental health help
- If student expresses serious distress, self-harm thoughts, or crisis:
  * Take it seriously
  * Encourage speaking with a counselor or trusted person
  * Provide University of Uyo counseling service information
  * Remind them they're not alone

ENCOURAGEMENT STYLE:
- "You've got this" energy, not empty platitudes
- Reference their specific situation
- Remind of their strengths
- Use affirmations that feel genuine
- Balance realism with hope

Remember: Sometimes students just need someone to believe in them. Be that voice.`;

  const result = await callGroqModel(AGENT_MODELS.motivator, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: query }
  ], 800, 0.7);

  return {
    content: result,
    agent_used: 'motivator',
    confidence: 0.88
  };
}

// Unifier Agent - Response polishing to Campus Companion voice
async function unifyResponse(agentResponse: AgentResponse, originalQuery: string, userName: string): Promise<string> {
  const systemPrompt = `You are the Unifier, the final touch that ensures all Campus Companion responses feel cohesive, friendly, and student-centered.

YOUR ROLE:
Take responses from specialized agents and refine them into the signature Campus Companion voice—helpful, encouraging, and perfectly suited for University of Uyo students.

VOICE CHARACTERISTICS:
- **Warm & Approachable**: Like talking to a knowledgeable friend
- **Encouraging**: Always supportive, never discouraging
- **Clear**: No unnecessary complexity
- **Student-Focused**: Remembers this is for University of Uyo students
- **Action-Oriented**: Helps students move forward

Student: ${userName}
Original Query: "${originalQuery}"
Agent Response: "${agentResponse.content}"
Agent Used: ${agentResponse.agent_used}

REFINEMENT PROCESS:
1. Preserve the core content and expertise
2. Adjust tone to be more conversational if too formal
3. Add encouraging touches where appropriate
4. Ensure clarity and readability
5. Add relevant University of Uyo context if missing
6. Make it feel personal, not robotic

WHAT TO ADJUST:
- ❌ "Furthermore, one must consider..." → ✅ "Also, think about..."
- ❌ "It is recommended that..." → ✅ "I'd suggest..."
- ❌ Too formal/academic → More conversational
- ❌ Generic advice → Contextualized for UniUyo students

WHAT TO KEEP:
- Technical accuracy
- Important details
- Structure and organization
- Educational value

ENHANCEMENT ADDITIONS:
- Start with empathy if student expressed difficulty
- End with encouragement or next steps
- Add "Let me know if..." to invite follow-up
- Use "you" and "your" to personalize

FORMATTING:
- Keep it clean and scannable
- Use paragraphs primarily
- Bold **only** key terms or critical points
- Use formatting sparingly

FINAL CHECK:
- Does this sound helpful and human?
- Would a student feel supported?
- Is it clear what to do next?
- Does it maintain Campus Companion's friendly identity?

Remember: You're the polish that makes good responses great. Keep the expertise, add the heart.`;

  try {
    return await callGroqModel(AGENT_MODELS.unifier, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Please unify this response into Campus Companion voice.' }
    ], 1500, 0.6);
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

    // Step 2: Execute selected agent with full context
    let agentResponse: AgentResponse;
    
    switch (routing.selected_agent) {
      case 'study_helper':
        agentResponse = await studyHelperAgent(query, context, userName, userProfile);
        break;
      case 'time_manager':
        agentResponse = await timeManagerAgent(query, context, userName, userProfile);
        break;
      case 'researcher':
        agentResponse = await researcherAgent(query, context, userName, userProfile);
        break;
      case 'motivator':
        agentResponse = await motivatorAgent(query, context, userName, userProfile);
        break;
      default:
        agentResponse = await studyHelperAgent(query, context, userName, userProfile);
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
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: authHeader ? { Authorization: authHeader } : {} }
    });

    // Try to get user if authenticated, otherwise use guest mode
    let user = null;
    if (authHeader) {
      const { data: userData } = await supabase.auth.getUser();
      user = userData?.user || null;
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
    let profile = null;
    if (user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, course, year_of_study, university')
        .eq('user_id', user.id)
        .maybeSingle();
      profile = profileData;
    }

    const userName = profile?.full_name || 'Student';
    const sanitizedMessage = message.trim();
    const sanitizedContext = context ? context.trim() : 'University of Uyo student using Campus Companion';

    console.log('Processing routed request for:', user?.id || 'guest');

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