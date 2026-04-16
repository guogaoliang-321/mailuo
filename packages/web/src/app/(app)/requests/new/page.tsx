"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Link from "next/link";

interface ProjectItem {
  id: string;
  name: string;
  region: string;
}

function NewRequestForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedProjectId = searchParams.get("projectId") ?? "";

  const [form, setForm] = useState({
    title: "",
    description: "",
    targetProjectId: preselectedProjectId,
    urgent: false,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: projectsData } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.get<ProjectItem[]>("/projects"),
  });

  const projects = projectsData?.data ?? [];

  const update = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await api.post("/requests", {
      title: form.title,
      description: form.description,
      targetProjectId: form.targetProjectId || null,
      relayPath: [],
    });

    setLoading(false);
    if (res.success) {
      router.push("/requests");
    } else {
      setError(res.error ?? "创建失败");
    }
  };

  return (
    <div className="space-y-5 max-w-lg page-enter">
      <div>
        <Link href="/requests" className="text-sm text-[#D4A853]/70 hover:text-[#D4A853] transition-colors">← 返回对接请求</Link>
        <h1 className="serif text-xl font-bold text-white/95 mt-2">发起对接请求</h1>
        <p className="text-sm text-white/40 mt-1">描述你需要的资源，系统将帮你找到路径</p>
      </div>

      <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5" style={{ marginBottom: 0 }}>
        {/* Urgent toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => update("urgent", !form.urgent)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
              form.urgent
                ? "bg-[#FF375F]/15 text-[#FF375F] border border-[#FF375F]/30"
                : "bg-white/5 text-white/40 border border-white/10 hover:bg-white/8"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${form.urgent ? "bg-[#FF375F] animate-pulse" : "bg-white/20"}`} />
            {form.urgent ? "🔴 紧急" : "标记为紧急"}
          </button>
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-medium text-white/50 mb-2">请求标题</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            required
            className="input-dark"
            placeholder="如：急需西安卫健系统决策层关系"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-white/50 mb-2">详细描述</label>
          <textarea
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            required
            rows={4}
            className="input-dark resize-none"
            placeholder="描述你需要什么资源、用于什么项目、期望的对接方式..."
          />
        </div>

        {/* Link to project */}
        <div>
          <label className="block text-xs font-medium text-white/50 mb-2">关联项目（可选）</label>
          <select
            value={form.targetProjectId}
            onChange={(e) => update("targetProjectId", e.target.value)}
            className="input-dark appearance-none"
          >
            <option value="">不关联项目</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name} — {p.region}</option>
            ))}
          </select>
          <p className="text-[10px] text-white/20 mt-1">关联后，项目贡献者将自动记入功劳链</p>
        </div>

        {error && (
          <div className="text-sm text-[#FF375F] bg-[#FF375F]/10 border border-[#FF375F]/20 rounded-xl px-4 py-2.5">
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-gold w-full py-3 flex items-center justify-center gap-2">
          {loading ? "提交中..." : "⇌ 发起对接"}
        </button>
      </form>
    </div>
  );
}

export default function NewRequestPage() {
  return (
    <Suspense fallback={<div className="text-white/30 text-sm">加载中...</div>}>
      <NewRequestForm />
    </Suspense>
  );
}
