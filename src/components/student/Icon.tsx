import { type SVGAttributes } from "react";
import { type LucideIcon } from "lucide-react";
import { T } from "../../data/constants";

export function Icon({
  as: As,
  size = 18,
  color = T.ink2,
  strokeWidth = 1.5,
  ...rest
}: {
  as: LucideIcon;
  size?: number;
  color?: string;
  strokeWidth?: number;
} & SVGAttributes<SVGSVGElement>) {
  return <As size={size} color={color} strokeWidth={strokeWidth} aria-hidden="true" {...rest} />;
}
