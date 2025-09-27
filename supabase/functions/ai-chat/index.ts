import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Student-Centered Multi-Agent System Configuration
const STUDENT_AGENT_MODELS = {
  orchestrator: 'llama-3.1-70b-versatile', // GPT-OSS 120B equivalent
  study_helper: 'llama-3.1-8b-instant', // GPT-OSS 20B equivalent for concept explanation
  reference_research: 'llama-3.1-70b-versatile', // Llama 3.3 70B equivalent for research
  task_manager: 'mixtral-8x7b-32768', // Qwen 3 32B equivalent for structured tasks
  multimodal: 'llama-3.2-11b-vision-preview', // Vision model for notes/slides
  language_helper: 'llama-3.1-70b-versatile', // Multilingual support
  citation: 'llama-3.1-8b-instant', // Citation and reference formatting
  safety: 'llama-guard-3-8b', // Content moderation
  polisher: 'llama-3.1-8b-instant', // Student-friendly style enhancement
};

interface StudentSubTask {
  id: string;
  type: 'study_help' | 'research' | 'task_management' | 'multimodal' | 'language' | 'citation';
  content: string;
  priority: number;
  student_context?: string;
  subject?: string;
}

interface StudentAgentResult {
  taskId: string;
  result: string;
  confidence: number;
  citations?: string[];
  study_tips?: string[];
  next_steps?: string[];
}

// Enhanced Groq API call with student-specific error handling
async function callGroqModel(model: string, messages: any[], maxTokens: number = 800, temperature: number = 0.3): Promise<string> {
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
    throw new Error(`AI service temporarily unavailable. Please try again.`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Student-Focused Orchestrator Agent
async function studentOrchestratorAgent(query: string, context: string, userName: string, userProfile?: any): Promise<StudentSubTask[]> {
  const systemPrompt = `You are the Campus Companion Orchestrator, specialized in helping university students succeed academically.

Your role: Analyze student queries and break them into subtasks for specialized student-focused agents.

Available Student Agents:
- study_help: Explain concepts, solve problems, break down complex topics, provide study strategies
- research: Find academic sources, research papers, textbook references, create bibliographies
- task_management: Schedule management, assignment tracking, deadline reminders, study planning
- multimodal: Analyze lecture slides, handwritten notes, diagrams, visual content
- language: Translate content, explain in simpler terms, multilingual support
- citation: Format references, create proper citations, academic writing help

Student Profile:
- Name: ${userName}
- University: University of Uyo
- Context: ${context}
${userProfile ? `- Course: ${userProfile.course || 'Not specified'}
- Year: ${userProfile.year_of_study || 'Not specified'}` : ''}

Student Query: "${query}"

Analyze this query and create subtasks that will best help this student learn and succeed. Focus on:
1. Educational value and learning outcomes
2. Practical study assistance
3. Academic skill development
4. Time management and organization

Return ONLY a JSON array of subtasks with this structure:
[{
  "id": "unique_id",
  "type": "agent_type",
  "content": "specific_task_description",
  "priority": 1-5,
  "student_context": "why_this_helps_learning",
  "subject": "academic_subject_if_applicable"
}]`;

  try {
    const response = await callGroqModel(STUDENT_AGENT_MODELS.orchestrator, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query }
    ], 1200, 0.2);

    const cleanResponse = response.replace(/```json\n?|\n?```/g, '').trim();
    const tasks = JSON.parse(cleanResponse);
    
    // Validate and ensure we have at least one task
    if (!Array.isArray(tasks) || tasks.length === 0) {
      throw new Error('Invalid task structure');
    }
    
    return tasks;
  } catch (error) {
    console.error('Student orchestrator parsing error:', error);
    // Intelligent fallback based on query content
    const queryLower = query.toLowerCase();
    let taskType: StudentSubTask['type'] = 'study_help';
    
    if (queryLower.includes('schedule') || queryLower.includes('deadline') || queryLower.includes('assignment')) {
      taskType = 'task_management';
    } else if (queryLower.includes('research') || queryLower.includes('reference') || queryLower.includes('source')) {
      taskType = 'research';
    } else if (queryLower.includes('translate') || queryLower.includes('explain simply')) {
      taskType = 'language';
    }
    
    return [{
      id: 'fallback-1',
      type: taskType,
      content: query,
      priority: 1,
      student_context: 'Direct assistance with student query',
      subject: 'General'
    }];
  }
}

