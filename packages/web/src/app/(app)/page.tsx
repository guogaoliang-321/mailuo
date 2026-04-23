"use client";

import { useAuth } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Link from "next/link";
import { PROJECT_STAGE_LABELS } from "@meridian/shared";
import { NetworkCanvas } from "@/components/network-canvas";
import { UserMenu } from "@/components/user-menu";
import { useState, useEffect, useRef } from "react";
import {
  FolderKanban,
  CircleDot,
  GitPullRequest,
  Users,
  Plus,
  ArrowRight,
  TrendingUp,
  Sparkles,
  MapPin,
  Bell,
} from "lucide-react";

interface ProjectItem {
  id: string;
  name: string;
  region: string;
  scale: string;
  stage: string;
  notes?: string;
  contributorName?: string;
}

interface CircleItem {
  id: string;
  name: string;
}

interface RequestItem {
  id: string;
  title: string;
  description: string;
  status: string;
  urgent?: boolean;
  timeAgo?: string;
  initiatorName?: string;
  initiatorId?: string;
  projectName?: string;
  projectId?: string;
}

interface RelItem {
  id: string;
  alias?: string;
  domainTags: string[];
  closeness?: number;
  _fuzzy?: boolean;
}

const STAGE_COLORS: Record<string, string> = {
  prospecting: "bg-white/5 text-white/40 border border-white/10",
  approved: "bg-[#5AC8FA]/10 text-[#5AC8FA] border border-[#5AC8FA]/20",
  bidding: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  announced: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  in_progress: "bg-[#30D158]/10 text-[#30D158] border border-[#30D158]/20",
  completed: "bg-[#30D158]/15 text-[#30D158] border border-[#30D158]/30",
};

