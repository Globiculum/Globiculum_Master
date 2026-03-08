import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { BookOpen, MapPin, Calendar, Target, BarChart3, Loader2, Globe } from "lucide-react";
import { ElementaryFoundations } from "./assessment/ElementaryFoundations";
import { LearningStyleObservations } from "./assessment/LearningStyleObservations";
import { StudyTimePatterns } from "./assessment/StudyTimePatterns";
import { HighSchoolMathDeepDive } from "./assessment/HighSchoolMathDeepDive";
import { AcademicSignals } from "./assessment/AcademicSignals";
import { shouldApplyStateLogic } from "./assessment/StateAwareMathCourses";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { logAuditEvent } from "@/lib/logAuditEvent";

interface AssessmentFormProps {
  prefillData?: Record<string, any>;
  prevReportId?: string;
}

const AssessmentForm = ({ prefillData, prevReportId }: AssessmentFormProps) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState(() => {
    const defaults = {
      // Step 0: Educational Start (Merged Step 1 + 2)
      schoolStage: "",
      snapshotGrade: "",
      snapshotLocation: "",
      snapshotLocationOther: "",
      usState: "",
      usStateOther: "",
      snapshotAge: "",
      currentCurriculum: "",
      currentCurriculumOther: "",
      reportCard: null as File | null,
      
      // Step 1: Previous Education & Goals
      previousLocation: "",
      previousLocationOther: "",
      targetGoal: "",
      targetGoalOther: "",
      timeline: "",
      
      // Step 2: Current Academic Path (moved from old step 0 + expanded)
      academicPath: [] as string[],
      selectedLanguages: [] as string[],
      languageProficiencies: {} as Record<string, string>,
      customLanguage: "",
      extracurriculars: [] as string[],
      languagesAtHome: [] as string[],
      
      // Foreign Language details (Middle School)
      foreignLanguageName: "",
      foreignLanguageNameOther: "",
      foreignLanguageLevel: "",
      
      // Elementary-specific: foundational confidence levels
      elementaryConfidences: {} as Record<string, string>,
      
      // High School Math Deep-Dive
      mathCourse: "",
      mathProgramLevel: "",
      
      // Academic Signals (High School electives reframed)
      academicSignals: [] as string[],
      
      // Step 3: Educational Assessment
      learningStyles: [] as string[], // Changed to multi-select behavior-based
      studyTime: "", // Changed to realistic patterns
      previousGrades: "",
      strongestSubjects: [] as string[],
      challengingSubjects: [] as string[],
      strengthenGoals: [] as string[], // Indian curriculum improvement goals
      transitionConcerns: [] as string[],
      supportNeeds: [] as string[]
    };

    if (prefillData) {
      // Merge prefill data into defaults, preserving types
      return {
        ...defaults,
        schoolStage: prefillData.schoolStage || defaults.schoolStage,
        snapshotGrade: prefillData.snapshotGrade ? String(prefillData.snapshotGrade) : defaults.snapshotGrade,
        snapshotLocation: prefillData.snapshotLocation || defaults.snapshotLocation,
        snapshotLocationOther: prefillData.snapshotLocationOther || defaults.snapshotLocationOther,
        usState: prefillData.usState || defaults.usState,
        usStateOther: prefillData.usStateOther || defaults.usStateOther,
        snapshotAge: prefillData.snapshotAge ? String(prefillData.snapshotAge) : defaults.snapshotAge,
        currentCurriculum: prefillData.currentCurriculum || defaults.currentCurriculum,
        currentCurriculumOther: prefillData.currentCurriculumOther || defaults.currentCurriculumOther,
        previousLocation: prefillData.previousLocation || defaults.previousLocation,
        previousLocationOther: prefillData.previousLocationOther || defaults.previousLocationOther,
        targetGoal: prefillData.targetGoal || defaults.targetGoal,
        targetGoalOther: prefillData.targetGoalOther || defaults.targetGoalOther,
        timeline: prefillData.timeline || defaults.timeline,
        academicPath: Array.isArray(prefillData.academicPath) ? prefillData.academicPath : defaults.academicPath,
        selectedLanguages: Array.isArray(prefillData.selectedLanguages) ? prefillData.selectedLanguages : defaults.selectedLanguages,
        languageProficiencies: prefillData.languageProficiencies || defaults.languageProficiencies,
        customLanguage: prefillData.customLanguage || defaults.customLanguage,
        extracurriculars: Array.isArray(prefillData.extracurriculars) ? prefillData.extracurriculars : defaults.extracurriculars,
        languagesAtHome: Array.isArray(prefillData.languagesAtHome) ? prefillData.languagesAtHome : defaults.languagesAtHome,
        foreignLanguageName: prefillData.foreignLanguageName || defaults.foreignLanguageName,
        foreignLanguageNameOther: prefillData.foreignLanguageNameOther || defaults.foreignLanguageNameOther,
        foreignLanguageLevel: prefillData.foreignLanguageLevel || defaults.foreignLanguageLevel,
        elementaryConfidences: prefillData.elementaryConfidences || defaults.elementaryConfidences,
        mathCourse: prefillData.mathCourse || defaults.mathCourse,
        mathProgramLevel: prefillData.mathProgramLevel || defaults.mathProgramLevel,
        academicSignals: Array.isArray(prefillData.academicSignals) ? prefillData.academicSignals : defaults.academicSignals,
        learningStyles: Array.isArray(prefillData.learningStyles) ? prefillData.learningStyles : defaults.learningStyles,
        studyTime: prefillData.studyTime || defaults.studyTime,
        previousGrades: prefillData.previousGrades || defaults.previousGrades,
        strongestSubjects: Array.isArray(prefillData.strongestSubjects) ? prefillData.strongestSubjects : defaults.strongestSubjects,
        challengingSubjects: Array.isArray(prefillData.challengingSubjects) ? prefillData.challengingSubjects : defaults.challengingSubjects,
        transitionConcerns: Array.isArray(prefillData.transitionConcerns) ? prefillData.transitionConcerns : defaults.transitionConcerns,
        supportNeeds: Array.isArray(prefillData.supportNeeds) ? prefillData.supportNeeds : defaults.supportNeeds,
        strengthenGoals: Array.isArray(prefillData.strengthenGoals) ? prefillData.strengthenGoals : defaults.strengthenGoals,
      };
    }

    return defaults;
  });

  // Helper: Determine if student is US-educated (for invisible logic)
  const isUSEducated = formData.previousLocation === "us";
  
  // Helper: Should show state-aware math logic
  const showStateMathLogic = shouldApplyStateLogic(
    formData.schoolStage,
    formData.previousLocation,
    formData.currentCurriculum,
    formData.usState
  );

  const handleSelectChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Dynamic grade update based on school stage
    if (field === "schoolStage") {
      setFormData(prev => ({ 
        ...prev, 
        snapshotGrade: "",
        // Reset stage-specific fields
        elementaryConfidences: {},
        mathCourse: "",
        mathProgramLevel: "",
        academicSignals: []
      }));
    }
  };

  const handleArrayToggle = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field as keyof typeof prev] as string[]).includes(value)
        ? (prev[field as keyof typeof prev] as string[]).filter(item => item !== value)
        : [...(prev[field as keyof typeof prev] as string[]), value]
    }));
  };

  const handleElementaryConfidenceChange = (area: string, level: string) => {
    setFormData(prev => ({
      ...prev,
      elementaryConfidences: {
        ...prev.elementaryConfidences,
        [area]: level
      }
    }));
  };

  const nextStep = () => {
    if (currentStep < 3) setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  };

  // Inline field error display helper
  const FieldError = ({ field }: { field: string }) => {
    const msg = fieldErrors[field];
    if (!msg) return null;
    return <p className="text-sm text-destructive mt-1">{msg}</p>;
  };

  const handleSubmit = async () => {
    setIsValidating(true);
    setFieldErrors({});

    // Save to both sessionStorage and localStorage for resilience
    const formDataJson = JSON.stringify(formData);
    sessionStorage.setItem('assessment-form-data', formDataJson);
    localStorage.setItem('assessment-form-data', formDataJson);
    
    // Clear any stale analysis data before generating new report
    sessionStorage.removeItem('saved-report-analysis');
    sessionStorage.removeItem('saved-report-id');
    
    console.log("[AssessmentForm] Submitting form data:", formData);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/report-preview", { state: { formData, prevReportId } });
        return;
      }

      const userId = session.user.id;

      // ── Validation gate: call validate-student-data ──
      const validationPayload = {
        schoolStage: formData.schoolStage,
        snapshotGrade: parseInt(formData.snapshotGrade, 10) || 0,
        snapshotAge: formData.snapshotAge ? parseInt(formData.snapshotAge, 10) : undefined,
        currentCurriculum: formData.currentCurriculum,
        timeline: formData.timeline || undefined,
        snapshotLocation: formData.snapshotLocation || undefined,
        usState: formData.usState || undefined,
      };

      const { data: valResponse, error: valError } = await supabase.functions.invoke(
        "validate-student-data",
        {
          body: validationPayload,
          headers: {
            "X-API-Version": "v1",
          },
        }
      );

      if (valError) {
        console.error("[AssessmentForm] Validation call failed:", valError);
        toast({
          title: "Validation service unavailable",
          description: "Could not validate your data. Please try again.",
          variant: "destructive",
        });
        return;
      }

      const valResult = valResponse?.data ?? valResponse;

      if (valResult && !valResult.isValid && valResult.errors?.length > 0) {
        // Map server errors to field-level display
        const newFieldErrors: Record<string, string> = {};
        for (const err of valResult.errors) {
          newFieldErrors[err.field] = err.message;
        }
        setFieldErrors(newFieldErrors);

        // Jump to step 0 where most field errors live
        if (currentStep !== 0) setCurrentStep(0);

        toast({
          title: "Please correct the highlighted fields",
          description: `${valResult.errors.length} issue(s) found.`,
          variant: "destructive",
        });
        return;
      }

      // Show warnings as non-blocking toasts
      if (valResult?.warnings?.length > 0) {
        for (const w of valResult.warnings) {
          toast({ title: w.message, description: w.suggestion || "" });
        }
      }

      setIsValidating(false);
      setIsSubmitting(true);

      // ── Proceed with save ──
      const { data: studentProfile } = await supabase
        .from("student_profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (!studentProfile) {
        console.warn("[AssessmentForm] No student profile found, skipping diagnostics");
        navigate("/report-preview", { state: { formData, prevReportId } });
        return;
      }

      // Save assessment to DB
      const { data: assessment, error: assessmentError } = await supabase
        .from("assessments")
        .insert({
          user_id: userId,
          student_profile_id: studentProfile.id,
          assessment_data: formData as any,
          status: "completed",
        })
        .select("id")
        .single();

      if (assessmentError || !assessment) {
        console.error("[AssessmentForm] Failed to save assessment:", assessmentError);
        navigate("/report-preview", { state: { formData, prevReportId } });
        return;
      }

      // Audit: student profile data changed (fire-and-forget)
      logAuditEvent({
        action: "update_student_profile",
        tableName: "assessments",
        recordId: assessment.id,
        newData: { student_profile_id: studentProfile.id, status: "completed" },
      });

      // Fire-and-forget: call analyze-curriculum and store result on student profile
      supabase.functions.invoke("analyze-curriculum", {
        body: {
          formData: {
            schoolStage: formData.schoolStage,
            snapshotGrade: parseInt(formData.snapshotGrade, 10) || undefined,
            snapshotLocation: formData.snapshotLocation || undefined,
            usState: formData.usState || undefined,
            previousCountry: formData.previousLocation || undefined,
            currentCurriculum: formData.currentCurriculum || undefined,
            targetGoal: formData.targetGoal || undefined,
            academicPath: formData.academicPath.length > 0 ? formData.academicPath : undefined,
            strongestSubjects: formData.strongestSubjects.length > 0 ? formData.strongestSubjects : undefined,
            challengingAreas: formData.challengingSubjects.length > 0 ? formData.challengingSubjects : undefined,
            languagesSpoken: formData.selectedLanguages.length > 0 ? formData.selectedLanguages : undefined,
            transitionTimeline: formData.timeline || undefined,
          },
        },
        headers: { "X-API-Version": "v1" },
      }).then(({ data: analysisResp }) => {
        if (analysisResp?.success && analysisResp.data) {
          supabase
            .from("student_profiles")
            .update({ curriculum_analysis: analysisResp.data } as any)
            .eq("id", studentProfile.id)
            .then(({ error: updateErr }) => {
              if (updateErr) console.error("[AssessmentForm] Failed to store curriculum_analysis:", updateErr);
              else console.log("[AssessmentForm] curriculum_analysis stored successfully");
            });
        }
      }).catch((err) => {
        console.error("[AssessmentForm] analyze-curriculum fire-and-forget error:", err);
      });

      // Call diagnostics-engine
      const { data: diagResponse, error: diagError } = await supabase.functions.invoke(
        "diagnostics-engine",
        {
          body: {
            studentId: studentProfile.id,
            assessmentId: assessment.id,
            diagnosticType: "full",
          },
        }
      );

      if (diagError || !diagResponse?.success) {
        const errMsg = diagError?.message || diagResponse?.error || "Diagnostics engine failed";
        console.error("[AssessmentForm] Diagnostics error:", errMsg);
        toast({
          title: "Could not run diagnostics",
          description: errMsg,
          variant: "destructive",
        });
        navigate("/report-preview", { state: { formData, prevReportId } });
        return;
      }

      const diagResult = diagResponse.data;

      // Store diagnostic result in database
      const { data: savedDiag, error: saveError } = await supabase
        .from("diagnostic_results" as any)
        .insert({
          user_id: userId,
          student_profile_id: studentProfile.id,
          assessment_id: assessment.id,
          overall_score: diagResult.overallScore,
          subject_scores: diagResult.subjectScores,
          strength_areas: diagResult.strengthAreas,
          gap_areas: diagResult.gapAreas,
          readiness_level: diagResult.readinessLevel,
          recommendations: diagResult.recommendations,
          diagnostic_type: "full",
        } as any)
        .select("id")
        .single();

      if (saveError || !savedDiag) {
        console.error("[AssessmentForm] Failed to save diagnostic result:", saveError);
        navigate("/report-preview", { state: { formData, prevReportId } });
        return;
      }

      navigate(`/report-preview?diagnosticId=${(savedDiag as any).id}`, {
        state: { formData, diagnosticResultId: (savedDiag as any).id, assessmentId: assessment.id, prevReportId },
      });
    } catch (err: any) {
      console.error("[AssessmentForm] Unexpected error:", err);
      toast({
        title: "Something went wrong",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
      navigate("/report-preview", { state: { formData, prevReportId } });
    } finally {
      setIsValidating(false);
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({ ...prev, reportCard: file }));
  };

  // Get grade options based on school stage
  const getGradeOptions = () => {
    switch (formData.schoolStage) {
      case "elementary":
        return Array.from({ length: 5 }, (_, i) => i + 1);
      case "middle":
        return Array.from({ length: 3 }, (_, i) => i + 6);
      case "high":
        return Array.from({ length: 4 }, (_, i) => i + 9);
      default:
        return Array.from({ length: 12 }, (_, i) => i + 1);
    }
  };

  // Curriculum options by stage - expanded with additional options
  const curriculumByStage = {
    elementary: [
      { value: "us-common-core", label: "US Common Core", info: "Standard academic benchmarks used in most US states." },
      { value: "state-specific", label: "State-Specific Standards", info: "Curriculum aligned to your specific state's requirements." },
      { value: "ib-pyp", label: "IB PYP (International Baccalaureate – Primary Years Programme)", info: "Inquiry-based international curriculum for Grades 1–5." },
      { value: "cambridge-primary", label: "Cambridge Primary", info: "International curriculum for ages 5-11." },
      { value: "montessori", label: "Montessori Curriculum", info: "Child-centered educational approach based on self-directed learning." },
      { value: "waldorf", label: "Waldorf Early Education", info: "Holistic approach emphasizing creative and practical activities." },
      { value: "magnet-tag", label: "Magnet / TAG Programs", info: "Gifted and talented programs with advanced curriculum." },
      { value: "charter", label: "Charter School Curriculum", info: "Independent public school with flexible curriculum." },
      { value: "other", label: "Other", info: "Specify your curriculum system." }
    ],
    middle: [
      { value: "us-common-core", label: "US Common Core", info: "Standard academic benchmarks used in most US states." },
      { value: "state-specific", label: "State-Specific Standards", info: "Curriculum aligned to your specific state's requirements." },
      { value: "ib-myp", label: "IB MYP (International Baccalaureate – Middle Years Programme)", info: "Global curriculum emphasizing interdisciplinary learning." },
      { value: "cambridge-lower", label: "Cambridge Lower Secondary", info: "International curriculum for ages 11-14." },
      { value: "honors-advanced", label: "Honors / Advanced Programs", info: "Accelerated coursework with higher academic standards." },
      { value: "magnet-tag", label: "Magnet / TAG Programs", info: "Gifted and talented programs with advanced curriculum." },
      { value: "stem-magnet", label: "STEM Magnet / STEAM-specific Curriculums", info: "Science, Technology, Engineering, Arts, and Math focused programs." },
      { value: "charter", label: "Charter School Curriculum", info: "Independent public school with flexible curriculum." },
      { value: "other", label: "Other", info: "Specify your curriculum system." }
    ],
    high: [
      { value: "us-common-core", label: "US Common Core", info: "Standard academic benchmarks used in most US states." },
      { value: "state-specific", label: "State-Specific Standards", info: "Curriculum aligned to your specific state's requirements." },
      { value: "american-diploma", label: "American Diploma Program", info: "Standard US high school diploma program." },
      { value: "ap", label: "AP Track (Advanced Placement)", info: "College-level courses for high school students." },
      { value: "ib-dp", label: "IB DP (International Baccalaureate – Diploma Programme)", info: "Globally recognized pre-university program for Grades 11–12." },
      { value: "cambridge-igcse", label: "Cambridge IGCSE (International General Certificate of Secondary Education)", info: "Cambridge international curriculum for Grades 9–10." },
      { value: "a-levels", label: "A-Levels (Advanced Level Qualification)", info: "Two-year UK program recognized worldwide." },
      { value: "honors", label: "Honors Program", info: "Advanced coursework with higher academic standards." },
      { value: "dual-credit", label: "Dual Credit Program", info: "Earn high school and college credits simultaneously." },
      { value: "magnet-tag", label: "Magnet / TAG Programs", info: "Gifted and talented programs with specialized focus." },
      { value: "charter", label: "Charter School Curriculum", info: "Independent public school with flexible curriculum." },
      { value: "other", label: "Other", info: "Specify your curriculum system." }
    ]
  };

  const usStates = [
    { value: "AL", label: "Alabama" },
    { value: "AK", label: "Alaska" },
    { value: "AZ", label: "Arizona" },
    { value: "AR", label: "Arkansas" },
    { value: "CA", label: "California" },
    { value: "CO", label: "Colorado" },
    { value: "CT", label: "Connecticut" },
    { value: "DE", label: "Delaware" },
    { value: "FL", label: "Florida" },
    { value: "GA", label: "Georgia" },
    { value: "HI", label: "Hawaii" },
    { value: "ID", label: "Idaho" },
    { value: "IL", label: "Illinois" },
    { value: "IN", label: "Indiana" },
    { value: "IA", label: "Iowa" },
    { value: "KS", label: "Kansas" },
    { value: "KY", label: "Kentucky" },
    { value: "LA", label: "Louisiana" },
    { value: "ME", label: "Maine" },
    { value: "MD", label: "Maryland" },
    { value: "MA", label: "Massachusetts" },
    { value: "MI", label: "Michigan" },
    { value: "MN", label: "Minnesota" },
    { value: "MS", label: "Mississippi" },
    { value: "MO", label: "Missouri" },
    { value: "MT", label: "Montana" },
    { value: "NE", label: "Nebraska" },
    { value: "NV", label: "Nevada" },
    { value: "NH", label: "New Hampshire" },
    { value: "NJ", label: "New Jersey" },
    { value: "NM", label: "New Mexico" },
    { value: "NY", label: "New York" },
    { value: "NC", label: "North Carolina" },
    { value: "ND", label: "North Dakota" },
    { value: "OH", label: "Ohio" },
    { value: "OK", label: "Oklahoma" },
    { value: "OR", label: "Oregon" },
    { value: "PA", label: "Pennsylvania" },
    { value: "RI", label: "Rhode Island" },
    { value: "SC", label: "South Carolina" },
    { value: "SD", label: "South Dakota" },
    { value: "TN", label: "Tennessee" },
    { value: "TX", label: "Texas" },
    { value: "UT", label: "Utah" },
    { value: "VT", label: "Vermont" },
    { value: "VA", label: "Virginia" },
    { value: "WA", label: "Washington" },
    { value: "WV", label: "West Virginia" },
    { value: "WI", label: "Wisconsin" },
    { value: "WY", label: "Wyoming" },
    { value: "DC", label: "District of Columbia" },
    { value: "other", label: "Other" }
  ];

  // Get current curriculum options based on selected stage
  const getCurrentCurriculumOptions = () => {
    if (!formData.schoolStage) return [];
    return curriculumByStage[formData.schoolStage as keyof typeof curriculumByStage] || [];
  };

  // Grade-band aware subject lists
  const getSubjectsByGradeBand = () => {
    switch (formData.schoolStage) {
      case "elementary":
        return [
          "Mathematics",
          "Science",
          "English / Language Arts",
          "Social Studies",
          "Basic Language",
        ];
      case "middle":
        return [
          "Mathematics",
          "Science",
          "English / Language Arts",
          "Social Studies",
          "Foreign Language",
          "Elective (Art/Music/Technology)",
        ];
      case "high":
        return [
          "Algebra",
          "Geometry",
          "Pre-Calculus / Calculus",
          "Biology",
          "Chemistry",
          "Physics",
          "English / Language Arts",
          "Social Studies / History",
          "Foreign Language",
          "Elective (Art/Music/CS/Other)",
        ];
      default:
        return [
          "Mathematics",
          "Science",
          "English / Language Arts",
          "Social Studies",
        ];
    }
  };

  // Dynamic subjects based on what the user selected in academicPath
  const getSelectedSubjectOptions = () => {
    if (formData.academicPath.length === 0) return [];
    return formData.academicPath;
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return renderEducationalStart();
      case 1:
        return renderGoalsAndTimeline();
      case 2:
        return renderAcademicPath();
      case 3:
        return renderEducationalAssessment();
      default:
        return renderEducationalStart();
    }
  };

  const renderEducationalStart = () => (
    <div className="space-y-8">
      {/* School Stage Selection */}
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-foreground mb-2">1. Select School Stage</h3>
          <p className="text-muted-foreground">Which stage best describes your child?</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => handleSelectChange("schoolStage", "elementary")}
            className={`p-6 rounded-lg border-2 transition-all hover:border-primary ${
              formData.schoolStage === "elementary" 
                ? "border-primary bg-primary/5" 
                : "border-border bg-card"
            }`}
          >
            <div className="flex flex-col items-center gap-3">
              <BookOpen className="h-12 w-12 text-primary" />
              <div className="text-center">
                <div className="font-semibold text-lg">Elementary</div>
                <div className="text-sm text-muted-foreground">(Grades 1–5)</div>
              </div>
            </div>
          </button>
          
          <button
            onClick={() => handleSelectChange("schoolStage", "middle")}
            className={`p-6 rounded-lg border-2 transition-all hover:border-primary ${
              formData.schoolStage === "middle" 
                ? "border-primary bg-primary/5" 
                : "border-border bg-card"
            }`}
          >
            <div className="flex flex-col items-center gap-3">
              <Target className="h-12 w-12 text-primary" />
              <div className="text-center">
                <div className="font-semibold text-lg">Middle School</div>
                <div className="text-sm text-muted-foreground">(Grades 6–8)</div>
              </div>
            </div>
          </button>
          
          <button
            onClick={() => handleSelectChange("schoolStage", "high")}
            className={`p-6 rounded-lg border-2 transition-all hover:border-primary ${
              formData.schoolStage === "high" 
                ? "border-primary bg-primary/5" 
                : "border-border bg-card"
            }`}
          >
            <div className="flex flex-col items-center gap-3">
              <BarChart3 className="h-12 w-12 text-primary" />
              <div className="text-center">
                <div className="font-semibold text-lg">High School</div>
                <div className="text-sm text-muted-foreground">(Grades 9–12)</div>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Student Snapshot */}
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-foreground mb-2">2. Student Snapshot</h3>
          <p className="text-muted-foreground">Tell us about your child's current education</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="snapshot-grade">Current Grade</Label>
            <Select 
              value={formData.snapshotGrade} 
              onValueChange={(value) => handleSelectChange("snapshotGrade", value)}
              disabled={!formData.schoolStage}
            >
              <SelectTrigger id="snapshot-grade">
                <SelectValue placeholder={formData.schoolStage ? "Select grade" : "Select school stage first"} />
              </SelectTrigger>
              <SelectContent>
                {getGradeOptions().map(grade => (
                  <SelectItem key={grade} value={String(grade)}>Grade {grade}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError field="snapshotGrade" />
          </div>
          
          <div>
            <Label htmlFor="snapshot-location">Location</Label>
            <Select value={formData.snapshotLocation} onValueChange={(value) => handleSelectChange("snapshotLocation", value)}>
              <SelectTrigger id="snapshot-location">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="us">United States</SelectItem>
                <SelectItem value="india" disabled>India (Coming Soon)</SelectItem>
                <SelectItem value="uae" disabled>UAE / Dubai / Abu Dhabi (Coming Soon)</SelectItem>
                <SelectItem value="qatar" disabled>Qatar (Coming Soon)</SelectItem>
                <SelectItem value="saudi" disabled>Saudi Arabia (Coming Soon)</SelectItem>
                <SelectItem value="kuwait" disabled>Kuwait (Coming Soon)</SelectItem>
                <SelectItem value="singapore" disabled>Singapore (Coming Soon)</SelectItem>
                <SelectItem value="malaysia" disabled>Malaysia (Coming Soon)</SelectItem>
                <SelectItem value="uk" disabled>United Kingdom (Coming Soon)</SelectItem>
                <SelectItem value="australia" disabled>Australia (Coming Soon)</SelectItem>
                <SelectItem value="canada" disabled>Canada (Coming Soon)</SelectItem>
                <SelectItem value="germany" disabled>Germany (Coming Soon)</SelectItem>
                <SelectItem value="nz" disabled>New Zealand (Coming Soon)</SelectItem>
                <SelectItem value="sa" disabled>South Africa (Coming Soon)</SelectItem>
                <SelectItem value="other">Other Country</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {formData.snapshotLocation === "us" && (
          <div>
            <Label htmlFor="us-state">Which US State?</Label>
            <Select value={formData.usState} onValueChange={(value) => handleSelectChange("usState", value)}>
              <SelectTrigger id="us-state">
                <SelectValue placeholder="Select your state" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {usStates.map(state => (
                  <SelectItem key={state.value} value={state.value}>{state.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError field="usState" />
          </div>
        )}
        
        {formData.usState === "other" && (
          <div>
            <Label htmlFor="us-state-other">Please enter your state</Label>
            <Input
              id="us-state-other"
              type="text"
              placeholder="Enter state name"
              value={formData.usStateOther}
              onChange={(e) => handleSelectChange("usStateOther", e.target.value)}
            />
          </div>
        )}
        
        {formData.snapshotLocation === "other" && (
          <div>
            <Label htmlFor="snapshot-location-other">Please specify your country</Label>
            <Input
              id="snapshot-location-other"
              type="text"
              placeholder="Enter country name"
              value={formData.snapshotLocationOther}
              onChange={(e) => handleSelectChange("snapshotLocationOther", e.target.value)}
            />
          </div>
        )}
        
        <div>
          <Label htmlFor="snapshot-age">Age (optional)</Label>
          <Input
            id="snapshot-age"
            type="number"
            min="5"
            max="18"
            placeholder="Student's age"
            value={formData.snapshotAge}
            onChange={(e) => handleSelectChange("snapshotAge", e.target.value)}
          />
          <FieldError field="snapshotAge" />
        </div>
      </div>

      {/* Current Curriculum */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="current-curriculum">Select your current curriculum system</Label>
          <p className="text-sm text-muted-foreground mb-2">
            Choose the curriculum your child is currently studying.
          </p>
          <Select 
            value={formData.currentCurriculum} 
            onValueChange={(value) => handleSelectChange("currentCurriculum", value)}
            disabled={!formData.schoolStage}
          >
            <SelectTrigger id="current-curriculum">
              <SelectValue placeholder={formData.schoolStage ? "Select current curriculum" : "Select school stage first"} />
            </SelectTrigger>
            <SelectContent className="max-h-[400px]">
              {getCurrentCurriculumOptions().map((curriculum) => (
                <SelectItem key={curriculum.value} value={curriculum.value} className="py-3">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{curriculum.label}</span>
                    <span className="text-xs text-muted-foreground">{curriculum.info}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError field="currentCurriculum" />
        </div>
        
        {formData.currentCurriculum === "other" && (
          <div>
            <Label htmlFor="current-curriculum-other">Please specify the curriculum system</Label>
            <Input
              id="current-curriculum-other"
              type="text"
              placeholder="Enter curriculum name"
              value={formData.currentCurriculumOther}
              onChange={(e) => handleSelectChange("currentCurriculumOther", e.target.value)}
            />
          </div>
        )}
      </div>


      {/* Optional Insights */}
      <div className="space-y-4 pt-6 border-t border-border/50">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-muted-foreground mb-2">Optional Insights</h3>
          <p className="text-sm text-muted-foreground">Upload a recent report card (PDF or image) - Optional</p>
        </div>
        
        <div className="flex justify-center">
          <label className="flex items-center gap-3 px-6 py-3 rounded-lg border-2 border-dashed border-border bg-card hover:border-primary transition-all cursor-pointer">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium text-sm">Choose File</span>
            <span className="text-muted-foreground text-xs">
              {formData.reportCard ? formData.reportCard.name : "No file chosen"}
            </span>
            <input
              type="file"
              accept=".pdf,image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>
  );

  const renderGoalsAndTimeline = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-lg font-semibold text-primary">
        <BookOpen className="h-5 w-5" />
        Education & Goals
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="previous-location">Previous Education Country</Label>
          <p className="text-xs text-muted-foreground mt-1 mb-2">
            This helps us align curriculum expectations accurately.
          </p>
          <Select value={formData.previousLocation} onValueChange={(value) => handleSelectChange("previousLocation", value)}>
            <SelectTrigger id="previous-location">
              <SelectValue placeholder="Where did your child study before?" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="us">USA</SelectItem>
              <SelectItem value="india">India</SelectItem>
              <SelectItem value="uae">UAE / Dubai / Abu Dhabi</SelectItem>
              <SelectItem value="singapore">Singapore</SelectItem>
              <SelectItem value="uk">United Kingdom</SelectItem>
              <SelectItem value="australia">Australia</SelectItem>
              <SelectItem value="canada">Canada</SelectItem>
              <SelectItem value="qatar">Qatar</SelectItem>
              <SelectItem value="saudi">Saudi Arabia</SelectItem>
              <SelectItem value="kuwait">Kuwait</SelectItem>
              <SelectItem value="malaysia">Malaysia</SelectItem>
              <SelectItem value="germany">Germany</SelectItem>
              <SelectItem value="nz">New Zealand</SelectItem>
              <SelectItem value="sa">South Africa</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {formData.previousLocation === "other" && (
          <div>
            <Label htmlFor="previous-location-other">Please specify</Label>
            <Input
              id="previous-location-other"
              type="text"
              placeholder="Enter country name"
              value={formData.previousLocationOther}
              onChange={(e) => handleSelectChange("previousLocationOther", e.target.value)}
            />
          </div>
        )}

        <div>
          <Label htmlFor="target-goal">Transition Pathway</Label>
          <p className="text-xs text-muted-foreground mt-1 mb-2">
            Select the Indian school system your child will be transitioning into.
          </p>
          <Select value={formData.targetGoal} onValueChange={(value) => handleSelectChange("targetGoal", value)}>
            <SelectTrigger id="target-goal">
              <SelectValue placeholder="Which Indian school system are you preparing for?" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <SelectItem value="india-cbse">Prepare for Indian CBSE Schools</SelectItem>
              <SelectItem value="india-igcse">Prepare for Indian IGCSE Schools</SelectItem>
              <SelectItem value="india-ib">Prepare for Indian IB Schools</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Cultural Readiness - Supporting context */}
        <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-2">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <Label className="text-base font-semibold">Cultural Readiness for India</Label>
          </div>
          <p className="text-sm text-muted-foreground">
            Your report will include guidance on classroom expectations, academic rigor differences,
            social adaptation, and cultural adjustment to help your child thrive in their new school environment.
          </p>
        </div>

        <div>
          <Label htmlFor="timeline">Preparation Timeline</Label>
          <Select value={formData.timeline} onValueChange={(value) => handleSelectChange("timeline", value)}>
            <SelectTrigger id="timeline">
              <SelectValue placeholder="When do you need to be ready?" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3months">3 months</SelectItem>
              <SelectItem value="6months">6 months</SelectItem>
              <SelectItem value="1year">1 year</SelectItem>
              <SelectItem value="2years">2+ years</SelectItem>
            </SelectContent>
          </Select>
          <FieldError field="timeline" />
        </div>
      </div>
    </div>
  );

  const renderAcademicPath = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-foreground mb-2">Current Academic Path</h3>
        <p className="text-muted-foreground">
          {formData.schoolStage === "elementary" 
            ? "Help us understand your child's foundational learning" 
            : "What subjects does the student currently study in their US curriculum?"}
        </p>
      </div>
      
      {/* Elementary: Foundational Areas instead of subjects */}
      {formData.schoolStage === "elementary" ? (
        <ElementaryFoundations 
          confidences={formData.elementaryConfidences}
          onChange={handleElementaryConfidenceChange}
        />
      ) : (
        <>
          {/* Grade-band aware subject selection */}
          <div className="space-y-4">
            <h4 className="font-semibold text-lg">Which subjects is your child currently studying?</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {getSubjectsByGradeBand().map((subject) => (
                <button
                  key={subject}
                  onClick={() => handleArrayToggle("academicPath", subject)}
                  className={`p-4 rounded-lg border-2 transition-all font-medium text-sm ${
                    formData.academicPath.includes(subject)
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-card hover:border-primary/50"
                  }`}
                >
                  {subject}
                </button>
              ))}
           </div>
          </div>

          {/* Foreign Language Details - Middle School */}
          {formData.schoolStage === "middle" && formData.academicPath.includes("Foreign Language") && (
            <div className="space-y-4 p-4 rounded-lg border border-primary/20 bg-primary/5">
              <h4 className="font-semibold text-base">Foreign Language Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="foreign-lang-name">Which foreign language is the student studying?</Label>
                  <Select 
                    value={formData.foreignLanguageName} 
                    onValueChange={(value) => handleSelectChange("foreignLanguageName", value)}
                  >
                    <SelectTrigger id="foreign-lang-name">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="spanish">Spanish</SelectItem>
                      <SelectItem value="french">French</SelectItem>
                      <SelectItem value="german">German</SelectItem>
                      <SelectItem value="mandarin">Mandarin</SelectItem>
                      <SelectItem value="japanese">Japanese</SelectItem>
                      <SelectItem value="latin">Latin</SelectItem>
                      <SelectItem value="arabic">Arabic</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {formData.foreignLanguageName === "other" && (
                    <Input
                      className="mt-2"
                      type="text"
                      placeholder="Enter language name"
                      value={formData.foreignLanguageNameOther}
                      onChange={(e) => handleSelectChange("foreignLanguageNameOther", e.target.value)}
                    />
                  )}
                </div>
                <div>
                  <Label htmlFor="foreign-lang-level">What is the student's current level?</Label>
                  <Select 
                    value={formData.foreignLanguageLevel} 
                    onValueChange={(value) => handleSelectChange("foreignLanguageLevel", value)}
                  >
                    <SelectTrigger id="foreign-lang-level">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          
          {/* High School Math Deep-Dive - only if Math-related selected and conditions met */}
          {formData.schoolStage === "high" && 
           (formData.academicPath.includes("Algebra") || formData.academicPath.includes("Geometry") || formData.academicPath.includes("Pre-Calculus / Calculus")) && 
           formData.previousLocation === "us" && 
           formData.usState && (
            <HighSchoolMathDeepDive
              usState={formData.usState}
              curriculum={formData.currentCurriculum}
              selectedCourse={formData.mathCourse}
              programLevel={formData.mathProgramLevel}
              onCourseChange={(course) => handleSelectChange("mathCourse", course)}
              onLevelChange={(level) => handleSelectChange("mathProgramLevel", level)}
            />
          )}
        </>
      )}

      {/* Language Readiness for Indian Schooling */}
      <div className="space-y-4">
        <h4 className="font-semibold text-lg">Language Readiness for Indian Schooling</h4>
        <p className="text-sm text-muted-foreground">
          Indian schools typically require Hindi and sometimes a regional or third language.
          English proficiency is assumed for US-based students and will not be heavily weighted.
        </p>
        
        {/* Primary Indian languages */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Select languages your child has exposure to</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              "Hindi",
              "Sanskrit",
              "Telugu",
              "Tamil",
              "Kannada",
              "Malayalam",
              "Marathi",
              "Bengali",
              "Gujarati",
            ].map((lang) => (
              <button
                key={lang}
                onClick={() => handleArrayToggle("selectedLanguages", lang)}
                className={`px-3 py-2 rounded-md border text-sm transition-all ${
                  formData.selectedLanguages.includes(lang)
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50"
                }`}
              >
                {lang}
              </button>
            ))}
            <button
              onClick={() => handleArrayToggle("selectedLanguages", "Other")}
              className={`px-3 py-2 rounded-md border text-sm transition-all ${
                formData.selectedLanguages.includes("Other")
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/50"
              }`}
            >
              Other
            </button>
          </div>
        </div>
        
        {formData.selectedLanguages.includes("Other") && (
          <div>
            <Label htmlFor="custom-language">Type the language</Label>
            <Input
              id="custom-language"
              type="text"
              placeholder="Enter language name"
              value={formData.customLanguage}
              onChange={(e) => handleSelectChange("customLanguage", e.target.value)}
            />
          </div>
        )}
        
        {formData.selectedLanguages.length > 0 && (
          <div className="space-y-3">
            <Label className="text-base font-medium">Proficiency Level for Each Language</Label>
            {formData.selectedLanguages.map((lang) => (
              <div key={lang} className="flex items-center gap-3">
                <span className="min-w-[100px] text-sm font-medium">{lang}</span>
                <Select 
                  value={formData.languageProficiencies[lang] || ""} 
                  onValueChange={(value) => {
                    setFormData(prev => ({
                      ...prev,
                      languageProficiencies: {
                        ...prev.languageProficiencies,
                        [lang]: value
                      }
                    }));
                  }}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select proficiency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Exposure</SelectItem>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="fluent">Fluent</SelectItem>
                    <SelectItem value="native">Native</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Languages Spoken at Home */}
      <div className="space-y-4">
        <div>
          <Label className="text-base font-medium">Languages Spoken at Home</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
            {[
              "English",
              "Hindi",
              "Tamil",
              "Telugu",
              "Kannada",
              "Malayalam",
              "Marathi",
              "Bengali",
              "Gujarati",
              "Spanish",
              "Mandarin",
              "Arabic"
            ].map((language) => (
              <div key={language} className="flex items-center space-x-2">
                <Checkbox 
                  id={`home-${language}`}
                  checked={formData.languagesAtHome.includes(language)}
                  onCheckedChange={() => handleArrayToggle("languagesAtHome", language)}
                />
                <Label htmlFor={`home-${language}`} className="text-sm cursor-pointer">{language}</Label>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* High School: Academic Signals (reframed electives) */}
      {formData.schoolStage === "high" && (
        <AcademicSignals
          selectedSignals={formData.academicSignals}
          onToggle={(signal) => handleArrayToggle("academicSignals", signal)}
        />
      )}

      {/* High School AP Subjects */}
      {formData.schoolStage === "high" && (
        <div className="space-y-4">
          <h4 className="font-semibold text-lg">High School Courses</h4>
          
          <div>
            <button
              onClick={() => handleArrayToggle("academicPath", "SAT Prep")}
              className={`w-full p-4 rounded-lg border-2 transition-all font-medium ${
                formData.academicPath.includes("SAT Prep")
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border bg-card hover:border-primary/50"
              }`}
            >
              SAT Prep (Scholastic Assessment Test)
            </button>
          </div>
          
          <div>
            <Label className="text-sm font-medium mb-2 block">AP (Advanced Placement) Subjects</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {[
                "AP (Advanced Placement) Calculus",
                "AP (Advanced Placement) Physics",
                "AP (Advanced Placement) Chemistry",
                "AP (Advanced Placement) Biology",
                "AP (Advanced Placement) Computer Science Principles",
                "AP (Advanced Placement) English",
                "AP (Advanced Placement) US History"
              ].map((ap) => (
                <button
                  key={ap}
                  onClick={() => handleArrayToggle("academicPath", ap)}
                  className={`px-3 py-2 rounded-md border text-sm transition-all ${
                    formData.academicPath.includes(ap)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {ap}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Extracurricular Activities - Keep for Middle/High only */}
      {formData.schoolStage !== "elementary" && (
        <div className="space-y-4">
          <Label className="text-base font-medium">Current Extracurricular Activities</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              "Sports & Athletics",
              "Music & Arts",
              "Debate & Public Speaking",
              "Science Olympiad",
              "Math Competitions",
              "Robotics & Coding",
              "Community Service",
              "Cultural Activities"
            ].map((activity) => (
              <div key={activity} className="flex items-center space-x-2">
                <Checkbox 
                  id={`extra-${activity}`}
                  checked={formData.extracurriculars.includes(activity)}
                  onCheckedChange={() => handleArrayToggle("extracurriculars", activity)}
                />
                <Label htmlFor={`extra-${activity}`} className="text-sm cursor-pointer">{activity}</Label>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderEducationalAssessment = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-foreground mb-2">Educational Assessment</h3>
        <p className="text-muted-foreground">Help us understand your child's learning profile</p>
      </div>

      {/* Learning Preferences - Behavior-based multi-select */}
      <LearningStyleObservations
        selectedStyles={formData.learningStyles}
        onToggle={(styleId) => handleArrayToggle("learningStyles", styleId)}
      />

      {/* Study Time - Realistic patterns */}
      <StudyTimePatterns
        selectedTime={formData.studyTime}
        onChange={(value) => handleSelectChange("studyTime", value)}
      />

      <div className="space-y-4">
        <div>
          <Label htmlFor="previous-grades">Overall Academic Performance</Label>
          <Select value={formData.previousGrades} onValueChange={(value) => handleSelectChange("previousGrades", value)}>
            <SelectTrigger id="previous-grades">
              <SelectValue placeholder="Typical grade range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="excellent">Excellent (A/90%+)</SelectItem>
              <SelectItem value="good">Good (B+/80-89%)</SelectItem>
              <SelectItem value="average">Average (B/70-79%)</SelectItem>
              <SelectItem value="below-average">Below Average (C+/60-69%)</SelectItem>
              <SelectItem value="struggling">Struggling (&lt;60%)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Strongest Subjects - Dynamic based on selected subjects */}
      <div className="space-y-4">
        <Label className="text-base font-medium">
          {getSelectedSubjectOptions().length > 0 
            ? "Which of the subjects you selected is the student's strongest?" 
            : "Strongest Subjects (select subjects in Step 3 first)"}
        </Label>
        {getSelectedSubjectOptions().length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {getSelectedSubjectOptions().map((subject) => (
              <div key={subject} className="flex items-center space-x-2">
                <Checkbox 
                  id={`strong-${subject}`}
                  checked={formData.strongestSubjects.includes(subject)}
                  onCheckedChange={() => handleArrayToggle("strongestSubjects", subject)}
                />
                <Label htmlFor={`strong-${subject}`} className="text-sm cursor-pointer">{subject}</Label>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">Please select subjects in the Academic Path step to populate this list.</p>
        )}
      </div>

      {/* Most Challenging Subjects - Dynamic */}
      <div className="space-y-4">
        <Label className="text-base font-medium">
          {getSelectedSubjectOptions().length > 0 
            ? "Which subject is currently most challenging for the student?" 
            : "Most Challenging Subjects (select subjects in Step 3 first)"}
        </Label>
        {getSelectedSubjectOptions().length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {getSelectedSubjectOptions().map((subject) => (
              <div key={subject} className="flex items-center space-x-2">
                <Checkbox 
                  id={`challenge-${subject}`}
                  checked={formData.challengingSubjects.includes(subject)}
                  onCheckedChange={() => handleArrayToggle("challengingSubjects", subject)}
                />
                <Label htmlFor={`challenge-${subject}`} className="text-sm cursor-pointer">{subject}</Label>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">Please select subjects in the Academic Path step to populate this list.</p>
        )}
      </div>

      {/* Indian Curriculum Improvement Goal */}
      <div className="space-y-4">
        <Label className="text-base font-medium">Which subjects would you most like the student to strengthen for Indian schooling?</Label>
        <p className="text-sm text-muted-foreground">Select all that apply — helps identify priority transition goals.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            ...(getSelectedSubjectOptions().length > 0 ? getSelectedSubjectOptions() : []),
            "Hindi / Languages",
            "Study habits for Indian curriculum",
          ].filter((v, i, a) => a.indexOf(v) === i).map((goal) => (
            <div key={goal} className="flex items-center space-x-2">
              <Checkbox 
                id={`strengthen-${goal}`}
                checked={formData.strengthenGoals.includes(goal)}
                onCheckedChange={() => handleArrayToggle("strengthenGoals", goal)}
              />
              <Label htmlFor={`strengthen-${goal}`} className="text-sm cursor-pointer">{goal}</Label>
            </div>
          ))}
        </div>
      </div>

      {/* Transition Concerns */}
      <div className="space-y-4">
        <Label className="text-base font-medium">Primary Transition Concerns</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            "Academic rigor differences",
            "Language barriers (Hindi/Regional)",
            "Cultural integration challenges",
            "Assessment style adaptation",
            "Peer interaction difficulties",
            "Teacher-student relationship norms",
            "Homework expectations",
            "Extracurricular differences"
          ].map((concern) => (
            <div key={concern} className="flex items-center space-x-2">
              <Checkbox 
                id={`concern-${concern}`}
                checked={formData.transitionConcerns.includes(concern)}
                onCheckedChange={() => handleArrayToggle("transitionConcerns", concern)}
              />
              <Label htmlFor={`concern-${concern}`} className="text-sm cursor-pointer">{concern}</Label>
            </div>
          ))}
        </div>
      </div>

      {/* Support Needs */}
      <div className="space-y-4">
        <Label className="text-base font-medium">Support Needs Priority</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            "1-on-1 tutoring sessions",
            "Group study programs",
            "Parent counseling calls",
            "Cultural mentorship",
            "Regular progress tracking",
            "Emergency academic support",
            "College admission guidance",
            "Peer support groups"
          ].map((need) => (
            <div key={need} className="flex items-center space-x-2">
              <Checkbox 
                id={`need-${need}`}
                checked={formData.supportNeeds.includes(need)}
                onCheckedChange={() => handleArrayToggle("supportNeeds", need)}
              />
              <Label htmlFor={`need-${need}`} className="text-sm cursor-pointer">{need}</Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <section id="assessment" className="py-10 md:py-20 bg-muted/30">
      <div className="container mx-auto px-4 overflow-y-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Begin Your <span className="text-primary">Personalized Curriculum Mapping</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Answer a few questions to unlock your AI-generated alignment report
          </p>
        </div>

        <Card className="max-w-4xl mx-auto shadow-medium bg-gradient-card border-0">
          <CardHeader className="text-center pb-6">
            <CardTitle className="flex items-center justify-center gap-2 text-2xl">
              <Target className="h-6 w-6 text-primary" />
              Educational Assessment - Step {currentStep + 1} of 4
            </CardTitle>
            <CardDescription className="text-base">
              Comprehensive assessment for personalized curriculum alignment
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-8">
            {/* Progress Indicator */}
            <div className="flex justify-center space-x-2 mb-8">
              {[0, 1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    step <= currentStep ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>

            {/* Render Current Step */}
            {renderStep()}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6">
              <Button 
                variant="outline" 
                onClick={prevStep} 
                disabled={currentStep === 0}
                className="min-w-24"
              >
                Previous
              </Button>
              
              {currentStep < 3 ? (
                <Button onClick={nextStep} disabled={!canProceed()}>
                  Next Step
                </Button>
              ) : (
                <Button 
                  onClick={handleSubmit} 
                  disabled={!canProceed() || isSubmitting || isValidating} 
                  className="bg-gradient-primary hover:shadow-strong"
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Validating...
                    </>
                  ) : isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    "View Alignment Report"
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );

  function canProceed() {
    switch (currentStep) {
      case 0:
        const locationValid = formData.snapshotLocation && 
          (formData.snapshotLocation !== "other" || formData.snapshotLocationOther) &&
          (formData.snapshotLocation !== "us" || (formData.usState && (formData.usState !== "other" || formData.usStateOther)));
        const curriculumValid = formData.currentCurriculum && 
          (formData.currentCurriculum !== "other" || formData.currentCurriculumOther);
        return formData.schoolStage && formData.snapshotGrade && locationValid && curriculumValid;
      case 1:
        const prevLocationValid = formData.previousLocation && 
          (formData.previousLocation !== "other" || formData.previousLocationOther);
        const targetValid = !!formData.targetGoal;
        return prevLocationValid && targetValid && formData.timeline;
      case 2:
        // Elementary: require at least one confidence level set
        if (formData.schoolStage === "elementary") {
          return Object.keys(formData.elementaryConfidences).length > 0 || formData.selectedLanguages.length > 0;
        }
        return formData.academicPath.length > 0 || formData.selectedLanguages.length > 0;
      case 3:
        // Updated: learningStyles is now an array, studyTime is new field
        return formData.learningStyles.length > 0 && formData.studyTime && formData.previousGrades;
      default:
        return false;
    }
  }
};

export default AssessmentForm;
