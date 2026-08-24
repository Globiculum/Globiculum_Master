import type { GlobiculumIconProps } from "./types";
import Icon3DImage from "./Icon3DImage";
import src from "@/assets/icons-3d/edit.png";

// Other / Specify / Edit — soft-3D pencil (teal duotone), sourced from
// the 3dicons.co open-license library, recolored to brand.
const GlobiculumPencilIcon = ({ size, className }: GlobiculumIconProps) => (
  <Icon3DImage src={src} size={size} className={className} />
);

export default GlobiculumPencilIcon;
