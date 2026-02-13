import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { user_id } = await req.json();

    if (!user_id || typeof user_id !== "string") {
      return NextResponse.json({ error: "Chybí user_id." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return NextResponse.json(
        { error: "Chybí env proměnné na serveru." },
        { status: 500 }
      );
    }

    // 1) ověření volajícího (musí být admin)
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (!token) {
      return NextResponse.json({ error: "Chybí Authorization token." }, { status: 401 });
    }

    // klient pro ověření JWT (anon key)
    const client = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
    });

    const { data: userData, error: userErr } = await client.auth.getUser(token);
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Neplatný token." }, { status: 401 });
    }

    const callerId = userData.user.id;

    // admin klient (service role)
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const { data: prof, error: profErr } = await admin
      .from("profiles")
      .select("role")
      .eq("user_id", callerId)
      .single();

    if (profErr || prof?.role !== "admin") {
      return NextResponse.json({ error: "Nemáš oprávnění." }, { status: 403 });
    }

    // bezpečnost: nedovol smazat sám sebe
    if (user_id === callerId) {
      return NextResponse.json(
        { error: "Nemůžeš smazat sám sebe." },
        { status: 400 }
      );
    }

    // 2) smaž data uživatele (nejdřív závislé tabulky)
    const delEntries = await admin.from("drink_entries").delete().eq("user_id", user_id);
    if (delEntries.error) {
      return NextResponse.json({ error: "Záznamy: " + delEntries.error.message }, { status: 400 });
    }

    const delProfile = await admin.from("profiles").delete().eq("user_id", user_id);
    if (delProfile.error) {
      return NextResponse.json({ error: "Profil: " + delProfile.error.message }, { status: 400 });
    }

    // 3) smaž auth uživatele
    const delAuth = await admin.auth.admin.deleteUser(user_id);
    if (delAuth.error) {
      return NextResponse.json({ error: "Auth: " + delAuth.error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Neplatný request." }, { status: 400 });
  }
}
