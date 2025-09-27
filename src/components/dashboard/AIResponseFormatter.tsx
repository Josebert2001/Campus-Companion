import React from 'react';
import { BookOpen, Lightbulb, ArrowRight, CheckCircle } from 'lucide-react';

interface AIResponseFormatterProps {
  content: string;
  className?: string;
}

export default function AIResponseFormatter({ content, className = "" }: AIResponseFormatterProps) {
  // Parse the AI response and format it properly
  const formatContent = (text: string) => {
    // Split into sections and format properly
    const sections = text.split(/\*\*([^*]+)\*\*/g);
    const elements: React.ReactNode[] = [];
    
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      
      if (i % 2 === 1) {
        // This is a header (between **)
        elements.push(
          <h4 key={i} className="font-semibold text-primary text-sm mt-3 mb-2 flex items-center gap-2">
            {section.includes('Learning Points') && <Lightbulb className="w-4 h-4" />}
            {section.includes('Tips') && <CheckCircle className="w-4 h-4" />}
            {section.includes('Next Steps') && <ArrowRight className="w-4 h-4" />}
            {!section.includes('Learning Points') && !section.includes('Tips') && !section.includes('Next Steps') && <BookOpen className="w-4 h-4" />}
            {section}
          </h4>
        );
      } else {
        // Regular content - format lists and paragraphs
        const lines = section.split('\n').filter(line => line.trim());
        
        lines.forEach((line, lineIndex) => {
          const trimmedLine = line.trim();
          
          if (!trimmedLine) return;
          
          // Handle numbered lists
          if (/^\d+\./.test(trimmedLine)) {
            const [, number, content] = trimmedLine.match(/^(\d+)\.\s*(.+)$/) || [];
            if (content) {
              elements.push(
                <div key={`${i}-${lineIndex}`} className="flex gap-3 mb-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-medium">
                    {number}
                  </span>
                  <p className="text-xs leading-relaxed">{content}</p>
                </div>
              );
            }
          }
          // Handle bullet points
          else if (trimmedLine.startsWith('*') || trimmedLine.startsWith('-')) {
            const content = trimmedLine.substring(1).trim();
            elements.push(
              <div key={`${i}-${lineIndex}`} className="flex gap-2 mb-1">
                <span className="flex-shrink-0 w-1 h-1 bg-secondary rounded-full mt-2"></span>
                <p className="text-xs leading-relaxed">{content}</p>
              </div>
            );
          }
          // Regular paragraphs
          else if (trimmedLine.length > 10) {
            elements.push(
              <p key={`${i}-${lineIndex}`} className="text-xs leading-relaxed mb-2">
                {trimmedLine}
              </p>
            );
          }
        });
      }
    }
    
    return elements;
  };

  return (
    <div className={`ai-response-formatted ${className}`}>
      {formatContent(content)}
    </div>
  );
}