"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { TagInput } from "@/components/tag-input";

interface Contact {
  id: string; name: string; company: string; title: string;
  phone: string; tags: string[]; closeness: number; notes: string;
  next_action: string; next_action_date: string;
  reminder_days: number; last_contacted_at: string;
  is_shared: boolean;
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
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: contactData } = useQuery({
    queryKey: ["my-contact", contactId],
    queryFn: () => api.get<Contact>(`/my/contacts/${contactId}`),
  });

  const { data: logsData, refetch: refetchLogs } = useQuery({
    queryKey: ["contact-logs", contactId],
    queryFn: () => api.get<LogItem[]>(`/my/contacts/${contactId}/logs`),
  });

  const { data: circlesData } = useQuery({
    queryKey: ["circles"],
    queryFn: () => api.get<Array<{ id: string; name: string }>>("/circles"),
  });

  const contact = contactData?.data;
  const logs = logsData?.data ?? [];
  const circles = circlesData?.data ?? [];

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [formTags, setFormTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const [logType, setLogType] = useState("note");
  const [logContent, setLogContent] = useState("");
  const [planDate, setPlanDate] = useState("");
  const [posting, setPosting] = useState(false);

  const [shareOpen, setShareOpen] = useState(false);
  const [sharing, setSharing] = useState(false);

  const startEdit = () => {
    if (!contact) return;
    setForm({
      name: contact.name ?? "",
      company: contact.company ?? "",
      title: contact.title ?? "",
      phone: contact.phone ?? "",
      closeness: contact.closeness ?? 3,
      notes: contact.notes ?? "",
      nextAction: contact.next_action ?? "",
      nextActionDate: contact.next_action_date ? new Date(contact.next_action_date).toISOString().split("T")[0] : "",
      reminderDays: contact.reminder_days ?? "",
    });
    setFormTags((contact.tags as string[]) ?? []);
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    await api.patch(`/my/contacts/${contactId}`, {
      ...form,
      tags: formTags,
      nextActionDate: (form.nextActionDate as string) || undefined,
      reminderDays: form.reminderDays ? Number(form.reminderDays) : undefined,
    });
    setSaving(false);
    setEditing(false);
    queryClient.invalidateQueries({ queryKey: ["my-contact", contactId] });
    queryClient.invalidateQueries({ queryKey: ["my-contacts"] });
    queryClient.invalidateQueries({ queryKey: ["my-tags"] });
  };

  const handleDelete = async () => {
    if (!confirm("确定删除此联系人？")) return;
    await api.delete(`/my/contacts/${contactId}`);
    queryClient.invalidateQueries({ queryKey: ["my-contacts"] });
    router.push("/my");
  };

  const handleAddLog = async () => {
    if (!logContent.trim()) return;
    setPosting(true);
    await api.post(`/my/contacts/${contactId}/logs`, {
      type: logType, content: logContent.trim(),
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

  const handleShare = async (circleId?: string) => {
    setSharing(true);
    await api.post(`/my/contacts/${contactId}/share`, { circleId });
    setSharing(false);
    setShareOpen(false);
    queryClient.invalidateQueries({ queryKey: ["my-contact", contactId] });
  };

  if (!contact) {
    return <div className="glass-card text-center py-12"><p className="text-white/40">加载中...</p></div>;
  }

  return (
    <div className="space-y-5 max-w-2xl page-enter">
      <Link href="/my" className="text-sm text-[#D4A853]/70 hover:text-[#D4A853] transition-colors">← 返回我的资源库</Link>

      {/* Contact Header / Edit */}
      <div className="glass-card p-5" style={{ marginBottom: 0 }}>
        {editing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input type="text" value={form.name as string} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="姓名 *" className="input-dark text-sm py-2" />
              <input type="text" value={form.company as string} onChange={(e) => setForm({...form, company: e.target.value})} placeholder="单位" className="input-dark text-sm py-2" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input type="text" value={form.title as string} onChange={(e) => setForm({...form, title: e.target.value})} placeholder="职务" className="input-dark text-sm py-2" />
              <input type="text" value={form.phone as string} onChange={(e) => setForm({...form, phone: e.target.value})} placeholder="电话" className="input-dark text-sm py-2" />
            </div>
            <div>
              <label className="block text-[10px] text-white/30 mb-1">标签</label>
              <TagInput value={formTags} onChange={setFormTags} placeholder="输入标签回车添加（如：政府、甲方、医院）" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-white/30 mb-1">亲疏度</label>
                <div className="flex gap-1">
                  {[1,2,3,4,5].map((i) => (
                    <button key={i} type="button" onClick={() => setForm({...form, closeness: i})}
                      className={`flex-1 h-9 rounded-lg text-xs font-medium transition-all ${
                        (form.closeness as number) >= i ? "bg-[#D4A853]/20 text-[#D4A853]" : "bg-white/5 text-white/20"
                      }`}>{i}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-white/30 mb-1">定期提醒（天）</label>
                <input type="number" value={form.reminderDays as string} onChange={(e) => setForm({...form, reminderDays: e.target.value})} placeholder="如30" className="input-dark text-sm py-2 w-full" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input type="text" value={form.nextAction as string} onChange={(e) => setForm({...form, nextAction: e.target.value})} placeholder="下一步行动" className="input-dark text-sm py-2" />
              <input type="date" value={form.nextActionDate as string} onChange={(e) => setForm({...form, nextActionDate: e.target.value})} className="input-dark text-sm py-2" />
            </div>
            <textarea value={form.notes as string} onChange={(e) => setForm({...form, notes: e.target.value})} placeholder="备注" rows={2} className="input-dark text-sm py-2 resize-none w-full" />
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving} className="btn-gold flex-1 py-2.5 text-sm">{saving ? "保存中..." : "保存"}</button>
              <button onClick={() => setEditing(false)} className="btn-glass flex-1 py-2.5 text-sm">取消</button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#D4A853]/15 text-[#D4A853] text-xl font-bold flex items-center justify-center shrink-0">
                {contact.name[0]}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg text-white/95 font-bold">{contact.name}</h1>
                  {contact.is_shared
                    ? <span className="text-[9px] text-[#30D158] bg-[#30D158]/10 px-1.5 py-0.5 rounded">已分享</span>
                    : <span className="text-[9px] text-white/25 bg-white/5 px-1.5 py-0.5 rounded">私有</span>
                  }
                </div>
                <div className="text-sm text-white/40 mt-0.5">{[contact.company, contact.title].filter(Boolean).join(" · ")}</div>
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

            {contact.next_action && (
              <div className="mt-4 pt-3 border-t border-white/[0.06]">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[#FF9F0A]">📌 下一步：</span>
                  <span className="text-white/60">{contact.next_action}</span>
                  {contact.next_action_date && <span className="text-white/30 ml-auto">{new Date(contact.next_action_date).toLocaleDateString("zh-CN")}</span>}
                </div>
              </div>
            )}
            {contact.reminder_days && (
              <div className="mt-2 text-[10px] text-white/25">
                🔔 每 {contact.reminder_days} 天提醒 {contact.last_contacted_at && ` · 上次 ${new Date(contact.last_contacted_at).toLocaleDateString("zh-CN")}`}
              </div>
            )}
            {contact.notes && (
              <div className="mt-3 pt-3 border-t border-white/[0.06]"><div className="text-xs text-white/40 leading-relaxed">{contact.notes}</div></div>
            )}

            {/* Actions */}
            <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center gap-3 flex-wrap">
              <button onClick={startEdit} className="text-[11px] text-[#D4A853] hover:text-[#D4A853]/80">✏️ 编辑</button>
              {!contact.is_shared && (
                shareOpen ? (
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-[10px] text-white/30">分享到：</span>
                    <button onClick={() => handleShare()} disabled={sharing} className="text-[10px] px-2 py-1 rounded-lg bg-[#5AC8FA]/10 text-[#5AC8FA]">{sharing ? "..." : "所有圈子"}</button>
                    {circles.map((c) => (
                      <button key={c.id} onClick={() => handleShare(c.id)} disabled={sharing} className="text-[10px] px-2 py-1 rounded-lg bg-white/5 text-white/50">{c.name}</button>
                    ))}
                    <button onClick={() => setShareOpen(false)} className="text-[10px] text-white/25">取消</button>
                  </div>
                ) : (
                  <button onClick={() => setShareOpen(true)} className="text-[11px] text-[#5AC8FA]/70 hover:text-[#5AC8FA]">📤 分享到圈子</button>
                )
              )}
              <button onClick={handleDelete} className="text-[11px] text-[#FF375F]/50 hover:text-[#FF375F] ml-auto">🗑 删除</button>
            </div>
          </div>
        )}
      </div>

      {/* Add Log */}
      <div className="glass-card p-5" style={{ marginBottom: 0 }}>
        <div className="text-sm font-semibold text-white/80 mb-3">➕ 记录联络</div>
        <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
          {Object.entries(LOG_TYPES).map(([key, cfg]) => (
            <button key={key} onClick={() => setLogType(key)}
              className={`text-[11px] px-3 py-1.5 rounded-lg shrink-0 transition-all ${logType === key ? "bg-white/10 text-white" : "text-white/30 hover:text-white/50"}`}>
              {cfg.icon} {cfg.label}
            </button>
          ))}
        </div>
        <textarea value={logContent} onChange={(e) => setLogContent(e.target.value)}
          placeholder={logType === "plan" ? "计划做什么..." : "记录内容..."} rows={2} className="input-dark text-sm resize-none mb-2 w-full" />
        {logType === "plan" && <input type="date" value={planDate} onChange={(e) => setPlanDate(e.target.value)} className="input-dark text-sm py-2 mb-2 w-full" />}
        <button onClick={handleAddLog} disabled={posting || !logContent.trim()} className="btn-gold w-full py-2.5 text-sm">{posting ? "保存中..." : "保存记录"}</button>
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
                  {!isLast && <div className="absolute left-[14px] top-[28px] bottom-0 w-[1.5px]" style={{ background: `linear-gradient(to bottom, ${cfg.color}40, ${cfg.color}10)` }} />}
                  <div className="w-[30px] h-[30px] rounded-full shrink-0 flex items-center justify-center text-xs"
                    style={{ backgroundColor: `${cfg.color}20`, border: `1.5px solid ${cfg.color}50`, boxShadow: `0 0 10px ${cfg.color}22` }}>
                    {isPlan && log.plan_done ? "✓" : cfg.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
                      <span className="text-[10px] text-white/20">{log.created_at ? new Date(log.created_at).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" }) : ""}</span>
                    </div>
                    <p className="text-sm text-white/60 mt-0.5 leading-relaxed">{log.content}</p>
                    {isPlan && log.plan_date && (
                      <div className="text-[10px] text-white/25 mt-1">
                        📅 {new Date(log.plan_date).toLocaleDateString("zh-CN")}
                        {!log.plan_done && <button onClick={() => handleMarkDone(log.id)} className="ml-2 text-[#30D158] hover:text-[#30D158]/80">标记完成</button>}
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
