/**
 * Knowledge & Validation Layer
 * Enterprise-grade validation with rule-based validators, curriculum alignment heuristics,
 * confidence scoring, and missing-data detection.
 * 
 * Features:
 * - Rule-based validators with configurable rules
 * - Curriculum alignment heuristics
 * - Confidence scoring (high/medium/low)
 * - Missing data detection
 * - Validation result aggregation
 */

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'uncertain';

export interface ValidationResult {
  isValid: boolean;
  score: number;
  confidence: ConfidenceLevel;
  confidenceScore: number;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  missingData: MissingDataItem[];
  metadata: ValidationMetadata;
}

export interface ValidationIssue {
  code: string;
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  suggestion?: string;
}

export interface MissingDataItem {
  field: string;
  importance: 'required' | 'recommended' | 'optional';
  impact: string;
  defaultUsed?: unknown;
}

export interface ValidationMetadata {
  rulesApplied: number;
  rulesPassed: number;
  rulesFailed: number;
  processingTimeMs: number;
  validatorVersion: string;
}


export interface ValidationRule<T = unknown> {
  id: string;
  name: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  category: string;
  enabled: boolean;
  validate: (data: T, context?: ValidationContext) => RuleResult;
}

export interface RuleResult {
  passed: boolean;
  score: number;
  message?: string;
  suggestion?: string;
  metadata?: Record<string, unknown>;
}

