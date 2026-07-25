import { useState, useCallback } from "react";
import { ZoomIn, ZoomOut, X, Maximize2 } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import readinessReport from "@/assets/Readiness_Report.jpeg";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

const ReadinessReportSection = () => {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scale, setScale] = useState(1);

  const zoomIn = useCallback(() => setScale((s) => Math.min(s + 0.25, 3)), []);
  const zoomOut = useCallback(() => setScale((s) => Math.max(s - 0.25, 0.5)), []);
  const resetZoom = useCallback(() => setScale(1), []);

  const openFullscreen = useCallback(() => {
    setIsFullscreen(true);
    setScale(1);
  }, []);

  return (
    <>
      <section className="relative overflow-hidden bg-muted/30 py-12 sm:py-16 md:py-24">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div
            className="max-w-4xl mx-auto text-center mb-8 sm:mb-10"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeUp} className="mb-6 flex justify-center">
              <Button
                size="lg"
                onClick={openFullscreen}
                className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg shadow-accent/25 hover:shadow-xl hover:shadow-accent/30 transition-all duration-300 rounded-full font-semibold uppercase tracking-wide text-base px-8 sm:px-10 py-6 sm:text-lg"
              >
                Sample Report
              </Button>
            </motion.div>

            <motion.h2
              variants={fadeUp}
              className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground leading-tight sm:leading-snug mb-3 sm:mb-4"
            >
              Sample Transition Readiness Report
            </motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              See exactly what you&apos;ll receive — a comprehensive, actionable report tailored to your child&apos;s academic transition.
            </motion.p>
          </motion.div>

          <motion.div
            className="max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="relative group rounded-[28px] overflow-hidden border border-[rgba(15,23,42,0.06)] bg-card shadow-sm transition-shadow duration-300 hover:shadow-xl">
              <img
                src={readinessReport}
                alt="Sample Globiculum Transition Readiness Report showing subject coverage, critical gaps, and bridge timeline"
                className="w-full h-auto block"
                loading="lazy"
              />
              <motion.button
                onClick={openFullscreen}
                whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }}
                className="absolute top-4 right-4 bg-primary/80 hover:bg-primary text-primary-foreground p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="View fullscreen"
              >
                <Maximize2 className="h-5 w-5" />
              </motion.button>
            </div>
          </motion.div>
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
