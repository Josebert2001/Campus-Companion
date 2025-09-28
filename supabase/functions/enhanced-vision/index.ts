import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VisionRequest {
  image: string; // base64 encoded
  context?: string;
  analysis_type?: 'academic' | 'technical' | 'mathematical' | 'scientific' | 'general';
  model?: 'llama-4-scout' | 'llama-4-maverick' | 'gpt-4o';
  detail_level?: 'low' | 'high' | 'auto';
  subject?: string;
  enhance_ocr?: boolean;
  extract_formulas?: boolean;
}

interface VisionAnalysis {
  description: string;
  extracted_text?: string;
  formulas?: string[];
  key_concepts?: string[];
  study_suggestions?: string[];
  subject_classification?: string;
  confidence?: number;
  processing_info?: any;
  unified_response?: string;
}

interface AgentRouting {
  selected_agent: 'study_helper' | 'researcher' | 'technical_analyzer' | 'formula_extractor';
  confidence: number;
  reason: string;
}

// Multi-Agent Router for Vision Analysis
function routeVisionAnalysis(request: VisionRequest): AgentRouting {
  const analysisType = request.analysis_type || 'academic';
  const hasFormulas = request.extract_formulas || false;
  const context = (request.context || '').toLowerCase();
  
  // Route based on analysis type and context
  if (analysisType === 'mathematical' || hasFormulas || context.includes('formula') || context.includes('equation')) {
    return {
      selected_agent: 'formula_extractor',
      confidence: 0.95,
      reason: 'Mathematical content detected - routing to formula extraction specialist'
    };
  }
  
  if (analysisType === 'technical' || context.includes('diagram') || context.includes('circuit') || context.includes('engineering')) {
    return {
      selected_agent: 'technical_analyzer',
      confidence: 0.90,
      reason: 'Technical content detected - routing to technical analysis specialist'
    };
  }
  
  if (context.includes('research') || context.includes('paper') || context.includes('reference')) {
    return {
      selected_agent: 'researcher',
      confidence: 0.88,
      reason: 'Research content detected - routing to research specialist'
    };
  }
  
  return {
    selected_agent: 'study_helper',
    confidence: 0.85,
    reason: 'General academic content - routing to study helper'
  };
}