export interface ValidationContext {
  gradeLevel?: number;
  sourceCurriculum?: string;
  targetCurriculum?: string;
  subjects?: string[];
  studentAge?: number;
  timeline?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const VALIDATOR_VERSION = '1.0.0';

const CONFIDENCE_THRESHOLDS = {
  high: 0.8,
  medium: 0.6,
  low: 0.4,
  uncertain: 0
};

// =============================================================================
// RULE-BASED VALIDATORS
// =============================================================================

export const StudentDataRules: ValidationRule<Record<string, unknown>>[] = [
  {
    id: 'grade_range',
    name: 'Grade Level Range',
    description: 'Grade level must be between 1 and 12',
    severity: 'error',
    category: 'data_integrity',
    enabled: true,
    validate: (data) => {
      const grade = data.snapshotGrade as number;
      if (grade === undefined || grade === null) {
        return { passed: false, score: 0, message: 'Grade level is required' };
      }
      if (grade < 1 || grade > 12) {
        return { passed: false, score: 0, message: `Grade ${grade} is out of valid range (1-12)` };
      }
      return { passed: true, score: 1 };
    }
  },
  {
    id: 'age_grade_consistency',
    name: 'Age-Grade Consistency',
    description: 'Student age should be appropriate for grade level',
    severity: 'warning',
    category: 'consistency',
    enabled: true,
    validate: (data) => {
      const grade = data.snapshotGrade as number;
      const age = data.snapshotAge as number;
      if (!age || !grade) {
        return { passed: true, score: 0.5, message: 'Age not provided for consistency check' };
      }
      
      const expectedAge = grade + 5; // Rough approximation: Grade 1 = 6 years old
      const ageDiff = Math.abs(age - expectedAge);
      
      if (ageDiff === 0) {
        return { passed: true, score: 1 };
      } else if (ageDiff === 1) {
        return { passed: true, score: 0.9 };
      } else if (ageDiff === 2) {
        return { 
          passed: true, 
          score: 0.7, 
          message: `Age ${age} is slightly unusual for grade ${grade}`,
          suggestion: 'Consider verifying student age'
        };
      } else {
        return { 
          passed: false, 
          score: 0.3, 
          message: `Age ${age} is unusual for grade ${grade} (expected ~${expectedAge})`,
          suggestion: 'Please verify the grade level and age are correct'
        };
      }
    }
  },
  {
    id: 'school_stage_grade_match',
    name: 'School Stage Grade Match',
    description: 'School stage should match grade level',
    severity: 'error',
    category: 'data_integrity',
    enabled: true,
    validate: (data) => {
      const grade = data.snapshotGrade as number;
      const stage = data.schoolStage as string;
      
      if (!stage) {
        return { passed: true, score: 0.5, message: 'School stage not provided' };
      }
      
      const stageGrades: Record<string, number[]> = {
        elementary: [1, 2, 3, 4, 5],
        middle: [6, 7, 8],
        high: [9, 10, 11, 12],
        high_school: [9, 10, 11, 12]
      };
      
      const validGrades = stageGrades[stage.toLowerCase()];
      if (!validGrades) {
        return { passed: true, score: 0.7, message: `Unknown school stage: ${stage}` };
      }
      
      if (validGrades.includes(grade)) {
        return { passed: true, score: 1 };
      }
      
      return {
        passed: false,
        score: 0,
        message: `Grade ${grade} does not match ${stage} school stage`,
        suggestion: `For ${stage} school, valid grades are: ${validGrades.join(', ')}`
      };
    }
  },
  {
    id: 'curriculum_recognized',
    name: 'Recognized Curriculum',
    description: 'Curriculum should be a recognized system',
    severity: 'warning',
    category: 'data_quality',
    enabled: true,
    validate: (data) => {
      const curriculum = data.currentCurriculum as string;
      if (!curriculum) {
        return { passed: false, score: 0, message: 'Curriculum is required' };
      }
      
      const recognized = [
        'common_core', 'cbse', 'icse', 'ib', 'igcse', 'british', 
        'state_board', 'nios', 'cambridge', 'edexcel', 'ap',
        'us', 'indian', 'uk', 'australian'
      ];
      
      const normalized = curriculum.toLowerCase().replace(/[^a-z]/g, '_');
      const isRecognized = recognized.some(r => normalized.includes(r));
      
      if (isRecognized) {
        return { passed: true, score: 1 };
      }
      
      return {
        passed: true,
        score: 0.6,
        message: `Curriculum '${curriculum}' is not a commonly recognized system`,
        suggestion: 'Analysis may be less accurate for unrecognized curricula'
      };
    }
  },
  {
    id: 'timeline_realistic',
    name: 'Realistic Timeline',
    description: 'Transition timeline should be realistic for the gaps',
    severity: 'warning',
    category: 'feasibility',
    enabled: true,
    validate: (data, context) => {
      const timeline = data.transitionTimeline as string;
      if (!timeline) {
        return { passed: true, score: 0.5 };
      }
      
      const timelineMonths: Record<string, number> = {
        '1month': 1, '2months': 2, '3months': 3,
        '6months': 6, '1year': 12, '2years': 24
      };
      
      const months = timelineMonths[timeline.replace(/\s/g, '')] || 6;
      const gradeLevel = context?.gradeLevel || 9;
      
      // Higher grades typically need more time
      const recommendedMin = gradeLevel > 8 ? 6 : 3;
      
      if (months < recommendedMin) {
        return {
          passed: true,
          score: 0.6,
          message: `${months} month timeline may be aggressive for grade ${gradeLevel}`,
          suggestion: `Consider at least ${recommendedMin} months for comprehensive bridging`
        };
      }
      
      return { passed: true, score: 1 };
    }
  },
  {
    id: 'subjects_coverage',
    name: 'Subject Coverage',
    description: 'Core subjects should be included for assessment',
    severity: 'warning',
    category: 'completeness',
    enabled: true,
    validate: (data) => {
      const subjects = data.academicPath as string[] || data.subjects as string[];
      const coreSubjects = ['math', 'science', 'english'];
      
      if (!subjects || subjects.length === 0) {
        return { 
          passed: true, 
          score: 0.5, 
          message: 'No subjects specified, will analyze core subjects',
          metadata: { defaultSubjects: ['math', 'science', 'english', 'social_studies'] }
        };
      }
      
      const normalizedSubjects = subjects.map(s => s.toLowerCase());
      const missingCore = coreSubjects.filter(c => 
        !normalizedSubjects.some(s => s.includes(c))
      );
      
      if (missingCore.length === 0) {
        return { passed: true, score: 1 };
      }
      
      return {
        passed: true,
        score: 0.7,
        message: `Core subjects not explicitly included: ${missingCore.join(', ')}`,
        suggestion: 'Consider including all core subjects for comprehensive analysis'
      };
    }
  },
  {
    id: 'location_consistency',
    name: 'Location Consistency',
    description: 'US location should have state specified',
    severity: 'warning',
    category: 'completeness',
    enabled: true,
    validate: (data) => {
      const location = data.snapshotLocation as string;
      const usState = data.usState as string;
      
      if (location?.toLowerCase() === 'us' && !usState) {
        return {
          passed: false,
          score: 0.5,
          message: 'US state not specified',
          suggestion: 'Specifying the US state improves curriculum accuracy'
        };
      }
      
      return { passed: true, score: 1 };
    }
  }
];

// =============================================================================
// Curriculum alignment heuristics removed — all gap data comes from RAG.
// The stubs below are dead code kept only for git history; never called.
// =============================================================================

type AlignmentHeuristic = { name: string; score: number; weight: number; details: string };
const _placeholder = {
  /**
   * Calculate curriculum system compatibility score
   */
  curriculumCompatibility(source: string, target: string): AlignmentHeuristic {
    const compatibilityMatrix: Record<string, Record<string, number>> = {
      'cbse': { 'common_core': 0.65, 'ib': 0.70, 'igcse': 0.75, 'british': 0.60 },
      'icse': { 'common_core': 0.70, 'ib': 0.75, 'igcse': 0.80, 'british': 0.75 },
      'ib': { 'common_core': 0.80, 'cbse': 0.70, 'icse': 0.75, 'igcse': 0.85 },
      'igcse': { 'common_core': 0.75, 'ib': 0.85, 'cbse': 0.70, 'icse': 0.75 },
      'state_board': { 'common_core': 0.55, 'cbse': 0.80, 'icse': 0.65 },
      'british': { 'common_core': 0.70, 'ib': 0.80, 'igcse': 0.85 }
    };
    
    const normalizedSource = source.toLowerCase().replace(/[^a-z]/g, '_');
    const normalizedTarget = target.toLowerCase().replace(/[^a-z]/g, '_');
    
    const score = compatibilityMatrix[normalizedSource]?.[normalizedTarget] || 0.50;
    
    return {
      name: 'curriculum_compatibility',
      score,
      weight: 0.25,
      details: `${source} → ${target} base compatibility: ${Math.round(score * 100)}%`
    };
  },

  /**
   * Calculate grade level difficulty adjustment
   */
  gradeLevelAdjustment(gradeLevel: number, source: string, target: string): AlignmentHeuristic {
    // Higher grades typically have larger gaps
    const gradeMultiplier = gradeLevel <= 5 ? 1.0 : gradeLevel <= 8 ? 0.9 : 0.8;
    
    // Some curricula are more advanced at certain levels
    const advancedCurricula = ['ib', 'igcse', 'icse'];
    const sourceAdvanced = advancedCurricula.includes(source.toLowerCase());
    const targetAdvanced = advancedCurricula.includes(target.toLowerCase());
    
    let adjustment = 0;
    if (sourceAdvanced && !targetAdvanced) {
      adjustment = 0.1; // Source is more advanced, easier transition
    } else if (!sourceAdvanced && targetAdvanced) {
      adjustment = -0.15; // Target is more advanced, harder transition
    }
    
    const score = Math.min(1, Math.max(0, gradeMultiplier + adjustment));
    
    return {
      name: 'grade_level_adjustment',
      score,
      weight: 0.15,
      details: `Grade ${gradeLevel} adjustment: ${sourceAdvanced ? 'advanced' : 'standard'} → ${targetAdvanced ? 'advanced' : 'standard'}`
    };
  },

  /**
   * Calculate subject-specific alignment factors
   */
  subjectAlignmentFactors(subjects: string[], source: string, target: string): AlignmentHeuristic {
    const subjectFactors: Record<string, Record<string, number>> = {
      math: {
        'cbse_common_core': 0.70,
        'icse_common_core': 0.75,
        'ib_common_core': 0.85,
        default: 0.65
      },
      science: {
        'cbse_common_core': 0.60,
        'icse_common_core': 0.70,
        'ib_common_core': 0.80,
        default: 0.60
      },
      english: {
        'cbse_common_core': 0.55,
        'icse_common_core': 0.70,
        'ib_common_core': 0.75,
        default: 0.60
      }
    };
    
    const key = `${source.toLowerCase()}_${target.toLowerCase()}`;
    let totalScore = 0;
    let count = 0;
    
    for (const subject of subjects) {
      const normalizedSubject = subject.toLowerCase();
      const factor = subjectFactors[normalizedSubject]?.[key] || 
                     subjectFactors[normalizedSubject]?.default || 
                     0.60;
      totalScore += factor;
      count++;
    }
    
    const score = count > 0 ? totalScore / count : 0.60;
    
    return {
      name: 'subject_alignment',
      score,
      weight: 0.30,
      details: `Subject-specific alignment for ${subjects.join(', ')}: ${Math.round(score * 100)}%`
    };
  },

  /**
   * Calculate timeline feasibility score
   */
  timelineFeasibility(timelineMonths: number, gapSeverity: number): AlignmentHeuristic {
    // Map gap severity to required months
    const requiredMonths = Math.ceil((1 - gapSeverity) * 12 + 3); // 3-15 months
    const ratio = timelineMonths / requiredMonths;
    
    let score: number;
    if (ratio >= 1.5) {
      score = 1.0; // Plenty of time
    } else if (ratio >= 1.0) {
      score = 0.9; // Adequate time
    } else if (ratio >= 0.75) {
      score = 0.7; // Tight but possible
    } else if (ratio >= 0.5) {
      score = 0.5; // Challenging
    } else {
      score = 0.3; // Very aggressive
    }
    
    return {
      name: 'timeline_feasibility',
      score,
      weight: 0.15,
      details: `${timelineMonths} months for estimated ${requiredMonths} required: ${score >= 0.7 ? 'feasible' : 'aggressive'}`
    };
  },

  /**
   * Calculate data completeness score
   */
  dataCompleteness(data: Record<string, unknown>): AlignmentHeuristic {
    const requiredFields = ['snapshotGrade', 'currentCurriculum'];
    const recommendedFields = ['schoolStage', 'snapshotLocation', 'targetGoal', 'transitionTimeline'];
    const optionalFields = ['academicPath', 'strongestSubjects', 'challengingAreas', 'languagesSpoken'];
    
    let requiredScore = 0;
    let recommendedScore = 0;
    let optionalScore = 0;
    
    for (const field of requiredFields) {
      if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
        requiredScore++;
      }
    }
    
    for (const field of recommendedFields) {
      if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
        recommendedScore++;
      }
    }
    
