"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

interface Contact {
  id: string; name: string; company: string; title: string;
  phone: string; tags: string[]; closeness: number; notes: string;
  next_action: string; next_action_date: string;
  reminder_days: number; last_contacted_at: string;
}

interface LogItem {
  id: string; type: string; content: string;
  plan_date: string; plan_done: boolean; created_at: string;
}

const LOG_TYPES: Record<string, { label: string; icon: string; color: string }> = {
  note: { label: "备注", icon: "📝", color: "#5AC8FA" },
  meeting: { label: "见面", icon: "🤝", color: "#30D158" },
  call: { label: "电话", icon: "📞", color: "#BF5AF2" },
  wechat: { label: "微信", icon: "💬", color: "#30D158" },
  dinner: { label: "饭局", icon: "🍽", color: "#FF9F0A" },
  plan: { label: "计划", icon: "📌", color: "#D4A853" },
};

export default function ContactDetailPage() {
  const params = useParams();
  const contactId = params.id as string;
  const queryClient = useQueryClient();

  const { data: contactData } = useQuery({
    queryKey: ["my-contact", contactId],
    queryFn: () => api.get<Contact>(`/my/contacts/${contactId}`),
  });

  const { data: logsData, refetch: refetchLogs } = useQuery({
    queryKey: ["contact-logs", contactId],
    queryFn: () => api.get<LogItem[]>(`/my/contacts/${contactId}/logs`),
  });

  const contact = contactData?.data;
  const logs = logsData?.data ?? [];

  const [logType, setLogType] = useState("note");
  const [logContent, setLogContent] = useState("");
  const [planDate, setPlanDate] = useState("");
  const [posting, setPosting] = useState(false);

  const handleAddLog = async () => {
    if (!logContent.trim()) return;
    setPosting(true);
    await api.post(`/my/contacts/${contactId}/logs`, {
      type: logType,
      content: logContent.trim(),
      planDate: logType === "plan" && planDate ? planDate : undefined,
    });
    setPosting(false);
    setLogContent("");
    setPlanDate("");
    refetchLogs();
    queryClient.invalidateQueries({ queryKey: ["my-contacts"] });
    queryClient.invalidateQueries({ queryKey: ["my-reminders"] });
  };

  const handleMarkDone = async (logId: string) => {
    await api.post(`/my/contacts/${contactId}/logs/${logId}/done`, {});
    refetchLogs();
  };

  if (!contact) {
    return <div className="glass-card text-center py-12"><p className="text-white/40">加载中...</p></div>;
  }

  return (
    <div className="space-y-5 max-w-2xl page-enter">
      <Link href="/my" className="text-sm text-[#D4A853]/70 hover:text-[#D4A853] transition-colors">← 返回我的资源库</Link>

      {/* Contact Header */}
      <div className="glass-card p-5" style={{ marginBottom: 0 }}>
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#D4A853]/15 text-[#D4A853] text-xl font-bold flex items-center justify-center shrink-0">
            {contact.name[0]}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg text-white/95 font-bold">{contact.name}</h1>
              {(contact as unknown as { is_shared?: boolean }).is_shared
                ? <span className="text-[9px] text-[#30D158] bg-[#30D158]/10 px-1.5 py-0.5 rounded">已分享到圈子</span>
                : <span className="text-[9px] text-white/25 bg-white/5 px-1.5 py-0.5 rounded">私有</span>
              }
            </div>
            <div className="text-sm text-white/40 mt-0.5">
              {[contact.company, contact.title].filter(Boolean).join(" · ")}
            </div>
            {contact.phone && <div className="text-xs text-white/30 mt-1">📱 {contact.phone}</div>}
            {(contact.tags ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {(contact.tags as string[]).map((t) => (
                  <span key={t} className="text-[10px] px-2 py-0.5 rounded bg-[#5AC8FA]/10 text-[#5AC8FA]/80">{t}</span>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-0.5 shrink-0">
            {[1,2,3,4,5].map((i) => (
              <div key={i} className={`w-2 h-2 rounded-full ${i <= (contact.closeness ?? 3) ? "bg-[#D4A853]" : "bg-white/10"}`}
                style={{ boxShadow: i <= (contact.closeness ?? 3) ? "0 0 4px rgba(212,168,83,0.4)" : "none" }} />
            ))}
          </div>
        </div>

        {/* Action plan */}
        {contact.next_action && (
          <div className="mt-4 pt-3 border-t border-white/[0.06]">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#FF9F0A]">📌 下一步：</span>
              <span className="text-white/60">{contact.next_action}</span>
              {contact.next_action_date && (
                <span className="text-white/30 ml-auto">{new Date(contact.next_action_date).toLocaleDateString("zh-CN")}</span>
              )}
            </div>
          </div>
        )}

        {/* Reminder info */}
        {contact.reminder_days && (
          <div className="mt-2 text-[10px] text-white/25">
            🔔 每 {contact.reminder_days} 天提醒联络
            {contact.last_contacted_at && ` · 上次联络 ${new Date(contact.last_contacted_at).toLocaleDateString("zh-CN")}`}
          </div>
        )}

        {contact.notes && (
          <div className="mt-3 pt-3 border-t border-white/[0.06]">
            <div className="text-xs text-white/40 leading-relaxed">{contact.notes}</div>
          </div>
        )}

        {/* Share button */}
        {!(contact as unknown as { is_shared?: boolean }).is_shared && (
          <div className="mt-3 pt-3 border-t border-white/[0.06]">
            <ShareContactBtn contactId={contactId} onDone={() => queryClient.invalidateQueries({ queryKey: ["my-contact", contactId] })} />
          </div>
        )}
      </div>

      {/* Add Log */}
      <div className="glass-card p-5" style={{ marginBottom: 0 }}>
        <div className="text-sm font-semibold text-white/80 mb-3">➕ 记录联络</div>

        {/* Type selector */}
        <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
          {Object.entries(LOG_TYPES).map(([key, cfg]) => (
            <button key={key} onClick={() => setLogType(key)}
              className={`text-[11px] px-3 py-1.5 rounded-lg shrink-0 transition-all ${
                logType === key ? "bg-white/10 text-white" : "text-white/30 hover:text-white/50"
              }`}>
              {cfg.icon} {cfg.label}
            </button>
          ))}
        </div>

        <textarea
          value={logContent}
          onChange={(e) => setLogContent(e.target.value)}
          placeholder={logType === "plan" ? "计划做什么（如：下周登门拜访）..." : "记录内容..."}
          rows={2}
          className="input-dark text-sm resize-none mb-2 w-full"
        />

        {logType === "plan" && (
          <input type="date" value={planDate} onChange={(e) => setPlanDate(e.target.value)}
            className="input-dark text-sm py-2 mb-2 w-full" />
        )}

        <button onClick={handleAddLog} disabled={posting || !logContent.trim()} className="btn-gold w-full py-2.5 text-sm">
          {posting ? "保存中..." : "保存记录"}
        </button>
      </div>

      {/* Timeline */}
      <div className="glass-card p-5" style={{ marginBottom: 0 }}>
        <div className="text-sm font-semibold text-white/80 mb-4">📜 联络时间线</div>

        {logs.length === 0 ? (
          <div className="text-center py-8 text-white/20 text-sm">还没有联络记录</div>
        ) : (
          <div className="space-y-0">
            {logs.map((log, i) => {
              const cfg = LOG_TYPES[log.type] ?? LOG_TYPES.note;
              const isLast = i === logs.length - 1;
              const isPlan = log.type === "plan";
              return (
                <div key={log.id} className="flex gap-3 relative" style={{ paddingBottom: isLast ? 0 : 20 }}>
                  {!isLast && (
                    <div className="absolute left-[14px] top-[28px] bottom-0 w-[1.5px]"
                      style={{ background: `linear-gradient(to bottom, ${cfg.color}40, ${cfg.color}10)` }} />
                  )}
                  <div className="w-[30px] h-[30px] rounded-full shrink-0 flex items-center justify-center text-xs"
                    style={{
                      backgroundColor: `${cfg.color}20`,
                      border: `1.5px solid ${cfg.color}50`,
                      boxShadow: `0 0 10px ${cfg.color}22`,
                    }}>
                    {isPlan && log.plan_done ? "✓" : cfg.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
                      <span className="text-[10px] text-white/20">
                        {log.created_at ? new Date(log.created_at).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" }) : ""}
                      </span>
                    </div>
                    <p className="text-sm text-white/60 mt-0.5 leading-relaxed">{log.content}</p>
                    {isPlan && log.plan_date && (
                      <div className="text-[10px] text-white/25 mt-1">
                        📅 {new Date(log.plan_date).toLocaleDateString("zh-CN")}
                        {!log.plan_done && (
                          <button onClick={() => handleMarkDone(log.id)} className="ml-2 text-[#30D158] hover:text-[#30D158]/80">标记完成</button>
                        )}
                        {log.plan_done && <span className="ml-2 text-[#30D158]">✓ 已完成</span>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ShareContactBtn({ contactId, onDone }: { contactId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [sharing, setSharing] = useState(false);

  const { data: circlesData } = useQuery({
    queryKey: ["circles"],
    queryFn: () => api.get<Array<{ id: string; name: string }>>("/circles"),
    enabled: open,
  });
  const circles = circlesData?.data ?? [];

  const handleShare = async (circleId?: string) => {
    setSharing(true);
    await api.post(`/my/contacts/${contactId}/share`, { circleId });
    setSharing(false);
    setOpen(false);
    onDone();
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-[11px] text-[#5AC8FA]/70 hover:text-[#5AC8FA] transition-colors">
        📤 分享到圈子
      </button>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      <span className="text-[10px] text-white/30 mr-1">分享到：</span>
      <button onClick={() => handleShare()} disabled={sharing} className="text-[10px] px-2 py-1 rounded-lg bg-[#5AC8FA]/10 text-[#5AC8FA] hover:bg-[#5AC8FA]/20 transition-colors">
        {sharing ? "..." : "所有圈子"}
      </button>
      {circles.map((c) => (
        <button key={c.id} onClick={() => handleShare(c.id)} disabled={sharing} className="text-[10px] px-2 py-1 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 transition-colors">
          {c.name}
        </button>
      ))}
      <button onClick={() => setOpen(false)} className="text-[10px] text-white/25 ml-1">取消</button>
    </div>
  );
}
