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
          const { data, error } = await supabase.functions.invoke('vision-analysis', {
            body: { 
              image: base64Image,
              context: "Academic study material analysis for University of Uyo student"
            }
          });

          if (error) throw error;

          const analysis = data?.analysis;
          if (!analysis) throw new Error('No analysis received');
          
          // Update image with analysis
          setImages(prev => prev.map((img, idx) => 
            idx === imageIndex ? { ...img, analysis } : img
          ));
          
          onImageAnalyzed(analysis, image.url);
          toast.success("Image analyzed successfully!");
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
          className="flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Upload Image
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
          className="flex items-center gap-2"
        >
          <Camera className="w-4 h-4" />
          Camera
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
                <div className="absolute bottom-1 left-1 w-2 h-2 bg-green-500 rounded-full" />
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}