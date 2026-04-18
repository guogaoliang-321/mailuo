"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PROJECT_STAGE_LABELS } from "@meridian/shared";
import { ArrowLeft, Send } from "lucide-react";
import Link from "next/link";

export default function NewProjectPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    region: "",
    scale: "",
    stage: "prospecting",
    decisionMakerClue: "",
    notes: "",
  });
  const [shareToCircle, setShareToCircle] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: circlesData } = useQuery({
    queryKey: ["circles"],
    queryFn: () => api.get<Array<{ id: string; name: string }>>("/circles"),
  });
  const circles = circlesData?.data ?? [];

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await api.post("/projects", { ...form, shareToCircle: shareToCircle || undefined });
    setLoading(false);
    if (res.success) {
      router.push(shareToCircle ? "/projects" : "/my");
    } else {
      setError(res.error ?? "创建失败");
    }
  };

  return (
    <div className="space-y-6 max-w-lg animate-fade-in page-enter">
      {/* Back + Title */}
      <div className="flex items-center gap-3">
        <Link
          href="/projects"
          className="flex items-center gap-1.5 text-[#D4A853] hover:text-[#D4A853]/80 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </Link>
      </div>

      <div>
        <h1 className="serif text-3xl font-bold text-white tracking-tight">
          贡献项目信息
        </h1>
        <p className="text-sm text-white/40 mt-1">项目信息将对圈内成员可见</p>
      </div>

      <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5">
        <div>
          <label className="block text-xs font-medium text-white/50 mb-2 tracking-wider uppercase">
            项目名称 / 代号
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            required
            className="input-dark w-full"
            placeholder="如：XX市某医院项目"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-white/50 mb-2 tracking-wider uppercase">
              区域
            </label>
            <input
              type="text"
              value={form.region}
              onChange={(e) => update("region", e.target.value)}
              required
              className="input-dark w-full"
              placeholder="如：西安市"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white/50 mb-2 tracking-wider uppercase">
              预估规模
            </label>
            <input
              type="text"
              value={form.scale}
              onChange={(e) => update("scale", e.target.value)}
              required
              className="input-dark w-full"
              placeholder="如：5000万"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-white/50 mb-2 tracking-wider uppercase">
            项目阶段
          </label>
          <select
            value={form.stage}
            onChange={(e) => update("stage", e.target.value)}
            className="input-dark w-full appearance-none"
          >
            {Object.entries(PROJECT_STAGE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-white/50 mb-2 tracking-wider uppercase">
            甲方 / 决策方线索
          </label>
          <input
            type="text"
            value={form.decisionMakerClue}
            onChange={(e) => update("decisionMakerClue", e.target.value)}
            className="input-dark w-full"
            placeholder="可选，仅圈内可见"
          />
          <p className="text-[11px] text-white/25 mt-1.5">
            此信息仅对圈内成员可见
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-white/50 mb-2 tracking-wider uppercase">
            备注
          </label>
          <textarea
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            rows={3}
            className="input-dark w-full resize-none"
          />
        </div>

        {/* Share to circle option */}
        <div>
          <label className="block text-xs font-medium text-white/50 mb-2 tracking-wider">
            同步到圈子（可选）
          </label>
          <select
            value={shareToCircle}
            onChange={(e) => setShareToCircle(e.target.value)}
            className="input-dark w-full appearance-none"
          >
            <option value="">仅保存到我的私有库</option>
            <option value="all">同步到所有圈子</option>
            {circles.map((c) => (
              <option key={c.id} value={c.id}>同步到「{c.name}」</option>
            ))}
          </select>
          <p className="text-[10px] text-white/20 mt-1">
            {shareToCircle ? "项目将同时保存到私有库和圈子共享池" : "默认仅存私有库，随时可在「我的」中同步到圈子"}
          </p>
        </div>

        {error && (
          <div className="text-sm text-[#FF375F] bg-[#FF375F]/10 border border-[#FF375F]/20 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-gold w-full flex items-center justify-center gap-2"
        >
          {loading ? (
            <span className="text-sm">提交中...</span>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>提交项目</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
