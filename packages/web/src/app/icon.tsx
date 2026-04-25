import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          background: "#0A0A12",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 96,
        }}
      >
        <span
          style={{
            fontSize: 280,
            color: "#D4A853",
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          脉
        </span>
      </div>
    ),
    { width: 512, height: 512 }
  );
}
