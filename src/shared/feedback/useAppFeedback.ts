import { App } from "antd";

type FeedbackContent = {
  title: string;
  description: string;
  key?: string;
};

export function useAppFeedback() {
  const { message, notification } = App.useApp();

  return {
    error({ title, description, key }: FeedbackContent): void {
      notification.error({
        key,
        className: "app-notification",
        title,
        description,
        placement: "topRight",
        duration: 7,
        pauseOnHover: true,
        showProgress: true,
      });
    },
    success(description: string): void {
      void message.success(description);
    },
  } as const;
}
