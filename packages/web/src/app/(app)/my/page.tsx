"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Link from "next/link";
import { useState } from "react";
import { TagInput } from "@/components/tag-input";

interface MyProject {
  id: string; name: string; stage: string; client: string;
  budget: string; region: string; notes: string;
  next_action: string; next_action_date: string;
  is_shared: boolean; tags: string[];
  created_at: string; updated_at: string;
}

interface MyContact {
  id: string; name: string; company: string; title: string;
  phone: string; tags: string[]; closeness: number; notes: string;
  next_action: string; next_action_date: string;
  reminder_days: number; last_contacted_at: string;
  is_shared: boolean; needsReminder: boolean; actionSoon: boolean;
  created_at: string;
}

interface Reminder {
  id: string; name: string; company: string; title: string;
  next_action: string; next_action_date: string;
  reminder_days: number; last_contacted_at: string;
  urgency: string; tags: string[];
}

const STAGE_LABELS: Record<string, string> = {
  prospecting: "前期意向", approved: "已立项", tracking: "跟踪中",
  bidding: "投标准备", won: "已中标", in_progress: "实施中", completed: "已完成",
};

const STAGE_COLORS: Record<string, string> = {
  prospecting: "#FF9F0A", approved: "#5AC8FA", tracking: "#BF5AF2",
  bidding: "#FF375F", won: "#30D158", in_progress: "#30D158", completed: "#30D158",
};