    for (const field of optionalFields) {
      const value = data[field];
      if (value !== undefined && value !== null && 
          (Array.isArray(value) ? value.length > 0 : value !== '')) {
        optionalScore++;
      }
    }
    
    const score = (requiredScore / requiredFields.length) * 0.5 +
                  (recommendedScore / recommendedFields.length) * 0.35 +
                  (optionalScore / optionalFields.length) * 0.15;
    
    return {
      name: 'data_completeness',
      score,
      weight: 0.15,
      details: `stub`
    };
  }
};
const AlignmentHeuristics = _placeholder;
void AlignmentHeuristics;

// =============================================================================
// MISSING DATA DETECTION
// =============================================================================

export function detectMissingData(data: Record<string, unknown>): MissingDataItem[] {
  const missing: MissingDataItem[] = [];
  
  const fieldConfig: Record<string, { importance: 'required' | 'recommended' | 'optional'; impact: string; default?: unknown }> = {
    snapshotGrade: { importance: 'required', impact: 'Cannot determine appropriate curriculum level' },
    currentCurriculum: { importance: 'required', impact: 'Cannot identify source curriculum gaps' },
    schoolStage: { importance: 'recommended', impact: 'May affect grade-level accuracy', default: 'high' },
    snapshotLocation: { importance: 'recommended', impact: 'Regional curriculum variations may be missed' },
    targetGoal: { importance: 'recommended', impact: 'Recommendations may be generic', default: 'US curriculum alignment' },
    transitionTimeline: { importance: 'recommended', impact: 'Pacing recommendations may not be optimal', default: '6months' },
    usState: { importance: 'optional', impact: 'State-specific standards not considered' },
    academicPath: { importance: 'optional', impact: 'All core subjects will be analyzed', default: ['math', 'science', 'english', 'social_studies'] },
    strongestSubjects: { importance: 'optional', impact: 'Cannot leverage existing strengths' },
    challengingAreas: { importance: 'optional', impact: 'Cannot prioritize areas needing most support' },
    languagesSpoken: { importance: 'optional', impact: 'Language support recommendations may be missed', default: ['English'] },
    snapshotAge: { importance: 'optional', impact: 'Age-appropriate recommendations not possible' }
  };
  
  for (const [field, config] of Object.entries(fieldConfig)) {
    const value = data[field];
    const isEmpty = value === undefined || value === null || 
                    (typeof value === 'string' && value.trim() === '') ||
                    (Array.isArray(value) && value.length === 0);
    
    if (isEmpty) {
      missing.push({
        field,
        importance: config.importance,
        impact: config.impact,
        defaultUsed: config.default
      });
    }
  }
  
  return missing;
}

