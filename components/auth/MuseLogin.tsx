
"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  authNoticeMessage,
  safeReturnPath,
  validLoginEmail,
} from "@/lib/auth/paths";
import { createMuseBrowserClient } from "@/lib/supabase/client";
import { MuseStar } from "../MuseStar";
import { MuseLoginFrame } from "./MuseLoginFrame";


type View = "choices" | "email" | "code";
type Status =
  | "idle"
  | "sending"
  | "sent"
  | "verifying"
  | "passkey"
  | "invalid"
  | "error";

export function MuseLogin({
  notice = "",
  next = "/",
}: {
  notice?: string;
  next?: string;
}) {
  const [view, setView] = useState<View>("choices");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const emailField = useRef<HTMLInputElement>(null);
  const codeField = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);

  const busy = [
    "sending",
    "verifying",
    "passkey",
  ].includes(status);

  const destination = safeReturnPath(next);

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setTimeout(
      () => setCooldown(value => Math.max(0, value - 1)),
      1000
    );

    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (view === "email") emailField.current?.focus();
    if (view === "code") codeField.current?.focus();
  }, [view]);

  function backToChoices() {
    setView("choices");
    setCode("");
    setError("");
    setStatus("idle");
  }

  async function signInWithPasskey() {
    if (inFlight.current) return;

    if (!window.PublicKeyCredential) {
      setError(
        "Passkeys aren't supported here. Try Google or an email code."
      );
      setStatus("error");
      return;
    }

    inFlight.current = true;
    setStatus("passkey");
    setError("");

    try {
      const client = createMuseBrowserClient();

      const { data, error: authError } =
        await client.auth.signInWithPasskey();

      if (authError) throw authError;
      if (!data.user) throw new Error("No user returned.");

      const { data: profile, error: profileError } =
        await client
          .from("profiles")
          .select("id")
          .eq("id", data.user.id)
          .maybeSingle();

      if (profileError || !profile) {
        await client.auth.signOut();
        throw new Error("This Muse account isn't available.");
      }

      window.location.assign(destination);
    } catch {
      setError(
        "Passkey sign-in wasn't completed. You can try again or use another method."
      );
      setStatus("error");
    } finally {
      inFlight.current = false;
    }
  }

  async function requestCode() {
    if (inFlight.current || cooldown > 0) return;

 
if (!validLoginEmail(email)) {
  setStatus("invalid");
  emailField.current?.focus();
  return;
}


    inFlight.current = true;
    setStatus("sending");
    setError("");

    try {
      const response = await fetch("/auth/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          next: destination,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(
          result.error ??
            "Your sign-in code couldn't be sent."
        );
        setStatus("error");

        if (response.status === 429) setCooldown(60);
        return;
      }

      setCode("");
      setCooldown(60);
      setStatus("sent");
      setView("code");
    } catch {
      setError(
        "Couldn't reach sign-in. Check your connection and try again."
      );
      setStatus("error");
    } finally {
      inFlight.current = false;
    }
  }

  async function submitEmail(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    await requestCode();
  }

  async function verifyCode(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (inFlight.current) return;

    if (!/^\d{6}$/.test(code)) {
      setError("Enter the six-digit code from your email.");
      setStatus("error");
      codeField.current?.focus();
      return;
    }

    inFlight.current = true;
    setStatus("verifying");
    setError("");

    try {
      const response = await fetch("/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          code,
          next: destination,
        }),
      });

      const result = await response.json();

      if (!response.ok || result.ok !== true) {
        setError(
          result.error ??
            "Your code couldn't be verified."
        );
        setStatus("error");

        if (response.status === 429) setCooldown(60);
        return;
      }

      window.location.assign(
        safeReturnPath(result.next)
      );
    } catch {
      setError(
        "Couldn't verify your code. Please try again."
      );
      setStatus("error");
    } finally {
      inFlight.current = false;
    }
  }

  const feedback =
    status === "invalid"
      ? "Enter a valid email address."
      : status === "error"
        ? error
        : status === "sending"
          ? "Sending your sign-in code…"
          : status === "verifying"
            ? "Verifying your code…"
            : status === "passkey"
              ? "Waiting for your passkey…"
              : status === "sent"
                ? "Enter the six digits from your latest email."
                : authNoticeMessage(notice) ?? "";

  return (
    <MuseLoginFrame>
      <span className="editor-label">
        YOUR OWN LITTLE CORNER OF THE UNIVERSE{" "}
        <MuseStar size={14} />
      </span>

      <h2 id="login-preview-title">
        Welcome to Muse.
      </h2>

      <p className="card-description">
        For everything you are and everything
        you&apos;re becoming.
      </p>

      {view === "choices" && (
        <div className="muse-login-methods">
          <form
            method="post"
            action="/auth/oauth/google"
            className="muse-login-google-form"
          >
            <input
              type="hidden"
              name="next"
              value={destination}
            />

            <button
              type="submit"
              className="muse-button button-primary muse-login-method"
              disabled={busy}
            >
              <span
                className="muse-google-mark"
                aria-hidden="true"
              >
                G
              </span>
              Continue with Google
            </button>
          </form>

          <button
            type="button"
            className="muse-button muse-login-method"
            disabled={busy}
            onClick={() => void signInWithPasskey()}
          >
            <span aria-hidden="true">◎</span>
            Sign in with a passkey
          </button>

          <button
            type="button"
            className="muse-login-email-link"
            disabled={busy}
            onClick={() => {
              setView("email");
              setStatus("idle");
              setError("");
            }}
          >
            Email me a code instead
          </button>
        </div>
      )}

      {view === "email" && (
        <form
          noValidate
          onSubmit={submitEmail}
          aria-busy={busy}
        >
          <label
            className="editor-label"
            htmlFor="login-email"
          >
            Email address
          </label>

          <input
            ref={emailField}
            id="login-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            maxLength={254}
            required
            placeholder="you@example.com"
            value={email}
            disabled={busy}
            aria-invalid={status === "invalid"}
            aria-describedby="login-feedback"
            onChange={event => {
              setEmail(event.target.value);
              setStatus("idle");
              setError("");
            }}
          />

          <button
            type="submit"
            className="muse-button button-primary"
            disabled={busy || cooldown > 0}
          >
            {status === "sending"
              ? "Sending…"
              : cooldown > 0
                ? `Try again in ${cooldown}s`
                : "Send me a code"}
            <MuseStar size={15} />
          </button>

          <button
            type="button"
            className="muse-login-email-link"
            disabled={busy}
            onClick={backToChoices}
          >
            Back to sign-in options
          </button>
        </form>
      )}

      {view === "code" && (
        <form
          noValidate
          onSubmit={verifyCode}
          aria-busy={busy}
        >
          <p className="small-label">
            Code for {email.trim()}
          </p>

          <label
            className="editor-label"
            htmlFor="login-code"
          >
            Six-digit verification code
          </label>

          <input
            ref={codeField}
            id="login-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            placeholder="000000"
            value={code}
            disabled={busy}
            aria-describedby="login-feedback"
            onChange={event => {
              setCode(
                event.target.value
                  .replace(/\D/g, "")
                  .slice(0, 6)
              );
              setStatus("idle");
              setError("");
            }}
            onPaste={event => {
              const pasted = event.clipboardData
                .getData("text")
                .replace(/\D/g, "");

              if (pasted.length === 6) {
                event.preventDefault();
                setCode(pasted);
                setStatus("idle");
                setError("");
              }
            }}
          />

          <button
            type="submit"
            className="muse-button button-primary"
            disabled={busy}
          >
            {status === "verifying"
              ? "Verifying…"
              : "Verify & enter Muse"}
            <MuseStar size={15} />
          </button>

          <div className="editor-actions">
            <button
              type="button"
              className="muse-button button-ghost"
              disabled={busy || cooldown > 0}
              onClick={() => void requestCode()}
            >
              {cooldown > 0
                ? `Resend in ${cooldown}s`
                : "Resend code"}
            </button>

            <button
              type="button"
              className="muse-button button-ghost"
              disabled={busy}
              onClick={() => {
                setView("email");
                setCode("");
                setStatus("idle");
                setError("");
              }}
            >
              Change email
            </button>
          </div>

          <button
            type="button"
            className="muse-login-email-link"
            disabled={busy}
            onClick={backToChoices}
          >
            Back to sign-in options
          </button>
        </form>
      )}

      <p
        id="login-feedback"
        className="muse-login-feedback"
        role={
          status === "error" || status === "invalid"
            ? "alert"
            : "status"
        }
      >
        {feedback}
      </p>

      <p className="small-label">
        Private, invite-only access.
      </p>
    </MuseLoginFrame>
  );
}