export default function MyPage() {
  const [tab, setTab] = useState<"projects" | "contacts">("contacts");

  const { data: reminders } = useQuery({
    queryKey: ["my-reminders"],
    queryFn: () => api.get<Reminder[]>("/my/reminders"),
  });

  const reminderList = reminders?.data ?? [];

  return (
    <div className="page-enter space-y-5">
      <div>
        <h1 className="serif text-2xl font-semibold text-white">我的资源库</h1>
        <p className="text-sm text-white/40 mt-1">私密管理你的项目和关系</p>
      </div>

      {/* Reminders */}
      {reminderList.length > 0 && (
        <div className="glass-card p-4" style={{ marginBottom: 0, borderColor: "rgba(255,159,10,0.2)" }}>
          <div className="text-xs font-semibold text-[#FF9F0A] mb-3">⏰ 待联络提醒 ({reminderList.length})</div>
          <div className="space-y-2">
            {reminderList.slice(0, 3).map((r) => (
              <Link key={r.id} href={`/my/contacts/${r.id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                <div className="w-7 h-7 rounded-full bg-[#FF9F0A]/15 text-[#FF9F0A] text-[10px] font-bold flex items-center justify-center shrink-0">
                  {r.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-white/80 font-medium">{r.name} · {r.company}</div>
                  <div className="text-[10px] text-white/35">{r.next_action ?? "该联络了"}</div>
                </div>
                <span className="text-[10px] shrink-0" style={{ color: r.urgency === "overdue" ? "#FF375F" : "#FF9F0A" }}>
                  {r.urgency === "overdue" ? "已过期" : r.urgency === "upcoming" ? "即将到期" : "该联络了"}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04]">
        <button onClick={() => setTab("contacts")}
          className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${tab === "contacts" ? "bg-white/10 text-[#D4A853]" : "text-white/40"}`}>
          🤝 我的关系 ({<ContactCount />})
        </button>
        <button onClick={() => setTab("projects")}
          className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${tab === "projects" ? "bg-white/10 text-[#D4A853]" : "text-white/40"}`}>
          📋 我的项目 ({<ProjectCount />})
        </button>
      </div>

      {tab === "contacts" && <ContactsTab />}
      {tab === "projects" && <ProjectsTab />}
    </div>
  );
}

function ContactCount() {
  const { data } = useQuery({ queryKey: ["my-contacts"], queryFn: () => api.get<MyContact[]>("/my/contacts") });
  return <>{(data?.data ?? []).length}</>;
}

function ProjectCount() {
  const { data } = useQuery({ queryKey: ["my-projects"], queryFn: () => api.get<MyProject[]>("/my/projects") });
  return <>{(data?.data ?? []).length}</>;
}

// ── Contacts Tab ──
function ContactsTab() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["my-contacts"], queryFn: () => api.get<MyContact[]>("/my/contacts") });
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const allContacts = data?.data ?? [];

  // Extract all unique tags from contacts for filter bar
  const allContactTags = [...new Set(allContacts.flatMap((c) => (c.tags ?? []) as string[]))].sort();

  const contacts = allContacts.filter((c) => {
    const matchSearch = !filter || c.name.includes(filter) || (c.tags ?? []).some((t: string) => t.includes(filter)) || (c.company ?? "").includes(filter);
    const matchTag = !tagFilter || (c.tags ?? []).includes(tagFilter);
    return matchSearch && matchTag;
  });

  const [form, setForm] = useState({ name: "", company: "", title: "", phone: "", closeness: 3, notes: "", nextAction: "", nextActionDate: "", reminderDays: "" });
  const [newTags, setNewTags] = useState<string[]>([]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post("/my/contacts", {
      ...form,
      tags: newTags,
      reminderDays: form.reminderDays ? Number(form.reminderDays) : undefined,
      nextActionDate: form.nextActionDate || undefined,
    });
    setShowForm(false);
    setForm({ name: "", company: "", title: "", phone: "", closeness: 3, notes: "", nextAction: "", nextActionDate: "", reminderDays: "" });
    setNewTags([]);
    queryClient.invalidateQueries({ queryKey: ["my-contacts"] });
    queryClient.invalidateQueries({ queryKey: ["my-tags"] });
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input type="text" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="搜索姓名、标签、单位..." className="input-dark flex-1 text-sm py-2" />
        <button onClick={() => setShowForm(!showForm)} className="btn-gold text-xs px-4">{showForm ? "取消" : "+ 添加"}</button>
      </div>

      {/* Tag filter bar */}
      {allContactTags.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          <button onClick={() => setTagFilter("")}
            className={`text-[10px] px-2.5 py-1 rounded-lg shrink-0 transition-all ${!tagFilter ? "bg-[#D4A853]/20 text-[#D4A853]" : "bg-white/5 text-white/30 hover:text-white/50"}`}>
            全部
          </button>
          {allContactTags.map((tag) => (
            <button key={tag} onClick={() => setTagFilter(tagFilter === tag ? "" : tag)}
              className={`text-[10px] px-2.5 py-1 rounded-lg shrink-0 transition-all ${tagFilter === tag ? "bg-[#5AC8FA]/20 text-[#5AC8FA]" : "bg-white/5 text-white/30 hover:text-white/50"}`}>
              {tag}
            </button>
          ))}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="glass-card p-5 space-y-3" style={{ marginBottom: 0 }}>
          <div className="grid grid-cols-2 gap-3">
            <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required placeholder="姓名 *" className="input-dark text-sm py-2" />
            <input type="text" value={form.company} onChange={(e) => setForm({...form, company: e.target.value})} placeholder="单位" className="input-dark text-sm py-2" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="text" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} placeholder="职务" className="input-dark text-sm py-2" />
            <input type="text" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} placeholder="电话" className="input-dark text-sm py-2" />
          </div>
          <div>
            <label className="block text-[10px] text-white/30 mb-1">标签</label>
            <TagInput value={newTags} onChange={setNewTags} placeholder="输入标签回车添加（如：政府、甲方、医院）" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="text" value={form.nextAction} onChange={(e) => setForm({...form, nextAction: e.target.value})} placeholder="下一步行动（如：登门拜访）" className="input-dark text-sm py-2" />
            <input type="date" value={form.nextActionDate} onChange={(e) => setForm({...form, nextActionDate: e.target.value})} className="input-dark text-sm py-2" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" value={form.reminderDays} onChange={(e) => setForm({...form, reminderDays: e.target.value})} placeholder="定期提醒天数（如30）" className="input-dark text-sm py-2" />
            <div />
          </div>
          <textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} placeholder="备注" rows={2} className="input-dark text-sm py-2 resize-none" />
          <button type="submit" className="btn-gold w-full py-2.5 text-sm">保存联系人</button>
        </form>
      )}

      {isLoading ? (
        <div className="skeleton-dark h-20" />
      ) : contacts.length === 0 ? (
        <div className="glass-card text-center py-10" style={{ marginBottom: 0 }}>
          <p className="text-white/20 text-sm">{filter ? "没有找到匹配的联系人" : "添加你的第一个联系人吧"}</p>
        </div>
      ) : (
        contacts.map((c) => (
          <div key={c.id} className="glass-card p-4" style={{ marginBottom: 0, borderColor: c.actionSoon ? "rgba(255,159,10,0.2)" : c.needsReminder ? "rgba(255,55,95,0.15)" : undefined }}>
            <Link href={`/my/contacts/${c.id}`} className="flex items-start gap-3 group">
              <div className="w-9 h-9 rounded-full bg-[#D4A853]/15 text-[#D4A853] text-sm font-bold flex items-center justify-center shrink-0">
                {c.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-white/90 font-medium group-hover:text-white transition-colors">{c.name}</span>
                  {c.is_shared
                    ? <span className="text-[9px] text-[#30D158] bg-[#30D158]/10 px-1.5 py-0.5 rounded">已分享</span>
                    : <span className="text-[9px] text-white/25 bg-white/5 px-1.5 py-0.5 rounded">私密关系 (仅本人可见)</span>
                  }
                  {c.actionSoon && <span className="text-[9px] text-[#FF9F0A] bg-[#FF9F0A]/10 px-1.5 py-0.5 rounded">待行动</span>}
                  {c.needsReminder && <span className="text-[9px] text-[#FF375F] bg-[#FF375F]/10 px-1.5 py-0.5 rounded">该联络</span>}
                </div>
                <div className="text-[11px] text-white/35 mt-0.5">
                  {[c.company, c.title].filter(Boolean).join(" · ")}
                </div>
                {(c.tags ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {(c.tags as string[]).slice(0, 4).map((t) => (
                      <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-[#5AC8FA]/10 text-[#5AC8FA]/70">{t}</span>
                    ))}
                  </div>
                )}
                {c.next_action && (
                  <div className="text-[10px] text-white/30 mt-1">
                    📌 {c.next_action} {c.next_action_date ? `(${new Date(c.next_action_date).toLocaleDateString("zh-CN")})` : ""}
                  </div>
                )}
              </div>
              <div className="flex gap-0.5 shrink-0 mt-1">
                {[1,2,3,4,5].map((i) => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full ${i <= (c.closeness ?? 3) ? "bg-[#D4A853]" : "bg-white/10"}`} />
                ))}
              </div>
            </Link>
            {/* Share management */}
            <div className="mt-2 ml-12">
              <ShareManager type="contacts" id={c.id} isShared={!!c.is_shared} onDone={() => queryClient.invalidateQueries({ queryKey: ["my-contacts"] })} />
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ── Projects Tab ──
function ProjectsTab() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["my-projects"], queryFn: () => api.get<MyProject[]>("/my/projects") });
  const [showForm, setShowForm] = useState(false);
  const [stageFilter, setStageFilter] = useState("");
  const allProjects = data?.data ?? [];
  const projects = stageFilter ? allProjects.filter((p) => p.stage === stageFilter) : allProjects;

  const [form, setForm] = useState({ name: "", stage: "prospecting", client: "", budget: "", region: "", notes: "", nextAction: "", nextActionDate: "", deadline: "", deadlineNote: "" });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post("/my/projects", { ...form, nextActionDate: form.nextActionDate || undefined, deadline: form.deadline || undefined });
    setShowForm(false);
    setForm({ name: "", stage: "prospecting", client: "", budget: "", region: "", notes: "", nextAction: "", nextActionDate: "", deadline: "", deadlineNote: "" });
    queryClient.invalidateQueries({ queryKey: ["my-projects"] });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        {/* Stage filter */}
        <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          <button onClick={() => setStageFilter("")}
            className={`text-[10px] px-2 py-1 rounded-lg shrink-0 transition-all ${!stageFilter ? "bg-[#D4A853]/20 text-[#D4A853]" : "bg-white/5 text-white/30"}`}>
            全部
          </button>
          {Object.entries(STAGE_LABELS).map(([k, v]) => (
            <button key={k} onClick={() => setStageFilter(stageFilter === k ? "" : k)}
              className={`text-[10px] px-2 py-1 rounded-lg shrink-0 transition-all ${stageFilter === k ? `bg-white/10 text-white` : "bg-white/5 text-white/30"}`}
              style={stageFilter === k ? { color: STAGE_COLORS[k] } : {}}>
              {v}
            </button>
          ))}
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-gold text-xs px-4 shrink-0">{showForm ? "取消" : "+ 添加"}</button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="glass-card p-5 space-y-3" style={{ marginBottom: 0 }}>
          <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required placeholder="项目名称 *" className="input-dark text-sm py-2" />
          <div className="grid grid-cols-3 gap-3">
            <select value={form.stage} onChange={(e) => setForm({...form, stage: e.target.value})} className="input-dark text-sm py-2">
              {Object.entries(STAGE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input type="text" value={form.client} onChange={(e) => setForm({...form, client: e.target.value})} placeholder="甲方" className="input-dark text-sm py-2" />
            <input type="text" value={form.budget} onChange={(e) => setForm({...form, budget: e.target.value})} placeholder="预算" className="input-dark text-sm py-2" />
          </div>
          <input type="text" value={form.region} onChange={(e) => setForm({...form, region: e.target.value})} placeholder="区域" className="input-dark text-sm py-2" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-white/30 mb-1">项目有效期/关键节点</label>
              <input type="date" value={form.deadline} onChange={(e) => setForm({...form, deadline: e.target.value})} className="input-dark text-sm py-2" />
            </div>
            <div>
              <label className="block text-[10px] text-white/30 mb-1">节点说明</label>
              <input type="text" value={form.deadlineNote} onChange={(e) => setForm({...form, deadlineNote: e.target.value})} placeholder="如：可研启动/招标截止" className="input-dark text-sm py-2" />
            </div>
          </div>
          <textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} placeholder="备注" rows={2} className="input-dark text-sm py-2 resize-none" />
          <button type="submit" className="btn-gold w-full py-2.5 text-sm">保存项目</button>
        </form>
      )}

      {isLoading ? (
        <div className="skeleton-dark h-20" />
      ) : projects.length === 0 ? (
        <div className="glass-card text-center py-10" style={{ marginBottom: 0 }}>
          <p className="text-white/20 text-sm">添加你的第一个在手项目吧</p>
        </div>
      ) : (
        projects.map((p) => {
          const color = STAGE_COLORS[p.stage] ?? "#FF9F0A";
          return (
            <Link key={p.id} href={`/my/projects/${p.id}`} className="glass-card p-4 block group" style={{ marginBottom: 0 }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm text-white/90 font-medium">{p.name}</h3>
                    {p.is_shared
                      ? <span className="text-[9px] text-[#30D158] bg-[#30D158]/10 px-1.5 py-0.5 rounded">已分享</span>
                      : <span className="text-[9px] text-white/25 bg-white/5 px-1.5 py-0.5 rounded">私密项目 (仅本人可见)</span>
                    }
                  </div>
                  <div className="text-[11px] text-white/35 mt-0.5">
                    {[p.client, p.region, p.budget].filter(Boolean).join(" · ")}
                  </div>
                  {(p as unknown as { deadline?: string }).deadline && (
                    <div className="text-[10px] text-[#FF9F0A]/70 mt-1">
                      ⏰ {String((p as unknown as { deadline_note?: string }).deadline_note ?? "关键节点")}: {new Date((p as unknown as { deadline: string }).deadline).toLocaleDateString("zh-CN")}
                    </div>
                  )}
                  {p.next_action && (
                    <div className="text-[10px] text-white/30 mt-1">
                      📌 {p.next_action} {p.next_action_date ? `(${new Date(p.next_action_date).toLocaleDateString("zh-CN")})` : ""}
                    </div>
                  )}
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0"
                  style={{ backgroundColor: `${color}15`, color, border: `0.5px solid ${color}30` }}>
                  {STAGE_LABELS[p.stage] ?? p.stage}
                </span>
              </div>
              {/* Share management */}
              <div className="mt-2" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                <ShareManager type="projects" id={p.id} isShared={!!p.is_shared} onDone={() => queryClient.invalidateQueries({ queryKey: ["my-projects"] })} />
              </div>
            </Link>
          );
        })
      )}
    </div>
  );
}

