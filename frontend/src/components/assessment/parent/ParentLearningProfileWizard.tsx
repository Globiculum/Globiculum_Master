import { GlobiculumIconTile, GlobiculumStudentIcon } from "@/components/icons";
import FieldError from "../shared/FieldError";
import FlashcardShell from "../shared/FlashcardShell";
import { LearningStyleObservations } from "../LearningStyleObservations";
import type { ParentFormData } from "./parentMapper";

// Phase D: Parent Learning Profile. Originally a 4-card flashcard sequence
// (Learning Style, Typical Grade Range, Overall Performance, Strengthen for
// Indian Schooling). Three of those were redundant with data collected
// elsewhere and have been removed:
//  - "Typical Grade Range" and "Overall Performance" asked essentially the
//    same thing in different wording; the required one (Overall Performance)
//    moved to the Academic Path step as a natural lead-in to the per-subject
//    picker there — see ParentStep2.tsx / parentValidation.ts. The other
//    (never required) was dropped entirely.
//  - "Strengthen for Indian Schooling" re-asked, in different wording,
//    subjects already captured by Academic Path's per-subject confidence
//    ratings (the same "needs-help" subjects surface on Review as
//    "Challenging Subjects"). formData.strengthenGoals stays in the data
//    model for backward compatibility with older saved reports, just no
//    longer collected here.
// That leaves a single question, so this is now a plain static card rather
// than a sequential wizard with nav dots and a summary/edit phase.

interface ParentLearningProfileWizardProps {
  formData: ParentFormData;
  onArrayToggle: (field: keyof ParentFormData, value: string) => void;
  fieldErrors: Record<string, string>;
}

const ParentLearningProfileWizard = ({ formData, onArrayToggle, fieldErrors }: ParentLearningProfileWizardProps) => (
  <FlashcardShell accent="teal">
    <div className="relative flex flex-col items-center text-center">
      <div className="mb-4">
        <GlobiculumIconTile tone="violet" size={72}>
          <GlobiculumStudentIcon size={40} />
        </GlobiculumIconTile>
      </div>
      <h4 className="text-xl font-bold text-foreground">How does your child learn best?</h4>
      <p className="mt-1.5 text-sm text-muted-foreground">Understanding your child's learning style helps us tailor recommendations in the report.</p>
    </div>
    <div className="relative mt-6">
      <LearningStyleObservations selectedStyles={formData.learningStyles} onToggle={(styleId) => onArrayToggle("learningStyles", styleId)} />
    </div>
    <FieldError message={fieldErrors.learningStyles} />
  </FlashcardShell>
);

export default ParentLearningProfileWizard;
