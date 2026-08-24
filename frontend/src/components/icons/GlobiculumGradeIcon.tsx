import type { GlobiculumIconProps } from "./types";
import Icon3DImage from "./Icon3DImage";
import src from "@/assets/icons-3d/grade.png";

// Grade / Academic level — soft-3D star (amber duotone), sourced from
// the 3dicons.co open-license library, recolored to brand.
const GlobiculumGradeIcon = ({ size, className }: GlobiculumIconProps) => (
  <Icon3DImage src={src} size={size} className={className} />
);

export default GlobiculumGradeIcon;