// =============================================================================
// CONFIDENCE SCORING
// =============================================================================

export function calculateConfidence(
  validationScore: number,
  dataCompleteness: number,
  ruleResults: RuleResult[]
): { level: ConfidenceLevel; score: number; factors: string[] } {
  const factors: string[] = [];
  
  // Base score from validation
  let score = validationScore * 0.4;
  factors.push(`Validation: ${Math.round(validationScore * 100)}%`);
  
  // Data completeness factor
  score += dataCompleteness * 0.3;
  factors.push(`Data completeness: ${Math.round(dataCompleteness * 100)}%`);
  
  // Rule pass rate factor
  const passedRules = ruleResults.filter(r => r.passed).length;
  const rulePassRate = ruleResults.length > 0 ? passedRules / ruleResults.length : 0.5;
  score += rulePassRate * 0.2;
  factors.push(`Rules passed: ${passedRules}/${ruleResults.length}`);
  
  // Penalty for errors
  const errorCount = ruleResults.filter(r => !r.passed && r.score < 0.3).length;
  score -= errorCount * 0.1;
  if (errorCount > 0) {
    factors.push(`Errors: -${errorCount * 10}%`);
  }
  
  // Normalize score
  score = Math.min(1, Math.max(0, score));
  
  // Determine confidence level
  let level: ConfidenceLevel;
  if (score >= CONFIDENCE_THRESHOLDS.high) {
    level = 'high';
  } else if (score >= CONFIDENCE_THRESHOLDS.medium) {
    level = 'medium';
  } else if (score >= CONFIDENCE_THRESHOLDS.low) {
    level = 'low';
  } else {
    level = 'uncertain';
  }
  
  return { level, score, factors };
}

