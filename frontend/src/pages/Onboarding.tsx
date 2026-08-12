import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { GraduationCap, Users, BookOpen, Calendar, ArrowRight, ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { z } from "zod";

const TOTAL_STEPS = 4;

const nameSchema = z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name too long");

const curriculumOptions = [
  { value: "US", label: "US Common Core" },
  { value: "Indian", label: "CBSE / Indian" },
  { value: "IB", label: "IB (International Baccalaureate)" },
  { value: "Other", label: "Other" },
];

const detailedCurriculumOptions = [
  { value: "cbse", label: "CBSE" },
  { value: "icse", label: "ICSE" },
  { value: "common-core", label: "US Common Core" },
  { value: "cambridge", label: "Cambridge (IGCSE / A-Levels)" },
  { value: "ib", label: "IB (International Baccalaureate)" },
  { value: "state-board", label: "Indian State Board" },
  { value: "other", label: "Other" },
];

const countryOptions = [
  { value: "US", label: "United States" },
  { value: "IN", label: "India" },
  { value: "UK", label: "United Kingdom" },
  { value: "AE", label: "UAE" },
  { value: "SG", label: "Singapore" },
  { value: "AU", label: "Australia" },
  { value: "CA", label: "Canada" },
  { value: "other", label: "Other" },
];

const timelineOptions = [
  { value: "immediate", label: "Within 3 months" },
  { value: "short", label: "3–6 months" },
  { value: "medium", label: "6–12 months" },
  { value: "long", label: "More than a year" },
  { value: "exploring", label: "Just exploring options" },
];

// Map detailed curriculum values to the enum values in DB
const mapCurriculumToEnum = (val: string): "US" | "Indian" | "IB" | "Other" => {
  if (["common-core"].includes(val)) return "US";
  if (["cbse", "icse", "state-board"].includes(val)) return "Indian";
  if (["ib"].includes(val)) return "IB";
  return "Other";
};

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);

  const [formData, setFormData] = useState({
    role: "" as "parent" | "student" | "",
    childName: "",
    currentGrade: "",
    schoolCountry: "",
    curriculumFrom: "",
    curriculumTo: "",
    transitionTimeline: "",
  });

  // Check if profile already exists — skip onboarding if so
  useEffect(() => {
    if (authLoading || !user) return;

    const checkProfile = async () => {
      const { data } = await supabase
        .from("student_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        navigate("/begin-journey", { replace: true });
      } else {
        setCheckingProfile(false);
      }
    };

    checkProfile();
  }, [user, authLoading, navigate]);

  if (authLoading || checkingProfile) {
    return (
      <div role="status" aria-live="polite" className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  if (!user) {
    navigate("/auth", { replace: true });
    return null;
  }

  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  const canProceed = () => {
    switch (step) {
      case 0:
        return formData.role !== "";
      case 1:
        return formData.childName.trim().length >= 2 && formData.currentGrade !== "" && formData.schoolCountry !== "";
      case 2:
        return formData.curriculumFrom !== "" && formData.curriculumTo !== "";
      case 3:
        return formData.transitionTimeline !== "";
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) setStep((s) => s + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    // Validate name
    const nameResult = nameSchema.safeParse(formData.childName);
    if (!nameResult.success) {
      toast({ title: "Invalid name", description: nameResult.error.errors[0].message, variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const gradeNum = parseInt(formData.currentGrade, 10);
      const age = gradeNum + 5; // rough approximation

      const { error } = await supabase.from("student_profiles").insert({
        user_id: user.id,
        student_name: nameResult.data,
        current_grade: `Grade ${formData.currentGrade}`,
        current_country: formData.schoolCountry,
        age,
        previous_curriculum: mapCurriculumToEnum(formData.curriculumFrom),
        target_curriculum: mapCurriculumToEnum(formData.curriculumTo),
        transition_timeline: formData.transitionTimeline,
      });

      if (error) throw error;

      toast({ title: "Welcome aboard!", description: "Your profile has been set up successfully." });
      navigate("/begin-journey", { replace: true });
    } catch (err: any) {
      console.error("[Onboarding] Save error:", err);
      toast({ title: "Could not save profile", description: err?.message || "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col items-center justify-center p-4">
      {/* Progress */}
      <div className="w-full max-w-lg mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">
            Step {step + 1} of {TOTAL_STEPS}
          </span>
          <span className="text-sm font-medium text-primary">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <Card className="w-full max-w-lg shadow-lg border-0 bg-card">
        {/* Step 0: Role */}
        {step === 0 && (
          <>
            <CardHeader className="text-center space-y-2">
              <Users className="h-10 w-10 text-primary mx-auto" />
              <h1 className="text-2xl font-semibold leading-none tracking-tight">Welcome to Globiculum</h1>
              <CardDescription>Let's personalize your experience. Are you a…</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {(["parent", "student"] as const).map((role) => (
                  <button
                    key={role}
                    onClick={() => setFormData((p) => ({ ...p, role }))}
                    className={`p-6 rounded-xl border-2 transition-all text-center space-y-2 ${
                      formData.role === role
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-border hover:border-primary/40 hover:bg-muted/30"
                    }`}
                  >
                    {role === "parent" ? (
                      <Users className="h-8 w-8 mx-auto text-primary" />
                    ) : (
                      <GraduationCap className="h-8 w-8 mx-auto text-secondary" />
                    )}
                    <span className="block text-sm font-semibold capitalize">{role}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </>
        )}

        {/* Step 1: Child Info */}
        {step === 1 && (
          <>
            <CardHeader className="text-center space-y-2">
              <BookOpen className="h-10 w-10 text-secondary mx-auto" />
              <h1 className="text-2xl font-semibold leading-none tracking-tight">
                {formData.role === "parent" ? "Tell us about your child" : "Tell us about yourself"}
              </h1>
              <CardDescription>We'll use this to build a personalized readiness plan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="childName">{formData.role === "parent" ? "Child's Name" : "Your Name"}</Label>
                <Input
                  id="childName"
                  placeholder="e.g. Aarav"
                  maxLength={100}
                  value={formData.childName}
                  onChange={(e) => setFormData((p) => ({ ...p, childName: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Current Grade</Label>
                <Select value={formData.currentGrade} onValueChange={(v) => setFormData((p) => ({ ...p, currentGrade: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                      <SelectItem key={g} value={String(g)}>Grade {g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Current School Country</Label>
                <Select value={formData.schoolCountry} onValueChange={(v) => setFormData((p) => ({ ...p, schoolCountry: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                  <SelectContent>
                    {countryOptions.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </>
        )}

        {/* Step 2: Curriculum */}
        {step === 2 && (
          <>
            <CardHeader className="text-center space-y-2">
              <GraduationCap className="h-10 w-10 text-accent mx-auto" />
              <h1 className="text-2xl font-semibold leading-none tracking-tight">Curriculum Transition</h1>
              <CardDescription>Which curriculum is your child moving from and to?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Moving FROM</Label>
                <Select value={formData.curriculumFrom} onValueChange={(v) => setFormData((p) => ({ ...p, curriculumFrom: v }))}>
                  <SelectTrigger><SelectValue placeholder="Current curriculum" /></SelectTrigger>
                  <SelectContent>
                    {detailedCurriculumOptions.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Moving TO</Label>
                <Select value={formData.curriculumTo} onValueChange={(v) => setFormData((p) => ({ ...p, curriculumTo: v }))}>
                  <SelectTrigger><SelectValue placeholder="Target curriculum" /></SelectTrigger>
                  <SelectContent>
                    {detailedCurriculumOptions.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.curriculumFrom && formData.curriculumTo && formData.curriculumFrom === formData.curriculumTo && (
                <p className="text-sm text-warning">
                  The source and target curricula are the same — are you sure?
                </p>
              )}
            </CardContent>
          </>
        )}

        {/* Step 3: Timeline */}
        {step === 3 && (
          <>
            <CardHeader className="text-center space-y-2">
              <Calendar className="h-10 w-10 text-primary mx-auto" />
              <h1 className="text-2xl font-semibold leading-none tracking-tight">When are you planning to transition?</h1>
              <CardDescription>This helps us prioritize what to prepare first.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {timelineOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFormData((p) => ({ ...p, transitionTimeline: opt.value }))}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                    formData.transitionTimeline === opt.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40 hover:bg-muted/30"
                  }`}
                >
                  {formData.transitionTimeline === opt.value ? (
                    <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                  )}
                  <span className="text-sm font-medium">{opt.label}</span>
                </button>
              ))}
            </CardContent>
          </>
        )}

        {/* Navigation */}
        <div className="p-6 pt-0 flex justify-between gap-3">
          {step > 0 ? (
            <Button variant="outline" onClick={handleBack} disabled={saving}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          ) : (
            <div />
          )}

          {step < TOTAL_STEPS - 1 ? (
            <Button onClick={handleNext} disabled={!canProceed()}>
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!canProceed() || saving} className="bg-gradient-primary">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </Card>

      {/* Step labels */}
      <div className="flex items-center gap-6 mt-8 text-xs text-muted-foreground">
        {["Your Role", "Student Info", "Curriculum", "Timeline"].map((label, i) => (
          <span key={label} className={`flex items-center gap-1.5 ${i <= step ? "text-primary font-medium" : ""}`}>
            <span className={`w-2 h-2 rounded-full ${i < step ? "bg-primary" : i === step ? "bg-primary animate-pulse" : "bg-muted-foreground/30"}`} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
};

export default Onboarding;
