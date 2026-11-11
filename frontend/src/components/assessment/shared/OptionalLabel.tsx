import { cn } from "@/lib/utils";

// "(Optional)" right after an optional question's title, in both assessments:
// plain text in the darker brand teal, on the same line as the question, so it
// reads as part of the title. A grey "Optional" pill was used briefly before
// this; it was too faint, especially over the flashcard's globe artwork.
const OptionalLabel = ({ className }: { className?: string }) => (
  <span className={cn("ml-2 whitespace-nowrap text-base font-semibold text-secondary-contrast", className)}>(Optional)</span>
);

export default OptionalLabel;