// =============================================================================
// MAIN VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validate student data with comprehensive rule checking
 */
export function validateStudentData(
  data: Record<string, unknown>,
  context?: ValidationContext
): ValidationResult {
  const startTime = performance.now();
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const ruleResults: RuleResult[] = [];
  
  // Run all enabled rules
  for (const rule of StudentDataRules) {
    if (!rule.enabled) continue;
    
    const result = rule.validate(data, context);
    ruleResults.push(result);
    
    if (!result.passed) {
      const issue: ValidationIssue = {
        code: rule.id,
        field: rule.id,
        message: result.message || rule.description,
        severity: rule.severity,
        suggestion: result.suggestion
      };
      
      if (rule.severity === 'error') {
        errors.push(issue);
      } else {
        warnings.push(issue);
      }
    }
  }
  
  // Detect missing data
  const missingData = detectMissingData(data);
  
  // Calculate scores
  const passedRules = ruleResults.filter(r => r.passed).length;
  const avgRuleScore = ruleResults.length > 0 
    ? ruleResults.reduce((sum, r) => sum + r.score, 0) / ruleResults.length 
    : 0;
  
  const dataCompletenessHeuristic = AlignmentHeuristics.dataCompleteness(data);
  
  const confidenceResult = calculateConfidence(
    avgRuleScore,
    dataCompletenessHeuristic.score,
    ruleResults
  );
  
  const processingTime = performance.now() - startTime;
  
  return {
    isValid: errors.length === 0,
    score: Math.round(avgRuleScore * 100) / 100,
    confidence: confidenceResult.level,
    confidenceScore: Math.round(confidenceResult.score * 100) / 100,
    errors,
    warnings,
    missingData,
    metadata: {
      rulesApplied: ruleResults.length,
      rulesPassed: passedRules,
      rulesFailed: ruleResults.length - passedRules,
      processingTimeMs: Math.round(processingTime * 100) / 100,
      validatorVersion: VALIDATOR_VERSION
    }
  };
}

