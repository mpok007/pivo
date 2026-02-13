"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/useAuth";

type Profile = {
  user_id: string;
  email: string | null;
  role: "admin" | "user";
};

type Stats = {
  beer_small: number;
  beer_large: number;
  na_small: number;
  na_large: number;
};

const ML = { small: 300, large: 500 };

export default function AdminPage() {
  const { role } = useAuth(true);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [stats, setStats] = useState<Record<string, Stats>>({});
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    setLoading(true);

    const { data: p, error: pErr } = await supabase
      .from("profiles")
      .select("user_id,email,role")
      .order("email");

    if (pErr) {
      alert("Chyba profily: " + pErr.message);
      setLoading(false);
      return;
    }

    const { data: d, error: dErr } = await supabase
      .from("drink_entries")
      .select("user_id,kind,size");

    if (dErr) {
      alert("Chyba záznamy: " + dErr.message);
      setLoading(false);
      return;
    }

    const map: Record<string, Stats> = {};

    for (const row of d ?? []) {
      if (!map[row.user_id]) {
        map[row.user_id] = {
          beer_small: 0,
          beer_large: 0,
          na_small: 0,
          na_large: 0,
        };
      }
      const key = `${row.kind}_${row.size}` as keyof Stats;
      if (key in map[row.user_id]) {
        map[row.user_id][key] += 1;
      }
    }

    setProfiles(p ?? []);
    setStats(map);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  if (role !== "admin") {
    return <div className="container">Nemáš oprávnění.</div>;
  }

  return (
    <main>
      <h1 className="h1">Admin – Statistiky</h1>

      {loading && <div>Načítám…</div>}

      {!loading && (
        <div style={{ display: "grid", gap: 14, marginTop: 16 }}>
          {profiles.map((p) => {
            const s = stats[p.user_id] || {
              beer_small: 0,
              beer_large: 0,
              na_small: 0,
              na_large: 0,
            };

            const beerL = (
              (s.beer_small * ML.small + s.beer_large * ML.large) /
              1000
            ).toFixed(1);

            const naL = (
              (s.na_small * ML.small + s.na_large * ML.large) /
              1000
            ).toFixed(1);

            return (
              <div
                key={p.user_id}
                className="cardTight"
                style={{
                  border: "1px solid #e5e5e5",
                  display: "grid",
                  gap: 6,
                }}
              >
                <b>{p.email}</b>

                <div>
                  Pivo malé: {s.beer_small}{" "}
                  <button
                    onClick={async () => {
                      await removeOne(p.user_id, "beer", "small");
                      await loadAll();
                    }}
                  >
                    −
                  </button>
                </div>

                <div>
                  Pivo velké: {s.beer_large}{" "}
                  <button
                    onClick={async () => {
                      await removeOne(p.user_id, "beer", "large");
                      await loadAll();
                    }}
                  >
                    −
                  </button>
                </div>

                <div>
                  Nealko malé: {s.na_small}{" "}
                  <button
                    onClick={async () => {
                      await removeOne(p.user_id, "na", "small");
                      await loadAll();
                    }}
                  >
                    −
                  </button>
                </div>

                <div>
                  Nealko velké: {s.na_large}{" "}
                  <button
                    onClick={async () => {
                      await removeOne(p.user_id, "na", "large");
                      await loadAll();
                    }}
                  >
                    −
                  </button>
                </div>

                <div>
                  <b>Pivo celkem:</b> {beerL} L
                </div>
                <div>
                  <b>Nealko celkem:</b> {naL} L
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

// ----- pomocná funkce MIMO komponentu -----
async function removeOne(
  userId: string,
  kind: "beer" | "na",
  size: "small" | "large"
) {
  const ok = confirm("Opravdu chceš odečíst jeden záznam?");
  if (!ok) return;

  const { data, error } = await supabase
    .from("drink_entries")
    .select("id")
    .eq("user_id", userId)
    .eq("kind", kind)
    .eq("size", size)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    alert("Chyba načtení: " + error.message);
    return;
  }

  if (!data || data.length === 0) {
    alert("Žádný záznam k odečtení");
    return;
  }

  const del = await supabase.from("drink_entries").delete().eq("id", data[0].id);
  if (del.error) alert("Chyba mazání: " + del.error.message);
}
