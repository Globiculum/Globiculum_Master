import type { GlobiculumIconProps } from "./types";
import Icon3DImage from "./Icon3DImage";
import src from "@/assets/icons-3d/target.png";

// Target board / Goal — soft-3D target (amber duotone), sourced from
// the 3dicons.co open-license library, recolored to brand.
const GlobiculumTargetIcon = ({ size, className }: GlobiculumIconProps) => (
  <Icon3DImage src={src} size={size} className={className} />
);

export default GlobiculumTargetIcon;