// =============================================================================
// Deprecated hard-coded helpers below this point — kept as stubs, not called.
// =============================================================================

function _validateCurriculumAlignment_REMOVED(
  data: Record<string, unknown>,
  sourceCurriculum: string,
  targetCurriculum: string,
  gradeLevel: number,
  subjects: string[] = ['math', 'science', 'english']
): ValidationResult {
  const startTime = performance.now();
  
  // First, validate the input data
  const baseValidation = validateStudentData(data, {
    gradeLevel,
    sourceCurriculum,
    targetCurriculum,
    subjects
  });
  
  // Calculate alignment heuristics
  const heuristics: AlignmentHeuristic[] = [
    AlignmentHeuristics.curriculumCompatibility(sourceCurriculum, targetCurriculum),
    AlignmentHeuristics.gradeLevelAdjustment(gradeLevel, sourceCurriculum, targetCurriculum),
    AlignmentHeuristics.subjectAlignmentFactors(subjects, sourceCurriculum, targetCurriculum),
    AlignmentHeuristics.dataCompleteness(data)
  ];
  
  // Add timeline heuristic if available
  const timeline = data.transitionTimeline as string;
  if (timeline) {
    const timelineMonths: Record<string, number> = {
      '1month': 1, '2months': 2, '3months': 3,
      '6months': 6, '1year': 12, '2years': 24
    };
    const months = timelineMonths[timeline.replace(/\s/g, '')] || 6;
    const preliminaryScore = heuristics.reduce((sum, h) => sum + h.score * h.weight, 0);
    heuristics.push(AlignmentHeuristics.timelineFeasibility(months, preliminaryScore));
  }
  
  // Calculate weighted alignment score
  const totalWeight = heuristics.reduce((sum, h) => sum + h.weight, 0);
  const alignmentScore = totalWeight > 0
    ? heuristics.reduce((sum, h) => sum + h.score * h.weight, 0) / totalWeight
    : 0.5;
  
  // Detect missing topics based on alignment
  const missingTopics: string[] = [];
  const coverage = { source: 0, target: 0, overlap: 0 };
  
  // Recalculate confidence with alignment data
  const confidenceFactors = [
    baseValidation.score,
    alignmentScore,
    coverage.overlap / 100
  ];
  const avgConfidenceFactor = confidenceFactors.reduce((a, b) => a + b, 0) / confidenceFactors.length;
  
  let confidenceLevel: ConfidenceLevel;
  if (avgConfidenceFactor >= 0.8 && baseValidation.missingData.filter(m => m.importance === 'required').length === 0) {
    confidenceLevel = 'high';
  } else if (avgConfidenceFactor >= 0.6) {
    confidenceLevel = 'medium';
  } else if (avgConfidenceFactor >= 0.4) {
    confidenceLevel = 'low';
  } else {
    confidenceLevel = 'uncertain';
  }
  
  const processingTime = performance.now() - startTime;
  
  return {
    ...baseValidation,
    metadata: {
      ...baseValidation.metadata,
      processingTimeMs: Math.round(processingTime * 100) / 100
    }
  };
}

