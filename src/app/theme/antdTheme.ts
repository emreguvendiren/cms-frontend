import type { ThemeConfig } from "antd";

import { palette } from "./palette";

export const antdTheme: ThemeConfig = {
  cssVar: {
    key: "app-theme",
  },

  token: {
    colorPrimary: palette.brand.primary,
    colorInfo: palette.semantic.info,
    colorSuccess: palette.semantic.success,
    colorWarning: palette.semantic.warning,
    colorError: palette.semantic.error,
    colorLink: palette.brand.primary,

    colorText: palette.neutral[900],
    colorTextSecondary: palette.neutral[600],
    colorTextTertiary: palette.neutral[500],

    colorBgBase: palette.neutral.white,
    colorBgLayout: palette.neutral[50],
    colorBgContainer: palette.neutral.white,
    colorBgElevated: palette.neutral.white,
    colorFillSecondary: palette.neutral[100],

    colorBorder: palette.neutral[200],
    colorBorderSecondary: palette.neutral[100],

    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 6,

    controlHeight: 40,
    controlHeightLG: 48,
    controlHeightSM: 32,

    fontSize: 14,
    fontSizeLG: 16,
    fontSizeSM: 12,

    fontFamily: [
      "Inter",
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "Roboto",
      '"Helvetica Neue"',
      "Arial",
      "sans-serif",
    ].join(", "),

    wireframe: false,
  },

  components: {
    Button: {
      primaryShadow: "none",
      fontWeight: 600,
    },

    Card: {
      headerFontSize: 16,
    },

    Table: {
      headerBg: palette.neutral[50],
      headerColor: palette.neutral[700],
      rowHoverBg: palette.neutral[50],
      borderColor: palette.neutral[200],
    },

    Menu: {
      itemSelectedBg: palette.brand.focus,
      itemSelectedColor: palette.brand.primary,
      itemHoverBg: palette.neutral[100],
    },

    Layout: {
      bodyBg: palette.neutral[50],
      headerBg: palette.neutral.white,
      siderBg: palette.neutral[900],
    },

    Input: {
      activeBorderColor: palette.brand.primary,
      hoverBorderColor: palette.brand.primary,
      activeShadow: `0 0 0 3px ${palette.brand.focus}`,
    },

    Select: {
      activeBorderColor: palette.brand.primary,
      hoverBorderColor: palette.brand.primary,
    },
  },
};
