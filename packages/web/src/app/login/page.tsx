"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MeshBG } from "@/components/mesh-bg";
import { Mail, Lock, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const { login, user } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) {
    router.replace("/");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const err = await login(email, password);
    setLoading(false);
    if (err) {
      setError(err);
    } else {
      router.replace("/");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0A0A12]">
      <MeshBG />

      <div className="w-full max-w-sm relative z-10 animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="serif text-5xl font-light tracking-[0.2em] text-[#D4A853] mb-2">
            脉 络
          </h1>
          <p className="text-xs tracking-[0.4em] text-white/30 uppercase">
            MERIDIAN
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="glass-card p-8 space-y-5"
        >
          <div>
            <label className="block text-xs font-medium text-white/50 mb-2 tracking-wider uppercase">
              邮箱
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-dark pl-10 w-full"
                placeholder="your@email.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-white/50 mb-2 tracking-wider uppercase">
              密码
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="input-dark pl-10 w-full"
                placeholder="至少 8 位"
              />
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-gold w-full py-3 flex items-center justify-center gap-2"
          >
            {loading ? (
              "登录中..."
            ) : (
              <>
                登录
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <p className="text-xs text-white/25 text-center pt-1">
            没有账号？需要{" "}
            <Link
              href="/invite"
              className="text-[#D4A853]/70 hover:text-[#D4A853] transition-colors"
            >
              邀请码
            </Link>{" "}
            注册
          </p>
        </form>

        <p className="text-center text-[11px] text-white/20 mt-8 tracking-widest">
          私密圈层资源网络平台
        </p>
      </div>
    </div>
  );
}