// Study Helper Agent - Core learning assistance
async function studyHelperAgent(task: StudentSubTask, context: string, userName: string): Promise<StudentAgentResult> {
  const systemPrompt = `You are the Study Helper Agent for Campus Companion, specialized in helping University of Uyo students learn and understand academic concepts.

Your expertise:
- Break down complex topics into digestible parts
- Provide step-by-step explanations
- Create study strategies and memory techniques
- Offer practice problems and examples
- Connect concepts to real-world applications
- Adapt explanations to student's level

Student: ${userName}
Context: ${context}
Subject: ${task.subject || 'General'}
Learning Goal: ${task.student_context}

Task: ${task.content}

Provide a comprehensive educational response that:
1. Explains the concept clearly and simply
2. Breaks down complex ideas step-by-step
3. Includes practical examples
4. Offers study tips and memory techniques
5. Suggests next learning steps
6. Encourages the student's learning journey

Format your response to be engaging, encouraging, and educational.`;

  const result = await callGroqModel(STUDENT_AGENT_MODELS.study_helper, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: task.content }
  ], 1000, 0.4);

  return {
    taskId: task.id,
    result,
    confidence: 0.90,
    citations: [],
    study_tips: ['Review the concept regularly', 'Practice with examples', 'Connect to previous knowledge'],
    next_steps: ['Try practice problems', 'Discuss with classmates', 'Apply to real scenarios']
  };
}

// Reference & Research Agent - Academic sources and citations
async function referenceResearchAgent(task: StudentSubTask, context: string, userName: string): Promise<StudentAgentResult> {
  const systemPrompt = `You are the Reference & Research Agent for Campus Companion, specialized in helping University of Uyo students find and use academic sources.

Your expertise:
- Identify relevant academic sources and references
- Explain research methodologies
- Help with literature reviews
- Provide citation formats (APA, MLA, Chicago)
- Suggest keywords for database searches
- Evaluate source credibility

Student: ${userName}
Context: ${context}
Subject: ${task.subject || 'General'}
Research Goal: ${task.student_context}

Task: ${task.content}

Provide comprehensive research assistance that:
1. Suggests relevant academic sources and databases
2. Provides proper citation examples
3. Explains how to evaluate source credibility
4. Offers search strategies and keywords
5. Includes both primary and secondary sources
6. Considers Nigerian and African academic perspectives when relevant

Focus on helping the student develop strong research skills.`;

  const result = await callGroqModel(STUDENT_AGENT_MODELS.reference_research, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: task.content }
  ], 1200, 0.3);

  return {
    taskId: task.id,
    result,
    confidence: 0.85,
    citations: [
      'Academic databases (JSTOR, PubMed, Google Scholar)',
      'University library resources',
      'Peer-reviewed journals',
      'Reputable academic publishers'
    ],
    study_tips: ['Always verify source credibility', 'Use multiple sources', 'Take detailed notes'],
    next_steps: ['Search academic databases', 'Consult librarian', 'Create bibliography']
  };
}

// Task Manager Agent - Schedule and assignment management
async function taskManagerAgent(task: StudentSubTask, context: string, userName: string): Promise<StudentAgentResult> {
  const systemPrompt = `You are the Task Manager Agent for Campus Companion, specialized in helping University of Uyo students organize their academic life.

Your expertise:
- Create study schedules and timetables
- Track assignment deadlines
- Prioritize tasks effectively
- Develop time management strategies
- Plan exam preparation
- Balance academic and personal life

Student: ${userName}
Context: ${context}
Management Goal: ${task.student_context}

Task: ${task.content}

Provide structured organizational assistance that:
1. Creates clear, actionable plans
2. Prioritizes tasks by importance and urgency
3. Suggests realistic timeframes
4. Includes buffer time for unexpected issues
5. Considers the Nigerian academic calendar
6. Provides accountability strategies

Format your response with clear structure, timelines, and actionable steps.`;

  const result = await callGroqModel(STUDENT_AGENT_MODELS.task_manager, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: task.content }
  ], 1000, 0.2);

  return {
    taskId: task.id,
    result,
    confidence: 0.95,
    citations: ['Time management best practices', 'Academic planning strategies'],
    study_tips: ['Use digital calendars', 'Set realistic goals', 'Review progress weekly'],
    next_steps: ['Create detailed schedule', 'Set up reminders', 'Track progress daily']
  };
}

