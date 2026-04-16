"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Link from "next/link";
import { useState } from "react";
import { Plus, CircleDot, Shield, Users, X } from "lucide-react";

interface CircleItem {
  id: string;
  name: string;
  description: string;
  myRole: string;
  memberCount?: number;
}

export default function CirclesPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["circles"],
    queryFn: () => api.get<CircleItem[]>("/circles"),
  });
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [creating, setCreating] = useState(false);

  const circles = data?.data ?? [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    await api.post("/circles", { name, description: desc });
    setCreating(false);
    setShowForm(false);
    setName("");
    setDesc("");
    refetch();
  };

  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="serif text-2xl font-semibold text-white">我的圈子</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
            {circles.length} 个圈子
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={showForm ? "btn-glass" : "btn-gold"}
        >
          {showForm ? (
            <>
              <X className="w-4 h-4" />
              <span>取消</span>
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              <span>创建圈子</span>
            </>
          )}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="glass-card p-6 space-y-4 max-w-lg animate-fade-in"
        >
          <h3 className="serif text-base font-semibold text-white">创建新圈子</h3>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="圈子名称"
            className="input-dark w-full"
          />
          <input
            type="text"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="简要描述（可选）"
            className="input-dark w-full"
          />
          <button type="submit" disabled={creating} className="btn-gold">
            {creating ? "创建中..." : "创建"}
          </button>
        </form>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-32 rounded-2xl animate-pulse"
              style={{ background: "rgba(255,255,255,0.04)" }}
            />
          ))}
        </div>
      ) : circles.length === 0 ? (
        <div
          className="glass-card flex flex-col items-center justify-center py-16 text-center"
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "rgba(48,209,88,0.12)" }}
          >
            <CircleDot className="w-8 h-8" style={{ color: "#30D158" }} />
          </div>
          <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.55)" }}>
            还没有加入任何圈子
          </p>
          <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>
            创建第一个圈子开始吧
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {circles.map((c) => (
            <Link
              key={c.id}
              href={`/circles/${c.id}`}
              className="glass-card p-5 group block transition-all hover:scale-[1.01]"
            >
              <div className="flex items-start gap-3">
                {/* Circle Icon */}
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(48,209,88,0.15)" }}
                >
                  <CircleDot className="w-5 h-5" style={{ color: "#30D158" }} />
                </div>

                <div className="flex-1 min-w-0">
                  <h3
                    className="serif font-semibold text-sm text-white group-hover:opacity-80 transition-opacity"
                  >
                    {c.name}
                  </h3>
                  {c.description && (
                    <p
                      className="text-xs mt-1 line-clamp-2"
                      style={{ color: "rgba(255,255,255,0.45)" }}
                    >
                      {c.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-3">
                    {c.myRole === "admin" ? (
                      <span
                        className="pill flex items-center gap-1"
                        style={{ background: "rgba(212,168,83,0.15)", color: "#D4A853" }}
                      >
                        <Shield className="w-3 h-3" />
                        管理员
                      </span>
                    ) : (
                      <span
                        className="pill flex items-center gap-1"
                        style={{ background: "rgba(90,200,250,0.12)", color: "#5AC8FA" }}
                      >
                        <Users className="w-3 h-3" />
                        成员
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
