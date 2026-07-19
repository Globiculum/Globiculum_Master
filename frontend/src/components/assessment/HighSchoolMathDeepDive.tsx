import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  getMathCourses, 
  programLevels, 
  getStateDisplayName,
  type MathCourse 
} from "./StateAwareMathCourses";

interface HighSchoolMathDeepDiveProps {
  usState: string;
  curriculum: string;
  selectedCourse: string;
  programLevel: string;
  onCourseChange: (course: string) => void;
  onLevelChange: (level: string) => void;
}

export function HighSchoolMathDeepDive({
  usState,
  curriculum,
  selectedCourse,
  programLevel,
  onCourseChange,
  onLevelChange,
}: HighSchoolMathDeepDiveProps) {
  const mathCourses = getMathCourses(usState, curriculum);
  const stateName = getStateDisplayName(usState);
  const isStateSpecific = usState === 'TX' || usState === 'FL';
  
  return (
    <div className="space-y-6 p-6 rounded-2xl border-2 border-secondary/20 bg-secondary/5 shadow-soft">
      <div>
        <h4 className="font-semibold text-lg flex items-center gap-2">
          <span className="text-2xl">📐</span>
          Math Deep-Dive
          {isStateSpecific && (
            <span className="text-sm font-normal text-muted-foreground">
              ({stateName}-aligned)
            </span>
          )}
        </h4>
        <p className="text-sm text-muted-foreground mt-1">
          Course names vary by state. Select the closest match.
        </p>
      </div>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="math-course">Current Math Course</Label>
          <Select value={selectedCourse} onValueChange={onCourseChange}>
            <SelectTrigger id="math-course" className="mt-2">
              <SelectValue placeholder="Select your math course" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {mathCourses.map((course: MathCourse) => (
                <SelectItem key={course.value} value={course.value}>
                  <span className="flex items-center gap-2">
                    {course.label}
                    {course.level && course.level !== 'standard' && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        course.level === 'honors' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                        course.level === 'advanced' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                        course.level === 'tag' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {course.level.toUpperCase()}
                      </span>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="program-level">Program Level (optional)</Label>
          <Select value={programLevel} onValueChange={onLevelChange}>
            <SelectTrigger id="program-level" className="mt-2">
              <SelectValue placeholder="Select program level" />
            </SelectTrigger>
            <SelectContent>
              {programLevels.map((level) => (
                <SelectItem key={level.value} value={level.value}>
                  {level.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