// Enhanced Vision Analysis with Latest Groq Models
async function analyzeWithGroqVision(request: VisionRequest, routing: AgentRouting): Promise<VisionAnalysis> {
  const groqApiKey = Deno.env.get('GROQ_API_KEY');
  if (!groqApiKey) {
    throw new Error('Groq API key not configured');
  }

  // Model selection based on agent and complexity
  const model = request.model || (
    routing.selected_agent === 'formula_extractor' || routing.selected_agent === 'technical_analyzer'
      ? 'llama-3.2-90b-vision-preview'  // Most powerful for complex analysis
      : 'llama-3.2-11b-vision-preview'  // Efficient for general analysis
  );

  // Generate agent-specific system prompt
  const systemPrompt = generateAgentVisionPrompt(request, routing);

  const messages = [
    {
      role: 'system',
      content: systemPrompt
    },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: `Please analyze this ${request.analysis_type || 'academic'} image using your ${routing.selected_agent} expertise. ${request.context || ''}`
        },
        {
          type: 'image_url',
          image_url: {
            url: `data:image/jpeg;base64,${request.image}`,
            detail: request.detail_level === 'high' ? 'high' : 'auto'
          }
        }
      ]
    }
  ];

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${groqApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 1500,
      temperature: 0.2,
      top_p: 0.9,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Groq Vision API error (${model}):`, response.status, errorText);
    throw new Error(`Vision analysis failed with ${model}`);
  }

  const data = await response.json();
  const analysisText = data.choices[0].message.content;

  // Parse structured response
  return parseVisionResponse(analysisText, model, request, routing);
}

// Generate agent-specific system prompts
function generateAgentVisionPrompt(request: VisionRequest, routing: AgentRouting): string {
  const basePrompt = `You are a specialized Vision Analysis Agent for Campus Companion, helping University of Uyo students with academic visual content.`;

  const agentPrompts: Record<string, string> = {
    study_helper: `
You are the Study Helper Vision Agent. Analyze academic study materials to help students learn:

EXPERTISE:
- Lecture slides and presentations
- Textbook pages and diagrams  
- Handwritten notes and assignments
- Study guides and summaries
- Educational charts and infographics

FOCUS ON:
- Clear concept explanation
- Learning objectives identification
- Study strategy recommendations
- Connection to broader curriculum
- Student-friendly language

Provide analysis that helps students understand and learn from visual content.`,

    researcher: `
You are the Research Vision Agent. Analyze research and reference materials:

EXPERTISE:
- Research papers and academic documents
- Data visualizations and charts
- Scientific publications
- Reference materials and citations
- Academic figures and tables

FOCUS ON:
- Information extraction and summarization
- Key findings identification
- Research methodology recognition
- Citation and reference extraction
- Academic context and significance

Help students understand research content and extract valuable information.`,

    technical_analyzer: `
You are the Technical Analysis Vision Agent. Analyze technical and engineering content:

EXPERTISE:
- Engineering diagrams and blueprints
- Circuit diagrams and schematics
- Technical specifications
- System architectures and flowcharts
- Computer science concepts and code

FOCUS ON:
- Technical accuracy and precision
- Component identification
- Process flow explanation
- Technical terminology clarification
- Practical application guidance

Provide detailed technical analysis for engineering and technical students.`,

    formula_extractor: `
You are the Formula Extraction Vision Agent. Specialize in mathematical and scientific content:

EXPERTISE:
- Mathematical equations and formulas
- Scientific notation and symbols
- Chemical formulas and reactions
- Physics equations and constants
- Statistical formulas and expressions

FOCUS ON:
- Accurate formula extraction in LaTeX format
- Mathematical concept explanation
- Step-by-step solution guidance
- Formula application examples
- Mathematical notation clarification

Extract and explain mathematical content with high precision.`
  };

  const analysisInstructions = `
${agentPrompts[routing.selected_agent]}

ANALYSIS REQUIREMENTS:
1. **Detailed Description**: What you see in the image
2. **Text Extraction**: All visible text, titles, labels${request.extract_formulas ? ', and formulas in LaTeX format' : ''}
3. **Key Concepts**: Main academic concepts present
4. **Study Suggestions**: How this material can be used for learning
5. **Subject Classification**: Academic subject identification
6. **Educational Value**: Learning objectives and outcomes

${request.enhance_ocr ? 'ENHANCED OCR: Extract ALL visible text accurately, including small print and handwritten notes.' : ''}

Context: ${request.context || 'Academic study material'}
Subject Area: ${request.subject || 'To be determined'}
Agent: ${routing.selected_agent} (${routing.reason})`;

  return `${basePrompt}\n${analysisInstructions}`;
}

// Parse and structure the vision response
function parseVisionResponse(analysisText: string, model: string, request: VisionRequest, routing: AgentRouting): VisionAnalysis {
  const extractedText = extractTextFromAnalysis(analysisText);
  const formulas = request.extract_formulas ? extractFormulas(analysisText) : [];
  const concepts = extractKeyConcepts(analysisText);
  const studySuggestions = extractStudySuggestions(analysisText);
  const subject = classifySubject(analysisText, request.subject);

  return {
    description: analysisText,
    extracted_text: extractedText,
    formulas: formulas.length > 0 ? formulas : undefined,
    key_concepts: concepts,
    study_suggestions: studySuggestions,
    subject_classification: subject,
    confidence: model.includes('90b') ? 0.95 : 0.90,
    processing_info: {
      model_used: model,
      agent_used: routing.selected_agent,
      routing_confidence: routing.confidence,
      routing_reason: routing.reason,
      analysis_type: request.analysis_type || 'academic',
      detail_level: request.detail_level || 'auto',
      enhanced_ocr: request.enhance_ocr || false
    }
  };
}

// Unified Response Generator
async function generateUnifiedResponse(analysis: VisionAnalysis, request: VisionRequest): Promise<string> {
  const groqApiKey = Deno.env.get('GROQ_API_KEY');
  if (!groqApiKey) {
    return analysis.description; // Fallback to raw analysis
  }

  const unifierPrompt = `You are the Campus Companion Response Unifier. Transform the technical vision analysis into a friendly, encouraging response for University of Uyo students.

ORIGINAL ANALYSIS:
${analysis.description}

KEY CONCEPTS: ${analysis.key_concepts?.join(', ') || 'None identified'}
SUBJECT: ${analysis.subject_classification || 'General'}
EXTRACTED TEXT: ${analysis.extracted_text || 'None'}
${analysis.formulas ? `FORMULAS: ${analysis.formulas.join(', ')}` : ''}

TRANSFORM INTO:
- Friendly, encouraging Campus Companion voice
- Student-focused language
- Practical study advice
- Clear explanations
- Motivational tone
- Nigerian university context

Keep the technical accuracy but make it conversational and supportive. Start with something like "I can see this is..." or "This looks like..." and end with encouragement.`;

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
          { role: 'user', content: 'Please create a unified, friendly response.' }
        ],
        max_tokens: 800,
        temperature: 0.6,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.choices[0].message.content;
    }
  } catch (error) {
    console.error('Unifier error:', error);
  }

  return analysis.description; // Fallback
}

// Helper functions (same as before but optimized)
function extractTextFromAnalysis(text: string): string {
  const textPatterns = [
    /(?:text|title|heading|label)[s]?[:\s]+([^\n\r]+)/gi,
    /(?:reads?|says?|shows?)[:\s]+["']([^"']+)["']/gi,
    /(?:written|displayed)[:\s]+([^\n\r]+)/gi
  ];

  const extractedTexts: string[] = [];
  
  for (const pattern of textPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1] && match[1].trim().length > 2) {
        extractedTexts.push(match[1].trim());
      }
    }
  }

  return extractedTexts.join(' | ');
}

function extractFormulas(text: string): string[] {
  const formulaPatterns = [
    /\$\$([^$]+)\$\$/g,
    /\$([^$]+)\$/g,
    /\\begin\{[^}]+\}.*?\\end\{[^}]+\}/gs,
    /(?:equation|formula)[s]?[:\s]+([^\n\r]+)/gi
  ];

  const formulas: string[] = [];
  
  for (const pattern of formulaPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1] && match[1].trim().length > 1) {
        formulas.push(match[1].trim());
      }
    }
  }

  return [...new Set(formulas)];
}

function extractKeyConcepts(text: string): string[] {
  const conceptPatterns = [
    /(?:concept|topic|subject|theme)[s]?[:\s]+([^\n\r\.]+)/gi,
    /(?:about|regarding|concerning)[:\s]+([^\n\r\.]+)/gi,
    /(?:key|main|important|primary)[:\s]+([^\n\r\.]+)/gi
  ];

  const concepts: string[] = [];
  
  for (const pattern of conceptPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1] && match[1].trim().length > 3) {
        concepts.push(match[1].trim());
      }
    }
  }

  return [...new Set(concepts.slice(0, 5))];
}

function extractStudySuggestions(text: string): string[] {
  const suggestionPatterns = [
    /(?:study|learn|practice|review|understand)[:\s]+([^\n\r\.]+)/gi,
    /(?:should|could|might|would)[:\s]+([^\n\r\.]+)/gi,
    /(?:recommend|suggest)[s]?[:\s]+([^\n\r\.]+)/gi
  ];

  const suggestions: string[] = [];
  
  for (const pattern of suggestionPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1] && match[1].trim().length > 5) {
        suggestions.push(match[1].trim());
      }
    }
  }

  if (suggestions.length === 0) {
    suggestions.push(
      'Review the key concepts highlighted in this material',
      'Practice similar problems or examples',
      'Connect this content to your course curriculum',
      'Discuss the concepts with classmates or instructors'
    );
  }

  return [...new Set(suggestions.slice(0, 4))];
}

function classifySubject(text: string, providedSubject?: string): string {
  if (providedSubject) return providedSubject;

  const subjectKeywords = {
    Mathematics: ['equation', 'formula', 'calculus', 'algebra', 'geometry', 'theorem', 'proof'],
    Physics: ['force', 'energy', 'wave', 'particle', 'quantum', 'mechanics', 'electricity'],
    Chemistry: ['molecule', 'atom', 'reaction', 'compound', 'element', 'chemical', 'bond'],
    Biology: ['cell', 'organism', 'dna', 'protein', 'evolution', 'ecosystem', 'anatomy'],
    Engineering: ['circuit', 'design', 'system', 'structure', 'analysis', 'technical'],
    'Computer Science': ['algorithm', 'code', 'program', 'data', 'software', 'computing'],
    Economics: ['market', 'price', 'demand', 'supply', 'economy', 'financial'],
    Psychology: ['behavior', 'cognitive', 'mental', 'brain', 'learning', 'memory'],
    Literature: ['text', 'author', 'poem', 'novel', 'literary', 'analysis'],
    History: ['historical', 'period', 'event', 'date', 'timeline', 'civilization']
  };

  const textLower = text.toLowerCase();
  let bestMatch = 'General Studies';
  let highestScore = 0;

  for (const [subject, keywords] of Object.entries(subjectKeywords)) {
    const score = keywords.reduce((count, keyword) => {
      return count + (textLower.includes(keyword) ? 1 : 0);
    }, 0);

    if (score > highestScore) {
      highestScore = score;
      bestMatch = subject;
    }
  }

  return bestMatch;
}

// Fallback to GPT-4o if Groq models are unavailable
async function analyzeWithGPT4oFallback(request: VisionRequest, routing: AgentRouting): Promise<VisionAnalysis> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: generateAgentVisionPrompt(request, routing)
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this ${request.analysis_type || 'academic'} image for University of Uyo students.`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${request.image}`,
                detail: request.detail_level === 'high' ? 'high' : 'auto'
              }
            }
          ]
        }
      ],
      max_tokens: 1500,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    throw new Error(`GPT-4o vision analysis failed: ${response.status}`);
  }

  const data = await response.json();
  const analysisText = data.choices[0].message.content;

  return parseVisionResponse(analysisText, 'gpt-4o', request, routing);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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

    const request: VisionRequest = await req.json();
    
    if (!request.image) {
      throw new Error('Image data is required');
    }

    // Validate image size
    const imageSize = request.image.length * 3/4;
    if (imageSize > 20 * 1024 * 1024) {
      throw new Error('Image too large. Please use an image under 20MB.');
    }

    console.log('Processing enhanced vision analysis with multi-agent routing');

    // Step 1: Route to appropriate agent
    const routing = routeVisionAnalysis(request);
    console.log('Routing decision:', routing);

    // Step 2: Analyze with selected agent
    let analysis: VisionAnalysis;
    let modelUsed: string;

    try {
      analysis = await analyzeWithGroqVision(request, routing);
      modelUsed = analysis.processing_info?.model_used || 'groq-vision';
    } catch (groqError) {
      console.log('Groq analysis failed, trying GPT-4o fallback:', groqError);
      analysis = await analyzeWithGPT4oFallback(request, routing);
      modelUsed = 'gpt-4o-fallback';
    }

    // Step 3: Generate unified response
    const unifiedResponse = await generateUnifiedResponse(analysis, request);
    analysis.unified_response = unifiedResponse;

    // Enhanced response with multi-agent context
    const enhancedResponse = {
      success: true,
      analysis: unifiedResponse, // Return unified response as main analysis
      raw_analysis: analysis.description, // Keep raw for debugging
      routing: {
        selected_agent: routing.selected_agent,
        confidence: routing.confidence,
        reason: routing.reason
      },
      extracted_data: {
        text: analysis.extracted_text,
        formulas: analysis.formulas,
        key_concepts: analysis.key_concepts,
        study_suggestions: analysis.study_suggestions,
        subject: analysis.subject_classification
      },
      model_used: modelUsed,
      processing_type: 'multi_agent_vision',
      academic_enhancements: {
        ocr_enabled: request.enhance_ocr || false,
        formula_extraction: request.extract_formulas || false,
        subject_classification: analysis.subject_classification,
        study_ready: true
      },
      university_context: {
        institution: 'University of Uyo',
        learning_focused: true,
        nigerian_context: true
      },
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(enhancedResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Enhanced vision analysis error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Vision analysis failed',
      success: false,
      fallback_available: true
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});