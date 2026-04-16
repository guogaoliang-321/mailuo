"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { CLOSENESS_LABELS, VISIBILITY_LABELS } from "@meridian/shared";
import { ArrowLeft, Send } from "lucide-react";
import Link from "next/link";

export default function NewRelationshipPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    alias: "",
    domainTags: "",
    levelTags: "",
    closeness: 3,
    visibility: "circle",
    notes: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (field: string, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await api.post("/relationships", {
      alias: form.alias,
      domainTags: form.domainTags.split(/[,\u3001\s]+/).filter(Boolean),
      levelTags: form.levelTags.split(/[,\u3001\s]+/).filter(Boolean),
      closeness: form.closeness,
      visibility: form.visibility,
      notes: form.notes,
    });

    setLoading(false);
    if (res.success) {
      router.push("/relationships");
    } else {
      setError(res.error ?? "创建失败");
    }
  };

  const VISIBILITY_CONFIG: Record<
    string,
    { label: string; activeClass: string }
  > = {
    designated: {
      label: VISIBILITY_LABELS["designated"] ?? "指定",
      activeClass:
        "bg-[#FF375F]/20 text-[#FF375F] border-[#FF375F]/50 shadow-[0_0_12px_rgba(255,55,95,0.2)]",
    },
    circle: {
      label: VISIBILITY_LABELS["circle"] ?? "圈内",
      activeClass:
        "bg-[#5AC8FA]/20 text-[#5AC8FA] border-[#5AC8FA]/50 shadow-[0_0_12px_rgba(90,200,250,0.2)]",
    },
    fuzzy: {
      label: VISIBILITY_LABELS["fuzzy"] ?? "模糊",
      activeClass:
        "bg-white/15 text-white/70 border-white/30",
    },
  };

  return (
    <div className="space-y-6 max-w-lg animate-fade-in page-enter">
      {/* Back + Title */}
      <div className="flex items-center gap-3">
        <Link
          href="/relationships"
          className="flex items-center gap-1.5 text-[#D4A853] hover:text-[#D4A853]/80 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </Link>
      </div>

      <div>
        <h1 className="serif text-3xl font-bold text-white tracking-tight">
          登记关系
        </h1>
        <p className="text-sm text-white/40 mt-1">
          登记你的人脉资源，不要求真实姓名
        </p>
      </div>

      <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5">
        {/* Alias */}
        <div>
          <label className="block text-xs font-medium text-white/50 mb-2 tracking-wider uppercase">
            代号 / 备注名
          </label>
          <input
            type="text"
            value={form.alias}
            onChange={(e) => update("alias", e.target.value)}
            required
            className="input-dark w-full"
            placeholder="不要求真实姓名，如：张总、卫健委李处"
          />
        </div>

        {/* Domain tags */}
        <div>
          <label className="block text-xs font-medium text-white/50 mb-2 tracking-wider uppercase">
            领域标签
          </label>
          <input
            type="text"
            value={form.domainTags}
            onChange={(e) => update("domainTags", e.target.value)}
            required
            className="input-dark w-full"
            placeholder="用逗号分隔，如：医疗卫生,教育"
          />
          <p className="text-[11px] text-white/25 mt-1.5">
            关系所属的行业或领域
          </p>
        </div>

        {/* Level tags */}
        <div>
          <label className="block text-xs font-medium text-white/50 mb-2 tracking-wider uppercase">
            层级标签
          </label>
          <input
            type="text"
            value={form.levelTags}
            onChange={(e) => update("levelTags", e.target.value)}
            className="input-dark w-full"
            placeholder="如：厅局级,总经理级"
          />
        </div>

        {/* Closeness dots */}
        <div>
          <label className="block text-xs font-medium text-white/50 mb-3 tracking-wider uppercase">
            亲疏程度
          </label>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-white/30">仅认识</span>
            <div className="flex gap-3 flex-1 justify-center">
              {[1, 2, 3].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => update("closeness", level)}
                  className="flex flex-col items-center gap-1.5 group"
                >
                  <span
                    className={`w-5 h-5 rounded-full transition-all ${
                      form.closeness >= level
                        ? "bg-[#D4A853] shadow-[0_0_10px_rgba(212,168,83,0.8)] scale-110"
                        : "bg-white/15 group-hover:bg-white/25"
                    }`}
                  />
                  <span
                    className={`text-[10px] transition-colors ${
                      form.closeness === level
                        ? "text-[#D4A853]"
                        : "text-white/30"
                    }`}
                  >
                    {CLOSENESS_LABELS[level] ?? level}
                  </span>
                </button>
              ))}
            </div>
            <span className="text-[11px] text-white/30">核心资源</span>
          </div>
        </div>

        {/* Visibility toggle buttons */}
        <div>
          <label className="block text-xs font-medium text-white/50 mb-2 tracking-wider uppercase">
            可见范围
          </label>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(VISIBILITY_CONFIG).map(([key, config]) => (
              <button
                key={key}
                type="button"
                onClick={() => update("visibility", key)}
                className={`py-2.5 rounded-xl text-xs font-medium border transition-all ${
                  form.visibility === key
                    ? config.activeClass
                    : "bg-white/5 text-white/40 border-white/10 hover:bg-white/10 hover:text-white/60"
                }`}
              >
                {config.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-white/50 mb-2 tracking-wider uppercase">
            备注
          </label>
          <textarea
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            rows={3}
            className="input-dark w-full resize-none"
            placeholder="补充说明（可选）"
          />
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
              <span>提交</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
