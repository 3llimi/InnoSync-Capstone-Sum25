// src/app/authentication/signup/page.tsx
"use client";
import styles from "../page.module.css";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import BodyToasts from "../../components/common/BodyToasts";
import { readErrorMessage } from "../../components/common/readErrorMessage";
import AuthField from "../AuthField";

const TOAST = {
  position: "top-center" as const,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  theme: "colored" as const,
};

/** 0-4: length, mixed case, digit, symbol. */
function passwordScore(pw: string) {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.max(1, score);
}

const STRENGTH = ["", "Weak", "Fair", "Good", "Strong"];

export default function SignUp() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    surname: "",
    middleName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({
    name: false,
    surname: false,
    email: false,
    password: false,
    confirmPassword: false,
    passwordMatch: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [slow, setSlow] = useState(false);
  const [shake, setShake] = useState(0);

  // Free hosting can take up to a minute to wake up: tell people it's working, not frozen.
  useEffect(() => {
    if (!submitting) {
      setSlow(false);
      return;
    }
    const timer = setTimeout(() => setSlow(true), 4000);
    return () => clearTimeout(timer);
  }, [submitting]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name as keyof typeof errors] || ((name === "password" || name === "confirmPassword") && errors.passwordMatch)) {
      setErrors((prev) => ({
        ...prev,
        [name]: false,
        passwordMatch: name === "password" || name === "confirmPassword" ? false : prev.passwordMatch,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors = {
      name: formData.name.trim() === "",
      surname: formData.surname.trim() === "",
      email: formData.email.trim() === "",
      password: formData.password.trim() === "",
      confirmPassword: formData.confirmPassword.trim() === "",
      passwordMatch: formData.password !== formData.confirmPassword,
    };
    setErrors(newErrors);

    if (Object.values(newErrors).some(Boolean)) {
      setShake((n) => n + 1);
      return;
    }

    // Combine name + middle name + surname into fullName
    const fullName = [formData.name, formData.middleName, formData.surname].map((s) => s.trim()).filter(Boolean).join(" ");

    setSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, password: formData.password, fullName }),
      });

      if (!res.ok) {
        // e.g. 409 "Email is already registered!" (plain text) or a JSON validation error.
        const message = await readErrorMessage(res, "Something went wrong. Please try again.");
        setShake((n) => n + 1);
        toast.error(`Signup failed: ${message}`, { ...TOAST, autoClose: 4000 });
        return;
      }

      const data = await res.json();
      toast.success("Signup successful!", { ...TOAST, autoClose: 3000 });
      if (data.accessToken) localStorage.setItem("token", data.accessToken);
      if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);

      // Store user information for profile initiation
      localStorage.setItem("userEmail", formData.email);
      localStorage.setItem("userFullName", fullName);

      // Trigger navbar refresh and auth state change
      window.dispatchEvent(new CustomEvent("profileUpdated"));
      window.dispatchEvent(new CustomEvent("authStateChanged"));

      router.push("/components/profile-initiation");
    } catch (err) {
      console.error("Network error during signup:", err);
      toast.error("Signup failed due to network error", { ...TOAST, autoClose: 4000 });
    } finally {
      setSubmitting(false);
    }
  };

  const score = passwordScore(formData.password);
  const matches = formData.confirmPassword.length > 0 && formData.confirmPassword === formData.password;

  return (
    <div className={styles.authCard}>
      <Link href="/" className={styles.back}>
        <span aria-hidden="true">←</span> Back to home
      </Link>

      <header className={styles.authHead}>
        <ol className={styles.steps} aria-label="Sign-up progress">
          <li className={styles.stepActive}><span>1</span> Account</li>
          <li><span>2</span> Profile</li>
        </ol>
        <h1 className={styles.authTitle}>Create your <span className={styles.accent}>account</span></h1>
        <p className={styles.authSub}>
          Already a member? <Link href="/authentication/login" className={styles.inlineLink}>Log in</Link>
        </p>
      </header>

      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        <div key={shake} className={`${styles.fields} ${shake ? styles.shake : ""}`}>
          <div className={styles.row}>
            <AuthField
              label="First name"
              icon="user"
              name="name"
              placeholder="Amina"
              autoComplete="given-name"
              value={formData.name}
              onChange={handleChange}
              error={errors.name && "Required"}
            />
            <AuthField
              label="Last name"
              icon="user"
              name="surname"
              placeholder="Karimova"
              autoComplete="family-name"
              value={formData.surname}
              onChange={handleChange}
              error={errors.surname && "Required"}
            />
          </div>
          <AuthField
            label="Middle name (optional)"
            icon="user"
            name="middleName"
            placeholder="Optional"
            autoComplete="additional-name"
            value={formData.middleName}
            onChange={handleChange}
          />
          <AuthField
            label="Email"
            icon="mail"
            type="email"
            name="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={formData.email}
            onChange={handleChange}
            error={errors.email && "Please enter your email."}
          />
          <AuthField
            label="Password"
            icon="lock"
            type="password"
            name="password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            value={formData.password}
            onChange={handleChange}
            error={errors.password && "Please choose a password."}
            hint={
              formData.password && (
                <div className={styles.strength} data-score={score} aria-live="polite">
                  <span className={styles.strengthBars} aria-hidden="true"><i /><i /><i /><i /></span>
                  <span className={styles.strengthLabel}>{STRENGTH[score]}</span>
                </div>
              )
            }
          />
          <AuthField
            label="Confirm password"
            icon="lock"
            type="password"
            name="confirmPassword"
            placeholder="Repeat your password"
            autoComplete="new-password"
            value={formData.confirmPassword}
            onChange={handleChange}
            error={
              (errors.confirmPassword && "Please confirm your password.") ||
              (errors.passwordMatch && "Passwords don't match.")
            }
            adornment={
              matches && (
                <span className={styles.matchTick} aria-label="Passwords match">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg>
                </span>
              )
            }
          />
        </div>

        <button type="submit" className={styles.submit} disabled={submitting} aria-busy={submitting}>
          {submitting ? (
            <><span className="spinner" aria-hidden="true" /> Creating account...</>
          ) : (
            <>Continue <span className={styles.submitArrow} aria-hidden="true">→</span></>
          )}
        </button>
        {submitting && slow && (
          <p className={styles.slowHint} role="status">
            Waking up the server. The first request can take up to a minute.
          </p>
        )}
      </form>
      {/* Portalled to <body>: the form column is its own stacking context, so the green panel would cover it. */}
      <BodyToasts label="Notification" />
    </div>
  );
}
