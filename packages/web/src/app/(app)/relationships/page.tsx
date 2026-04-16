"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Link from "next/link";
import { CLOSENESS_LABELS, VISIBILITY_LABELS } from "@meridian/shared";
import { useState } from "react";
import { Search, Users } from "lucide-react";

interface RelItem {
  id: string;
  alias?: string;
  domainTags: string[];
  levelTags: string[];
  regionTags?: string[];
  closeness?: number;
  visibility: string;
  ownerName?: string;
  description?: string;
  _fuzzy?: boolean;
}

const VISIBILITY_PILL: Record<string, string> = {
  designated:
    "bg-[#FF375F]/20 text-[#FF375F] border border-[#FF375F]/30",
  circle:
    "bg-[#5AC8FA]/20 text-[#5AC8FA] border border-[#5AC8FA]/30",
  fuzzy:
    "bg-white/10 text-white/40 border border-white/10",
};

const DOMAIN_AVATAR_COLORS: Record<string, string> = {
  医疗卫生: "bg-[#30D158]/20 text-[#30D158]",
  教育: "bg-[#5AC8FA]/20 text-[#5AC8FA]",
  政府: "bg-[#FF9F0A]/20 text-[#FF9F0A]",
  金融: "bg-[#D4A853]/20 text-[#D4A853]",
  default: "bg-[#5AC8FA]/20 text-[#5AC8FA]",
};

function getAvatarColor(domainTags: string[]): string {
  for (const tag of domainTags) {
    if (DOMAIN_AVATAR_COLORS[tag]) return DOMAIN_AVATAR_COLORS[tag];
  }
  return DOMAIN_AVATAR_COLORS.default;
}

