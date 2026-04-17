"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { Network, ZoomIn, ZoomOut, Maximize2, Info } from "lucide-react";

interface GraphNode {
  id: string;
  label: string;
  type: "user" | "circle";
  group?: string;
}

interface GraphLink {
  source: string;
  target: string;
  type: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export default function GraphPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["network-graph"],
    queryFn: () => api.get<GraphData>("/recommendations/graph"),
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const nodesRef = useRef<
    Array<GraphNode & { x: number; y: number; vx: number; vy: number }>
  >([]);
  const linksRef = useRef<GraphLink[]>([]);

  const graph = data?.data;
  const hasData = graph && graph.nodes && graph.nodes.length > 0;

  // Initialize simulation data
  useEffect(() => {
    if (!graph?.nodes) return;

    const cx = dimensions.width / 2;
    const cy = dimensions.height / 2;

    nodesRef.current = graph.nodes.map((n, i) => ({
      ...n,
      x: cx + (Math.random() - 0.5) * 300,
      y: cy + (Math.random() - 0.5) * 300,
      vx: 0,
      vy: 0,
    }));
    linksRef.current = graph.links ?? [];
  }, [graph, dimensions]);

  // Simple force simulation
  const simulate = useCallback(() => {
    const nodes = nodesRef.current;
    const links = linksRef.current;
    if (nodes.length === 0) return;

    const cx = dimensions.width / 2;
    const cy = dimensions.height / 2;

    // Center gravity
    for (const n of nodes) {
      n.vx += (cx - n.x) * 0.001;
      n.vy += (cy - n.y) * 0.001;
    }

    // Repulsion between nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = 800 / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        nodes[i].vx -= fx;
        nodes[i].vy -= fy;
        nodes[j].vx += fx;
        nodes[j].vy += fy;
      }
    }

    // Link attraction
    for (const link of links) {
      const source = nodes.find((n) => n.id === link.source);
      const target = nodes.find((n) => n.id === link.target);
      if (!source || !target) continue;
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const force = (dist - 120) * 0.005;
      const fx = (dx / Math.max(dist, 1)) * force;
      const fy = (dy / Math.max(dist, 1)) * force;
      source.vx += fx;
      source.vy += fy;
      target.vx -= fx;
      target.vy -= fy;
    }

    // Apply velocity with damping
    for (const n of nodes) {
      n.vx *= 0.85;
      n.vy *= 0.85;
      n.x += n.vx;
      n.y += n.vy;
      // Keep in bounds
      n.x = Math.max(30, Math.min(dimensions.width - 30, n.x));
      n.y = Math.max(30, Math.min(dimensions.height - 30, n.y));
    }
  }, [dimensions]);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasData) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      simulate();
      const nodes = nodesRef.current;
      const links = linksRef.current;

      ctx.clearRect(0, 0, dimensions.width, dimensions.height);

      // Draw links
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      for (const link of links) {
        const source = nodes.find((n) => n.id === link.source);
        const target = nodes.find((n) => n.id === link.target);
        if (!source || !target) continue;
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
      }

      // Draw nodes
      for (const node of nodes) {
        const isHovered = hoveredNode?.id === node.id;
        const radius = node.type === "circle" ? 18 : 14;
        const r = isHovered ? radius + 3 : radius;

        // Glow
        if (isHovered) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, r + 6, 0, Math.PI * 2);
          ctx.fillStyle =
            node.type === "circle"
              ? "rgba(99, 102, 241, 0.1)"
              : "rgba(139, 92, 246, 0.1)";
          ctx.fill();
        }

        // Node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(
          node.x - r / 3,
          node.y - r / 3,
          0,
          node.x,
          node.y,
          r,
        );
        if (node.type === "circle") {
          gradient.addColorStop(0, "#818cf8");
          gradient.addColorStop(1, "#4f46e5");
        } else {
          gradient.addColorStop(0, "#a78bfa");
          gradient.addColorStop(1, "#7c3aed");
        }
        ctx.fillStyle = gradient;
        ctx.fill();

        // Border
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Label
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.font = `${isHovered ? "600" : "500"} 11px system-ui, -apple-system, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(node.label, node.x, node.y + r + 14);
      }

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animRef.current);
  }, [hasData, dimensions, hoveredNode, simulate]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      const container = canvasRef.current?.parentElement;
      if (container) {
        setDimensions({
          width: container.clientWidth,
          height: Math.max(500, container.clientHeight),
        });
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Handle mouse hover
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const found = nodesRef.current.find((n) => {
        const dx = n.x - x;
        const dy = n.y - y;
        return Math.sqrt(dx * dx + dy * dy) < 20;
      });
      setHoveredNode(found ?? null);
      canvas.style.cursor = found ? "pointer" : "default";
    },
    [],
  );

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-xl font-bold text-white/90">关系图谱</h1>
          <p className="text-sm text-white/40 mt-0.5">
            你的人脉网络可视化
          </p>
        </div>
      </div>

      <div className="glass-card overflow-hidden relative">
        {isLoading ? (
          <div className="flex items-center justify-center h-[500px]">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full border-2 border-brand-200 border-t-[#5AC8FA] animate-spin" />
              <span className="text-sm text-white/30">加载图谱数据...</span>
            </div>
          </div>
        ) : !hasData ? (
          <div className="empty-state h-[500px]">
            <Network className="w-16 h-16 text-gray-200 mb-4" />
            <p className="text-sm font-medium text-white/40">
              暂无图谱数据
            </p>
            <p className="text-xs text-white/30 mt-1">
              添加圈子和关系后，图谱将自动生成
            </p>
          </div>
        ) : (
          <>
            <canvas
              ref={canvasRef}
              width={dimensions.width}
              height={dimensions.height}
              onMouseMove={handleMouseMove}
              className="block"
            />

            {/* Legend */}
            <div className="absolute bottom-4 left-4 flex items-center gap-4 bg-white/[0.08] backdrop-blur-sm rounded-xl px-4 py-2 border border-white/[0.1]">
              <div className="flex items-center gap-2 text-xs text-white/40">
                <div className="w-3 h-3 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600" />
                <span>圈子</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/40">
                <div className="w-3 h-3 rounded-full bg-gradient-to-br from-purple-400 to-purple-600" />
                <span>成员</span>
              </div>
            </div>

            {/* Hover info */}
            {hoveredNode && (
              <div className="absolute top-4 right-4 bg-white/[0.10] backdrop-blur-sm rounded-xl px-4 py-3 border border-white/[0.1] shadow-sm">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-brand-500" />
                  <span className="text-sm font-medium text-white/90">
                    {hoveredNode.label}
                  </span>
                </div>
                <span className="text-xs text-white/30 mt-1 block">
                  {hoveredNode.type === "circle" ? "圈子" : "成员"}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
