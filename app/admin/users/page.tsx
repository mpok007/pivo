"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/useAuth";

type Profile = {
  user_id: string;
  email: string | null;
  name: string | null;
  role: "admin" | "user";
};

export default function AdminUsersPage() {
  const { role } = useAuth(true);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [email, setEmail]       = useState("");
  const [newRole, setNewRole]   = useState<"admin" | "user">("user");
  const [loading, setLoading]   = useState(true);
  // Sleduje, který uživatel má právě editované jméno (user_id → dočasná hodnota)
  const [editingName, setEditingName] = useState<Record<string, string>>({});

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id,email,name,role")
      .order("email");

    if (error) {
      alert("Chyba načtení profilů: " + error.message);
      setLoading(false);
      return;
    }

    setProfiles(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadProfiles(); }, [loadProfiles]);

  if (role !== "admin") {
    return <div className="container">Nemáš oprávnění.</div>;
  }

  const inviteUser = async () => {
    if (!email) return alert("Zadej email.");

    const ok = confirm(`Opravdu poslat pozvánku na: ${email}?`);
    if (!ok) return;

    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) return alert("Chybí session/token. Zkus se odhlásit a přihlásit.");

    const res = await fetch("/api/admin/invite", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email, role: newRole }),
    });

    const json = await res.json();
    if (!res.ok) {
      alert("Chyba: " + (json?.error ?? "Neznámá chyba"));
      return;
    }

    alert("Pozvánka odeslána ✅");
    setEmail("");
    setNewRole("user");
    loadProfiles();
  };

  const saveName = async (userId: string) => {
    const name = (editingName[userId] ?? "").trim() || null;
    const { error } = await supabase
      .from("profiles")
      .update({ name })
      .eq("user_id", userId);

    if (error) return alert("Chyba uložení jména: " + error.message);

    // Odstraníme z editingName a znovu načteme
    setEditingName((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
    loadProfiles();
  };

  const setRoleForUser = async (userId: string, role: "admin" | "user") => {
    const { error } = await supabase.from("profiles").update({ role }).eq("user_id", userId);
    if (error) return alert("Chyba změny role: " + error.message);
    loadProfiles();
  };

  const deleteUser = async (userId: string, email?: string | null) => {
    const ok1 = confirm(`Opravdu smazat uživatele: ${email ?? userId}?`);
    if (!ok1) return;
    const ok2 = confirm("Smažou se i jeho záznamy. Opravdu pokračovat?");
    if (!ok2) return;

    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) return alert("Chybí session/token. Zkus se odhlásit a přihlásit.");

    const res = await fetch("/api/admin/delete-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ user_id: userId }),
    });

    const json = await res.json();
    if (!res.ok) return alert("Chyba: " + (json?.error ?? "Neznámá chyba"));

    alert("Uživatel smazán ✅");
    loadProfiles();
  };

  return (
    <main>
      <h1 className="h1">Admin – Uživatelé</h1>

      {/* Pozvání nového uživatele */}
      <div
        className="cardTight"
        style={{
          border: "1px solid #e5e5e5", padding: 10,
          display: "flex", justifyContent: "space-between",
          alignItems: "center", gap: 10,
        }}
      >
        <b>Pozvat nového uživatele</b>
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <select value={newRole} onChange={(e) => setNewRole(e.target.value as "admin" | "user")}>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <button onClick={inviteUser}>Poslat pozvánku</button>
      </div>

      {/* Seznam uživatelů */}
      <div style={{ marginTop: 24 }}>
        <b>Existující uživatelé</b>

        {loading && <div style={{ marginTop: 10 }}>Načítám…</div>}

        {!loading && (
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {profiles.map((p) => {
              const isEditing = p.user_id in editingName;
              const nameVal = isEditing ? editingName[p.user_id] : (p.name ?? "");

              return (
                <div
                  key={p.user_id}
                  className="cardTight"
                  style={{ border: "1px solid #e5e5e5", display: "grid", gap: 8, padding: 10 }}
                >
                  {/* Horní řádek – email + role tlačítka + smazat */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <div>
                      <b>{p.email}</b>
                      <div style={{ opacity: 0.5, fontSize: 11 }}>{p.user_id}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <button
                        style={{ padding: "6px 10px" }}
                        disabled={p.role === "user"}
                        onClick={() => setRoleForUser(p.user_id, "user")}
                      >
                        User
                      </button>
                      <button
                        style={{ padding: "6px 10px" }}
                        disabled={p.role === "admin"}
                        onClick={() => setRoleForUser(p.user_id, "admin")}
                      >
                        Admin
                      </button>
                      <button
                        style={{ padding: "6px 10px", background: "#dc2626" }}
                        onClick={() => deleteUser(p.user_id, p.email)}
                      >
                        Smazat
                      </button>
                    </div>
                  </div>

                  {/* Dolní řádek – jméno/přezdívka */}
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      placeholder="Jméno / přezdívka (volitelné)"
                      value={nameVal}
                      style={{ flex: 1, fontSize: 13 }}
                      onChange={(e) =>
                        setEditingName((prev) => ({ ...prev, [p.user_id]: e.target.value }))
                      }
                      onFocus={() => {
                        if (!isEditing)
                          setEditingName((prev) => ({ ...prev, [p.user_id]: p.name ?? "" }));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveName(p.user_id);
                        if (e.key === "Escape")
                          setEditingName((prev) => {
                            const next = { ...prev }; delete next[p.user_id]; return next;
                          });
                      }}
                    />
                    {isEditing && (
                      <button
                        style={{ padding: "6px 12px", fontSize: 13 }}
                        onClick={() => saveName(p.user_id)}
                      >
                        Uložit
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
