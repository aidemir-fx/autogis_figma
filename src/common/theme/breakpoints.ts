export type Breakpoint = "xxs" | "xs" | "sm" | "md" | "lg" | "xl";
export type BreakpointDirection = "up" | "down";

export const BREAKPOINTS: Record<Breakpoint, number> = {
  xxs: 320,
  xs: 375,
  sm: 412,
  md: 768,
  lg: 1280,
  xl: 1920,
};

const mediaQueryCss = (
  direction: BreakpointDirection,
  breakpoint: Breakpoint,
) => {
  const size = BREAKPOINTS[breakpoint];

  if (direction === "up") {
    return `@media (min-width: ${size}px)`;
  }

  return `@media (max-width: ${size - 1}px)`;
};

export const mediaQuery = (
  direction: BreakpointDirection,
  breakpoint: Breakpoint,
) => {
  const size = BREAKPOINTS[breakpoint];

  if (direction === "up") {
    return `(min-width: ${size}px)`;
  }

  return `(max-width: ${size - 1}px)`;
};

export const breakpoints = {
  up: (breakpoint: Breakpoint) => mediaQueryCss("up", breakpoint),
  down: (breakpoint: Breakpoint) => mediaQueryCss("down", breakpoint),
};
