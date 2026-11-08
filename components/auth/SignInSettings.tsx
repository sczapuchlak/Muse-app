
"use client";

import { useEffect, useState } from "react";
import { createMuseBrowserClient } from "@/lib/supabase/client";
import { MuseCard } from "../MuseCard";
import { CardHeading } from "../CardHeading";
import { passkeyMessage } from "@/lib/auth/passkey-errors";

type Passkey = {
  id: string;
  friendly_name?: string;
  created_at: string;
};

export function SignInSettings() {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [googleLinked, setGoogleLinked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  /** #98: a server with passkeys switched off (e.g. local development) is a setting, not an error. */
  const [passkeysOff, setPasskeysOff] = useState(false);

  async function refresh() {
    const client = createMuseBrowserClient();

    const [identityResult, passkeyResult] =
      await Promise.all([
        client.auth.getUserIdentities(),
        client.auth.passkey.list(),
      ]);

    // Each source loads on its own, so one failing never hides the other.
    if (!identityResult.error) {
      setGoogleLinked(
        identityResult.data.identities.some(
          identity => identity.provider === "google"
        )
      );
    }

    const passkeyError = passkeyResult.error as { code?: string } | null;
    if (passkeyError?.code === "passkey_disabled") {
      setPasskeysOff(true);
      setPasskeys([]);
    } else if (!passkeyError) {
      setPasskeysOff(false);
      setPasskeys(passkeyResult.data ?? []);
    }

    if (identityResult.error) throw identityResult.error;
    if (passkeyError && passkeyError.code !== "passkey_disabled") throw passkeyError;
  }

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        await refresh();
      } catch {
        if (active) {
          setError("Couldn't load sign-in settings.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  async function connectGoogle() {
    if (busy) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const client = createMuseBrowserClient();

      const { data, error: linkError } =
        await client.auth.linkIdentity({
          provider: "google",
          options: {
            redirectTo:
              `${window.location.origin}/auth/oauth/callback`,
          },
        });

      if (linkError) throw linkError;

      if (data.url) {
        window.location.assign(data.url);
        return;
      }

      throw new Error("Google didn't provide a redirect.");
    } catch {
      setError(
        "Couldn't connect Google. Check that manual identity linking is enabled in Supabase."
      );
      setBusy(false);
    }
  }

  async function registerPasskey() {
    if (busy) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const client = createMuseBrowserClient();

      const { data: before, error: userError } =
        await client.auth.getUser();

      if (userError || !before.user) {
        throw new Error("Sign in again first.");
      }

      const { error: registerError } =
        await client.auth.registerPasskey();

      if (registerError) throw registerError;

      const { data: after } =
        await client.auth.getUser();

      if (after.user?.id !== before.user.id) {
        throw new Error("Your session changed.");
      }

      await refresh();
      setMessage("Your new passkey is ready!");
    } catch (cause) {
      const { problem, message } = passkeyMessage("register", cause);
      // A device that already holds a Muse passkey is good news, not an error.
      if (problem === "already-registered") setMessage(message);
      else setError(message);
    } finally {
      setBusy(false);
    }
  }

  async function removePasskey(passkeyId: string) {
    if (busy) return;

    const confirmed = window.confirm(
      "Remove this passkey? Make sure you have another way to sign in."
    );

    if (!confirmed) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const client = createMuseBrowserClient();

      const { error: deleteError } =
        await client.auth.passkey.delete({
          passkeyId,
        });

      if (deleteError) throw deleteError;

      await refresh();
      setMessage("Passkey removed.");
    } catch {
      setError("Couldn't remove the passkey.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <MuseCard id="sign-in-security">
      <CardHeading
        id="sign-in-security"
        title="Sign-in & security"
        icon="settings"
      />

      <div className="muse-settings-fields">
        <section>
          <h3>Google</h3>

          <p className="card-description">
            Connect Google to your existing Muse account
            before using Google sign-in.
          </p>

          {googleLinked ? (
            <p className="small-label">
              Google is connected to this account.
            </p>
          ) : (
            <button
              type="button"
              className="muse-button"
              disabled={loading || busy}
              onClick={() => void connectGoogle()}
            >
              Connect Google
            </button>
          )}
        </section>

        <section>
          <h3>Passkeys</h3>

          <p className="card-description">
            Sign in with Face ID, Touch ID, your device
            PIN, or another supported passkey.
          </p>

          {passkeysOff ? (
            <p className="small-label">
              Passkeys aren’t turned on for this Muse server.
            </p>
          ) : (
          <button
            type="button"
            className="muse-button"
            disabled={loading || busy}
            onClick={() => void registerPasskey()}
          >
            {busy ? "Please wait…" : "Add a passkey"}
          </button>
          )}

          {passkeys.length > 0 && (
            <ul className="muse-passkey-list">
              {passkeys.map(passkey => (
                <li key={passkey.id}>
                  <div>
                    <strong>
                      {passkey.friendly_name || "Passkey"}
                    </strong>
                    <p className="small-label">
                      Added{" "}
                      {new Date(
                        passkey.created_at
                      ).toLocaleDateString()}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="muse-button button-ghost"
                    disabled={busy}
                    onClick={() =>
                      void removePasskey(passkey.id)
                    }
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!loading && !passkeysOff && passkeys.length === 0 && (
            <p className="small-label">
              No passkeys registered yet.
            </p>
          )}
        </section>

        {message && (
          <p role="status" className="small-label">
            {message}
          </p>
        )}

        {error && (
          <p role="alert" className="field-error">
            {error}
          </p>
        )}
      </div>
    </MuseCard>
  );
}
