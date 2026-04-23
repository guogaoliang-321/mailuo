"use client";

import { useRef, useEffect, useCallback } from "react";

interface GraphNode {
  id: string;
  label: string;
  ring: number;
  type: "user" | "circle";
  avatar?: string;
}

interface GraphLink {
  source: string;
  target: string;
}

interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  pinned: boolean;
}

interface Props {
  nodes: GraphNode[];
  links: GraphLink[];
  width: number;
  height: number;
  onNodeTap?: (nodeId: string | null) => void;
  activeNode?: string | null;
}

const C = {
  gold: "#D4A853",
  goldGlow: "rgba(212,168,83,0.35)",
  blue: "#5AC8FA",
  blueGlow: "rgba(90,200,250,0.30)",
  green: "#30D158",
  greenGlow: "rgba(48,209,88,0.30)",
  purple: "#BF5AF2",
  purpleGlow: "rgba(191,90,242,0.30)",
  orange: "#FF9F0A",
  orangeGlow: "rgba(255,159,10,0.30)",
  edge: "rgba(255,255,255,0.06)",
  edgeActive: "rgba(212,168,83,0.5)",
  text: "rgba(255,255,255,0.95)",
  textDim: "rgba(255,255,255,0.65)",
};

// Assign distinct colors to circles
const CIRCLE_COLORS = [
  { fill: C.purple, glow: C.purpleGlow },
  { fill: C.blue, glow: C.blueGlow },
  { fill: C.orange, glow: C.orangeGlow },
  { fill: C.green, glow: C.greenGlow },
];

const FONT = `-apple-system, "SF Pro Display", "Noto Sans SC", sans-serif`;

