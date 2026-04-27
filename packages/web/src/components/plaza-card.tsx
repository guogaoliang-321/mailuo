"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, MessageSquare } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

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
const SHOW_LIMIT = 3;

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
  const dim = size * 4;
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold shrink-0"
      style={{ backgroundColor: `${color}22`, color, width: dim, height: dim, fontSize: dim * 0.4 }}
    >
      {name?.[0] ?? "?"}
    </div>
  );
}

// ── Inline confirm helper ──────────────────────────────────────────────────

function ConfirmDelete({
  onConfirm,
  onCancel,
  loading,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <button
        onClick={onConfirm}
        disabled={loading}
        className="text-[10px] text-red-400 hover:text-red-300 transition-colors disabled:opacity-40"
      >
        确认
      </button>
      <button
        onClick={onCancel}
        className="text-[10px] text-white/30 hover:text-white/50 transition-colors"
      >
        取消
      </button>
    </span>
  );
}

// ── Sub-reply item ─────────────────────────────────────────────────────────

function SubReplyItem({
  reply,
  messageId,
  canDelete,
  onClickReply,
  onDeleted,
}: {
  reply: PlazaReply;
  messageId: string;
  canDelete: boolean;
  onClickReply: (parentId: string, parentName: string) => void;
  onDeleted: () => void;
}) {
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const color = avatarColor(reply.userName);

  const handleDelete = async () => {
    setDeleting(true);
    await api.delete(`/plaza/${messageId}/replies/${reply.id}`);
    onDeleted();
  };

  return (
    <div className="py-1.5">
      {/* Row 1: Avatar + Name + Time + Delete */}
      <div className="flex items-center gap-1.5">
        <Avatar name={reply.userName} size={5} />
        <span className="text-[11px] font-semibold" style={{ color }}>{reply.userName}</span>
        <span className="text-[10px] text-white/20">{fmtTime(reply.created_at)}</span>
        <span className="ml-auto">
          {canDelete && (
            confirmDel
              ? <ConfirmDelete onConfirm={handleDelete} onCancel={() => setConfirmDel(false)} loading={deleting} />
              : <button onClick={() => setConfirmDel(true)} className="text-[10px] text-white/20 hover:text-red-400/70 transition-colors">删除</button>
          )}
        </span>
      </div>
      {/* Row 2: Content + Reply */}
      <div className="flex items-start gap-2 ml-[22px] mt-0.5">
        <span className="flex-1 text-[12px] text-white/60 break-words leading-relaxed">{reply.content}</span>
        <button
          onClick={() => onClickReply(reply.id, reply.userName)}
          className="text-[10px] text-white/25 hover:text-[#D4A853]/70 transition-colors shrink-0 mt-0.5"
        >
          回复
        </button>
      </div>
    </div>
  );
}

// ── Top-level comment item ─────────────────────────────────────────────────

