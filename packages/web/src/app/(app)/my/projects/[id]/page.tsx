"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

const STAGE_LABELS: Record<string, string> = {
  prospecting: "前期意向", approved: "已立项", tracking: "跟踪中",
  bidding: "投标准备", won: "已中标", in_progress: "实施中", completed: "已完成",
};

const STAGE_COLORS: Record<string, string> = {
  prospecting: "#FF9F0A", approved: "#5AC8FA", tracking: "#BF5AF2",
  bidding: "#FF375F", won: "#30D158", in_progress: "#30D158", completed: "#30D158",
};

export default function MyProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["my-projects"],
    queryFn: () => api.get<Array<Record<string, unknown>>>("/my/projects"),
  });

  const project = (data?.data ?? []).find((p) => p.id === projectId);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [sharing, setSharing] = useState(false);

  const { data: circlesData } = useQuery({
    queryKey: ["circles"],
    queryFn: () => api.get<Array<{ id: string; name: string }>>("/circles"),
    enabled: shareOpen,
  });

  if (!project) {
    return <div className="glass-card text-center py-12"><p className="text-white/40">加载中...</p></div>;
  }

  const color = STAGE_COLORS[project.stage as string] ?? "#FF9F0A";
  const isShared = project.is_shared as boolean;

  const startEdit = () => {
    setForm({
      name: (project.name as string) ?? "",
      stage: (project.stage as string) ?? "prospecting",
      client: (project.client as string) ?? "",
      budget: (project.budget as string) ?? "",
      region: (project.region as string) ?? "",
      notes: (project.notes as string) ?? "",
      nextAction: (project.next_action as string) ?? "",
      nextActionDate: project.next_action_date ? new Date(project.next_action_date as string).toISOString().split("T")[0] : "",
      deadline: project.deadline ? new Date(project.deadline as string).toISOString().split("T")[0] : "",
      deadlineNote: (project.deadline_note as string) ?? "",
    });
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    await api.patch(`/my/projects/${projectId}`, {
      ...form,
      nextActionDate: form.nextActionDate || undefined,
      deadline: form.deadline || undefined,
    });
    setSaving(false);
    setEditing(false);
    queryClient.invalidateQueries({ queryKey: ["my-projects"] });
  };

  const handleDelete = async () => {
    if (!confirm("确定删除此项目？")) return;
    await api.delete(`/my/projects/${projectId}`);
    queryClient.invalidateQueries({ queryKey: ["my-projects"] });
    router.push("/my");
  };

  const handleShare = async (circleId?: string) => {
    setSharing(true);
    await api.post(`/my/projects/${projectId}/share`, { circleId });
    setSharing(false);
    setShareOpen(false);
    queryClient.invalidateQueries({ queryKey: ["my-projects"] });
  };

  return (
    <div className="space-y-5 max-w-2xl page-enter">
      <Link href="/my" className="text-sm text-[#D4A853]/70 hover:text-[#D4A853] transition-colors">← 返回我的资源库</Link>

      <div className="glass-card p-5" style={{ marginBottom: 0 }}>
        {editing ? (
          /* Edit form */
          <div className="space-y-3">
            <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="input-dark text-sm py-2 w-full" placeholder="项目名称" />
            <div className="grid grid-cols-3 gap-3">
              <select value={form.stage} onChange={(e) => setForm({...form, stage: e.target.value})} className="input-dark text-sm py-2">
                {Object.entries(STAGE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <input type="text" value={form.client} onChange={(e) => setForm({...form, client: e.target.value})} placeholder="甲方" className="input-dark text-sm py-2" />
              <input type="text" value={form.budget} onChange={(e) => setForm({...form, budget: e.target.value})} placeholder="预算" className="input-dark text-sm py-2" />
            </div>
            <input type="text" value={form.region} onChange={(e) => setForm({...form, region: e.target.value})} placeholder="区域" className="input-dark text-sm py-2 w-full" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-white/30 mb-1">关键节点日期</label>
                <input type="date" value={form.deadline} onChange={(e) => setForm({...form, deadline: e.target.value})} className="input-dark text-sm py-2 w-full" />
              </div>
              <div>
                <label className="block text-[10px] text-white/30 mb-1">节点说明</label>
                <input type="text" value={form.deadlineNote} onChange={(e) => setForm({...form, deadlineNote: e.target.value})} placeholder="如：招标截止" className="input-dark text-sm py-2 w-full" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input type="text" value={form.nextAction} onChange={(e) => setForm({...form, nextAction: e.target.value})} placeholder="下一步行动" className="input-dark text-sm py-2" />
              <input type="date" value={form.nextActionDate} onChange={(e) => setForm({...form, nextActionDate: e.target.value})} className="input-dark text-sm py-2" />
            </div>
            <textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} placeholder="备注" rows={3} className="input-dark text-sm py-2 resize-none w-full" />
            {/* Share status in edit mode */}
            {!isShared && (
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white/30">当前状态：<span className="text-white/50">私有</span></span>
                  {!shareOpen ? (
                    <button onClick={() => setShareOpen(true)} className="text-[10px] text-[#5AC8FA]/70 hover:text-[#5AC8FA]">📤 分享到圈子</button>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <button onClick={() => handleShare()} disabled={sharing} className="text-[10px] px-2 py-1 rounded-lg bg-[#5AC8FA]/10 text-[#5AC8FA]">{sharing ? "..." : "所有圈子"}</button>
                      {(circlesData?.data ?? []).map((c) => (
                        <button key={c.id} onClick={() => handleShare(c.id)} disabled={sharing} className="text-[10px] px-2 py-1 rounded-lg bg-white/5 text-white/50">{c.name}</button>
                      ))}
                      <button onClick={() => setShareOpen(false)} className="text-[10px] text-white/25">取消</button>
                    </div>
                  )}
                </div>
              </div>
            )}
            {isShared && (
              <div className="text-[10px] text-[#30D158] bg-[#30D158]/10 px-3 py-2 rounded-lg">✓ 已分享到圈子</div>
            )}
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving} className="btn-gold flex-1 py-2.5 text-sm">{saving ? "保存中..." : "保存"}</button>
              <button onClick={() => setEditing(false)} className="btn-glass flex-1 py-2.5 text-sm">取消</button>
            </div>
          </div>
        ) : (
          /* View mode */
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg text-white/95 font-bold">{project.name as string}</h1>
                  {isShared
                    ? <span className="text-[9px] text-[#30D158] bg-[#30D158]/10 px-1.5 py-0.5 rounded">已分享到圈子</span>
                    : <span className="text-[9px] text-white/25 bg-white/5 px-1.5 py-0.5 rounded">私有</span>
                  }
                </div>
                <div className="text-sm text-white/40 mt-1">
                  {[project.client, project.region, project.budget].filter(Boolean).join(" · ")}
                </div>
              </div>
              <span className="text-[11px] px-2.5 py-1 rounded-full font-medium shrink-0"
                style={{ backgroundColor: `${color}15`, color, border: `0.5px solid ${color}30` }}>
                {STAGE_LABELS[project.stage as string] ?? project.stage}
              </span>
            </div>

            {!!project.deadline && (
              <div className="text-xs text-[#FF9F0A]/70 mt-3">
                {"⏰ "}{String(project.deadline_note ?? "关键节点")}{": "}{new Date(project.deadline as string).toLocaleDateString("zh-CN")}
              </div>
            )}

            {!!project.next_action && (
              <div className="text-xs text-white/30 mt-2">
                {"📌 "}{String(project.next_action)}{project.next_action_date ? ` (${new Date(project.next_action_date as string).toLocaleDateString("zh-CN")})` : ""}
              </div>
            )}

            {!!project.notes && (
              <div className="mt-3 pt-3 border-t border-white/[0.06]">
                <div className="text-xs text-white/40 leading-relaxed">{String(project.notes)}</div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center gap-3">
              <button onClick={startEdit} className="text-[11px] text-[#D4A853] hover:text-[#D4A853]/80 transition-colors">✏️ 编辑</button>
              {!isShared && (
                <>
                  {shareOpen ? (
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className="text-[10px] text-white/30">分享到：</span>
                      <button onClick={() => handleShare()} disabled={sharing} className="text-[10px] px-2 py-1 rounded-lg bg-[#5AC8FA]/10 text-[#5AC8FA]">
                        {sharing ? "..." : "所有圈子"}
                      </button>
                      {(circlesData?.data ?? []).map((c) => (
                        <button key={c.id} onClick={() => handleShare(c.id)} disabled={sharing} className="text-[10px] px-2 py-1 rounded-lg bg-white/5 text-white/50">
                          {c.name}
                        </button>
                      ))}
                      <button onClick={() => setShareOpen(false)} className="text-[10px] text-white/25">取消</button>
                    </div>
                  ) : (
                    <button onClick={() => setShareOpen(true)} className="text-[11px] text-[#5AC8FA]/70 hover:text-[#5AC8FA] transition-colors">📤 分享到圈子</button>
                  )}
                </>
              )}
              <button onClick={handleDelete} className="text-[11px] text-[#FF375F]/50 hover:text-[#FF375F] transition-colors ml-auto">🗑 删除</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
