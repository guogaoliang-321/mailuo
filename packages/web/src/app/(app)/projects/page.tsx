"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Link from "next/link";
import { PROJECT_STAGE_LABELS } from "@meridian/shared";
import { useState } from "react";
import { Search, FolderKanban } from "lucide-react";

interface ProjectItem {
  id: string;
  name: string;
  region: string;
  scale: string;
  stage: string;
  contributorName: string;
  createdAt: string;
}

const STAGE_FILTER_TABS = [
  { key: "", label: "全部" },
  { key: "prospecting", label: "前期意向" },
  { key: "approved", label: "已立项" },
  { key: "bidding", label: "即将招标" },
];

const STAGE_PILL_COLORS: Record<string, string> = {
  prospecting: "bg-orange-500/20 text-orange-300 border border-orange-500/30",
  approved: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  bidding: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
  announced: "bg-purple-500/20 text-purple-300 border border-purple-500/30",
  in_progress: "bg-green-500/20 text-green-300 border border-green-500/30",
  completed: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
};

const HOT_STAGES = new Set(["bidding", "announced"]);

export default function ProjectsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.get<ProjectItem[]>("/projects"),
  });
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");

  const allProjects = data?.data ?? [];
  const projects = allProjects.filter((p) => {
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.region.toLowerCase().includes(search.toLowerCase());
    const matchStage = !stageFilter || p.stage === stageFilter;
    return matchSearch && matchStage;
  });

  return (
    <div className="space-y-6 animate-fade-in page-enter">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="serif text-3xl font-bold text-white tracking-tight">
            项目池
          </h1>
          <p className="text-sm text-white/40 mt-1">
            {allProjects.length} 个项目信息
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索项目名称或区域..."
          className="input-dark pl-11 w-full"
        />
      </div>

      {/* Stage filter pills */}
      <div className="flex flex-wrap gap-2">
        {STAGE_FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStageFilter(tab.key)}
            className={`pill transition-all ${
              stageFilter === tab.key
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="glass-card h-32 animate-pulse rounded-2xl"
            />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-16 text-center">
          <FolderKanban className="w-12 h-12 text-white/20 mb-4" />
          <p className="text-sm font-medium text-white/40">
            {search || stageFilter ? "没有找到匹配的项目" : "暂无项目信息"}
          </p>
          <p className="text-xs text-white/25 mt-1">
            {search || stageFilter ? "试试调整筛选条件" : "成为第一个贡献者吧"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="glass-card p-5 group relative overflow-hidden hover:border-white/20 transition-all"
            >
              {/* HOT badge */}
              {HOT_STAGES.has(p.stage) && (
                <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-[#FF375F] to-[#FF9F0A] text-white tracking-widest">
                  HOT
                </span>
              )}

              {/* Project code */}
              <p className="text-[10px] tracking-[0.2em] text-white/30 uppercase mb-2 font-mono">
                {p.id.slice(0, 8).toUpperCase()}
              </p>

              {/* Name */}
              <h3 className="serif font-bold text-base text-white group-hover:text-[#D4A853] transition-colors line-clamp-1 pr-12">
                {p.name}
              </h3>

              {/* Region + Scale */}
              <p className="text-xs text-white/40 mt-1">
                {p.region}
                {p.scale && (
                  <span className="ml-2 text-white/30">· {p.scale}</span>
                )}
              </p>

              {/* Footer */}
              <div className="flex items-center justify-between mt-4">
                <span
                  className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${
                    STAGE_PILL_COLORS[p.stage] ??
                    "bg-white/10 text-white/50 border border-white/10"
                  }`}
                >
                  {PROJECT_STAGE_LABELS[p.stage] ?? p.stage}
                </span>
                <span className="text-[10px] text-white/25">
                  by {p.contributorName}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Contribute button */}
      <div className="flex justify-center pt-2">
        <Link href="/projects/new" className="btn-glass text-white/70 hover:text-white">
          + 贡献新项目
        </Link>
      </div>
    </div>
  );
}
