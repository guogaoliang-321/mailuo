"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Link from "next/link";
import { Plus, GitPullRequest, User, Clock } from "lucide-react";

interface RequestItem {
  id: string;
  title: string;
  description: string;
  status: string;
  initiatorName: string;
  createdAt: string;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; color: string; dot: string }
> = {
  pending: {
    label: "待处理",
    bg: "rgba(255,159,10,0.12)",
    color: "#FF9F0A",
    dot: "#FF9F0A",
  },
  relaying: {
    label: "转介中",
    bg: "rgba(90,200,250,0.12)",
    color: "#5AC8FA",
    dot: "#5AC8FA",
  },
  fulfilled: {
    label: "已对接",
    bg: "rgba(48,209,88,0.12)",
    color: "#30D158",
    dot: "#30D158",
  },
  rejected: {
    label: "已拒绝",
    bg: "rgba(255,55,95,0.12)",
    color: "#FF375F",
    dot: "#FF375F",
  },
  expired: {
    label: "已过期",
    bg: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.35)",
    dot: "rgba(255,255,255,0.25)",
  },
};

/** Mini chain visualization: colored dots connected by lines */
function ChainViz({ status }: { status: string }) {
  const steps = ["发起", "传递", "对接"];
  const activeIndex =
    status === "fulfilled" ? 2 : status === "relaying" ? 1 : 0;
  const dotColor =
    status === "fulfilled"
      ? "#30D158"
      : status === "relaying"
        ? "#5AC8FA"
        : status === "rejected"
          ? "#FF375F"
          : "#FF9F0A";

  return (
    <div className="flex items-center gap-0 mt-3">
      {steps.map((step, i) => {
        const isActive = i <= activeIndex;
        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center gap-0.5">
              <div
                className="w-2 h-2 rounded-full transition-all"
                style={{
                  background: isActive ? dotColor : "rgba(255,255,255,0.12)",
                  boxShadow: isActive ? `0 0 6px ${dotColor}80` : "none",
                }}
              />
              <span
                className="text-[9px] leading-none"
                style={{
                  color: isActive ? dotColor : "rgba(255,255,255,0.2)",
                }}
              >
                {step}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className="h-px w-8 mx-1 mb-3"
                style={{
                  background:
                    i < activeIndex
                      ? `linear-gradient(to right, ${dotColor}, ${dotColor})`
                      : "rgba(255,255,255,0.1)",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function RequestsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["requests"],
    queryFn: () => api.get<RequestItem[]>("/requests"),
  });

  const requests = data?.data ?? [];

  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="serif text-2xl font-semibold text-white">对接请求</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
            {requests.length} 个请求
          </p>
        </div>
        <Link href="/requests/new" className="btn-gold inline-flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span>发起对接</span>
        </Link>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 rounded-2xl animate-pulse"
              style={{ background: "rgba(255,255,255,0.04)" }}
            />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-16 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "rgba(90,200,250,0.10)" }}
          >
            <GitPullRequest className="w-8 h-8" style={{ color: "#5AC8FA" }} />
          </div>
          <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.55)" }}>
            暂无对接请求
          </p>
          <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>
            发现需要对接的资源？发起一个请求吧
          </p>
        </div>
      ) : (
        <div className="space-y-3 animate-fade-in">
          {requests.map((r) => {
            const config = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.expired;
            return (
              <Link
                key={r.id}
                href={`/requests/${r.id}`}
                className="glass-card p-5 block group transition-all hover:scale-[1.005]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="serif font-semibold text-sm text-white group-hover:opacity-80 transition-opacity">
                      {r.title}
                    </h3>
                    <p
                      className="text-xs mt-1.5 line-clamp-2"
                      style={{ color: "rgba(255,255,255,0.45)" }}
                    >
                      {r.description}
                    </p>

                    {/* Chain visualization */}
                    <ChainViz status={r.status} />

                    <div
                      className="flex items-center gap-4 mt-2 text-xs"
                      style={{ color: "rgba(255,255,255,0.3)" }}
                    >
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {r.initiatorName}
                      </span>
                      {r.createdAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(r.createdAt).toLocaleDateString("zh-CN")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status pill */}
                  <span
                    className="pill shrink-0 flex items-center gap-1.5"
                    style={{ background: config.bg, color: config.color }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: config.dot }}
                    />
                    {config.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
