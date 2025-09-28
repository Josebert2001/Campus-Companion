import { useState, useRef } from "react";
import { Camera, Upload, X, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ImageUploadProps {
  onImageAnalyzed: (analysis: string, imageUrl: string) => void;
  disabled?: boolean;
}

export default function ImageUpload({ onImageAnalyzed, disabled }: ImageUploadProps) {
  const [images, setImages] = useState<Array<{ file: File; url: string; analysis?: string }>>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisType, setAnalysisType] = useState<'academic' | 'mathematical' | 'technical' | 'scientific'>('academic');
  const [enhanceOCR, setEnhanceOCR] = useState(false);
  const [extractFormulas, setExtractFormulas] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    files.forEach(processFile);
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    const url = URL.createObjectURL(file);
    setImages(prev => [...prev, { file, url }]);
  };

  const analyzeImage = async (imageIndex: number) => {
    const image = images[imageIndex];
    if (!image || isAnalyzing) return;

    try {
      setIsAnalyzing(true);
      
      // Convert image to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Image = (reader.result as string).split(',')[1];
        
        try {
          const { data, error } = await supabase.functions.invoke('enhanced-vision', {
            body: { 
              image: base64Image,
              context: "Academic study material analysis for University of Uyo student",
              analysis_type: analysisType,
              enhance_ocr: enhanceOCR,
              extract_formulas: extractFormulas,
              detail_level: 'high'
            }
          });

          if (error) throw error;

          const analysis = data?.analysis || data?.raw_analysis;
          if (!analysis) throw new Error('No analysis received');
          
          // Update image with analysis
          setImages(prev => prev.map((img, idx) => 
            idx === imageIndex ? { ...img, analysis } : img
          ));
          
          onImageAnalyzed(analysis, image.url);
          
          // Show enhanced feedback
          const processingType = data?.processing_type || 'standard';
          const agentUsed = data?.routing?.selected_agent || 'general';
          toast.success(`Image analyzed with ${agentUsed} agent! (${processingType})`);
        } catch (error) {
          console.error('Vision analysis error:', error);
          toast.error("Failed to analyze image. Please try again.");
        }
      };
      reader.readAsDataURL(image.file);
    } catch (error) {
      console.error('Image processing error:', error);
      toast.error("Failed to process image");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].url);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  return (
    <div className="space-y-3">
      {/* Analysis Options */}
      <div className="glass-panel p-3 space-y-2">
        <div className="flex flex-wrap gap-2 items-center">
          <label className="text-xs font-medium">Analysis Type:</label>
          <select
            value={analysisType}
            onChange={(e) => setAnalysisType(e.target.value as any)}
            className="text-xs px-2 py-1 rounded border bg-background"
            disabled={disabled}
          >
            <option value="academic">Academic</option>
            <option value="mathematical">Mathematical</option>
            <option value="technical">Technical</option>
            <option value="scientific">Scientific</option>
          </select>
        </div>
        
        <div className="flex flex-wrap gap-3 text-xs">
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={enhanceOCR}
              onChange={(e) => setEnhanceOCR(e.target.checked)}
              disabled={disabled}
              className="w-3 h-3"
            />
            Enhanced OCR
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={extractFormulas}
              onChange={(e) => setExtractFormulas(e.target.checked)}
              disabled={disabled}
              className="w-3 h-3"
            />
            Extract Formulas
          </label>
        </div>
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="flex items-center gap-2 neuro-btn"
        >
          <Upload className="w-4 h-4" />
          Upload Study Material
        </Button>
        
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            navigator.mediaDevices.getUserMedia({ video: true })
              .then(() => toast.info("Camera capture coming soon!"))
              .catch(() => toast.error("Camera access denied"));
          }}
          disabled={disabled}
          className="flex items-center gap-2 neuro-btn"
        >
          <Camera className="w-4 h-4" />
          Take Photo
        </Button>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
          {images.map((image, index) => (
            <Card key={index} className="p-2 relative">
              <img
                src={image.url}
                alt={`Upload ${index + 1}`}
                className="w-full h-16 object-cover rounded"
              />
              
              <div className="absolute top-1 right-1 flex gap-1">
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-6 w-6"
                  onClick={() => analyzeImage(index)}
                  disabled={isAnalyzing || !!image.analysis}
                  title={image.analysis ? 'Already analyzed' : 'Analyze with AI'}
                >
                  {isAnalyzing ? (
                    <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Eye className="w-3 h-3" />
                  )}
                </Button>
                
                <Button
                  size="icon"
                  variant="destructive"
                  className="h-6 w-6"
                  onClick={() => removeImage(index)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
              
              {image.analysis && (
                <div className="absolute bottom-1 left-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Analysis complete" />
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}