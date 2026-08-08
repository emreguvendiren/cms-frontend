import type { JSX, PropsWithChildren } from "react";

import { App as AntdApp, ConfigProvider } from "antd";
import trTR from "antd/locale/tr_TR";

import { antdTheme } from "../theme/antdTheme";

export function AppProviders({
  children,
}: PropsWithChildren): JSX.Element {
  return (
    <ConfigProvider locale={trTR} theme={antdTheme}>
      <AntdApp>{children}</AntdApp>
    </ConfigProvider>
  );
}
