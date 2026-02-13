"use client";

import "./globals.css";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/useAuth";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";
  const { loading, role, signOut } = useAuth(!isLogin);

  return (
    <html lang="cs">
      <body>
        {isLogin ? (
          <div className="container">{children}</div>
        ) : loading ? (
          <div style={{ padding: 24 }}>Načítám…</div>
        ) : (
          <>
            <nav
              style={{
                padding: 16,
                borderBottom: "1px solid #e5e5e5",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Link href="/">Pivo</Link>

                {role === "admin" && (
                  <>
                    <Link href="/admin">Statistiky</Link>
                    <Link href="/admin/users">Uživatelé</Link>
                  </>
                )}
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ opacity: 0.75 }}>
                  Role: <b>{role}</b>
                </span>

                <button onClick={() => signOut()}>Odhlásit</button>
              </div>
            </nav>

            <div className="container">{children}</div>
          </>
        )}
      </body>
    </html>
  );
}
