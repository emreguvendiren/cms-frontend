import { theme } from "antd";

export function useAppTheme() {
  const { token } = theme.useToken();

  return {
    colors: {
      primary: token.colorPrimary,
      success: token.colorSuccess,
      warning: token.colorWarning,
      error: token.colorError,

      text: token.colorText,
      textSecondary: token.colorTextSecondary,

      background: token.colorBgLayout,
      surface: token.colorBgContainer,
      border: token.colorBorder,
    },

    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
    },

    radius: {
      default: token.borderRadius,
      large: token.borderRadiusLG,
    },
  } as const;
}