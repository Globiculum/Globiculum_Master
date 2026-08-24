import type { GlobiculumIconProps } from "./types";
import Icon3DImage from "./Icon3DImage";
import src from "@/assets/icons-3d/wrapup.png";

// "Your summary is ready" / Wrap-up — soft-3D checkmark (teal duotone),
// sourced from the 3dicons.co open-license library, recolored to brand.
// Also covers "Learning Profile" and "Academic Path" flashcard summaries
// wherever this component is already reused for those concepts.
const GlobiculumChecklistIcon = ({ size, className }: GlobiculumIconProps) => (
  <Icon3DImage src={src} size={size} className={className} />
);

export default GlobiculumChecklistIcon;
