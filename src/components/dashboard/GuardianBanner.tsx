import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";

interface GuardianBannerProps {
  studentName: string;
}

const GuardianBanner = ({ studentName }: GuardianBannerProps) => {
  return (
    <div className="bg-primary/10 border border-primary/20 rounded-lg px-4 py-3 flex items-center justify-center gap-3">
      <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
      <span className="text-sm font-medium">
        Viewing as Guardian for <span className="text-primary font-semibold">{studentName}</span>
      </span>
      <Badge variant="outline" className="text-xs border-primary/30 text-primary">
        Read-Only
      </Badge>
    </div>
  );
};

export default GuardianBanner;
