import type { GlobiculumIconProps } from "./types";
import Icon3DImage from "./Icon3DImage";
import src from "@/assets/icons-3d/profile.png";

// Profile / About You — soft-3D avatar bust (violet duotone), sourced from
// the 3dicons.co open-license library, recolored to brand.
const GlobiculumStudentIcon = ({ size, className }: GlobiculumIconProps) => (
  <Icon3DImage src={src} size={size} className={className} />
);

export default GlobiculumStudentIcon;