function _detectMissingTopics_REMOVED(
  source: string,
  target: string,
  subjects: string[]
): string[] {
  // Topic gaps based on common curriculum differences
  const topicGaps: Record<string, Record<string, string[]>> = {
    'cbse_common_core': {
      math: ['Statistics & Probability depth', 'Data Analysis', 'Mathematical Modeling'],
      science: ['Lab Methodology', 'Scientific Inquiry Process', 'Environmental Science'],
      english: ['Argumentative Writing', 'Research Skills', 'Media Literacy']
    },
    'icse_common_core': {
      math: ['Applied Statistics', 'Real-world Problem Solving'],
      science: ['Integrated Science Approach', 'Engineering Design'],
      english: ['Academic Writing Conventions', 'Citation Standards']
    },
    'state_board_common_core': {
      math: ['Algebraic Reasoning depth', 'Geometry Proofs', 'Statistics'],
      science: ['Lab Skills', 'Scientific Method', 'Technology Integration'],
      english: ['Critical Analysis', 'Research Writing', 'Digital Literacy']
    }
  };
  
  const key = `${source.toLowerCase()}_${target.toLowerCase()}`;
  const gaps: string[] = [];
  
  for (const subject of subjects) {
    const subjectGaps = topicGaps[key]?.[subject.toLowerCase()] || [];
    gaps.push(...subjectGaps);
  }
  
  // Add generic gaps if no specific ones found
  if (gaps.length === 0) {
    gaps.push('Assessment Strategy Alignment', 'Pedagogical Approach Differences');
  }
  
  return gaps.slice(0, 10); // Limit to top 10
}

function _calculateCoverage_REMOVED(
  source: string,
  target: string,
  alignmentScore: number
): { source: number; target: number; overlap: number } {
  // Estimate coverage based on curriculum characteristics
  const curriculumDepth: Record<string, number> = {
    'ib': 95,
    'igcse': 90,
    'icse': 85,
    'cbse': 80,
    'common_core': 85,
    'british': 88,
    'state_board': 70
  };
  
  const sourceDepth = curriculumDepth[source.toLowerCase()] || 75;
  const targetDepth = curriculumDepth[target.toLowerCase()] || 80;
  const overlap = Math.round(alignmentScore * Math.min(sourceDepth, targetDepth));
  
  return {
    source: sourceDepth,
    target: targetDepth,
    overlap
  };
}

/**
 * Create a summary for API consumers.
 * alignment_score is always null here — it is set by the RAG pipeline downstream.
 */
export function createValidationSummary(result: ValidationResult): {
  alignment_score: number | null;
  confidence: ConfidenceLevel;
  missing_topics: string[];
  is_valid: boolean;
  error_count: number;
  warning_count: number;
} {
  return {
    alignment_score: null,
    confidence: result.confidence,
    missing_topics: [],
    is_valid: result.isValid,
    error_count: result.errors.length,
    warning_count: result.warnings.length
  };
}
