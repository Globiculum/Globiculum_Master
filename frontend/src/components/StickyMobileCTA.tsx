import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const StickyMobileCTA = () => {
  return (
    <div className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-primary/95 backdrop-blur-sm border-t border-primary-foreground/10 p-3">
      <Button
        size="lg"
        className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold rounded-full"
        asChild
      >
        <Link to="/begin-journey">
          Start Free Assessment
          <ArrowRight className="ml-2 h-5 w-5" />
        </Link>
      </Button>
    </div>
  );
};

export default StickyMobileCTA;
