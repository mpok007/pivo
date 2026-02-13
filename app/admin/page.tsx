"use client";

import { useEffect, useMemo, useState } from "react";
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
        map[row.user_id] = { beer_small: 0, beer_large: 0, na_small: 0, na_large: 0 };
      }
      const key = `${row.kind}_${row.size}` as keyof Stats;
      if (key in map[row.user_id]) map[row.user_id][key] += 1;
    }

    setProfiles(p ?? []);
    setStats(map);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const resetAll = async () => {
    const ok1 = confirm("SMAZAT VŠE? Smaže to všechny záznamy pro všechny uživatele.");
    if (!ok1) return;
    const ok2 = confirm("Opravdu opravdu? Tohle nejde vrátit.");
    if (!ok2) return;

    const { error } = await supabase
      .from("drink_entries")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (error) return alert("Chyba při mazání: " + error.message);

    await loadAll();
    alert("Hotovo. Všechny záznamy byly smazány.");
  };

  const totals = useMemo(() => {
    let beerMl = 0;
    let naMl = 0;

    for (const uid of Object.keys(stats)) {
      const s = stats[uid];
      beerMl += s.beer_small * ML.small + s.beer_large * ML.large;
      naMl += s.na_small * ML.small + s.na_large * ML.large;
    }

    return {
      beerL: (beerMl / 1000).toFixed(1),
      naL: (naMl / 1000).toFixed(1),
    };
  }, [stats]);

  if (role !== "admin") return <div className="container">Nemáš oprávnění.</div>;

  return (
    <main>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <h1 className="h1" style={{ margin: 0 }}>
          Admin – Statistiky
        </h1>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, opacity: 0.85 }}>
            Pivo: <b>{totals.beerL} L</b> • Nealko: <b>{totals.naL} L</b>
          </span>
          <button onClick={resetAll} style={{ background: "#dc2626" }}>
            Smazat vše
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ marginTop: 12 }}>Načítám…</div>
      ) : (
        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
          {profiles.map((p) => {
            const s =
              stats[p.user_id] || ({ beer_small: 0, beer_large: 0, na_small: 0, na_large: 0 } as Stats);

            const beerL = ((s.beer_small * ML.small + s.beer_large * ML.large) / 1000).toFixed(1);
            const naL = ((s.na_small * ML.small + s.na_large * ML.large) / 1000).toFixed(1);

            const Row = ({
              label,
              count,
              onMinus,
            }: {
              label: string;
              count: number;
              onMinus: () => Promise<void>;
            }) => (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{label}</span>

                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <b>{count}</b>
                  <button
                    style={{ padding: "4px 8px" }}
                    onClick={async () => {
                      await onMinus();
                      await loadAll();
                    }}
                  >
                    −
                  </button>
                </div>
              </div>
            );

            return (
              <div
                key={p.user_id}
                className="cardTight"
                style={{
                  border: "1px solid #e5e5e5",
                  padding: 10,
                  display: "grid",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{p.email}</div>
                  <div style={{ fontSize: 13, opacity: 0.85 }}>
                    Pivo <b>{beerL} L</b> • Nealko <b>{naL} L</b>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                    fontSize: 13,
                  }}
                >
                  <Row
                    label="Pivo 0,5"
                    count={s.beer_large}
                    onMinus={() => removeOne(p.user_id, "beer", "large")}
                  />
                  <Row
                    label="Pivo 0,3"
                    count={s.beer_small}
                    onMinus={() => removeOne(p.user_id, "beer", "small")}
                  />
                  <Row
                    label="Nealko 0,5"
                    count={s.na_large}
                    onMinus={() => removeOne(p.user_id, "na", "large")}
                  />
                  <Row
                    label="Nealko 0,3"
                    count={s.na_small}
                    onMinus={() => removeOne(p.user_id, "na", "small")}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

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

  if (error) return alert("Chyba: " + error.message);
  if (!data || data.length === 0) return alert("Žádný záznam k odečtení");

  const del = await supabase.from("drink_entries").delete().eq("id", data[0].id);
  if (del.error) alert("Chyba mazání: " + del.error.message);
}