// Language Helper Agent - Multilingual and simplification support
async function languageHelperAgent(task: StudentSubTask, context: string, userName: string): Promise<StudentAgentResult> {
  const systemPrompt = `You are the Language Helper Agent for Campus Companion, specialized in making academic content accessible to University of Uyo students.

Your expertise:
- Simplify complex academic language
- Translate between English and local languages
- Explain technical terminology
- Adapt content for different comprehension levels
- Provide cultural context for international concepts
- Support multilingual learning

Student: ${userName}
Context: ${context}
Language Goal: ${task.student_context}

Task: ${task.content}

Provide language assistance that:
1. Simplifies complex academic language
2. Explains technical terms clearly
3. Provides cultural context when needed
4. Offers multiple ways to understand concepts
5. Considers Nigerian English and local expressions
6. Makes content more accessible and relatable

Focus on clarity, cultural relevance, and comprehension.`;

  const result = await callGroqModel(STUDENT_AGENT_MODELS.language_helper, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: task.content }
  ], 1000, 0.5);

  return {
    taskId: task.id,
    result,
    confidence: 0.88,
    citations: ['Language learning resources', 'Academic terminology guides'],
    study_tips: ['Practice new vocabulary daily', 'Use terms in context', 'Create personal glossary'],
    next_steps: ['Build vocabulary list', 'Practice explanations', 'Seek clarification when needed']
  };
}

// Citation Agent - Academic writing and referencing
async function citationAgent(task: StudentSubTask, context: string, userName: string): Promise<StudentAgentResult> {
  const systemPrompt = `You are the Citation Agent for Campus Companion, specialized in helping University of Uyo students with academic writing and proper referencing.

Your expertise:
- Format citations in APA, MLA, Chicago styles
- Create bibliographies and reference lists
- Explain plagiarism prevention
- Improve academic writing style
- Structure academic papers
- Ensure academic integrity

Student: ${userName}
Context: ${context}
Citation Goal: ${task.student_context}

Task: ${task.content}

Provide citation and writing assistance that:
1. Shows proper citation formats with examples
2. Explains when and how to cite sources
3. Helps structure academic arguments
4. Provides templates for common citation types
5. Emphasizes academic integrity
6. Considers University of Uyo citation requirements

Focus on helping the student develop strong academic writing skills.`;

  const result = await callGroqModel(STUDENT_AGENT_MODELS.citation, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: task.content }
  ], 800, 0.2);

  return {
    taskId: task.id,
    result,
    confidence: 0.92,
    citations: ['APA Style Guide', 'MLA Handbook', 'University writing guidelines'],
    study_tips: ['Keep detailed source records', 'Cite as you write', 'Use citation management tools'],
    next_steps: ['Practice citation formats', 'Review university guidelines', 'Use reference managers']
  };
}

// Execute student-focused workers in parallel
async function executeStudentWorkers(tasks: StudentSubTask[], context: string, userName: string, userProfile?: any): Promise<StudentAgentResult[]> {
  const workerPromises = tasks.map(async (task) => {
    try {
      switch (task.type) {
        case 'study_help':
          return await studyHelperAgent(task, context, userName);
        case 'research':
          return await referenceResearchAgent(task, context, userName);
        case 'task_management':
          return await taskManagerAgent(task, context, userName);
        case 'language':
          return await languageHelperAgent(task, context, userName);
        case 'citation':
          return await citationAgent(task, context, userName);
        default:
          return await studyHelperAgent(task, context, userName);
      }
    } catch (error) {
      console.error(`Student worker error for task ${task.id}:`, error);
      return {
        taskId: task.id,
        result: `I'm having trouble with this part of your question, but I'm here to help you learn! Let me assist you with the other aspects.`,
        confidence: 0.1,
        citations: [],
        study_tips: ['Don\'t worry about setbacks', 'Keep practicing', 'Ask for help when needed'],
        next_steps: ['Try rephrasing your question', 'Break it into smaller parts', 'Seek additional resources']
      };
    }
  });

  return await Promise.all(workerPromises);
}

// Student-Focused Synthesis Agent
async function studentSynthesisAgent(results: StudentAgentResult[], originalQuery: string, userName: string): Promise<string> {
  const systemPrompt = `You are the Student Synthesis Agent for Campus Companion. Your role is to combine multiple specialist outputs into one coherent, educational response for the University of Uyo student.

Student: ${userName}
Original Query: "${originalQuery}"

Specialist Results:
${results.map(r => `
Task ${r.taskId}:
Response: ${r.result}
Study Tips: ${r.study_tips?.join(', ') || 'None'}
Next Steps: ${r.next_steps?.join(', ') || 'None'}
Citations: ${r.citations?.join(', ') || 'None'}
`).join('\n')}

Create a unified, educational response that:
1. Directly answers the student's question
2. Combines insights from all specialists
3. Is encouraging and supportive
4. Uses clear, student-friendly language
5. Includes actionable study tips
6. Provides clear next steps for learning
7. Maintains an encouraging, mentor-like tone
8. Emphasizes the student's ability to succeed

Structure your response with:
- Clear main answer
- Key learning points
- Practical study tips
- Recommended next steps
- Encouragement for continued learning

Make it feel like a helpful tutor who believes in the student's success.`;

  return await callGroqModel(STUDENT_AGENT_MODELS.polisher, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: 'Please synthesize the specialist results into a final educational response.' }
  ], 1400, 0.4);
}

