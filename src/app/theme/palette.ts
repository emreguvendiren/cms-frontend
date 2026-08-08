export const palette = {
  brand: {
    primary: "#0F766E",
    primaryHover: "#115E59",
    primaryActive: "#134E4A",
    focus: "#CCFBF1",
    accent: "#9A6700",
  },

  neutral: {
    white: "#FFFFFF",
    50: "#F8FAFC",
    100: "#F1F5F9",
    200: "#E2E8F0",
    300: "#CBD5E1",
    400: "#94A3B8",
    500: "#64748B",
    600: "#475569",
    700: "#334155",
    800: "#1E293B",
    900: "#0F172A",
  },

  semantic: {
    success: "#15803D",
    warning: "#B45309",
    error: "#B42318",
    info: "#0F766E",
  },

  dataVisualization: [
    "#0F766E",
    "#2563EB",
    "#9A6700",
    "#B42318",
    "#7C3AED",
    "#0E7490",
  ],
} as const;

export type AppPalette = typeof palette;
