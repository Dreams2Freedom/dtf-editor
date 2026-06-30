import { useId } from 'react';

/**
 * DTF Editor mountain-badge artwork as inline SVG (circular emblem).
 * Shared by the toolkit preview panels so the badge can be blurred,
 * placed on transparency, or annotated with vector nodes — crisp on retina.
 *
 * - `frame`        adds the rounded-square outer frame (off by default).
 * - `transparent`  leaves the circle interior unfilled so the panel
 *                  background (blue / checkerboard) shows through.
 */
export function MountainBadge({
  frame = false,
  transparent = false,
  className,
  style,
}: {
  frame?: boolean;
  transparent?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const clip = `mb-${useId().replace(/:/g, '')}`;
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className} style={style} aria-hidden="true">
      {frame && (
        <rect x="6" y="6" width="88" height="88" rx="20" fill="#fff" stroke="#15294d" strokeWidth="5" />
      )}
      <circle cx="50" cy="50" r="33" fill={transparent ? 'none' : '#fff'} stroke="#15294d" strokeWidth="3.5" />
      <clipPath id={clip}>
        <circle cx="50" cy="50" r="31.5" />
      </clipPath>
      <g clipPath={`url(#${clip})`}>
        <circle cx="64" cy="36" r="10" fill="#ee8a1e" />
        <rect x="15" y="64" width="70" height="22" fill="#15294d" />
        <path d="M18 70 L40 41 L62 70 Z" fill="#15294d" />
        <path d="M47 70 L64 49 L83 70 Z" fill="#15294d" />
        <path d="M34 52 L40 41 L46 52 L42.5 49 L40 52.5 L37.5 49 Z" fill="#fff" />
        <path d="M56 57 L64 49 L72 57 L68.5 54.5 L65 57.5 L61.5 54.5 Z" fill="#fff" />
        <rect x="31" y="71" width="38" height="2.6" rx="1.3" fill="#fff" />
        <rect x="27" y="76" width="46" height="2.6" rx="1.3" fill="#fff" />
        <rect x="33" y="81" width="34" height="2.6" rx="1.3" fill="#fff" />
      </g>
    </svg>
  );
}

/** Orange vector control-points overlaid on the badge for the "vector" preview. */
export function BadgeNodes({ className }: { className?: string }) {
  const pts: Array<[number, number]> = [
    [40, 41],
    [64, 49],
    [18, 70],
    [48, 70],
    [62, 70],
    [83, 70],
    [50, 17],
    [83, 50],
    [50, 83],
    [17, 50],
  ];
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className} aria-hidden="true">
      <path
        d="M18 70 L40 41 L62 70 M47 70 L64 49 L83 70"
        stroke="#013193"
        strokeWidth="1.1"
        strokeDasharray="2.5 2.5"
        opacity="0.6"
      />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.1" fill="#ee8a1e" stroke="#fff" strokeWidth="1" />
      ))}
    </svg>
  );
}
