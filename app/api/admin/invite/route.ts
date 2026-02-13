import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { email, role } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Chybí email." }, { status: 400 });
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceKey || !url) {
      return NextResponse.json(
        { error: "Chybí serverové env proměnné." },
        { status: 500 }
      );
    }

    // Admin (server) client
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });

    // 1) Pošli invite email (Supabase pošle pozvánku)
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: "https://pivo.mpok.cz/login",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const userId = data.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Nepodařilo se získat user id." }, { status: 500 });
    }

    // 2) Založ profil (role) – service role obchází RLS
    const safeRole = role === "admin" ? "admin" : "user";
    const { error: pErr } = await admin.from("profiles").upsert({
      user_id: userId,
      email,
      role: safeRole,
    });

    if (pErr) {
      return NextResponse.json({ error: "Profil: " + pErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Neplatný request." }, { status: 400 });
  }
}
