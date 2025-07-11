import NumberFlow from "@number-flow/react";
import { cn } from "@/lib/utils";

interface AnimatedNumberProps {
  value: number;
  className?: string;
  format?: { notation?: "standard" | "compact" };
  style?: React.CSSProperties;
  willChange?: boolean;
  transformTiming?: {
    duration?: number;
    easing?: string;
  };
}

const DEFAULT_FORMAT = {};
const DEFAULT_TRANSFORM_TIMING = {
  duration: 600,
  easing: "cubic-bezier(0.23, 1, 0.320, 1)",
};

export function AnimatedNumber({
  value,
  className,
  format = DEFAULT_FORMAT,
  style,
  willChange = true,
  transformTiming = DEFAULT_TRANSFORM_TIMING,
  ...props
}: AnimatedNumberProps) {
  return (
    <NumberFlow
      value={value}
      format={format}
      className={cn("tabular-nums", className)}
      style={style}
      willChange={willChange}
      transformTiming={transformTiming}
      {...props}
    />
  );
}
