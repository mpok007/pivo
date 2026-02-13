"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function SetPasswordPage() {
  const [loading, setLoading] = useState(true);
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      // Po kliknutí z emailu by už měl být uživatel přihlášen (session vznikne z magic linku)
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setMsg("Odkaz už není platný nebo nejsi přihlášen. Zkus pozvánku otevřít znovu.");
      }
      setLoading(false);
    };

    run();
  }, []);

  const save = async () => {
    setMsg(null);

    if (pw1.length < 6) {
      setMsg("Heslo musí mít alespoň 6 znaků.");
      return;
    }
    if (pw1 !== pw2) {
      setMsg("Hesla se neshodují.");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: pw1 });
    if (error) {
      setMsg("Nepovedlo se nastavit heslo: " + error.message);
      return;
    }

    setMsg("Hotovo ✅ Heslo nastaveno. Přesměrovávám…");
    setTimeout(() => {
      window.location.replace("/");
    }, 800);
  };

  return (
    <main className="container" style={{ maxWidth: 520 }}>
      <h1 className="h1">Nastavit heslo</h1>

      {loading ? (
        <div style={{ marginTop: 12 }}>Načítám…</div>
      ) : (
        <div className="formGrid" style={{ marginTop: 14 }}>
          <input
            type="password"
            placeholder="Nové heslo"
            value={pw1}
            onChange={(e) => setPw1(e.target.value)}
          />
          <input
            type="password"
            placeholder="Nové heslo znovu"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
          />

          <button onClick={save}>Uložit heslo</button>

          {msg ? <div style={{ opacity: 0.85 }}>{msg}</div> : null}
        </div>
      )}
    </main>
  );
}
