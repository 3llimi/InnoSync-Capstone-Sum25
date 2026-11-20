import { ReactNode } from "react";
import styles from "./page.module.css";
import AuthShowcase from "./AuthShowcase";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.authShell}>
      <section className={styles.formSide}>
        <span className={styles.formGlow} aria-hidden="true" />
        <div className={styles.formWrap}>{children}</div>
        <p className={styles.terms}>
          By continuing you agree to InnoSync&apos;s Terms of Service and Privacy Policy.
        </p>
      </section>
      <AuthShowcase />
    </div>
  );
}
