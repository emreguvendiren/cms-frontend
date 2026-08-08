import type { JSX } from "react";
import { Typography } from "antd";

import { LoginForm, type AuthenticatedUser } from "../../features/auth";
import "./loginPage.css";

type LoginPageProps = {
  onAuthenticated: (user: AuthenticatedUser) => void;
};

export function LoginPage({ onAuthenticated }: LoginPageProps): JSX.Element {

  return (
    <main className="login-page">
      <section className="login-page__context" aria-labelledby="product-title">
        <div className="login-page__context-content">
          <div className="login-page__brand" aria-label="İkiteknik Bilişim">
            <span className="login-page__brand-mark" aria-hidden="true">İKİ</span>
            <span>İkiteknik Bilişim</span>
          </div>
          <div className="login-page__intro">
            <Typography.Text className="login-page__eyebrow">EĞİTİM OPERASYON PLATFORMU</Typography.Text>
            <Typography.Title id="product-title" level={1}>
              Öğrenciden eğitime, finanstan rapora tek merkezden yönetin.
            </Typography.Title>
            <Typography.Paragraph>
              Öğrenci kayıtlarını, kurs süreçlerini ve finansal operasyonları güvenli ve izlenebilir biçimde yönetin.
            </Typography.Paragraph>
          </div>
          <ul className="login-page__assurances" aria-label="Platform güvenlik özellikleri">
            <li><span aria-hidden="true">01</span>Öğrenci ve kayıt takibi</li>
            <li><span aria-hidden="true">02</span>Kurs ve sınıf operasyonları</li>
            <li><span aria-hidden="true">03</span>Gelir, gider ve raporlama</li>
          </ul>
        </div>
        <div className="login-page__signal" aria-hidden="true" />
      </section>
      <section className="login-page__access" aria-labelledby="login-title">
        <div className="login-page__form-shell">
          <header className="login-page__form-header">
            <Typography.Text className="login-page__section-label">İKİTEKNİK YÖNETİM</Typography.Text>
            <Typography.Title id="login-title" level={2}>Hesabınıza giriş yapın</Typography.Title>
            <Typography.Paragraph>Yetkilendirilmiş kurum hesabınızla devam edin.</Typography.Paragraph>
          </header>
          <LoginForm onSuccess={onAuthenticated} />
          <footer className="login-page__help">
            <span className="login-page__status-dot" aria-hidden="true" />
            Güvenli bağlantı · Erişim sorunu için sistem yöneticinize başvurun.
          </footer>
        </div>
      </section>
    </main>
  );
}
