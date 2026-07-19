import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BottomNavigationProps {
  onBack: () => void;
  onNext: () => void;
  backDisabled: boolean;
  showNext: boolean;
}

// Back always calls goPrev; Continue always calls goNext (which internally
// validates and blocks advance with inline field errors) — identical to the
// original Back/Next buttons, just restyled and pinned to the bottom.
const BottomNavigation = ({ onBack, onNext, backDisabled, showNext }: BottomNavigationProps) => (
  <div className="sticky bottom-0 z-10 -mx-4 mt-8 border-t border-border bg-background/90 px-4 py-4 backdrop-blur-sm sm:mx-0 sm:rounded-2xl sm:border sm:shadow-soft">
    <div className="flex items-center justify-between gap-3">
      <Button type="button" variant="outline" size="lg" onClick={onBack} disabled={backDisabled} className="gap-2 rounded-full">
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>
      {showNext && (
        <Button
          type="button"
          size="lg"
          onClick={onNext}
          className="group gap-2 rounded-full bg-gradient-cta px-8 shadow-medium transition-all duration-300 hover:shadow-strong hover:brightness-105"
        >
          Continue
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </Button>
      )}
    </div>
  </div>
);

export default BottomNavigation;
