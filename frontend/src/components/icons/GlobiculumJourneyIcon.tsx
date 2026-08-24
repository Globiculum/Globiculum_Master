import type { GlobiculumIconProps } from "./types";
import Icon3DImage from "./Icon3DImage";
import src from "@/assets/icons-3d/academic-path.png";

// Begin Journey / Academic Path — soft-3D travel case (violet duotone),
// sourced from the 3dicons.co open-license library, recolored to brand.
const GlobiculumJourneyIcon = ({ size, className }: GlobiculumIconProps) => (
  <Icon3DImage src={src} size={size} className={className} />
);

export default GlobiculumJourneyIcon;
