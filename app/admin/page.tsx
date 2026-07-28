"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/useAuth";

type Profile = {
  user_id: string;
  email: string | null;
  name: string | null;
  role: "admin" | "user";
};

type Stats = {
  beer_small: number;
  beer_large: number;
  na_small: number;
  na_large: number;
};

type Event = {
  id: string;
  name: string;
  date: string;
  is_active: boolean;
};

const ML = { small: 300, large: 500 };
const EMPTY_STATS: Stats = { beer_small: 0, beer_large: 0, na_small: 0, na_large: 0 };

function displayName(p: Profile) {
  if (p.name) return `${p.name} (${p.email})`;
  return p.email ?? p.user_id;
}

function calcLitres(s: Stats) {
  const beerMl = s.beer_small * ML.small + s.beer_large * ML.large;
  const naMl   = s.na_small  * ML.small + s.na_large  * ML.large;
  return {
    beerL: (beerMl / 1000).toFixed(1),
    naL:   (naMl   / 1000).toFixed(1),
  };
}

function StatRow({ label, count, onMinus, readOnly }: {
  label: string; count: number; onMinus: () => Promise<void>; readOnly: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span>{label}</span>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <b>{count}</b>
        {!readOnly && <button style={{ padding: "4px 8px" }} onClick={onMinus}>−</button>}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { role } = useAuth(true);

  const [events, setEvents]           = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [profiles, setProfiles]       = useState<Profile[]>([]);
  const [stats, setStats]             = useState<Record<string, Stats>>({});
  const [loading, setLoading]         = useState(true);
  const [expanded, setExpanded]       = useState<string | null>(null);

  // Načti akce
  const loadEvents = useCallback(async () => {
    const { data } = await supabase
      .from("events")
      .select("*")
      .order("date", { ascending: false });

    const evts = data ?? [];
    setEvents(evts);

    // Defaultně vyber aktivní akci
    const active = evts.find(e => e.is_active);
    if (active) setSelectedEventId(active.id);
    else if (evts.length > 0) setSelectedEventId(evts[0].id);
  }, []);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const selectedEvent = events.find(e => e.id === selectedEventId) ?? null;

  // Načti statistiky pro vybranou akci
  const loadAll = useCallback(async () => {
    if (!selectedEventId) return;
    setLoading(true);

    const { data: p, error: pErr } = await supabase
      .from("profiles")
      .select("user_id,email,name,role");

    if (pErr) {
      alert("Chyba profily: " + pErr.message);
      setLoading(false);
      return;
    }

    const { data: d, error: dErr } = await supabase
      .from("drink_entries")
      .select("user_id,kind,size")
      .eq("event_id", selectedEventId);

    if (dErr) {
      alert("Chyba záznamy: " + dErr.message);
      setLoading(false);
      return;
    }

    const map: Record<string, Stats> = {};
    for (const row of d ?? []) {
      if (!map[row.user_id]) map[row.user_id] = { ...EMPTY_STATS };
      const key = `${row.kind}_${row.size}` as keyof Stats;
      if (key in map[row.user_id]) map[row.user_id][key] += 1;
    }

    // Zobraz jen uživatele kteří mají záznamy v této akci
    const activeUserIds = new Set(Object.keys(map));
    const filtered = (p ?? [])
      .filter(u => activeUserIds.has(u.user_id))
      .sort((a, b) => {
        const aKey = (a.name ?? a.email ?? a.user_id).toLowerCase();
        const bKey = (b.name ?? b.email ?? b.user_id).toLowerCase();
        return aKey.localeCompare(bKey, "cs");
      });

    setProfiles(filtered);
    setStats(map);
    setLoading(false);
  }, [selectedEventId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const resetAll = async () => {
    if (!selectedEventId) return;
    const ok1 = confirm("SMAZAT VŠE? Smaže to všechny záznamy v této akci.");
    if (!ok1) return;
    const ok2 = confirm("Opravdu opravdu? Tohle nejde vrátit.");
    if (!ok2) return;

    const { error } = await supabase
      .from("drink_entries")
      .delete()
      .eq("event_id", selectedEventId);

    if (error) return alert("Chyba při mazání: " + error.message);
    await loadAll();
    alert("Hotovo. Všechny záznamy byly smazány.");
  };

  const resetUser = async (userId: string, name: string) => {
    if (!selectedEventId) return;
    const ok = confirm(`Smazat všechny záznamy uživatele ${name} v této akci?`);
    if (!ok) return;

    const { error } = await supabase
      .from("drink_entries")
      .delete()
      .eq("user_id", userId)
      .eq("event_id", selectedEventId);

    if (error) return alert("Chyba při mazání: " + error.message);
    await loadAll();
    alert("Hotovo. Záznamy uživatele byly smazány.");
  };

  const totals = useMemo(() => {
    let beerMl = 0, naMl = 0;
    for (const uid of Object.keys(stats)) {
      const s = stats[uid];
      beerMl += s.beer_small * ML.small + s.beer_large * ML.large;
      naMl   += s.na_small  * ML.small + s.na_large  * ML.large;
    }
    return {
      beerL: (beerMl / 1000).toFixed(1),
      naL:   (naMl   / 1000).toFixed(1),
    };
  }, [stats]);

  if (role !== "admin") return <div className="container">Nemáš oprávnění.</div>;

  return (
    <main>
      {/* Hlavička */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <h1 className="h1" style={{ margin: 0 }}>Admin – Statistiky</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, opacity: 0.85 }}>
            Pivo: <b>{totals.beerL} L</b> • Nealko: <b>{totals.naL} L</b>
          </span>
          {selectedEvent?.is_active && (
            <button onClick={resetAll} style={{ background: "#dc2626" }}>
              Smazat vše
            </button>
          )}
        </div>
      </div>

      {/* Přepínač akcí */}
      {events.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <select
            value={selectedEventId ?? ""}
            onChange={(e) => {
              setSelectedEventId(e.target.value);
              setExpanded(null);
            }}
            style={{ width: "100%", fontSize: 14 }}
          >
            {events.map(ev => (
              <option key={ev.id} value={ev.id}>
                {ev.is_active ? "🟢 " : "📁 "}
                {ev.name} ({new Date(ev.date).toLocaleDateString("cs-CZ")})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Archivní banner */}
      {selectedEvent && !selectedEvent.is_active && (
        <div style={{
          marginTop: 8, padding: "6px 12px", borderRadius: 8, fontSize: 12,
          background: "rgba(107,114,128,0.15)", color: "var(--color-text-secondary)",
        }}>
          📁 Zobrazuješ archivní akci – záznamy jsou jen pro čtení
        </div>
      )}

      {/* Seznam uživatelů */}
      {loading ? (
        <div style={{ marginTop: 12 }}>Načítám…</div>
      ) : profiles.length === 0 ? (
        <div style={{ marginTop: 16, opacity: 0.6, fontSize: 14 }}>
          V této akci zatím nejsou žádné záznamy.
        </div>
      ) : (
        <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
          {profiles.map((p) => {
            const s = stats[p.user_id] ?? EMPTY_STATS;
            const { beerL, naL } = calcLitres(s);
            const isExpanded = expanded === p.user_id;

            return (
              <div
                key={p.user_id}
                className="cardTight"
                style={{ border: "1px solid #e5e5e5", padding: 0, overflow: "hidden" }}
              >
                <div
                  onClick={() => setExpanded(isExpanded ? null : p.user_id)}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    gap: 10, padding: "10px 12px", cursor: "pointer", userSelect: "none",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{displayName(p)}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                    <span style={{ fontSize: 13, opacity: 0.85 }}>
                      Pivo <b>{beerL} L</b> • Nealko <b>{naL} L</b>
                    </span>
                    <span style={{ fontSize: 12, opacity: 0.5 }}>{isExpanded ? "▲" : "▼"}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ borderTop: "1px solid #e5e5e5", padding: "10px 12px", display: "grid", gap: 8 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13 }}>
                      <StatRow label="Pivo 0,5" count={s.beer_large} readOnly={!selectedEvent?.is_active}
                        onMinus={async () => { await removeOne(p.user_id, "beer", "large", selectedEventId!); await loadAll(); }} />
                      <StatRow label="Pivo 0,3" count={s.beer_small} readOnly={!selectedEvent?.is_active}
                        onMinus={async () => { await removeOne(p.user_id, "beer", "small", selectedEventId!); await loadAll(); }} />
                      <StatRow label="Nealko 0,5" count={s.na_large} readOnly={!selectedEvent?.is_active}
                        onMinus={async () => { await removeOne(p.user_id, "na", "large", selectedEventId!); await loadAll(); }} />
                      <StatRow label="Nealko 0,3" count={s.na_small} readOnly={!selectedEvent?.is_active}
                        onMinus={async () => { await removeOne(p.user_id, "na", "small", selectedEventId!); await loadAll(); }} />
                    </div>
                    {selectedEvent?.is_active && (
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button
                          style={{ background: "#dc2626", padding: "6px 12px", fontSize: 13 }}
                          onClick={() => resetUser(p.user_id, displayName(p))}
                        >
                          Smazat vše
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

async function removeOne(userId: string, kind: "beer" | "na", size: "small" | "large", eventId: string) {
  const ok = confirm("Opravdu chceš odečíst jeden záznam?");
  if (!ok) return;

  const { data, error } = await supabase
    .from("drink_entries")
    .select("id")
    .eq("user_id", userId)
    .eq("kind", kind)
    .eq("size", size)
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) return alert("Chyba: " + error.message);
  if (!data || data.length === 0) return alert("Žádný záznam k odečtení");

  const { error: delError } = await supabase
    .from("drink_entries")
    .delete()
    .eq("id", data[0].id);

  if (delError) alert("Chyba mazání: " + delError.message);
}
