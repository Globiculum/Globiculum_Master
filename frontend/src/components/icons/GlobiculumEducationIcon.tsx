import type { GlobiculumIconProps } from "./types";
import Icon3DImage from "./Icon3DImage";
import src from "@/assets/icons-3d/education-history.png";

// Education History — soft-3D folder (teal duotone), sourced from
// the 3dicons.co open-license library, recolored to brand.
const GlobiculumEducationIcon = ({ size, className }: GlobiculumIconProps) => (
  <Icon3DImage src={src} size={size} className={className} />
);

export default GlobiculumEducationIcon;
