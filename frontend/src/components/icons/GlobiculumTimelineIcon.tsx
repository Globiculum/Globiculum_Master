import type { GlobiculumIconProps } from "./types";
import Icon3DImage from "./Icon3DImage";
import src from "@/assets/icons-3d/timeline.png";

// Timeline / Transition — soft-3D calendar (teal duotone), sourced from
// the 3dicons.co open-license library, recolored to brand.
const GlobiculumTimelineIcon = ({ size, className }: GlobiculumIconProps) => (
  <Icon3DImage src={src} size={size} className={className} />
);

export default GlobiculumTimelineIcon;
