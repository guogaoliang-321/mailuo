"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { User, Mail, Shield, Users, Pencil, Lock, Check, X, LogOut, KeyRound, Camera, Bell, BellOff } from "lucide-react";

export default function SettingsPage() {
  const { user, logout, updateProfile, updateAvatar } = useAuth();
  const router = useRouter();

  // Avatar upload state
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_500_000) { setAvatarError("图片不超过 1.5MB"); return; }
    setAvatarUploading(true);
    setAvatarError("");
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      const err = await updateAvatar(dataUrl);
      setAvatarUploading(false);
      if (err) setAvatarError(err);
    };
    reader.readAsDataURL(file);
  };

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

  // Push notification state
  const [pushSupported, setPushSupported] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushError, setPushError] = useState("");
  const [currentSubscription, setCurrentSubscription] = useState<PushSubscription | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("PushManager" in window) || !("serviceWorker" in navigator)) return;
    setPushSupported(true);

    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        if (sub) {
          setCurrentSubscription(sub);
          setPushSubscribed(true);
        }
      });
    });
  }, []);

  const handleEnablePush = async () => {
    setPushLoading(true);
    setPushError("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushError("请在浏览器设置中允许通知权限");
        setPushLoading(false);
        return;
      }

      const keyRes = await api.get("/push/vapid-key");
      if (!keyRes.success || !keyRes.data) {
        setPushError("获取配置失败，请稍后重试");
        setPushLoading(false);
        return;
      }

      const vapidPublicKey = keyRes.data as string;
      const reg = await navigator.serviceWorker.ready;

      // Convert VAPID key from base64 to Uint8Array
      const padding = "=".repeat((4 - (vapidPublicKey.length % 4)) % 4);
      const base64 = (vapidPublicKey + padding).replace(/-/g, "+").replace(/_/g, "/");
      const rawKey = window.atob(base64);
      const applicationServerKey = new Uint8Array(rawKey.length);
      for (let i = 0; i < rawKey.length; i++) {
        applicationServerKey[i] = rawKey.charCodeAt(i);
      }

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      const subJson = subscription.toJSON();
      const res = await api.post("/push/subscribe", {
        endpoint: subscription.endpoint,
        p256dh: subJson.keys?.p256dh ?? "",
        auth: subJson.keys?.auth ?? "",
      });

      if (!res.success) {
        await subscription.unsubscribe();
        setPushError(res.error ?? "订阅失败");
      } else {
        setCurrentSubscription(subscription);
        setPushSubscribed(true);
      }
    } catch (err) {
      setPushError(err instanceof Error ? err.message : "开启失败，请重试");
    }
    setPushLoading(false);
  };

  const handleDisablePush = async () => {
    if (!currentSubscription) return;
    setPushLoading(true);
    setPushError("");
    try {
      await api.delete("/push/subscribe", { endpoint: currentSubscription.endpoint });
      await currentSubscription.unsubscribe();
      setCurrentSubscription(null);
      setPushSubscribed(false);
    } catch (err) {
      setPushError(err instanceof Error ? err.message : "关闭失败，请重试");
    }
    setPushLoading(false);
  };

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
            <label className="relative cursor-pointer group flex-shrink-0">
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              {user?.avatar ? (
                <img src={user.avatar} alt="头像" className="w-14 h-14 rounded-2xl object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#D4A853]/60 to-[#D4A853]/30 flex items-center justify-center text-white text-xl font-bold">
                  {user?.displayName?.charAt(0) ?? "?"}
                </div>
              )}
              <div className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {avatarUploading ? <span className="text-[10px] text-white">上传中…</span> : <Camera className="w-5 h-5 text-white" />}
              </div>
            </label>
            <div>
              {avatarError && <p className="text-[10px] text-red-400 mb-1">{avatarError}</p>}
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

      {/* Push Notifications */}
      {pushSupported && (
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-white/40" />
              <div>
                <p className="text-sm font-semibold text-white/80">消息通知</p>
                <p className="text-xs text-white/30">
                  {pushSubscribed ? "已开启推送通知" : "开启后可收到广场新评论提醒"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {pushSubscribed ? (
                <button
                  onClick={handleDisablePush}
                  disabled={pushLoading}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80 transition-colors disabled:opacity-50"
                >
                  <BellOff className="w-3.5 h-3.5" />
                  {pushLoading ? "处理中…" : "关闭通知"}
                </button>
              ) : (
                <button
                  onClick={handleEnablePush}
                  disabled={pushLoading}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#D4A853]/15 text-[#D4A853] hover:bg-[#D4A853]/25 transition-colors disabled:opacity-50"
                >
                  <Bell className="w-3.5 h-3.5" />
                  {pushLoading ? "处理中…" : "开启通知"}
                </button>
              )}
            </div>
          </div>
          {pushError && <p className="text-xs text-red-400">{pushError}</p>}
        </div>
      )}

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