export function NetworkCanvas({ nodes, links, width, height, onNodeTap, activeNode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const simRef = useRef<SimNode[]>([]);
  const particlesRef = useRef<Array<{ sx: number; sy: number; ex: number; ey: number; p: number; spd: number }>>([]);
  const dragRef = useRef<{ node: SimNode; startX: number; startY: number; moved: boolean } | null>(null);
  const circleColorMap = useRef(new Map<string, { fill: string; glow: string }>());
  const imgCache = useRef(new Map<string, HTMLImageElement>());

  const dpr = typeof window !== "undefined" ? (window.devicePixelRatio || 1) : 1;

  // Assign colors to circle nodes
  useEffect(() => {
    const map = new Map<string, { fill: string; glow: string }>();
    let ci = 0;
    for (const n of nodes) {
      if (n.type === "circle") {
        map.set(n.id, CIRCLE_COLORS[ci % CIRCLE_COLORS.length]);
        ci++;
      }
    }
    circleColorMap.current = map;
  }, [nodes]);

  // Pre-load avatar images
  useEffect(() => {
    for (const n of nodes) {
      if (n.type === "user" && n.avatar && !imgCache.current.has(n.id)) {
        const img = new Image();
        img.src = n.avatar;
        imgCache.current.set(n.id, img);
      }
    }
  }, [nodes]);

  // Get color for a member node based on which circle(s) it belongs to
  const getMemberColor = useCallback((nodeId: string): { fill: string; glow: string } => {
    // Find which circle this member connects to
    for (const link of links) {
      const circleId = link.source === nodeId ? link.target : link.target === nodeId ? link.source : null;
      if (circleId) {
        const cc = circleColorMap.current.get(circleId);
        if (cc) return cc;
      }
    }
    return { fill: C.green, glow: C.greenGlow };
  }, [links]);

  // Initialize simulation positions
  useEffect(() => {
    if (nodes.length === 0) return;
    const cx = width / 2;
    const cy = height / 2;
    const r1 = Math.min(width, height) * 0.22;
    const r2 = Math.min(width, height) * 0.44;

    const ring1 = nodes.filter((n) => n.ring === 1);
    const ring2 = nodes.filter((n) => n.ring === 2);

    simRef.current = nodes.map((n) => {
      let x: number, y: number;
      if (n.ring === 0) {
        x = cx; y = cy;
      } else if (n.ring === 1) {
        const i = ring1.indexOf(n);
        const a = (i / ring1.length) * Math.PI * 2 - Math.PI / 2;
        x = cx + Math.cos(a) * r1;
        y = cy + Math.sin(a) * r1;
      } else {
        const i = ring2.indexOf(n);
        const a = (i / ring2.length) * Math.PI * 2 - Math.PI * 0.4;
        x = cx + Math.cos(a) * r2 + (Math.random() - 0.5) * 30;
        y = cy + Math.sin(a) * r2 + (Math.random() - 0.5) * 30;
      }
      return { ...n, x, y, vx: 0, vy: 0, pinned: false };
    });
  }, [nodes, width, height]);

  // Force simulation
  const simulate = useCallback(() => {
    const sn = simRef.current;
    if (sn.length === 0) return;
    const cx = width / 2;
    const cy = height / 2;

    for (const n of sn) {
      if (n.pinned) continue;
      n.vx += (cx - n.x) * 0.0006;
      n.vy += (cy - n.y) * 0.0006;
    }

    // Repulsion
    for (let i = 0; i < sn.length; i++) {
      for (let j = i + 1; j < sn.length; j++) {
        if (sn[i].pinned && sn[j].pinned) continue;
        const dx = sn[j].x - sn[i].x;
        const dy = sn[j].y - sn[i].y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = 800 / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        if (!sn[i].pinned) { sn[i].vx -= fx; sn[i].vy -= fy; }
        if (!sn[j].pinned) { sn[j].vx += fx; sn[j].vy += fy; }
      }
    }

    // Link attraction — different rest lengths per ring
    for (const link of links) {
      const a = sn.find((n) => n.id === link.source);
      const b = sn.find((n) => n.id === link.target);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // me→circle: shorter, circle→member: longer
      const rest = (a.ring === 0 || b.ring === 0) ? 85 : 70;
      const force = (dist - rest) * 0.005;
      const fx = (dx / Math.max(dist, 1)) * force;
      const fy = (dy / Math.max(dist, 1)) * force;
      if (!a.pinned) { a.vx += fx; a.vy += fy; }
      if (!b.pinned) { b.vx -= fx; b.vy -= fy; }
    }

    for (const n of sn) {
      if (n.pinned) continue;
      n.vx *= 0.88;
      n.vy *= 0.88;
      n.x += n.vx;
      n.y += n.vy;
      n.x = Math.max(40, Math.min(width - 40, n.x));
      n.y = Math.max(40, Math.min(height - 40, n.y));
    }
  }, [width, height, links]);

  // Draw hexagon path
  const hexPath = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  };

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    let t = 0;
    const particles = particlesRef.current;

    const draw = () => {
      t += 0.012;
      simulate();
      const sn = simRef.current;
      ctx.clearRect(0, 0, width, height);

      // Edges
      for (const link of links) {
        const a = sn.find((n) => n.id === link.source);
        const b = sn.find((n) => n.id === link.target);
        if (!a || !b) continue;
        const isActive = activeNode && (link.source === activeNode || link.target === activeNode);
        const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
        if (isActive) {
          grad.addColorStop(0, C.edgeActive);
          grad.addColorStop(0.5, "rgba(212,168,83,0.25)");
          grad.addColorStop(1, C.edgeActive);
        } else {
          grad.addColorStop(0, C.edge);
          grad.addColorStop(0.5, "rgba(255,255,255,0.12)");
          grad.addColorStop(1, C.edge);
        }
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = isActive ? 1.5 : 0.7;
        ctx.stroke();
      }

      // Particles
      if (Math.random() < 0.05 && links.length > 0) {
        const e = links[Math.floor(Math.random() * links.length)];
        const a = sn.find((n) => n.id === e.source);
        const b = sn.find((n) => n.id === e.target);
        if (a && b) particles.push({ sx: a.x, sy: a.y, ex: b.x, ey: b.y, p: 0, spd: 0.008 + Math.random() * 0.01 });
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.p += p.spd;
        if (p.p >= 1) { particles.splice(i, 1); continue; }
        const px = p.sx + (p.ex - p.sx) * p.p;
        const py = p.sy + (p.ey - p.sy) * p.p;
        const alpha = Math.sin(p.p * Math.PI);
        const g = ctx.createRadialGradient(px, py, 0, px, py, 4);
        g.addColorStop(0, `rgba(212,168,83,${alpha * 0.7})`);
        g.addColorStop(1, "transparent");
        ctx.fillStyle = g;
        ctx.fillRect(px - 4, py - 4, 8, 8);
      }

      // Nodes
      for (const n of sn) {
        const isSelf = n.ring === 0;
        const isCircle = n.type === "circle";
        const isAct = activeNode === n.id;
        const pulse = isSelf ? Math.sin(t * 1.5) * 2 : 0;

        let color: string, glowCol: string;
        if (isSelf) {
          color = C.gold; glowCol = C.goldGlow;
        } else if (isCircle) {
          const cc = circleColorMap.current.get(n.id) ?? { fill: C.purple, glow: C.purpleGlow };
          color = cc.fill; glowCol = cc.glow;
        } else {
          const mc = getMemberColor(n.id);
          color = mc.fill; glowCol = mc.glow;
        }

        const baseR = isSelf ? 28 : isCircle ? 22 : 16;
        const r = baseR + (isAct ? 3 : 0) + pulse;

        // Outer glow
        const glowR = r + (isAct ? 24 : 14);
        const glow = ctx.createRadialGradient(n.x, n.y, r * 0.3, n.x, n.y, glowR);
        glow.addColorStop(0, isAct ? `${color}40` : `${color}18`);
        glow.addColorStop(1, "transparent");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(n.x, n.y, glowR, 0, Math.PI * 2);
        ctx.fill();

        // Node shape: hexagon for circles, circle for users
        if (isCircle) {
          // Hexagon
          const base = ctx.createRadialGradient(n.x - r * 0.2, n.y - r * 0.2, 0, n.x, n.y, r);
          base.addColorStop(0, `${color}55`);
          base.addColorStop(0.7, `${color}25`);
          base.addColorStop(1, `${color}15`);
          hexPath(ctx, n.x, n.y, r);
          ctx.fillStyle = base;
          ctx.fill();
          hexPath(ctx, n.x, n.y, r);
          ctx.strokeStyle = isAct ? `${color}AA` : "rgba(255,255,255,0.18)";
          ctx.lineWidth = isAct ? 1.5 : 0.8;
          ctx.stroke();
          // Specular
          const spec = ctx.createRadialGradient(n.x - r * 0.25, n.y - r * 0.25, 0, n.x - r * 0.15, n.y - r * 0.15, r * 0.6);
          spec.addColorStop(0, "rgba(255,255,255,0.2)");
          spec.addColorStop(1, "transparent");
          hexPath(ctx, n.x, n.y, r);
          ctx.fillStyle = spec;
          ctx.fill();
        } else {
          const img = imgCache.current.get(n.id);
          if (img?.complete && img.naturalWidth > 0) {
            // Real avatar — clip to circle
            ctx.save();
            ctx.beginPath();
            ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(img, n.x - r, n.y - r, r * 2, r * 2);
            ctx.restore();
            // Border ring
            ctx.beginPath();
            ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
            ctx.strokeStyle = isSelf ? `${C.gold}CC` : isAct ? `${color}AA` : "rgba(255,255,255,0.35)";
            ctx.lineWidth = isSelf ? 2 : 1.5;
            ctx.stroke();
          } else {
            // Fallback: gradient circle with initial
            const base = ctx.createRadialGradient(n.x - r * 0.25, n.y - r * 0.3, 0, n.x, n.y, r);
            base.addColorStop(0, `${color}55`);
            base.addColorStop(0.7, `${color}25`);
            base.addColorStop(1, `${color}15`);
            ctx.beginPath();
            ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
            ctx.fillStyle = base;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
            ctx.strokeStyle = isAct ? `${color}AA` : "rgba(255,255,255,0.18)";
            ctx.lineWidth = isAct ? 1.5 : 0.8;
            ctx.stroke();
            const spec = ctx.createRadialGradient(n.x - r * 0.3, n.y - r * 0.3, 0, n.x - r * 0.2, n.y - r * 0.2, r * 0.7);
            spec.addColorStop(0, "rgba(255,255,255,0.25)");
            spec.addColorStop(1, "transparent");
            ctx.fillStyle = spec;
            ctx.beginPath();
            ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Label
        ctx.fillStyle = C.text;
        const fontSize = isSelf ? 14 : isCircle ? 10 : 11;
        ctx.font = `${isSelf ? 700 : 600} ${fontSize}px ${FONT}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const hasImg = !isCircle && (() => { const im = imgCache.current.get(n.id); return im?.complete && im.naturalWidth > 0; })();
        if (isCircle || hasImg) {
          // Show label below node
          const maxW = r * 2.5;
          let label = n.label;
          ctx.font = `600 ${isCircle ? fontSize : Math.max(fontSize - 1, 9)}px ${FONT}`;
          if (ctx.measureText(label).width > maxW) {
            while (label.length > 2 && ctx.measureText(label + "…").width > maxW) label = label.slice(0, -1);
            label += "…";
          }
          ctx.fillStyle = C.textDim;
          ctx.fillText(label, n.x, n.y + r + 12);
        } else {
          ctx.fillStyle = C.text;
          ctx.fillText(n.label, n.x, n.y);
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [nodes, links, width, height, activeNode, dpr, simulate, getMemberColor]);

  // Hit test
  const hitTest = (x: number, y: number): string | null => {
    for (const n of simRef.current) {
      const dx = n.x - x;
      const dy = n.y - y;
      if (Math.sqrt(dx * dx + dy * dy) < 35) return n.id;
    }
    return null;
  };

  const getPos = (clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const { x, y } = getPos(e.clientX, e.clientY);
    const id = hitTest(x, y);
    if (id) {
      const node = simRef.current.find((n) => n.id === id);
      if (node) {
        node.pinned = true;
        dragRef.current = { node, startX: x, startY: y, moved: false };
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const drag = dragRef.current;
    if (drag) {
      const { x, y } = getPos(e.clientX, e.clientY);
      drag.node.x = x;
      drag.node.y = y;
      if (Math.abs(x - drag.startX) > 3 || Math.abs(y - drag.startY) > 3) drag.moved = true;
      canvasRef.current!.style.cursor = "grabbing";
    } else {
      const { x, y } = getPos(e.clientX, e.clientY);
      canvasRef.current!.style.cursor = hitTest(x, y) ? "grab" : "default";
    }
  };

  const handleMouseUp = () => {
    const drag = dragRef.current;
    if (drag) {
      drag.node.pinned = false;
      if (!drag.moved) onNodeTap?.(drag.node.id);
      dragRef.current = null;
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    const { x, y } = getPos(t.clientX, t.clientY);
    const id = hitTest(x, y);
    if (id) {
      const node = simRef.current.find((n) => n.id === id);
      if (node) {
        node.pinned = true;
        dragRef.current = { node, startX: x, startY: y, moved: false };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const drag = dragRef.current;
    if (drag) {
      e.preventDefault();
      const t = e.touches[0];
      const { x, y } = getPos(t.clientX, t.clientY);
      drag.node.x = x;
      drag.node.y = y;
      if (Math.abs(x - drag.startX) > 3 || Math.abs(y - drag.startY) > 3) drag.moved = true;
    }
  };

  const handleTouchEnd = () => {
    const drag = dragRef.current;
    if (drag) {
      drag.node.pinned = false;
      if (!drag.moved) onNodeTap?.(drag.node.id);
      dragRef.current = null;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (dragRef.current) return;
    const { x, y } = getPos(e.clientX, e.clientY);
    const id = hitTest(x, y);
    onNodeTap?.(id);
  };

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, display: "block", touchAction: "none" }}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    />
  );
}
