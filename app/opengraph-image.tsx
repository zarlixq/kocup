import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "KoçUp Akademi — YKS & LGS Birebir Eğitim Koçluğu"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          color: "white",
          fontFamily: "sans-serif",
          background:
            "linear-gradient(135deg, #0F1F28 0%, #143847 45%, #1B6B8A 100%)",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -180,
            right: -120,
            width: 520,
            height: 520,
            borderRadius: "50%",
            background: "rgba(249, 115, 22, 0.22)",
            filter: "blur(80px)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -220,
            left: -160,
            width: 480,
            height: 480,
            borderRadius: "50%",
            background: "rgba(27, 107, 138, 0.55)",
            filter: "blur(80px)",
            display: "flex",
          }}
        />

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "10px 22px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.18)",
              fontSize: 22,
              fontWeight: 600,
              color: "rgba(255,255,255,0.92)",
              alignSelf: "flex-start",
            }}
          >
            <span style={{ color: "#F97316", fontSize: 26 }}>✦</span>
            Sertifikalı Eğitim Koçluğu Platformu
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              fontSize: 88,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
            }}
          >
            <span>YKS &amp; LGS için&nbsp;</span>
            <span style={{ color: "#F97316" }}>birebir koçluk.</span>
          </div>
          <div
            style={{
              fontSize: 30,
              color: "rgba(219, 234, 254, 0.85)",
              maxWidth: 980,
              lineHeight: 1.35,
              display: "flex",
            }}
          >
            MYK belgeli koçlarla haftalık takip, deneme analizi ve veli raporu.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 28,
            borderTop: "1px solid rgba(255,255,255,0.18)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              fontSize: 30,
              fontWeight: 800,
              letterSpacing: "-0.02em",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "linear-gradient(135deg, #1B6B8A 0%, #F97316 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: 800,
                fontSize: 22,
              }}
            >
              K
            </div>
            KoçUp Akademi
          </div>
          <div
            style={{
              fontSize: 22,
              color: "rgba(219, 234, 254, 0.7)",
              display: "flex",
            }}
          >
            kocupakedemi.com
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
