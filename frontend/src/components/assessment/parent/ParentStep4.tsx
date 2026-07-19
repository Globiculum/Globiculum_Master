import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import type { ParentStepProps } from "./types";

// Step 4: Concerns & Support.
// Transition Concerns / Support Needs are ported verbatim from
// AssessmentForm.tsx's renderEducationalAssessment(). "Additional Notes" is
// a NEW frontend-only field (no equivalent existed before) — captured here
// but deliberately excluded from parentMapper.ts's payload, so it cannot
// affect backend compatibility.

const TRANSITION_CONCERNS = [
  "Academic rigor differences", "Language barriers (Hindi/Regional)", "Cultural integration challenges",
  "Assessment style adaptation", "Peer interaction difficulties", "Teacher-student relationship norms",
  "Homework expectations", "Extracurricular differences",
];

const SUPPORT_NEEDS = [
  "1-on-1 tutoring sessions", "Peer learning groups", "Worksheets & practice papers", "Mock tests",
  "Group study programs", "Parent counseling calls", "Cultural mentorship", "Regular progress tracking",
  "Emergency academic support", "College admission guidance",
];

const ParentStep4 = ({ formData, onFieldChange, onArrayToggle }: ParentStepProps) => {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Label className="text-base font-medium">Primary Transition Concerns</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {TRANSITION_CONCERNS.map((concern) => (
            <div key={concern} className="flex items-center space-x-2">
              <Checkbox
                id={`concern-${concern}`}
                checked={formData.transitionConcerns.includes(concern)}
                onCheckedChange={() => onArrayToggle("transitionConcerns", concern)}
              />
              <Label htmlFor={`concern-${concern}`} className="text-sm cursor-pointer">
                {concern}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <Label className="text-base font-medium">Support Needs Priority</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {SUPPORT_NEEDS.map((need) => (
            <div key={need} className="flex items-center space-x-2">
              <Checkbox
                id={`need-${need}`}
                checked={formData.supportNeeds.includes(need)}
                onCheckedChange={() => onArrayToggle("supportNeeds", need)}
              />
              <Label htmlFor={`need-${need}`} className="text-sm cursor-pointer">
                {need}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <Label htmlFor="additional-notes" className="text-base font-medium">
          Additional Notes (optional)
        </Label>
        <p className="text-xs text-muted-foreground">Frontend-only for now — not yet sent to the report generator.</p>
        <Textarea id="additional-notes" rows={4} value={formData.additionalNotes} onChange={(e) => onFieldChange("additionalNotes", e.target.value)} />
      </div>
    </div>
  );
};

export default ParentStep4;
