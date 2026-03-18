"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [pass, setPass]   = useState("");
  const [msg, setMsg]     = useState<string | null>(null);

  const login = async () => {
    setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: pass,
    });
    if (error) return setMsg("Přihlášení se nepovedlo: " + error.message);
    router.replace("/");
  };

  // Umožní odeslat formulář klávesou Enter
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") login();
  };

  return (
    <main className="container">
      <h1 className="h1">Přihlášení</h1>

      <div className="formGrid" style={{ marginTop: 14, maxWidth: 520 }}>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Email"
          type="email"
          autoComplete="email"
        />
        <input
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          onKeyDown={onKeyDown}
          type="password"
          placeholder="Heslo"
          autoComplete="current-password"
        />
        <button onClick={login}>Přihlásit</button>
        {msg && <div style={{ opacity: 0.85 }}>{msg}</div>}
      </div>
    </main>
  );
}
