import { useMemo } from "react";
import { Progress } from "@/components/ui/progress";
import { Check, X } from "lucide-react";

interface PasswordStrengthIndicatorProps {
  password: string;
}

interface PasswordRequirement {
  label: string;
  met: boolean;
}

export const PasswordStrengthIndicator = ({ password }: PasswordStrengthIndicatorProps) => {
  const requirements = useMemo((): PasswordRequirement[] => {
    return [
      { label: "At least 8 characters", met: password.length >= 8 },
      { label: "Contains uppercase letter", met: /[A-Z]/.test(password) },
      { label: "Contains lowercase letter", met: /[a-z]/.test(password) },
      { label: "Contains number", met: /[0-9]/.test(password) },
      { label: "Contains special character", met: /[^A-Za-z0-9]/.test(password) },
    ];
  }, [password]);

  const strength = useMemo(() => {
    const metCount = requirements.filter(r => r.met).length;
    return (metCount / requirements.length) * 100;
  }, [requirements]);

  const getStrengthLabel = () => {
    if (strength === 0) return "";
    if (strength <= 40) return "Weak";
    if (strength <= 60) return "Fair";
    if (strength <= 80) return "Good";
    return "Strong";
  };

  const getStrengthColor = () => {
    if (strength <= 40) return "bg-destructive";
    if (strength <= 60) return "bg-warning";
    if (strength <= 80) return "bg-primary";
    return "bg-success";
  };

  if (password.length === 0) return null;

  return (
    <div className="space-y-2 mt-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Password Strength:</span>
        <span className={`font-medium ${
          strength <= 40 ? "text-destructive" :
          strength <= 60 ? "text-warning" :
          strength <= 80 ? "text-primary" :
          "text-success"
        }`}>
          {getStrengthLabel()}
        </span>
      </div>
      <Progress value={strength} className="h-2">
        <div className={`h-full transition-all ${getStrengthColor()}`} style={{ width: `${strength}%` }} />
      </Progress>
      <ul className="space-y-1 text-xs">
        {requirements.map((req, index) => (
          <li key={index} className="flex items-center gap-2">
            {req.met ? (
              <Check className="h-3 w-3 text-success flex-shrink-0" aria-hidden="true" />
            ) : (
              <X className="h-3 w-3 text-muted-foreground flex-shrink-0" aria-hidden="true" />
            )}
            <span className={req.met ? "text-success" : "text-muted-foreground"}>
              {req.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
