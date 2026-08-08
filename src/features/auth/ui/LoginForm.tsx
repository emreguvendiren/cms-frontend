import type { JSX } from "react";
import { useState } from "react";
import { Button, Checkbox, Form, Input } from "antd";

import { ApiError } from "../../../shared/api";
import { useAppFeedback } from "../../../shared/feedback";
import { login } from "../api/authApi";
import type { AuthenticatedUser, LoginCredentials } from "../model/authTypes";

type LoginFormProps = { onSuccess: (user: AuthenticatedUser) => void };

export function LoginForm({ onSuccess }: LoginFormProps): JSX.Element {
  const feedback = useAppFeedback();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(credentials: LoginCredentials): Promise<void> {
    setSubmitting(true);
    try {
      const result = await login(credentials);
      feedback.success("Oturum güvenli biçimde açıldı.");
      onSuccess(result.user);
    } catch (error: unknown) {
      const loginError = getLoginError(error);
      feedback.error({
        key: "login-error",
        title: loginError.title,
        description: loginError.description,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Form<LoginCredentials>
      layout="vertical"
      requiredMark={false}
      onFinish={(values) => void handleSubmit(values)}
      initialValues={{ rememberMe: false }}
      autoComplete="on"
      size="large"
    >
      <Form.Item<LoginCredentials> label="E-posta adresi" name="email" rules={[
        { required: true, message: "E-posta adresinizi girin." },
        { type: "email", message: "Geçerli bir e-posta adresi girin." },
      ]}>
        <Input type="email" autoComplete="username" placeholder="ornek@kurum.com" disabled={submitting} />
      </Form.Item>
      <Form.Item<LoginCredentials> label="Şifre" name="password"
        rules={[{ required: true, message: "Şifrenizi girin." }]}>
        <Input.Password autoComplete="current-password" placeholder="Şifreniz" disabled={submitting} />
      </Form.Item>
      <Form.Item<LoginCredentials> name="rememberMe" valuePropName="checked">
        <Checkbox disabled={submitting}>Beni hatırla</Checkbox>
      </Form.Item>
      <Button className="login-form__submit" type="primary" htmlType="submit"
        loading={submitting} disabled={submitting} block>
        {submitting ? "Oturum açılıyor" : "Giriş yap"}
      </Button>
    </Form>
  );
}

function getLoginError(error: unknown): { title: string; description: string } {
  if (error instanceof ApiError) {
    if (error.status === 401) return {
      title: "Giriş bilgileri doğrulanamadı",
      description: "E-posta adresi veya şifre hatalı. Bilgilerinizi kontrol edip tekrar deneyin.",
    };
    if (error.status === 403) return {
      title: "Güvenlik doğrulaması başarısız",
      description: "Sayfayı yenileyip tekrar giriş yapmayı deneyin.",
    };
  }
  if (error instanceof TypeError) return {
    title: "Sunucuya ulaşılamıyor",
    description: "Bağlantınızı kontrol edip tekrar deneyin. Sorun sürerse sistem yöneticinize başvurun.",
  };
  return {
    title: "Giriş işlemi tamamlanamadı",
    description: "Beklenmeyen bir sorun oluştu. Lütfen tekrar deneyin.",
  };
}
