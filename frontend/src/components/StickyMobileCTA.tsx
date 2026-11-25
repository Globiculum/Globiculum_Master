import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Phones only: a "Start Free Assessment" bar fixed to the bottom of the screen.
 * It appears once the hero's own buttons (#hero-cta) have scrolled out of view,
 * so it never covers the hero or the stats under it on first load. Pages
 * without #hero-cta show it straight away.
 */
const StickyMobileCTA = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const heroCta = document.getElementById("hero-cta");
    if (!heroCta || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0));
    observer.observe(heroCta);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={cn(
        "fixed bottom-0 inset-x-0 z-50 md:hidden bg-primary/95 backdrop-blur-sm border-t border-primary-foreground/10 p-3 transition-transform duration-300 motion-reduce:transition-none",
        visible ? "translate-y-0" : "pointer-events-none translate-y-full"
      )}
      aria-hidden={!visible}
    >
      <Button
        size="lg"
        className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold rounded-full"
        asChild
      >
        <Link to="/begin-journey" tabIndex={visible ? undefined : -1}>
          Start Free Assessment
          <ArrowRight className="ml-2 h-5 w-5" />
        </Link>
      </Button>
    </div>
  );
};

export default StickyMobileCTA;