// Enhanced Safety Agent for student content
async function studentSafetyAgent(content: string): Promise<{ safe: boolean; reason?: string }> {
  const systemPrompt = `You are the Safety Agent for Campus Companion, protecting University of Uyo students. Review content for:

1. Academic integrity violations (encouraging cheating, plagiarism)
2. Harmful or inappropriate content
3. Misinformation or factually incorrect academic content
4. Unsafe advice or instructions
5. Content that undermines learning or education
6. Personal information exposure

Content to review: ${content}

Respond with only "SAFE" or "UNSAFE: [specific reason]"`;

  try {
    const result = await callGroqModel(STUDENT_AGENT_MODELS.safety, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: content }
    ], 200, 0.1);

    const isSafe = result.toLowerCase().includes('safe') && !result.toLowerCase().includes('unsafe');
    return {
      safe: isSafe,
      reason: isSafe ? undefined : result
    };
  } catch (error) {
    console.error('Safety check error:', error);
    return { safe: true }; // Default to safe if check fails
  }
}

// Student-Friendly Style Enhancement Agent
async function studentPolisherAgent(content: string, userName: string): Promise<string> {
  const systemPrompt = `You are the Student Polisher Agent for Campus Companion. Transform the response to be:

1. Clear and well-structured for university students
2. Encouraging and motivational
3. Practical and actionable
4. Appropriate for University of Uyo context
5. Engaging and easy to understand
6. Supportive of the student's learning journey

Student: ${userName}
Content to enhance: ${content}

Polish this response to be more:
- Student-friendly and encouraging
- Clear and well-organized
- Practical with actionable advice
- Motivational and supportive
- Culturally appropriate for Nigerian students

Maintain all factual content while improving clarity, encouragement, and educational value.`;

  try {
    return await callGroqModel(STUDENT_AGENT_MODELS.polisher, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: content }
    ], 1200, 0.6);
  } catch (error) {
    console.error('Student polisher error:', error);
    return content;
  }
}

// Main student-focused multi-agent processing
async function processStudentMultiAgent(query: string, context: string, userName: string, userProfile?: any): Promise<string> {
  try {
    console.log('Starting student-focused multi-agent processing for:', userName);

    // Step 1: Student Orchestrator analyzes query
    const subtasks = await studentOrchestratorAgent(query, context, userName, userProfile);
    console.log('Student orchestrator created', subtasks.length, 'educational subtasks');

    // Step 2: Execute student-focused workers
    const workerResults = await executeStudentWorkers(subtasks, context, userName, userProfile);
    console.log('Student specialists completed processing');

    // Step 3: Educational synthesis
    const synthesizedResponse = await studentSynthesisAgent(workerResults, query, userName);
    console.log('Educational synthesis completed');

    // Step 4: Student safety check
    const safetyCheck = await studentSafetyAgent(synthesizedResponse);
    if (!safetyCheck.safe) {
      console.log('Content blocked by student safety agent:', safetyCheck.reason);
      return `I want to help you learn, but I can't provide that specific information. Let me help you with your studies in a different way! What specific concept or topic would you like to understand better?`;
    }

    // Step 5: Student-friendly enhancement
    const finalResponse = await studentPolisherAgent(synthesizedResponse, userName);
    console.log('Student-focused multi-agent processing completed successfully');

    return finalResponse;
  } catch (error) {
    console.error('Student multi-agent processing error:', error);
    // Fallback to encouraging single-model response
    return await callGroqModel(STUDENT_AGENT_MODELS.study_helper, [
      { 
        role: 'system', 
        content: `You are Campus Companion, an encouraging AI study assistant for University of Uyo students. Help ${userName} learn and succeed with their question: ${query}. Be supportive, clear, and educational.` 
      },
      { role: 'user', content: query }
    ], 1000, 0.5);
  }
}

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

    const { message, context } = await req.json();
    
    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (message.length > 2000) {
      return new Response(JSON.stringify({ error: 'Message too long. Please keep it under 2000 characters so I can help you better!' }), {
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
    const sanitizedContext = context ? context.trim() : 'University of Uyo student using Campus Companion for academic assistance';

    console.log('Processing student-focused request for:', user.id);

    // Process using student-centered multi-agent system
    const response = await processStudentMultiAgent(sanitizedMessage, sanitizedContext, userName, profile);

    return new Response(JSON.stringify({ 
      response,
      processing_type: 'student_multi_agent',
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
    console.error('Error in student ai-chat function:', error);
    return new Response(JSON.stringify({ 
      error: 'I\'m having trouble right now, but I\'m here to help you succeed! Please try again in a moment.',
      processing_type: 'error_fallback'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});