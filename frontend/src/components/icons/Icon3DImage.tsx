// Shared renderer for the soft-3D raster icon family (frontend/src/assets/icons-3d/).
// These are pre-recolored PNGs (brand-duotone baked in at build time, since a
// photoreal 3D render has no dynamic fill to recolor at runtime the way the
// old inline-SVG icons did) — so unlike GlobiculumIconProps' color knobs,
// only size/className apply here.
interface Icon3DImageProps {
  src: string;
  size?: number;
  className?: string;
}

const Icon3DImage = ({ src, size = 24, className }: Icon3DImageProps) => (
  <img
    src={src}
    width={size}
    height={size}
    style={{ width: size, height: size, objectFit: "contain" }}
    className={className}
    alt=""
    aria-hidden="true"
    draggable={false}
  />
);

export default Icon3DImage;
