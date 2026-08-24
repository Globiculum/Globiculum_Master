import type { GlobiculumIconProps } from "./types";
import Icon3DImage from "./Icon3DImage";
import src from "@/assets/icons-3d/location.png";

// State / Region — soft-3D location marker (teal duotone), sourced from
// the 3dicons.co open-license library, recolored to brand.
const GlobiculumLocationIcon = ({ size, className }: GlobiculumIconProps) => (
  <Icon3DImage src={src} size={size} className={className} />
);

export default GlobiculumLocationIcon;
