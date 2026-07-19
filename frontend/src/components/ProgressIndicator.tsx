import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Brain, CheckCircle } from "lucide-react";

const ProgressIndicator = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setProgress(85), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="bg-gradient-card border-0 shadow-medium rounded-lg p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Brain className="h-6 w-6 text-primary animate-pulse" />
          <h3 className="text-lg font-semibold">AI-Driven Gap Analysis Process</h3>
        </div>
        <CheckCircle className="h-5 w-5 text-success" />
      </div>
      
      <Progress value={progress} className="h-3 mb-3" />
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-6">
        <div className="text-center">
          <div className="w-8 h-8 rounded-full bg-success/20 text-success flex items-center justify-center mx-auto mb-2 font-bold">✓</div>
          <p className="text-muted-foreground">Curriculum Mapping</p>
        </div>
        <div className="text-center">
          <div className="w-8 h-8 rounded-full bg-success/20 text-success flex items-center justify-center mx-auto mb-2 font-bold">✓</div>
          <p className="text-muted-foreground">Gap Identification</p>
        </div>
        <div className="text-center">
          <div className="w-8 h-8 rounded-full bg-success/20 text-success flex items-center justify-center mx-auto mb-2 font-bold">✓</div>
          <p className="text-muted-foreground">Bridge Plan Creation</p>
        </div>
        <div className="text-center">
          <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center mx-auto mb-2 font-bold animate-pulse">→</div>
          <p className="text-muted-foreground">Your Personalized Report</p>
        </div>
      </div>
    </div>
  );
};

export default ProgressIndicator;
