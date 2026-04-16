"use client";

export function MeshBG() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <div className="absolute inset-0 bg-[#0A0A12]" />
      <div
        className="absolute rounded-full"
        style={{
          width: 500, height: 500, top: "-10%", left: "-10%",
          background: "radial-gradient(circle, rgba(212,168,83,0.08) 0%, transparent 70%)",
          animation: "meshFloat1 20s ease-in-out infinite",
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: 600, height: 600, bottom: "-15%", right: "-15%",
          background: "radial-gradient(circle, rgba(90,200,250,0.06) 0%, transparent 70%)",
          animation: "meshFloat2 25s ease-in-out infinite",
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: 400, height: 400, top: "40%", left: "50%",
          transform: "translate(-50%,-50%)",
          background: "radial-gradient(circle, rgba(191,90,242,0.05) 0%, transparent 70%)",
          animation: "meshFloat3 18s ease-in-out infinite",
        }}
      />
      {/* Noise overlay */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
