import type { JSX, ReactNode } from "react";
import CheckCircleOutlined from "@ant-design/icons/CheckCircleOutlined";
import CloseCircleOutlined from "@ant-design/icons/CloseCircleOutlined";
import ExclamationCircleOutlined from "@ant-design/icons/ExclamationCircleOutlined";
import InfoCircleOutlined from "@ant-design/icons/InfoCircleOutlined";

import "./statusLine.css";

type StatusLineTone = "error" | "warning" | "info" | "success";

const icons: Record<StatusLineTone, JSX.Element> = {
  error: <CloseCircleOutlined />,
  warning: <ExclamationCircleOutlined />,
  info: <InfoCircleOutlined />,
  success: <CheckCircleOutlined />,
};

export function StatusLine({ tone, title, description, action }: { tone: StatusLineTone; title: ReactNode; description?: ReactNode; action?: ReactNode }): JSX.Element {
  return <div className={`status-line status-line--${tone}`} role={tone === "error" ? "alert" : "status"}>
    <span className="status-line__icon" aria-hidden="true">{icons[tone]}</span>
    <span className="status-line__content"><strong>{title}</strong>{description && <span>{description}</span>}</span>
    {action && <span className="status-line__action">{action}</span>}
  </div>;
}
