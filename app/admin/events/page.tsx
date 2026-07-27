"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/useAuth";

type Event = {
  id: string;
  name: string;
  date: string;
  is_active: boolean;
  created_at: string;
};

export default function AdminEventsPage() {
  const { role } = useAuth(true);

  const [events, setEvents]   = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName]       = useState("");
  const [date, setDate]       = useState("");
  const [saving, setSaving]   = useState(false);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("date", { ascending: false });

    if (error) {
      alert("Chyba načtení akcí: " + error.message);
      setLoading(false);
      return;
    }
    setEvents(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  if (role !== "admin") return <div className="container">Nemáš oprávnění.</div>;

  const createEvent = async () => {
    if (!name.trim()) return alert("Zadej název akce.");
    if (!date) return alert("Zadej datum akce.");

    setSaving(true);

    // Nová akce je vždy neaktivní – admin ji musí ručně aktivovat
    const { error } = await supabase
      .from("events")
      .insert({ name: name.trim(), date, is_active: false });

    if (error) {
      alert("Chyba vytvoření akce: " + error.message);
      setSaving(false);
      return;
    }

    setName("");
    setDate("");
    setSaving(false);
    loadEvents();
  };

  const activateEvent = async (id: string, eventName: string) => {
    const ok = confirm(`Aktivovat akci "${eventName}"? Tím se deaktivuje aktuálně aktivní akce.`);
    if (!ok) return;

    // Deaktivuj všechny akce
    const { error: deErr } = await supabase
      .from("events")
      .update({ is_active: false })
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (deErr) return alert("Chyba: " + deErr.message);

    // Aktivuj vybranou
    const { error } = await supabase
      .from("events")
      .update({ is_active: true })
      .eq("id", id);

    if (error) return alert("Chyba aktivace: " + error.message);
    loadEvents();
  };

  const deactivateEvent = async (eventName: string) => {
    const ok = confirm(`Uzavřít akci "${eventName}"? Uživatelé ji budou vidět jen jako archiv.`);
    if (!ok) return;

    const { error } = await supabase
      .from("events")
      .update({ is_active: false })
      .eq("is_active", true);

    if (error) return alert("Chyba uzavření: " + error.message);
    loadEvents();
  };

  const deleteEvent = async (id: string, eventName: string) => {
    const ok1 = confirm(`Smazat akci "${eventName}"? Smažou se i všechny záznamy k ní.`);
    if (!ok1) return;
    const ok2 = confirm("Opravdu? Tohle nejde vrátit.");
    if (!ok2) return;

    // Smaž záznamy
    const { error: dErr } = await supabase
      .from("drink_entries")
      .delete()
      .eq("event_id", id);

    if (dErr) return alert("Chyba mazání záznamů: " + dErr.message);

    // Smaž akci
    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", id);

    if (error) return alert("Chyba mazání akce: " + error.message);
    loadEvents();
  };

  const activeEvent = events.find(e => e.is_active);

  return (
    <main>
      <h1 className="h1">Správa akcí</h1>

      {/* Vytvoření nové akce */}
      <div
        className="cardTight"
        style={{ border: "1px solid #e5e5e5", padding: 12, marginTop: 14, display: "grid", gap: 10 }}
      >
        <b>Vytvořit novou akci</b>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            placeholder="Název akce (např. Oslava narozenin)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ flex: 2, minWidth: 180 }}
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ flex: 1, minWidth: 140 }}
          />
          <button onClick={createEvent} disabled={saving} style={{ flexShrink: 0 }}>
            {saving ? "Ukládám…" : "Vytvořit"}
          </button>
        </div>
      </div>

      {/* Seznam akcí */}
      <div style={{ marginTop: 24 }}>
        <b>Existující akce</b>

        {loading && <div style={{ marginTop: 10 }}>Načítám…</div>}

        {!loading && events.length === 0 && (
          <div style={{ marginTop: 10, opacity: 0.6 }}>Žádné akce.</div>
        )}

        {!loading && (
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {events.map((e) => (
              <div
                key={e.id}
                className="cardTight"
                style={{
                  border: e.is_active ? "2px solid #16a34a" : "1px solid #e5e5e5",
                  padding: 12, display: "grid", gap: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>
                      {e.is_active && <span style={{ color: "#16a34a", marginRight: 6 }}>● </span>}
                      {e.name}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>
                      {new Date(e.date).toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" })}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {!e.is_active && (
                      <button
                        style={{ padding: "6px 10px", fontSize: 12, background: "#16a34a" }}
                        onClick={() => activateEvent(e.id, e.name)}
                      >
                        Aktivovat
                      </button>
                    )}
                    {e.is_active && (
                      <button
                        style={{ padding: "6px 10px", fontSize: 12, background: "#6b7280" }}
                        onClick={() => deactivateEvent(e.name)}
                      >
                        Uzavřít
                      </button>
                    )}
                    <button
                      style={{ padding: "6px 10px", fontSize: 12, background: "#dc2626" }}
                      onClick={() => deleteEvent(e.id, e.name)}
                    >
                      Smazat
                    </button>
                  </div>
                </div>
                {e.is_active && (
                  <div style={{ fontSize: 12, color: "#16a34a" }}>
                    ✓ Aktivní – uživatelé nyní klikají do této akce
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {!activeEvent && !loading && (
        <div style={{ marginTop: 16, padding: 12, borderRadius: 10, background: "rgba(234,88,12,0.1)", fontSize: 13, color: "#EA580C" }}>
          ⚠️ Žádná akce není aktivní. Uživatelé vidí jen archiv.
        </div>
      )}
    </main>
  );
}
