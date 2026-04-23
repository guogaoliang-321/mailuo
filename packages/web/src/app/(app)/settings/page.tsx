"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { User, Mail, Shield, Users, Pencil, Lock, Check, X, LogOut, KeyRound } from "lucide-react";

export default function SettingsPage() {
  const { user, logout, updateProfile } = useAuth();
  const router = useRouter();

  // Edit display name state
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [nameError, setNameError] = useState("");
  const [nameSaving, setNameSaving] = useState(false);

  // Change password state
  const [pwOpen, setPwOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  const handleStartEditName = () => {
    setNewName(user?.displayName ?? "");
    setNameError("");
    setEditingName(true);
  };

  const handleSaveName = async () => {
    const trimmed = newName.trim();
    if (!trimmed) { setNameError("名称不能为空"); return; }
    if (trimmed === user?.displayName) { setEditingName(false); return; }
    setNameSaving(true);
    setNameError("");
    const err = await updateProfile({ displayName: trimmed });
    setNameSaving(false);
    if (err) { setNameError(err); } else { setEditingName(false); }
  };

  const handleChangePassword = async () => {
    setPwError("");
    if (!currentPw) { setPwError("请输入当前密码"); return; }
    if (newPw.length < 8) { setPwError("新密码至少8位"); return; }
    if (newPw !== confirmPw) { setPwError("两次输入的新密码不一致"); return; }
    setPwSaving(true);
    const res = await api.patch("/auth/password", { currentPassword: currentPw, newPassword: newPw });
    setPwSaving(false);
    if (!res.success) {
      setPwError(res.error ?? "修改失败");
    } else {
      setPwSuccess(true);
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      setTimeout(() => { setPwSuccess(false); setPwOpen(false); }, 2000);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const joinedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })
    : null;

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-xl font-bold text-white/90">个人设置</h1>
        <p className="text-sm text-white/40 mt-0.5">管理你的账号信息与安全</p>
      </div>

      {/* Profile */}
      <div className="glass-card p-6 space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#D4A853]/60 to-[#D4A853]/30 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
              {user?.displayName?.charAt(0) ?? "?"}
            </div>
            <div>
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white/90 outline-none focus:border-[#D4A853]/50 w-40"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") setEditingName(false); }}
                    autoFocus
                    maxLength={50}
                  />
                  <button onClick={handleSaveName} disabled={nameSaving} className="p-1.5 rounded-lg text-green-400 hover:bg-white/5 transition-colors disabled:opacity-50">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setEditingName(false)} className="p-1.5 rounded-lg text-white/30 hover:bg-white/5 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-white/90">{user?.displayName}</span>
                  <button onClick={handleStartEditName} className="p-1 rounded-lg text-white/25 hover:text-white/60 hover:bg-white/5 transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              {nameError && <p className="text-xs text-red-400 mt-1">{nameError}</p>}
              <span className={`badge mt-1 ${user?.role === "admin" ? "bg-[#D4A853]/15 text-[#D4A853]" : "bg-gray-100 text-white/50"}`}>
                {user?.role === "admin" ? (
                  <><Shield className="w-3 h-3 mr-1" />管理员</>
                ) : (
                  <><Users className="w-3 h-3 mr-1" />成员</>
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-white/40" />
            </div>
            <div>
              <p className="text-[10px] text-white/30">显示名称</p>
              <p className="text-sm font-medium text-white/80">{user?.displayName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0">
              <Mail className="w-4 h-4 text-white/40" />
            </div>
            <div>
              <p className="text-[10px] text-white/30">邮箱地址</p>
              <p className="text-sm font-medium text-white/80">{user?.email}</p>
            </div>
          </div>
          {joinedDate && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0">
                <Lock className="w-4 h-4 text-white/40" />
              </div>
              <div>
                <p className="text-[10px] text-white/30">加入时间</p>
                <p className="text-sm font-medium text-white/80">{joinedDate}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Security */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <KeyRound className="w-4 h-4 text-white/40" />
            <div>
              <p className="text-sm font-semibold text-white/80">账号安全</p>
              <p className="text-xs text-white/30">修改登录密码</p>
            </div>
          </div>
          <button
            onClick={() => { setPwOpen((v) => !v); setPwError(""); setPwSuccess(false); }}
            className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80 transition-colors"
          >
            {pwOpen ? "取消" : "修改密码"}
          </button>
        </div>

        {pwOpen && (
          <div className="space-y-3 pt-2 border-t border-white/[0.06]">
            {["当前密码", "新密码（至少8位）", "确认新密码"].map((label, i) => {
              const val = [currentPw, newPw, confirmPw][i];
              const setter = [setCurrentPw, setNewPw, setConfirmPw][i];
              return (
                <div key={label}>
                  <label className="text-xs text-white/30 mb-1 block">{label}</label>
                  <input
                    type="password"
                    value={val}
                    onChange={(e) => { setter(e.target.value); setPwError(""); }}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 outline-none focus:border-[#D4A853]/50 transition-colors"
                    placeholder={label}
                  />
                </div>
              );
            })}
            {pwError && <p className="text-xs text-red-400">{pwError}</p>}
            {pwSuccess && <p className="text-xs text-green-400">密码修改成功</p>}
            <button
              onClick={handleChangePassword}
              disabled={pwSaving}
              className="w-full py-2 rounded-xl bg-[#D4A853]/20 text-[#D4A853] text-sm font-medium hover:bg-[#D4A853]/30 transition-colors disabled:opacity-50"
            >
              {pwSaving ? "保存中…" : "确认修改"}
            </button>
          </div>
        )}
      </div>

      {/* Logout */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white/80">退出登录</p>
            <p className="text-xs text-white/30 mt-0.5">退出后需重新登录才能访问</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 text-red-400/80 text-sm font-medium hover:bg-red-500/20 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            退出
          </button>
        </div>
      </div>
    </div>
  );
}
