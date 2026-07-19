// State-aware math course configurations for High School
// Extensible structure for adding more states in the future

export interface MathCourse {
  value: string;
  label: string;
  level?: 'standard' | 'honors' | 'advanced' | 'tag';
}

export interface StateMathConfig {
  stateName: string;
  courses: MathCourse[];
  hasLevelOptions: boolean;
}

// Texas-aligned Math pathways
export const texasMathCourses: MathCourse[] = [
  { value: "algebra-1", label: "Algebra I", level: "standard" },
  { value: "algebra-1-double", label: "Algebra I (Double-Blocked / Placement-Based)", level: "standard" },
  { value: "geometry", label: "Geometry", level: "standard" },
  { value: "geometry-advanced", label: "Geometry Advanced", level: "advanced" },
  { value: "geometry-tag", label: "Geometry Advanced TAG", level: "tag" },
  { value: "algebra-2", label: "Algebra II", level: "standard" },
  { value: "algebra-2-advanced", label: "Algebra II Advanced", level: "advanced" },
  { value: "algebra-2-tag", label: "Algebra II Advanced TAG", level: "tag" },
  { value: "precalculus", label: "Pre-Calculus", level: "standard" },
  { value: "precalculus-ap", label: "Pre-Calculus Advanced / AP", level: "advanced" },
  { value: "calculus-ab", label: "AP Calculus AB", level: "advanced" },
  { value: "calculus-bc", label: "AP Calculus BC", level: "advanced" },
  { value: "statistics", label: "Statistics", level: "standard" },
  { value: "ap-statistics", label: "AP Statistics", level: "advanced" },
];

// Florida B.E.S.T aligned Math progression
export const floridaMathCourses: MathCourse[] = [
  { value: "algebra-1", label: "Algebra I", level: "standard" },
  { value: "algebra-1-honors", label: "Algebra I Honors", level: "honors" },
  { value: "geometry", label: "Geometry", level: "standard" },
  { value: "geometry-honors", label: "Geometry Honors", level: "honors" },
  { value: "algebra-2", label: "Algebra II", level: "standard" },
  { value: "algebra-2-honors", label: "Algebra II Honors", level: "honors" },
  { value: "precalculus", label: "Pre-Calculus", level: "standard" },
  { value: "precalculus-honors", label: "Pre-Calculus Honors", level: "honors" },
  { value: "calculus-ab", label: "AP Calculus AB", level: "advanced" },
  { value: "calculus-bc", label: "AP Calculus BC", level: "advanced" },
  { value: "statistics", label: "Statistics", level: "standard" },
  { value: "ap-statistics", label: "AP Statistics", level: "advanced" },
  { value: "financial-algebra", label: "Financial Algebra", level: "standard" },
];

// Generic US Common Core Math flow (non-state-specific)
export const commonCoreMathCourses: MathCourse[] = [
  { value: "algebra-1", label: "Algebra I", level: "standard" },
  { value: "algebra-1-honors", label: "Algebra I Honors", level: "honors" },
  { value: "geometry", label: "Geometry", level: "standard" },
  { value: "geometry-honors", label: "Geometry Honors", level: "honors" },
  { value: "algebra-2", label: "Algebra II", level: "standard" },
  { value: "algebra-2-honors", label: "Algebra II Honors", level: "honors" },
  { value: "precalculus", label: "Pre-Calculus", level: "standard" },
  { value: "precalculus-honors", label: "Pre-Calculus Honors", level: "honors" },
  { value: "calculus", label: "Calculus", level: "standard" },
  { value: "ap-calculus-ab", label: "AP Calculus AB", level: "advanced" },
  { value: "ap-calculus-bc", label: "AP Calculus BC", level: "advanced" },
  { value: "integrated-math-1", label: "Integrated Math I", level: "standard" },
  { value: "integrated-math-2", label: "Integrated Math II", level: "standard" },
  { value: "integrated-math-3", label: "Integrated Math III", level: "standard" },
  { value: "statistics", label: "Statistics", level: "standard" },
  { value: "ap-statistics", label: "AP Statistics", level: "advanced" },
];

// Program levels for state-specific options
export const programLevels = [
  { value: "standard", label: "Standard" },
  { value: "honors", label: "Honors" },
  { value: "advanced", label: "Advanced" },
  { value: "tag", label: "TAG / Magnet" },
];

// Get math courses based on state and curriculum
export function getMathCourses(state: string, curriculum: string): MathCourse[] {
  // State-specific standards take priority
  if (curriculum.includes('texas') || state === 'TX') {
    return texasMathCourses;
  }
  if (curriculum.includes('florida') || state === 'FL') {
    return floridaMathCourses;
  }
  // Default to common core for all other cases
  return commonCoreMathCourses;
}

// Check if state-aware logic should apply
export function shouldApplyStateLogic(
  schoolStage: string,
  previousLocation: string,
  curriculum: string,
  usState: string
): boolean {
  // State-aware logic only for High School
  if (schoolStage !== 'high') return false;
  
  // Only for US-educated students
  if (previousLocation !== 'us') return false;
  
  // Only for state-specific or common core curricula
  const stateSpecificCurricula = [
    'texas-teks', 'florida-best', 'virginia-sol', 'ny-nextgen',
    'us-common-core', 'state-specific'
  ];
  if (!stateSpecificCurricula.some(c => curriculum.includes(c) || curriculum === c)) return false;
  
  // State must be selected
  if (!usState || usState === 'other') return false;
  
  return true;
}

// Get state display name
export function getStateDisplayName(stateCode: string): string {
  const stateNames: Record<string, string> = {
    'TX': 'Texas',
    'FL': 'Florida',
    'CA': 'California',
    'NY': 'New York',
    'VA': 'Virginia',
  };
  return stateNames[stateCode] || stateCode;
}
