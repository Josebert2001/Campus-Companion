import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Multi-Agent System Configuration
const AGENT_MODELS = {
  orchestrator: 'llama-3.1-70b-versatile',
  reasoning: 'llama-3.1-8b-instant',
  function_tool: 'mixtral-8x7b-32768',
  synthesis: 'llama-3.1-70b-versatile',
  citation: 'llama-3.1-8b-instant',
  safety: 'llama-guard-3-8b',
  style: 'llama-3.1-8b-instant'
};

interface SubTask {
  id: string;
  type: 'reasoning' | 'function_tool' | 'synthesis' | 'research';
  content: string;
  priority: number;
}

interface AgentResult {
  taskId: string;
  result: string;
  confidence: number;
  citations?: string[];
}

// Groq API call wrapper with error handling
async function callGroqModel(model: string, messages: any[], maxTokens: number = 800): Promise<string> {
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
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error(`Groq API error for model ${model}:`, response.status, errorData);
    throw new Error(`AI service error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Orchestrator Agent - Decomposes queries into subtasks
async function orchestratorAgent(query: string, context: string, userName: string): Promise<SubTask[]> {
  const systemPrompt = `You are the Orchestrator Agent for Campus Companion, an AI study assistant for university students.

Your role is to analyze student queries and break them down into subtasks for specialized worker agents.

Available worker types:
- reasoning: Deep analysis, problem-solving, concept explanation
- function_tool: Structured data processing, calculations, formatting
- research: Information gathering, fact-checking, academic research
- synthesis: Combining information, creating summaries

Analyze this query from ${userName} and return a JSON array of subtasks. Each subtask should have:
- id: unique identifier
- type: worker type needed
- content: specific task description
- priority: 1-5 (1=highest priority)

Context: ${context}
Student Query: ${query}

Return ONLY valid JSON array, no other text.`;

  try {
    const response = await callGroqModel(AGENT_MODELS.orchestrator, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query }
    ], 1000);

    // Parse JSON response
    const cleanResponse = response.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleanResponse);
  } catch (error) {
    console.error('Orchestrator parsing error:', error);
    // Fallback to single reasoning task
    return [{
      id: 'fallback-1',
      type: 'reasoning',
      content: query,
      priority: 1
    }];
  }
}

// Reasoning Worker Agent
async function reasoningWorker(task: SubTask, context: string, userName: string): Promise<AgentResult> {
  const systemPrompt = `You are a Reasoning Worker for Campus Companion, specializing in deep analysis and problem-solving for university students.

Your role: Provide detailed explanations, solve problems step-by-step, and help students understand complex concepts.

Student: ${userName}
Context: ${context}
Task: ${task.content}

Provide a comprehensive, educational response that helps the student learn.`;

  const result = await callGroqModel(AGENT_MODELS.reasoning, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: task.content }
  ]);

  return {
    taskId: task.id,
    result,
    confidence: 0.85,
    citations: []
  };
}

// Function/Tool Worker Agent
async function functionToolWorker(task: SubTask, context: string, userName: string): Promise<AgentResult> {
  const systemPrompt = `You are a Function/Tool Worker for Campus Companion, specializing in structured data processing and calculations.

Your role: Handle calculations, format data, create structured outputs like tables, lists, or step-by-step procedures.

Student: ${userName}
Context: ${context}
Task: ${task.content}

Provide structured, well-formatted output that's easy to understand and use.`;

  const result = await callGroqModel(AGENT_MODELS.function_tool, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: task.content }
  ]);

  return {
    taskId: task.id,
    result,
    confidence: 0.90,
    citations: []
  };
}

// Research Worker Agent
async function researchWorker(task: SubTask, context: string, userName: string): Promise<AgentResult> {
  const systemPrompt = `You are a Research Worker for Campus Companion, specializing in academic research and information gathering.

Your role: Provide well-researched, factual information with proper academic context. Focus on educational content suitable for university students.

Student: ${userName}
Context: ${context}
Task: ${task.content}

Provide accurate, well-researched information with clear explanations. Include relevant academic concepts and terminology.`;

  const result = await callGroqModel(AGENT_MODELS.reasoning, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: task.content }
  ]);

  return {
    taskId: task.id,
    result,
    confidence: 0.80,
    citations: ['Academic knowledge base', 'Educational resources']
  };
}

// Execute worker agents in parallel
async function executeWorkers(tasks: SubTask[], context: string, userName: string): Promise<AgentResult[]> {
  const workerPromises = tasks.map(async (task) => {
    try {
      switch (task.type) {
        case 'reasoning':
          return await reasoningWorker(task, context, userName);
        case 'function_tool':
          return await functionToolWorker(task, context, userName);
        case 'research':
          return await researchWorker(task, context, userName);
        default:
          return await reasoningWorker(task, context, userName);
      }
    } catch (error) {
      console.error(`Worker error for task ${task.id}:`, error);
      return {
        taskId: task.id,
        result: `I encountered an issue processing this part of your question. Let me help you with the other aspects.`,
        confidence: 0.1,
        citations: []
      };
    }
  });

  return await Promise.all(workerPromises);
}

