import { useState, useCallback } from "react";
import { ZoomIn, ZoomOut, X, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import readinessReport from "@/assets/Readiness_Report.jpeg";

const ReadinessReportSection = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scale, setScale] = useState(1);

  const zoomIn = useCallback(() => setScale((s) => Math.min(s + 0.25, 3)), []);
  const zoomOut = useCallback(() => setScale((s) => Math.max(s - 0.25, 0.5)), []);
  const resetZoom = useCallback(() => setScale(1), []);

  return (
    <>
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-4 mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-snug">
              Sample Transition Readiness Report
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              See exactly what you'll receive — a comprehensive, actionable report tailored to your child's academic transition.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="relative group rounded-2xl overflow-hidden shadow-lg border border-border bg-card">
              <img
                src={readinessReport}
                alt="Sample Globiculum Transition Readiness Report showing subject coverage, critical gaps, and bridge timeline"
                className="w-full h-auto block"
                loading="lazy"
              />
              <button
                onClick={() => {
                  setIsFullscreen(true);
                  setScale(1);
                }}
                className="absolute top-4 right-4 bg-primary/80 hover:bg-primary text-primary-foreground p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="View fullscreen"
              >
                <Maximize2 className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground text-center mt-4">
              Click the expand icon to zoom in and explore the full report
            </p>
          </div>
        </div>
      </section>

      {/* Fullscreen overlay */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
          {/* Controls */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
            <h3 className="text-lg font-semibold text-foreground">
              Transition Readiness Report
            </h3>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={zoomOut} disabled={scale <= 0.5}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <button
                onClick={resetZoom}
                className="text-sm text-muted-foreground hover:text-foreground min-w-[4rem] text-center"
              >
                {Math.round(scale * 100)}%
              </button>
              <Button variant="outline" size="sm" onClick={zoomIn} disabled={scale >= 3}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setIsFullscreen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Scrollable image area */}
          <div className="flex-1 overflow-auto flex items-start justify-center p-6">
            <img
              src={readinessReport}
              alt="Transition Readiness Report – fullscreen view"
              className="max-w-none transition-transform duration-200 rounded-lg shadow-lg"
              style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default ReadinessReportSection;
