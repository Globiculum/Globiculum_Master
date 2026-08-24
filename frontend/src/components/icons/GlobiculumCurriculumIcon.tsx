import type { GlobiculumIconProps } from "./types";
import Icon3DImage from "./Icon3DImage";
import src from "@/assets/icons-3d/curriculum.png";

// Curriculum / Subjects — soft-3D bookmark (teal duotone), sourced from
// the 3dicons.co open-license library, recolored to brand.
const GlobiculumCurriculumIcon = ({ size, className }: GlobiculumIconProps) => (
  <Icon3DImage src={src} size={size} className={className} />
);

export default GlobiculumCurriculumIcon;
