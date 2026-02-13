"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/useAuth";

type Profile = {
  user_id: string;
  email: string | null;
  role: "admin" | "user";
};

export default function AdminUsersPage() {
  const { role } = useAuth(true);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [email, setEmail] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "user">("user");

  const loadProfiles = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id,email,role")
      .order("email");

    if (error) {
      alert(error.message);
      return;
    }

    setProfiles(data ?? []);
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  if (role !== "admin") {
    return <div className="container">Nemáš oprávnění.</div>;
  }

  const createProfile = async () => {
    if (!email) return alert("Zadej email");

    const { error } = await supabase.rpc("create_profile_by_email", {
      p_email: email,
      p_role: newRole,
    });

    if (error) return alert(error.message);

    setEmail("");
    setNewRole("user");
    loadProfiles();
  };

  const setRoleForUser = async (
    userId: string,
    role: "admin" | "user"
  ) => {
    const { error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("user_id", userId);

    if (error) return alert(error.message);
    loadProfiles();
  };

  return (
    <main>
      <h1 className="h1">Admin – Uživatelé</h1>

      <div
        className="cardTight"
        style={{
          border: "1px solid #e5e5e5",
          marginTop: 16,
          display: "grid",
          gap: 8,
          maxWidth: 520,
        }}
      >
        <b>Vytvořit profil</b>

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <select
          value={newRole}
          onChange={(e) => setNewRole(e.target.value as any)}
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>

        <button onClick={createProfile}>Vytvořit</button>
      </div>

      <div style={{ marginTop: 20, display: "grid", gap: 10 }}>
        {profiles.map((p) => (
          <div
            key={p.user_id}
            className="cardTight"
            style={{
              border: "1px solid #e5e5e5",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <b>{p.email}</b>
            </div>

            <div style={{ display: "flex", gap: 6 }}>
              <button
                disabled={p.role === "user"}
                onClick={() => setRoleForUser(p.user_id, "user")}
              >
                User
              </button>
              <button
                disabled={p.role === "admin"}
                onClick={() => setRoleForUser(p.user_id, "admin")}
              >
                Admin
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
