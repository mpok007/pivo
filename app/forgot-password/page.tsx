"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg]     = useState<string | null>(null);
  const [sent, setSent]   = useState(false);

  const send = async () => {
    if (!email.trim()) return setMsg("Zadej email.");
    setMsg(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: "https://pivo.mpok.cz/set-password",
    });

    if (error) return setMsg("Chyba: " + error.message);
    setSent(true);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") send();
  };

  return (
    <main className="container">
      <h1 className="h1">Zapomenuté heslo</h1>

      {sent ? (
        <div style={{ marginTop: 14, maxWidth: 520 }}>
          <div style={{ marginBottom: 12 }}>
            ✅ Odkaz pro reset hesla byl odeslán na <b>{email}</b>. Zkontroluj svůj email.
          </div>
          <Link href="/login" style={{ fontSize: 13, opacity: 0.65 }}>
            Zpět na přihlášení
          </Link>
        </div>
      ) : (
        <div className="formGrid" style={{ marginTop: 14, maxWidth: 520 }}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Email"
            type="email"
            autoComplete="email"
          />
          <button onClick={send}>Odeslat odkaz</button>
          {msg && <div style={{ opacity: 0.85 }}>{msg}</div>}
          <Link href="/login" style={{ fontSize: 13, opacity: 0.65, textAlign: "center" }}>
            Zpět na přihlášení
          </Link>
        </div>
      )}
    </main>
  );
}