interface NetworkGraphData {
  nodes: Array<{ id: string; label: string; ring: number; type: "user" | "circle" }>;
  links: Array<{ source: string; target: string }>;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [graphSize, setGraphSize] = useState({ w: 400, h: 350 });
  const graphContainerRef = useRef<HTMLDivElement>(null);

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.get<ProjectItem[]>("/projects"),
  });
  const { data: circles } = useQuery({
    queryKey: ["circles"],
    queryFn: () => api.get<CircleItem[]>("/circles"),
  });
  const { data: requests } = useQuery({
    queryKey: ["requests"],
    queryFn: () => api.get<RequestItem[]>("/requests"),
  });
  const { data: allDemands } = useQuery({
    queryKey: ["demands-all"],
    queryFn: () => api.get<RequestItem[]>("/requests/all-visible"),
  });
  const { data: relationships } = useQuery({
    queryKey: ["relationships"],
    queryFn: () => api.get<RelItem[]>("/relationships"),
  });
  const { data: graphData } = useQuery({
    queryKey: ["network-graph"],
    queryFn: () => api.get<NetworkGraphData>("/requests/network-graph"),
  });

  // Resize observer for graph container
  useEffect(() => {
    const el = graphContainerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      setGraphSize({ w: width, h: Math.max(300, Math.min(width * 0.85, 450)) });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const projectList = (projects?.data ?? []) as ProjectItem[];
  const circleList = (circles?.data ?? []) as CircleItem[];
  const requestList = (requests?.data ?? []) as RequestItem[];
  const relList = (relationships?.data ?? []) as RelItem[];

  const activeProjects = projectList.filter(
    (p) => p.stage !== "completed",
  ).length;
  const pendingRequests = requestList.filter(
    (r) => r.status === "pending" || r.status === "relaying",
  ).length;
  const coreRelations = relList.filter(
    (r) => r.closeness != null && r.closeness >= 4,
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="serif text-3xl font-light tracking-[0.15em] text-[#D4A853]">
            脉 络
          </h1>
          <p className="text-xs text-white/30 tracking-widest mt-0.5">
            {user?.displayName}，欢迎回来
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/requests" className="glass w-9 h-9 flex items-center justify-center text-white/40 hover:text-white/70 transition-colors rounded-xl relative">
            <Bell className="w-4 h-4" />
            {pendingRequests > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#FF375F] rounded-full text-[9px] text-white flex items-center justify-center font-bold">{pendingRequests}</span>
            )}
          </Link>
          <UserMenu />
        </div>
      </div>

      {/* Network Graph */}
      <div ref={graphContainerRef} className="glass-card p-0 overflow-hidden" style={{ marginBottom: 0 }}>
        {graphData?.data && graphData.data.nodes.length > 0 ? (
          <NetworkCanvas
            nodes={graphData.data.nodes}
            links={graphData.data.links}
            width={graphSize.w}
            height={graphSize.h}
            activeNode={activeNode}
            onNodeTap={(id) => setActiveNode(id === activeNode ? null : id)}
          />
        ) : (
          <div className="flex items-center justify-center" style={{ height: graphSize.h }}>
            <div className="text-center text-white/20">
              <div className="text-3xl mb-2">◎</div>
              <p className="text-sm">加载网络图谱...</p>
            </div>
          </div>
        )}
      </div>

      {/* Stats Bar */}
      <div className="glass-card p-4">
        <div className="grid grid-cols-4 gap-4 divide-x divide-white/5">
          <Link href="/projects" className="group text-center px-4 first:pl-0 last:pr-0">
            <div className="text-2xl font-semibold text-[#D4A853] group-hover:text-[#e8c070] transition-colors">
              {projectList.length}
            </div>
            <div className="text-[10px] text-white/35 mt-0.5 tracking-wide">项目池</div>
            {activeProjects > 0 && (
              <div className="flex items-center justify-center gap-1 mt-1">
                <TrendingUp className="w-2.5 h-2.5 text-[#5AC8FA]" />
                <span className="text-[9px] text-[#5AC8FA]">{activeProjects} 进行中</span>
              </div>
            )}
          </Link>

          <Link href="/circles" className="group text-center px-4">
            <div className="text-2xl font-semibold text-[#5AC8FA] group-hover:text-[#7dd6ff] transition-colors">
              {circleList.length}
            </div>
            <div className="text-[10px] text-white/35 mt-0.5 tracking-wide">我的圈子</div>
          </Link>

          <Link href="/requests" className="group text-center px-4">
            <div className="text-2xl font-semibold text-amber-400 group-hover:text-amber-300 transition-colors">
              {requestList.length}
            </div>
            <div className="text-[10px] text-white/35 mt-0.5 tracking-wide">对接请求</div>
            {pendingRequests > 0 && (
              <div className="flex items-center justify-center gap-1 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-[9px] text-amber-400">{pendingRequests} 待处理</span>
              </div>
            )}
          </Link>

          <Link href="/relationships" className="group text-center px-4">
            <div className="text-2xl font-semibold text-[#30D158] group-hover:text-[#5ade78] transition-colors">
              {relList.length}
            </div>
            <div className="text-[10px] text-white/35 mt-0.5 tracking-wide">关系资源</div>
            {coreRelations > 0 && (
              <div className="flex items-center justify-center gap-1 mt-1">
                <Sparkles className="w-2.5 h-2.5 text-[#30D158]" />
                <span className="text-[9px] text-[#30D158]">{coreRelations} 核心</span>
              </div>
            )}
          </Link>
        </div>
      </div>

      {/* Quick Actions — compact row */}
      <div className="flex gap-2">
        <Link href="/projects/new" className="btn-glass flex-1 flex items-center justify-center gap-1.5 py-2 px-2 text-[11px] rounded-xl">
          <span className="text-[#5AC8FA]">+</span>
          <span className="text-white/60">贡献项目信息</span>
        </Link>
        <Link href="/relationships/new" className="btn-glass flex-1 flex items-center justify-center gap-1.5 py-2 px-2 text-[11px] rounded-xl">
          <span className="text-[#30D158]">+</span>
          <span className="text-white/60">登记关系资源</span>
        </Link>
        <Link href="/requests/new" className="btn-glass flex-1 flex items-center justify-center gap-1.5 py-2 px-2 text-[11px] rounded-xl">
          <span className="text-[#D4A853]">+</span>
          <span className="text-white/60">发起对接请求</span>
        </Link>
      </div>

      {/* Plaza — Circle Square */}
      <PlazaSection userId={user?.id ?? ""} />

      {/* Latest Projects — horizontal scroll cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white/80">🔥 最新项目</h2>
          <Link href="/projects" className="text-xs text-[#D4A853]/60 hover:text-[#D4A853] flex items-center gap-1 transition-colors">
            查看全部 <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory" style={{ scrollbarWidth: "none" }}>
          {projectList.slice(0, 6).map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="glass-card p-4 min-w-[260px] max-w-[280px] shrink-0 snap-start group"
              style={{ marginBottom: 0 }}
            >
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[10px] text-white/25 tracking-[1.5px] font-mono">
                  {p.id.slice(0, 8).toUpperCase()}
                </span>
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium ${STAGE_COLORS[p.stage] ?? "bg-white/5 text-white/40 border border-white/10"}`}>
                  {PROJECT_STAGE_LABELS[p.stage] ?? p.stage}
                </span>
              </div>
              <div className="serif text-[15px] font-bold text-white/90 leading-snug mb-2 group-hover:text-white transition-colors">
                {p.name}
              </div>
              {p.notes && (
                <div className="text-xs text-white/35 line-clamp-1 mb-3">{p.notes}</div>
              )}
              <div className="flex items-center gap-2 text-xs text-white/40">
                <span className="w-5 h-5 rounded-full bg-[#5AC8FA]/15 text-[#5AC8FA] text-[10px] font-bold flex items-center justify-center">
                  {(p.contributorName ?? "?")[0]}
                </span>
                <span>{p.contributorName}</span>
                <span className="ml-auto text-white/20">{p.region}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Latest Resources */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white/80">🤝 最新资源</h2>
          <Link href="/relationships" className="text-xs text-[#D4A853]/60 hover:text-[#D4A853] flex items-center gap-1 transition-colors">
            查看全部 <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory" style={{ scrollbarWidth: "none" }}>
          {relList.filter((r) => !r._fuzzy).slice(0, 6).map((r) => (
            <div
              key={r.id}
              className="glass-card p-4 min-w-[240px] max-w-[260px] shrink-0 snap-start"
              style={{ marginBottom: 0 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-[#BF5AF2]/15 text-[#BF5AF2] text-xs font-bold flex items-center justify-center shrink-0">
                  {(r.alias ?? "?")[0]}
                </div>
                <div className="min-w-0">
                  <div className="text-sm text-white/80 font-medium truncate">{r.alias}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mb-2">
                {(r.domainTags ?? []).map((t: string) => (
                  <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-[#5AC8FA]/10 text-[#5AC8FA]/80">{t}</span>
                ))}
              </div>
              {r.closeness != null && (
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map((i) => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full ${i <= (r.closeness ?? 0) ? "bg-[#D4A853]" : "bg-white/10"}`} style={{ boxShadow: i <= (r.closeness ?? 0) ? "0 0 4px rgba(212,168,83,0.4)" : "none" }} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Relationship Demands */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white/80">🔗 关系需求</h2>
          <Link href="/requests" className="text-xs text-[#D4A853]/60 hover:text-[#D4A853] flex items-center gap-1 transition-colors">
            查看全部 <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="space-y-3">
          {(allDemands?.data ?? []).slice(0, 6).map((d) => (
            <div key={d.id} className="glass-card p-4" style={{ marginBottom: 0 }}>
              {/* Header: urgent tag + time */}
              <div className="flex items-center justify-between mb-2">
                {d.urgent ? (
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#FF375F]">
                    <span className="w-2 h-2 rounded-full bg-[#FF375F] animate-pulse" />
                    紧急
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-[11px] font-medium text-[#FF9F0A]">
                    <span className="w-2 h-2 rounded-full bg-[#FF9F0A]" />
                    一般
                  </span>
                )}
                <span className="text-[11px] text-white/25">{d.timeAgo}</span>
              </div>

              {/* Title + description */}
              <div className="serif text-[15px] font-bold text-white/90 leading-snug mb-1.5">
                {d.title}
              </div>
              <div className="text-xs text-white/40 leading-relaxed mb-3">
                {d.description}
              </div>

              {/* Initiator + linked project */}
              <div className="flex items-center gap-3 mb-3 text-xs">
                <div className="flex items-center gap-1.5 text-white/50">
                  <span className="w-5 h-5 rounded-full bg-[#D4A853]/15 text-[#D4A853] text-[10px] font-bold flex items-center justify-center">
                    {d.initiatorId === user?.id ? "我" : (d.initiatorName ?? "?")[0]}
                  </span>
                  <span>{d.initiatorId === user?.id ? "我 发起" : `${d.initiatorName} 发起`}</span>
                </div>
                {d.projectName && (
                  <div className="flex items-center gap-1.5 text-white/35 ml-auto">
                    <span className="text-white/20">关联</span>
                    <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/8 text-white/50 text-[10px] truncate max-w-[140px]">
                      {d.projectName}
                    </span>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-2">
                <Link href={`/requests/${d.id}`} className="btn-glass py-2.5 text-xs flex items-center justify-center gap-1.5 rounded-xl" style={{ padding: "10px 0" }}>
                  <span>💬</span> 我有线索
                </Link>
                <Link href={`/requests/${d.id}`} className="btn-glass py-2.5 text-xs flex items-center justify-center gap-1.5 rounded-xl" style={{ padding: "10px 0" }}>
                  <span>⇌</span> 帮忙转介
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ClosenessIndicator({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={`w-1.5 h-4 rounded-full ${
            i < value ? "bg-[#D4A853]" : "bg-white/10"
          }`}
        />
      ))}
    </div>
  );
}

interface PlazaMsg {
  id: string;
  userId: string;
  userName: string;
  content: string;
  type: string;
  created_at: string;
}

function PlazaSection({ userId }: { userId: string }) {
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["plaza"],
    queryFn: () => api.get<PlazaMsg[]>("/plaza"),
    refetchInterval: 15000,
  });

  const messages = data?.data ?? [];
  const COLORS = ["#D4A853", "#5AC8FA", "#30D158", "#BF5AF2", "#FF9F0A", "#FF375F"];

  const handleSend = async () => {
    if (!msg.trim()) return;
    setSending(true);
    await api.post("/plaza", { content: msg.trim() });
    setSending(false);
    setMsg("");
    queryClient.invalidateQueries({ queryKey: ["plaza"] });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "project": return "📋";
      case "relationship": return "🤝";
      case "request": return "⇌";
      default: return "💬";
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-white/80">🏛 圈子广场</h2>
        <span className="text-[10px] text-white/25">所有圈子成员可见</span>
      </div>

      {/* Post input */}
      <div className="glass-card p-4 mb-3" style={{ marginBottom: 12 }}>
        <div className="flex gap-2">
          <input
            type="text"
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder="分享信息、项目线索、资源动态..."
            className="input-dark flex-1 text-sm py-2.5"
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <button onClick={handleSend} disabled={sending || !msg.trim()} className="btn-gold text-xs px-4 py-2.5 shrink-0">
            {sending ? "..." : "发布"}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-2">
        {messages.length === 0 ? (
          <div className="glass-card text-center py-8" style={{ marginBottom: 0 }}>
            <p className="text-white/20 text-sm">广场还没有消息，成为第一个发言的人吧</p>
          </div>
        ) : (
          messages.slice(0, 10).map((m) => (
              <PlazaMessageCard key={m.id} message={m} colors={COLORS} />
          ))
        )}
      </div>
    </div>
  );
}

interface PlazaReply {
  id: string; userName: string; userId: string; content: string; created_at: string;
}

function PlazaMessageCard({ message: m, colors }: { message: PlazaMsg; colors: string[] }) {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const queryClient = useQueryClient();
  const color = colors[(m.userName?.charCodeAt(0) ?? 0) % colors.length];

  const { data: repliesData, refetch: refetchReplies } = useQuery({
    queryKey: ["plaza-replies", m.id],
    queryFn: () => api.get<PlazaReply[]>(`/plaza/${m.id}/replies`),
  });

  const replies = repliesData?.data ?? [];

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setSending(true);
    await api.post(`/plaza/${m.id}/replies`, { content: replyText.trim() });
    setSending(false);
    setReplyText("");
    refetchReplies();
  };

  return (
    <div className="glass-card p-4" style={{ marginBottom: 0 }}>
      {/* Main message */}
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${color}20`, color }}>
          {m.userName?.[0] ?? "?"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/70 font-medium">{m.userName}</span>
              <span className="text-[10px] text-white/20">
                {m.created_at ? new Date(m.created_at).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : ""}
              </span>
            </div>
          </div>
          <p className="text-sm text-white/60 mt-1 leading-relaxed">{m.content}</p>
        </div>
      </div>

      {/* Replies preview */}
      {replies.length > 0 && (
        <div className="mt-3 ml-11 space-y-1.5">
          {replies.map((r) => {
            const rc = colors[(r.userName?.charCodeAt(0) ?? 0) % colors.length];
            return (
              <div key={r.id} className="flex items-start gap-2 text-[11px]">
                <span className="font-medium shrink-0" style={{ color: rc }}>{r.userName}</span>
                <span className="text-white/45 flex-1 min-w-0">{r.content}</span>
                <span className="text-white/15 shrink-0 text-[10px]">
                  {r.created_at ? new Date(r.created_at).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : ""}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Reply button + input */}
      <div className="mt-2.5 ml-11">
        {showReply ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="回复..."
              className="input-dark flex-1 text-xs py-1.5"
              onKeyDown={(e) => e.key === "Enter" && handleReply()}
              autoFocus
            />
            <button onClick={handleReply} disabled={sending || !replyText.trim()} className="text-[11px] text-[#D4A853] hover:text-[#D4A853]/80 px-2 shrink-0">
              {sending ? "..." : "发送"}
            </button>
            <button onClick={() => { setShowReply(false); setReplyText(""); }} className="text-[11px] text-white/25 hover:text-white/40 shrink-0">
              取消
            </button>
          </div>
        ) : (
          <button onClick={() => setShowReply(true)} className="text-[11px] text-white/25 hover:text-white/40 transition-colors">
            💬 回复{replies.length > 0 ? ` (${replies.length})` : ""}
          </button>
        )}
      </div>
    </div>
  );
}
