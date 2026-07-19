import { ReactNode } from "react";

// Generalizes the repeated "section heading + description + content" block
// used throughout the original AssessmentForm.tsx render functions. Two
// sizes match the two heading styles that already existed in that file.

interface QuestionCardProps {
  title?: string;
  description?: string;
  size?: "lg" | "md"; // lg = "text-2xl" centered section headings, md = "text-lg" left-aligned subsection headings
  centered?: boolean;
  className?: string;
  children: ReactNode;
}

const QuestionCard = ({ title, description, size = "lg", centered = true, className, children }: QuestionCardProps) => {
  const wrapperClass = className ?? "space-y-4";

  if (size === "lg") {
    return (
      <div className={wrapperClass}>
        {(title || description) && (
          <div className={centered ? "text-center" : undefined}>
            {title && <h3 className="text-2xl font-bold text-foreground mb-2">{title}</h3>}
            {description && <p className="text-muted-foreground">{description}</p>}
          </div>
        )}
        {children}
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      {title && <h4 className="font-semibold text-lg">{title}</h4>}
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      {children}
    </div>
  );
};

export default QuestionCard;