export default function RelationshipsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["relationships"],
    queryFn: () => api.get<RelItem[]>("/relationships"),
  });
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"all" | "mine" | "fuzzy">("all");

  const allItems = data?.data ?? [];
  const items = allItems.filter((r) => {
    const matchSearch =
      !search ||
      (r.alias ?? "").toLowerCase().includes(search.toLowerCase()) ||
      r.domainTags.some((t) =>
        t.toLowerCase().includes(search.toLowerCase()),
      ) ||
      r.levelTags.some((t) =>
        t.toLowerCase().includes(search.toLowerCase()),
      );
    const matchView =
      view === "all" ||
      (view === "mine" && !r._fuzzy) ||
      (view === "fuzzy" && r._fuzzy);
    return matchSearch && matchView;
  });

  const fuzzyCount = allItems.filter((r) => r._fuzzy).length;

  return (
    <div className="space-y-6 animate-fade-in page-enter">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="serif text-3xl font-bold text-white tracking-tight">
            关系池
          </h1>
          <p className="text-sm text-white/40 mt-1">
            {allItems.length} 个关系资源
            {fuzzyCount > 0 && (
              <span className="text-white/25">
                {" "}(含 {fuzzyCount} 个跨圈模糊资源)
              </span>
            )}
          </p>
        </div>
        <Link href="/relationships/new" className="btn-gold text-sm px-4 py-2">
          + 登记关系
        </Link>
      </div>

      {/* Info card */}
      <div className="glass-card px-4 py-3 border-[#5AC8FA]/20">
        <p className="text-xs text-white/50 leading-relaxed">
          🔒 模糊可见资源仅显示领域与层级，需通过中间人对接方可获取详细信息
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索代号、领域或层级..."
          className="input-dark pl-11 w-full"
        />
      </div>

      {/* View tabs */}
      <div className="flex gap-2">
        {(
          [
            { key: "all", label: "全部" },
            { key: "mine", label: "我的" },
            { key: "fuzzy", label: "跨圈" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setView(tab.key)}
            className={`pill transition-all ${
              view === tab.key
                ? "bg-[#D4A853]/20 text-[#D4A853] border border-[#D4A853]/40 shadow-[0_0_12px_rgba(212,168,83,0.2)]"
                : "btn-glass text-white/60 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card h-24 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-16 text-center">
          <Users className="w-12 h-12 text-white/20 mb-4" />
          <p className="text-sm font-medium text-white/40">暂无关系信息</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <RelationshipCard key={r.id} item={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function RelationshipCard({ item: r }: { item: RelItem }) {
  if (r._fuzzy) {
    return (
      <div className="glass-card p-4 border-dashed border-white/10">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
            <span className="text-white/20 text-lg">?</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {r.domainTags.map((t) => (
                <span
                  key={t}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-[#5AC8FA]/15 text-[#5AC8FA] border border-[#5AC8FA]/20"
                >
                  {t}
                </span>
              ))}
              {r.levelTags.map((t) => (
                <span
                  key={t}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-white/40 border border-white/10"
                >
                  {t}
                </span>
              ))}
            </div>
            <p className="text-xs text-white/25">跨圈资源 — 需通过中间人对接</p>
          </div>
          <Link
            href="/requests/new"
            className="shrink-0 btn-glass text-xs text-white/60 hover:text-white px-3 py-1.5"
          >
            对接 →
          </Link>
        </div>
      </div>
    );
  }

  const avatarColor = getAvatarColor(r.domainTags);
  const visibilityLabel = VISIBILITY_LABELS[r.visibility] ?? r.visibility;

  return (
    <div className="glass-card p-4">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${avatarColor}`}
        >
          {(r.alias ?? "?").charAt(0)}
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="serif font-bold text-sm text-white">{r.alias}</h3>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                VISIBILITY_PILL[r.visibility] ??
                "bg-white/10 text-white/40 border border-white/10"
              }`}
            >
              {visibilityLabel}
            </span>
          </div>

          {r.description && (
            <p className="serif text-xs text-white/50 mt-1 line-clamp-1">
              {r.description}
            </p>
          )}

          <div className="flex flex-wrap gap-1.5 mt-2">
            {r.domainTags.map((t) => (
              <span
                key={t}
                className="text-[11px] px-2 py-0.5 rounded-full bg-[#5AC8FA]/15 text-[#5AC8FA] border border-[#5AC8FA]/20"
              >
                {t}
              </span>
            ))}
            {r.levelTags.map((t) => (
              <span
                key={t}
                className="text-[11px] px-2 py-0.5 rounded-full bg-[#FF9F0A]/15 text-[#FF9F0A] border border-[#FF9F0A]/20"
              >
                {t}
              </span>
            ))}
            {(r.regionTags ?? []).map((t) => (
              <span
                key={t}
                className="text-[11px] px-2 py-0.5 rounded-full bg-[#30D158]/15 text-[#30D158] border border-[#30D158]/20"
              >
                {t}
              </span>
            ))}
          </div>

          {r.ownerName && (
            <p className="text-[10px] text-white/25 mt-1.5">
              by {r.ownerName}
            </p>
          )}
        </div>

        {/* Right side */}
        <div className="shrink-0 flex flex-col items-end gap-2">
          {r.closeness != null && <ClosenessDots value={r.closeness} />}
          <Link
            href="/requests/new"
            className="btn-glass text-xs text-white/60 hover:text-white px-3 py-1.5"
          >
            对接 →
          </Link>
        </div>
      </div>
    </div>
  );
}

function ClosenessDots({ value }: { value: number }) {
  return (
    <div className="flex gap-1 items-center">
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={`w-2 h-2 rounded-full transition-all ${
            i <= value
              ? "bg-[#D4A853] shadow-[0_0_6px_rgba(212,168,83,0.7)]"
              : "bg-white/15"
          }`}
        />
      ))}
      {value <= 3 && (
        <span className="text-[10px] text-white/30 ml-1">
          {CLOSENESS_LABELS[value] ?? ""}
        </span>
      )}
    </div>
  );
}
