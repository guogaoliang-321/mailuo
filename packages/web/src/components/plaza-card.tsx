"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, MessageSquare } from "lucide-react";
import { api } from "@/lib/api";

// ── Constants ──────────────────────────────────────────────────────────────

const PLAZA_CATEGORIES = [
  { value: "design",       label: "设计类",   icon: "📐" },
  { value: "construction", label: "施工类",   icon: "🏗" },
  { value: "connection",   label: "找关系",   icon: "🤝" },
  { value: "materials",    label: "材料设备", icon: "📦" },
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  design:       "#5AC8FA",
  construction: "#FF9F0A",
  connection:   "#BF5AF2",
  materials:    "#30D158",
};

const AVATAR_COLORS = ["#D4A853", "#5AC8FA", "#30D158", "#BF5AF2", "#FF9F0A", "#FF375F"];

// ── Types ──────────────────────────────────────────────────────────────────

export interface PlazaMsg {
  id: string;
  userId: string;
  userName: string;
  content: string;
  type: string;
  created_at: string;
}

export interface PlazaReply {
  id: string;
  userId: string;
  userName: string;
  content: string;
  parentId: string | null;
  created_at: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function avatarColor(name: string) {
  return AVATAR_COLORS[(name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
}

function fmtTime(ts: string) {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("zh-CN", {
    month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

// ── Avatar ─────────────────────────────────────────────────────────────────

function Avatar({ name, size = 7 }: { name: string; size?: number }) {
  const color = avatarColor(name);
  const dim = size * 4; // tailwind w-7 = 28px
  return (
    <div
      className={`w-${size} h-${size} rounded-full flex items-center justify-center font-bold shrink-0`}
      style={{ backgroundColor: `${color}22`, color, width: dim, height: dim, fontSize: dim * 0.4 }}
    >
      {name?.[0] ?? "?"}
    </div>
  );
}

// ── Sub-reply item (inside an expanded thread) ─────────────────────────────

function SubReplyItem({
  reply,
  onClickReply,
}: {
  reply: PlazaReply;
  onClickReply: (parentId: string, parentName: string) => void;
}) {
  const color = avatarColor(reply.userName);
  return (
    <div className="flex items-start gap-2 py-2">
      <Avatar name={reply.userName} size={5} />
      <div className="flex-1 min-w-0">
        <span className="text-[11px] font-semibold mr-1.5" style={{ color }}>
          {reply.userName}
        </span>
        <span className="text-[12px] text-white/60 break-words leading-relaxed">
          {reply.content}
        </span>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-[10px] text-white/20">{fmtTime(reply.created_at)}</span>
          <button
            onClick={() => onClickReply(reply.id, reply.userName)}
            className="text-[10px] text-white/25 hover:text-[#D4A853]/70 transition-colors"
          >
            回复
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Top-level comment item ─────────────────────────────────────────────────

function CommentItem({
  reply,
  subReplies,
  messageId,
  onNewReply,
}: {
  reply: PlazaReply;
  subReplies: PlazaReply[];
  messageId: string;
  onNewReply: () => void;
}) {
  const [subExpanded, setSubExpanded] = useState(false);
  const [replyTarget, setReplyTarget] = useState<{ parentId: string; parentName: string } | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const color = avatarColor(reply.userName);

  const openReply = (parentId: string, parentName: string) => {
    setReplyTarget({ parentId, parentName });
    setSubExpanded(true);
  };

  const handleSend = async () => {
    if (!replyText.trim() || !replyTarget) return;
    setSending(true);
    await api.post(`/plaza/${messageId}/replies`, {
      content: replyText.trim(),
      parentId: replyTarget.parentId,
    });
    setSending(false);
    setReplyText("");
    setReplyTarget(null);
    onNewReply();
  };

  return (
    <div>
      {/* Comment row */}
      <div className="flex items-start gap-3 py-3">
        <Avatar name={reply.userName} size={7} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[12px] font-semibold" style={{ color }}>{reply.userName}</span>
            <span className="text-[10px] text-white/20">{fmtTime(reply.created_at)}</span>
          </div>
          <p className="text-[13px] text-white/70 leading-relaxed break-words">{reply.content}</p>
          <div className="flex items-center gap-4 mt-2">
            <button
              onClick={() => openReply(reply.id, reply.userName)}
              className="text-[10px] text-white/25 hover:text-[#D4A853]/70 transition-colors"
            >
              回复
            </button>
            {subReplies.length > 0 && (
              <button
                onClick={() => setSubExpanded((v) => !v)}
                className="flex items-center gap-1 text-[10px] text-[#5AC8FA]/60 hover:text-[#5AC8FA] transition-colors"
              >
                {subExpanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                {subExpanded ? "收起回复" : `展开 ${subReplies.length} 条回复`}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sub-replies block — collapsed by default */}
      {subExpanded && (
        <div className="ml-10 pl-3 border-l border-white/[0.06] space-y-0">
          {subReplies.map((sr) => (
            <SubReplyItem key={sr.id} reply={sr} onClickReply={openReply} />
          ))}

          {/* Reply input inside thread */}
          {replyTarget && (
            <div className="flex gap-2 py-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`回复 ${replyTarget.parentName}…`}
                className="input-dark flex-1 text-xs py-1.5"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSend();
                  if (e.key === "Escape") { setReplyTarget(null); setReplyText(""); }
                }}
              />
              <button
                onClick={handleSend}
                disabled={sending || !replyText.trim()}
                className="text-[11px] text-[#D4A853] px-2 shrink-0 disabled:opacity-40"
              >
                {sending ? "…" : "发送"}
              </button>
              <button
                onClick={() => { setReplyTarget(null); setReplyText(""); }}
                className="text-[11px] text-white/25 shrink-0"
              >
                取消
              </button>
            </div>
          )}
        </div>
      )}

      {/* Reply input when no sub-replies yet */}
      {!subExpanded && replyTarget && (
        <div className="ml-10 flex gap-2 pb-2">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder={`回复 ${replyTarget.parentName}…`}
            className="input-dark flex-1 text-xs py-1.5"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend();
              if (e.key === "Escape") { setReplyTarget(null); setReplyText(""); }
            }}
          />
          <button
            onClick={handleSend}
            disabled={sending || !replyText.trim()}
            className="text-[11px] text-[#D4A853] px-2 shrink-0 disabled:opacity-40"
          >
            {sending ? "…" : "发送"}
          </button>
          <button
            onClick={() => { setReplyTarget(null); setReplyText(""); }}
            className="text-[11px] text-white/25 shrink-0"
          >
            取消
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main PlazaCard ─────────────────────────────────────────────────────────

const SHOW_LIMIT = 5;

export function PlazaCard({ message: m }: { message: PlazaMsg }) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const { data: repliesData, refetch } = useQuery({
    queryKey: ["plaza-replies", m.id],
    queryFn: () => api.get<PlazaReply[]>(`/plaza/${m.id}/replies`),
    enabled: commentsOpen,
    staleTime: 30_000,
  });

  const allReplies = repliesData?.data ?? [];
  const topLevel = allReplies.filter((r) => !r.parentId);

  // Build sub-reply map: parentId → children
  // For sub-replies whose parentId points to another sub-reply,
  // we group them under that sub-reply's top-level ancestor.
  const replyMap = new Map<string, PlazaReply>();
  for (const r of allReplies) replyMap.set(r.id, r);

  function rootId(id: string): string {
    const r = replyMap.get(id);
    if (!r || !r.parentId) return id;
    return rootId(r.parentId);
  }

  function getSubReplies(topId: string): PlazaReply[] {
    return allReplies.filter((r) => r.parentId !== null && rootId(r.id) === topId);
  }

  // Show latest SHOW_LIMIT top-level; older ones behind expand
  const hiddenCount = Math.max(0, topLevel.length - SHOW_LIMIT);
  const visible = showAll ? topLevel : topLevel.slice(-SHOW_LIMIT);

  const handleTopReply = async () => {
    if (!replyText.trim()) return;
    setSending(true);
    await api.post(`/plaza/${m.id}/replies`, { content: replyText.trim() });
    setSending(false);
    setReplyText("");
    refetch();
  };

  const cat = PLAZA_CATEGORIES.find((c) => c.value === m.type);
  const catColor = CATEGORY_COLORS[m.type];
  const totalReplies = allReplies.length;

  return (
    <div className="glass-card p-5" style={{ marginBottom: 0 }}>
      {/* Category badge */}
      {cat && (
        <span
          className="inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full font-medium mb-3"
          style={{ backgroundColor: `${catColor}1A`, color: catColor, border: `1px solid ${catColor}33` }}
        >
          {cat.icon} {cat.label}
        </span>
      )}

      {/* Content — larger */}
      <p className="text-[15px] text-white/85 leading-[1.7] mb-4 break-words">{m.content}</p>

      {/* Meta: author + time, right-aligned */}
      <div className="flex items-center justify-end gap-2 pb-4 border-b border-white/[0.06]">
        <Avatar name={m.userName} size={5} />
        <span className="text-[12px] text-white/55 font-medium">{m.userName}</span>
        <span className="text-[10px] text-white/25">{fmtTime(m.created_at)}</span>
      </div>

      {/* Comments toggle */}
      <div className="pt-3">
        <button
          onClick={() => setCommentsOpen((v) => !v)}
          className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/55 transition-colors"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          {commentsOpen
            ? totalReplies > 0 ? `${totalReplies} 条评论` : "评论"
            : totalReplies > 0 ? `查看 ${totalReplies} 条评论` : "发表评论"}
          {commentsOpen
            ? <ChevronUp className="w-3 h-3 ml-0.5" />
            : <ChevronDown className="w-3 h-3 ml-0.5" />}
        </button>

        {commentsOpen && (
          <div className="mt-3">
            {/* Expand older comments (card style) */}
            {!showAll && hiddenCount > 0 && (
              <button
                onClick={() => setShowAll(true)}
                className="w-full mb-2 py-2.5 rounded-xl border border-white/[0.06] text-[11px] text-white/35 hover:text-white/60 hover:bg-white/[0.03] transition-colors"
              >
                展开更早的 {hiddenCount} 条评论 ↑
              </button>
            )}

            {/* Top-level comments */}
            <div className="divide-y divide-white/[0.04]">
              {visible.length === 0 ? (
                <p className="text-[11px] text-white/20 py-4 text-center">暂无评论，来说点什么</p>
              ) : (
                visible.map((r) => (
                  <CommentItem
                    key={r.id}
                    reply={r}
                    subReplies={getSubReplies(r.id)}
                    messageId={m.id}
                    onNewReply={refetch}
                  />
                ))
              )}
            </div>

            {/* Write a comment */}
            <div className="flex gap-2 pt-3 mt-1 border-t border-white/[0.05]">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="写评论…"
                className="input-dark flex-1 text-xs py-2"
                onKeyDown={(e) => e.key === "Enter" && handleTopReply()}
              />
              <button
                onClick={handleTopReply}
                disabled={sending || !replyText.trim()}
                className="text-xs text-[#D4A853] px-3 shrink-0 disabled:opacity-40 hover:text-[#D4A853]/80 transition-colors"
              >
                {sending ? "…" : "发送"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
