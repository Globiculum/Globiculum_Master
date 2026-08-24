import type { GlobiculumIconProps } from "./types";
import Icon3DImage from "./Icon3DImage";
import src from "@/assets/icons-3d/overall-performance.png";

// Completion / Success / Overall Performance — soft-3D trophy (amber
// duotone), sourced from the 3dicons.co open-license library, recolored
// to brand. Also covers "Overall Performance" wherever this component is
// already reused for that concept.
const GlobiculumSuccessIcon = ({ size, className }: GlobiculumIconProps) => (
  <Icon3DImage src={src} size={size} className={className} />
);

export default GlobiculumSuccessIcon;
