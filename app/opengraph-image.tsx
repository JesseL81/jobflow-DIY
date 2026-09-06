import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "CleanBuild"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0f172a",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "40px" }}>
          
          <div style={{ display: "flex", width: "250px", height: "250px" }}>
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }}>
              <rect width="100" height="100" rx="22" fill="#18181B" />
              <path d="M20 38L50 20L80 38L50 56L20 38Z" fill="#FF8C00"/>
              <path d="M20 38V68L50 85V56L20 38Z" fill="#C2410C"/>
              <path d="M80 38V68L50 85V56L80 38Z" fill="#FF6B00"/>
              <path d="M12 35 L50 12 L88 35" stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <path d="M44 50.4L33 43.8C28.5 41.1 26 44 26 49.5V58.5C26 64 28.5 66.9 33 69.6L44 76.2" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <line x1="56" y1="52.6" x2="56" y2="75" stroke="#FFFFFF" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <path d="M56 52.6L68 45.4C72.5 42.7 75 44.5 75 48.5C75 52.5 72.5 55.5 68 58.2L56 65.4" stroke="#FFFFFF" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <path d="M56 65.4L69 57.6C73.5 54.9 76 56.7 76 60.7C76 64.7 73.5 67.7 69 70.4L56 78.2" stroke="#FFFFFF" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </div>

          <div
            style={{
              fontSize: "130px",
              fontWeight: "900",
              color: "white",
              fontFamily: "sans-serif",
              display: "flex",
              letterSpacing: "-0.05em",
            }}
          >
            Clean<span style={{ color: "#fb923c" }}>Build</span>
          </div>

        </div>
      </div>
    ),
    { ...size }
  )
}