function CommentItem({
  reply,
  subReplies,
  messageId,
  canDelete,
  onNewReply,
}: {
  reply: PlazaReply;
  subReplies: PlazaReply[];
  messageId: string;
  canDelete: (userId: string) => boolean;
  onNewReply: () => void;
}) {
  const [subExpanded, setSubExpanded] = useState(false);
  const [replyTarget, setReplyTarget] = useState<{ parentId: string; parentName: string } | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const color = avatarColor(reply.userName);

  const handleDeleteComment = async () => {
    setDeleting(true);
    await api.delete(`/plaza/${messageId}/replies/${reply.id}`);
    onNewReply();
  };

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

  const replyInput = (
    <div className="flex gap-2 py-1.5">
      <input
        type="text"
        value={replyText}
        onChange={(e) => setReplyText(e.target.value)}
        placeholder={`回复 ${replyTarget?.parentName}…`}
        className="input-dark flex-1 text-xs py-1.5"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSend();
          if (e.key === "Escape") { setReplyTarget(null); setReplyText(""); }
        }}
      />
      <button onClick={handleSend} disabled={sending || !replyText.trim()} className="text-[11px] text-[#D4A853] px-2 shrink-0 disabled:opacity-40">
        {sending ? "…" : "发送"}
      </button>
      <button onClick={() => { setReplyTarget(null); setReplyText(""); }} className="text-[11px] text-white/25 shrink-0">
        取消
      </button>
    </div>
  );

  return (
    <div className="py-2.5">
      {/* Row 1: Avatar + Name + Time + Delete */}
      <div className="flex items-center gap-2">
        <Avatar name={reply.userName} size={7} />
        <span className="text-[12px] font-semibold" style={{ color }}>{reply.userName}</span>
        <span className="text-[10px] text-white/20">{fmtTime(reply.created_at)}</span>
        <span className="ml-auto">
          {canDelete(reply.userId) && (
            confirmDel
              ? <ConfirmDelete onConfirm={handleDeleteComment} onCancel={() => setConfirmDel(false)} loading={deleting} />
              : <button onClick={() => setConfirmDel(true)} className="text-[10px] text-white/20 hover:text-red-400/70 transition-colors">删除</button>
          )}
        </span>
      </div>

      {/* Row 2: Content + Reply */}
      <div className="flex items-start gap-2 ml-9 mt-0.5">
        <p className="flex-1 text-[13px] text-white/70 leading-relaxed break-words">{reply.content}</p>
        <button
          onClick={() => openReply(reply.id, reply.userName)}
          className="text-[10px] text-white/25 hover:text-[#D4A853]/70 transition-colors shrink-0 mt-0.5"
        >
          回复
        </button>
      </div>

      {/* Sub-replies toggle */}
      {subReplies.length > 0 && (
        <button
          onClick={() => setSubExpanded((v) => !v)}
          className="flex items-center gap-1 ml-9 mt-1 text-[10px] text-[#5AC8FA]/60 hover:text-[#5AC8FA] transition-colors"
        >
          {subExpanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
          {subExpanded ? "收起回复" : `展开 ${subReplies.length} 条回复`}
        </button>
      )}

      {/* Sub-replies */}
      {subExpanded && (
        <div className="ml-9 pl-3 border-l border-white/[0.06] mt-1">
          {subReplies.map((sr) => (
            <SubReplyItem
              key={sr.id}
              reply={sr}
              messageId={messageId}
              canDelete={canDelete(sr.userId)}
              onClickReply={openReply}
              onDeleted={onNewReply}
            />
          ))}
          {replyTarget && replyInput}
        </div>
      )}

      {/* Reply input when thread not yet expanded */}
      {!subExpanded && replyTarget && (
        <div className="ml-9 mt-1">{replyInput}</div>
      )}
    </div>
  );
}

// ── Main PlazaCard ─────────────────────────────────────────────────────────

export function PlazaCard({ message: m }: { message: PlazaMsg }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [commentsOpen, setCommentsOpen] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canDelete = (ownerId: string) => user?.id === ownerId || user?.role === "admin";

  const handleDeleteMessage = async () => {
    setDeleting(true);
    await api.delete(`/plaza/${m.id}`);
    queryClient.invalidateQueries({ queryKey: ["plaza"] });
  };

  const { data: repliesData, refetch } = useQuery({
    queryKey: ["plaza-replies", m.id],
    queryFn: () => api.get<PlazaReply[]>(`/plaza/${m.id}/replies`),
    enabled: true,
    staleTime: 30_000,
  });

  const allReplies = repliesData?.data ?? [];
  const topLevel = allReplies.filter((r) => !r.parentId);

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

      {/* Content + meta */}
      <div className="flex items-start gap-3 pb-4 border-b border-white/[0.06]">
        <p className="flex-1 text-[15px] text-white/85 leading-[1.7] break-words">{m.content}</p>
        <div className="flex items-center gap-1.5 shrink-0 ml-3 mt-0.5">
          <Avatar name={m.userName} size={5} />
          <span className="text-[12px] text-white/55 font-medium whitespace-nowrap">{m.userName}</span>
          <span className="text-[10px] text-white/25 whitespace-nowrap">{fmtTime(m.created_at)}</span>
          {canDelete(m.userId) && (
            confirmDel
              ? <ConfirmDelete onConfirm={handleDeleteMessage} onCancel={() => setConfirmDel(false)} loading={deleting} />
              : <button onClick={() => setConfirmDel(true)} className="text-[10px] text-white/20 hover:text-red-400/70 transition-colors ml-1">删除</button>
          )}
        </div>
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
            {/* Expand older comments */}
            {!showAll && hiddenCount > 0 && (
              <button
                onClick={() => setShowAll(true)}
                className="w-full mb-2 py-2.5 rounded-xl border border-white/[0.06] text-[11px] text-white/35 hover:text-white/60 hover:bg-white/[0.03] transition-colors"
              >
                展开更早的 {hiddenCount} 条评论 ↑
              </button>
            )}

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
                    canDelete={canDelete}
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