// Synthesis Agent - Combines worker outputs
async function synthesisAgent(results: AgentResult[], originalQuery: string, userName: string): Promise<string> {
  const systemPrompt = `You are the Synthesis Agent for Campus Companion. Your role is to combine multiple worker outputs into one coherent, helpful response for the student.

Student: ${userName}
Original Query: ${originalQuery}

Worker Results:
${results.map(r => `Task ${r.taskId}: ${r.result}`).join('\n\n')}

Create a unified, well-structured response that:
1. Directly answers the student's question
2. Combines insights from all workers
3. Is educational and encouraging
4. Uses clear, student-friendly language
5. Maintains a helpful, supportive tone

Provide the final response without mentioning the internal agent system.`;

  return await callGroqModel(AGENT_MODELS.synthesis, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: 'Please synthesize the worker results into a final response.' }
  ], 1200);
}

// Safety Agent - Content moderation
async function safetyAgent(content: string): Promise<{ safe: boolean; reason?: string }> {
  const systemPrompt = `You are a Safety Agent for Campus Companion. Review the content for:
1. Harmful or inappropriate content
2. Academic integrity violations
3. Unsafe advice or instructions
4. Personal information exposure

Content to review: ${content}

Respond with only "SAFE" or "UNSAFE: [reason]"`;

  try {
    const result = await callGroqModel(AGENT_MODELS.safety, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: content }
    ], 200);

    const isSafe = result.toLowerCase().includes('safe') && !result.toLowerCase().includes('unsafe');
    return {
      safe: isSafe,
      reason: isSafe ? undefined : result
    };
  } catch (error) {
    console.error('Safety check error:', error);
    // Default to safe if safety check fails
    return { safe: true };
  }
}

// Style Enhancement Agent
async function styleAgent(content: string, userName: string): Promise<string> {
  const systemPrompt = `You are a Style Agent for Campus Companion. Polish the response to be:
1. Clear and well-structured
2. Encouraging and supportive
3. Appropriate for university students
4. Engaging and easy to read

Student: ${userName}
Content to enhance: ${content}

Return the polished version maintaining all factual content but improving clarity and style.`;

  try {
    return await callGroqModel(AGENT_MODELS.style, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: content }
    ], 1000);
  } catch (error) {
    console.error('Style enhancement error:', error);
    return content; // Return original if enhancement fails
  }
}

// Main multi-agent processing function
async function processMultiAgent(query: string, context: string, userName: string): Promise<string> {
  try {
    console.log('Starting multi-agent processing for user:', userName);

    // Step 1: Orchestrator decomposes query
    const subtasks = await orchestratorAgent(query, context, userName);
    console.log('Orchestrator created', subtasks.length, 'subtasks');

    // Step 2: Execute workers in parallel
    const workerResults = await executeWorkers(subtasks, context, userName);
    console.log('Workers completed processing');

    // Step 3: Synthesis
    const synthesizedResponse = await synthesisAgent(workerResults, query, userName);
    console.log('Synthesis completed');

    // Step 4: Safety check
    const safetyCheck = await safetyAgent(synthesizedResponse);
    if (!safetyCheck.safe) {
      console.log('Content blocked by safety agent:', safetyCheck.reason);
      return `I apologize, but I can't provide that information. Let me help you with something else related to your studies!`;
    }

    // Step 5: Style enhancement
    const finalResponse = await styleAgent(synthesizedResponse, userName);
    console.log('Multi-agent processing completed successfully');

    return finalResponse;
  } catch (error) {
    console.error('Multi-agent processing error:', error);
    // Fallback to simple single-model response
    return await callGroqModel(AGENT_MODELS.reasoning, [
      { role: 'system', content: `You are Campus Companion, an AI study assistant. Help ${userName} with their question: ${query}` },
      { role: 'user', content: query }
    ]);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get JWT from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Authentication error:', userError);
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { message, context } = await req.json();
    
    // Input validation
    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Message is required and must be a string' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (message.length > 2000) {
      return new Response(JSON.stringify({ error: 'Message too long. Maximum 2000 characters allowed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (context && (typeof context !== 'string' || context.length > 1000)) {
      return new Response(JSON.stringify({ error: 'Context must be a string with maximum 1000 characters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch user profile to get their name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .single();

    const userName = profile?.full_name || 'there';
    const sanitizedMessage = message.trim();
    const sanitizedContext = context ? context.trim() : 'University student using Campus Companion app';

    console.log('Processing multi-agent request for user:', user.id);

    // Process using multi-agent system
    const response = await processMultiAgent(sanitizedMessage, sanitizedContext, userName);

    return new Response(JSON.stringify({ 
      response,
      processing_type: 'multi_agent',
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-chat function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});