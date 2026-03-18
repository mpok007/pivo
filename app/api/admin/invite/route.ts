import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Načteme env proměnné jednou při startu modulu, ne při každém requestu
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey || !serviceKey) {
  throw new Error("Chybí Supabase env proměnné (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY).");
}

// Po kontrole výše TypeScript stále považuje proměnné za `string | undefined`.
// Přetypujeme je na `string`, aby to prošlo type checkerem.
const _supabaseUrl = supabaseUrl as string;
const _anonKey     = anonKey as string;
const _serviceKey  = serviceKey as string;

export async function POST(req: Request) {
  try {
    const { email, role } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Chybí email." }, { status: 400 });
    }

    // 1) ověření volajícího (musí být admin)
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (!token) {
      return NextResponse.json({ error: "Chybí Authorization token." }, { status: 401 });
    }

    // klient pro ověření JWT (anon key)
    const client = createClient(_supabaseUrl, _anonKey, {
      auth: { persistSession: false },
    });

    const { data: userData, error: userErr } = await client.auth.getUser(token);
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Neplatný token." }, { status: 401 });
    }

    const callerId = userData.user.id;

    // admin klient (service role)
    const admin = createClient(_supabaseUrl, _serviceKey, {
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

    // 2) Pošli invite email (Supabase pošle pozvánku)
    const { data, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: "https://pivo.mpok.cz/set-password",
    });

    if (inviteErr) {
      return NextResponse.json({ error: inviteErr.message }, { status: 400 });
    }

    const userId = data.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Nepodařilo se získat user id." }, { status: 500 });
    }

    // 3) Založ profil (role) – service role obchází RLS
    const safeRole = role === "admin" ? "admin" : "user";
    const { error: profileErr } = await admin.from("profiles").upsert({
      user_id: userId,
      email,
      role: safeRole,
    });

    if (profileErr) {
      return NextResponse.json({ error: "Profil: " + profileErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Neplatný request." }, { status: 400 });
  }
}