// ── Share Manager (multi-select, always editable) ──
function ShareManager({ type, id, isShared, onDone }: { type: "projects" | "contacts"; id: string; isShared: boolean; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [sharing, setSharing] = useState(false);

  const { data: circlesData } = useQuery({
    queryKey: ["circles"],
    queryFn: () => api.get<Array<{ id: string; name: string }>>("/circles"),
    enabled: open,
  });
  const circles = circlesData?.data ?? [];

  const handleShare = async (e: React.MouseEvent, circleId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSharing(true);
    await api.post(`/my/${type}/${id}/share`, { circleId });
    setSharing(false);
    onDone();
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-[11px] transition-colors" style={{ color: isShared ? "rgba(48,209,88,0.7)" : "rgba(90,200,250,0.7)" }}>
        {isShared ? "🔄 管理分享" : "📤 分享到圈子"}
      </button>
    );
  }

  return (
    <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
      <div className="text-[10px] text-white/30 mb-2">{isShared ? "重新分享到：" : "选择分享的圈子："}</div>
      <div className="flex flex-wrap gap-1.5">
        <button onClick={(e) => handleShare(e)} disabled={sharing} className="text-[10px] px-2.5 py-1 rounded-lg bg-[#5AC8FA]/10 text-[#5AC8FA] hover:bg-[#5AC8FA]/20 transition-colors">
          {sharing ? "..." : "📢 所有圈子"}
        </button>
        {circles.map((c) => (
          <button key={c.id} onClick={(e) => handleShare(e, c.id)} disabled={sharing} className="text-[10px] px-2.5 py-1 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 transition-colors">
            {c.name}
          </button>
        ))}
      </div>
      <button onClick={() => setOpen(false)} className="text-[10px] text-white/25 mt-2 block">收起</button>
    </div>
  );
}
