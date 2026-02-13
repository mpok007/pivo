"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const login = async () => {
    setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: pass,
    });
    if (error) return setMsg("Přihlášení se nepovedlo: " + error.message);
    window.location.href = "/";
  };

  return (
    <main className="container">
      <h1 className="h1">Přihlášení</h1>

      <div className="formGrid" style={{ marginTop: 14, maxWidth: 520 }}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input value={pass} onChange={(e) => setPass(e.target.value)} type="password" placeholder="Heslo" />
        <button onClick={login}>Přihlásit</button>
        {msg ? <div style={{ opacity: 0.85 }}>{msg}</div> : null}
      </div>
    </main>
  );
}
