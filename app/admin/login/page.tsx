// app/admin/login/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin login",
  robots: { index: false },
};

// 保证始终 SSR，避免被预渲染
export const dynamic = "force-dynamic";

export default function AdminLoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const next = (searchParams?.next && decodeURIComponent(searchParams.next)) || "/admin";

  return (
    <section className="section">
      <div className="container max-w-md">
        <h1 className="h2 mb-4">Admin sign in</h1>

        <form action="/api/admin/login" method="post" className="space-y-4">
          <input type="hidden" name="next" value={next} />
          
          {searchParams?.error === "invalid_passcode" && (
            <div className="bg-red-50 text-red-600 p-3 rounded text-sm border border-red-200">
              Invalid passcode. Please try again.
            </div>
          )}

          {searchParams?.logged_out === "1" && (
            <div className="bg-green-50 text-green-600 p-3 rounded text-sm border border-green-200">
              You have been successfully logged out.
            </div>
          )}

          <label htmlFor="passcode">Passcode</label>
          <input
            id="passcode"
            name="passcode"
            type="password"
            required
            className="w-full border border-ink/20 bg-paper px-3 py-2 focus:outline-none focus:border-ink"
            autoFocus
          />

          <button className="btn btn-primary w-full" type="submit">
            Sign in
          </button>
        </form>
      </div>
    </section>
  );
}