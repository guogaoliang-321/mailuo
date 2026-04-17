"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Link from "next/link";
import { MeshBG } from "@/components/mesh-bg";
import { Mail, Lock, User, Ticket, ArrowRight } from "lucide-react";

export default function InvitePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    password: "",
    displayName: "",
    inviteCode: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await api.post("/auth/register", form);
    setLoading(false);
    if (res.success) {
      router.replace("/");
    } else {
      setError(res.error ?? "注册失败");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0A0A12]">
      <MeshBG />

      <div className="w-full max-w-sm relative z-10 animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="serif text-4xl font-light tracking-[0.2em] text-[#D4A853] mb-2">
            加入脉络
          </h1>
          <p className="text-xs tracking-[0.3em] text-white/30">
            邀请制注册
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="glass-card p-8 space-y-5"
        >
          <div>
            <label className="block text-xs font-medium text-white/50 mb-2 tracking-wider">
              邀请码
            </label>
            <div className="relative">
              <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                value={form.inviteCode}
                onChange={(e) => update("inviteCode", e.target.value)}
                required
                className="input-dark pl-10 w-full"
                placeholder="请输入邀请码"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-white/50 mb-2 tracking-wider">
              显示名称
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                value={form.displayName}
                onChange={(e) => update("displayName", e.target.value)}
                required
                className="input-dark pl-10 w-full"
                placeholder="你在脉络中的显示名"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-white/50 mb-2 tracking-wider">
              邮箱
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                required
                className="input-dark pl-10 w-full"
                placeholder="your@email.com"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-white/50 mb-2 tracking-wider">
              设置密码
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="password"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
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
              "注册中..."
            ) : (
              <>
                注册
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <p className="text-xs text-white/25 text-center pt-1">
            已有账号？{" "}
            <Link
              href="/login"
              className="text-[#D4A853]/70 hover:text-[#D4A853] transition-colors"
            >
              登录
            </Link>
          </p>
        </form>

        <p className="text-center text-[11px] text-white/20 mt-8 tracking-widest">
          私密圈层资源网络平台
        </p>
      </div>
    </div>
  );
}
