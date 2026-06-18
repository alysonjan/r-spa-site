"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Form = {
  email: string;
  password: string;
  confirm: string;

  first_name: string;
  last_name: string;
  phone: string;

  month?: string;
  day?: string;
  year?: string;
  street?: string;
  city?: string;
  postal?: string;
  country?: string;
  marketing_email?: boolean;
};

export default function SignUpForm() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<"form" | "code">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");

  const [form, setForm] = useState<Form>({
    email: "",
    password: "",
    confirm: "",
    first_name: "",
    last_name: "",
    phone: "",
    month: "",
    day: "",
    year: "",
    street: "",
    city: "",
    postal: "",
    country: "",
    marketing_email: true,
  });

  const onChange =
    (k: keyof Form) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.type === "checkbox" ? !!e.target.checked : e.target.value;
      setForm((s) => ({ ...s, [k]: v }));
    };

  const buildDob = () => {
    const yyyy = (form.year || "").trim();
    const mm = (form.month || "").trim();
    const dd = (form.day || "").trim();
    if (yyyy && mm && dd) return `${yyyy.padStart(4, "0")}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    return null;
  };

  // Step 1: 发送邮箱验证码
  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.password.length < 6) return setError("Password must be at least 6 characters.");
    if (form.password !== form.confirm) return setError("Passwords do not match.");

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: form.email.trim(),
        options: {
          shouldCreateUser: true,
          data: {
            first_name: form.first_name,
            last_name: form.last_name,
            phone: form.phone,
            dob: buildDob(),
            address: {
              street: form.street,
              city: form.city,
              postal: form.postal,
              country: form.country,
            },
            marketing_email: !!form.marketing_email,
          },
        },
      });
      if (error) throw error;
      setStep("code");
    } catch (err: any) {
      setError(err.message || "Failed to send code");
    } finally {
      setLoading(false);
    }
  }

  // Step 2: 验证 6 位验证码 → 设置密码 → 写入资料 → 登出 → 去 /sign-in
  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // Try verifying with different token types because Supabase triggers different templates
      let verifyRes = await supabase.auth.verifyOtp({
        email: form.email.trim(),
        token: code.trim(),
        type: "email",
      });
      
      if (verifyRes.error) {
        verifyRes = await supabase.auth.verifyOtp({
          email: form.email.trim(),
          token: code.trim(),
          type: "signup",
        });
      }
      
      if (verifyRes.error) {
        verifyRes = await supabase.auth.verifyOtp({
          email: form.email.trim(),
          token: code.trim(),
          type: "magiclink",
        });
      }
      
      const { data, error } = verifyRes;
      if (error) throw error;
      if (!data.session) throw new Error("No session after OTP verification.");

      // 设置用户密码
      const { error: updErr } = await supabase.auth.updateUser({ password: form.password });
      if (updErr) throw updErr;

      // 资料入库（RLS：携带 access_token）
      const upsertResponse = await fetch("/api/profile/upsert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({
          first_name: form.first_name,
          last_name: form.last_name,
          phone: form.phone,
          dob: buildDob(),
          street: form.street,
          city: form.city,
          postal: form.postal,
          country: form.country,
          marketing_email: !!form.marketing_email,
        }),
        cache: "no-store",
      });
      if (!upsertResponse.ok) throw new Error("Failed to upsert profile");

      // 强制走登录页
      await supabase.auth.signOut();
      const redirectParam = searchParams.get("redirect");
      const signInUrl = redirectParam
        ? `/sign-in?verified=1&redirect=${encodeURIComponent(redirectParam)}`
        : "/sign-in?verified=1";
      window.location.href = signInUrl;
    } catch (err: any) {
      setError(err.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  // ---- UI ----
  if (step === "code") {
    return (
      <form onSubmit={handleVerifyCode} className="space-y-4 max-w-xl">
        <h2 className="h2">Verify your email</h2>
        <p className="text-sm text-zinc-600">
          We’ve sent a verification code to <b>{form.email}</b>. (Check spam if not received.)
        </p>
        <div>
          <label className="block text-sm mb-1">Verification code</label>
          <input
            className="w-full"
            inputMode="numeric"
            pattern="[0-9]*"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div className="flex gap-3">
          <button className="btn btn-primary" disabled={loading}>
            {loading ? "Verifying..." : "Verify & complete"}
          </button>
          <button
            type="button"
            className="underline text-sm"
            onClick={async () => {
              setError(null);
              setLoading(true);
              try {
                await supabase.auth.signInWithOtp({
                  email: form.email.trim(),
                  options: { shouldCreateUser: true },
                });
              } catch (err: any) {
                setError(err.message || "Failed to resend code");
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
          >
            Resend code
          </button>
        </div>
        <p className="text-xs text-zinc-500">You can resend once every 60 seconds.</p>
      </form>
    );
  }

  return (
    <form onSubmit={handleSendCode} className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1">First name *</label>
          <input className="w-full" required value={form.first_name} onChange={onChange("first_name")} />
        </div>
        <div>
          <label className="block text-sm mb-1">Last name *</label>
          <input className="w-full" required value={form.last_name} onChange={onChange("last_name")} />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm mb-1">Email *</label>
          <input className="w-full" type="email" required value={form.email} onChange={onChange("email")} />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm mb-1">Phone *</label>
          <input className="w-full" inputMode="tel" required value={form.phone} onChange={onChange("phone")} />
        </div>

        <div>
          <label className="block text-sm mb-1">Password *</label>
          <input className="w-full" type="password" required value={form.password} onChange={onChange("password")} />
        </div>
        <div>
          <label className="block text-sm mb-1">Confirm password *</label>
          <input className="w-full" type="password" required value={form.confirm} onChange={onChange("confirm")} />
        </div>

        {/* DOB */}
        <div>
          <label className="block text-sm mb-1">Month</label>
          <input className="w-full" placeholder="MM" inputMode="numeric" pattern="[0-9]*" maxLength={2}
                 value={form.month} onChange={onChange("month")} />
        </div>
        <div>
          <label className="block text-sm mb-1">Day</label>
          <input className="w-full" placeholder="DD" inputMode="numeric" pattern="[0-9]*" maxLength={2}
                 value={form.day} onChange={onChange("day")} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">Year</label>
          <input className="w-full" placeholder="YYYY" inputMode="numeric" pattern="[0-9]*" maxLength={4}
                 value={form.year} onChange={onChange("year")} />
        </div>

        {/* Address */}
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">Street</label>
          <input className="w-full" value={form.street} onChange={onChange("street")} />
        </div>
        <div>
          <label className="block text-sm mb-1">City</label>
          <input className="w-full" value={form.city} onChange={onChange("city")} />
        </div>
        <div>
          <label className="block text-sm mb-1">ZIP/Postal code</label>
          <input className="w-full" value={form.postal} onChange={onChange("postal")} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">Country</label>
          <input className="w-full" value={form.country} onChange={onChange("country")} />
        </div>

        <div className="md:col-span-2">
          <label className="flex items-start gap-3 text-sm rounded border p-4">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4"
              checked={!!form.marketing_email}
              onChange={onChange("marketing_email")}
            />
            <span className="leading-5">Yes, I&apos;d like to receive updates by email</span>
          </label>
        </div>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <button className="btn btn-primary w-full sm:w-auto" disabled={loading}>
        {loading ? "Sending code..." : "Create account"}
      </button>

      <p className="text-sm text-zinc-600">
        Already have an account? <a href="/sign-in" className="underline">Sign in</a>
      </p>
    </form>
  );
}