"use client";

/**
 * Last-resort boundary for errors thrown in the root layout itself. Must render
 * its own <html>/<body>. Kept dependency-free and inline-styled.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#F8F8F8",
          color: "#1A1A1A",
          fontFamily: "Georgia, 'Times New Roman', serif",
          textAlign: "center",
          padding: "0 24px",
        }}
      >
        <h1 style={{ fontSize: 32, fontWeight: 500, marginBottom: 12 }}>
          A momentary lapse in service.
        </h1>
        <p style={{ color: "#555", marginBottom: 24, fontFamily: "Arial, sans-serif" }}>
          Something didn&apos;t load as it should. Please try again.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            background: "#0D0D0D",
            color: "#fff",
            border: "none",
            padding: "14px 28px",
            fontSize: 12,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            borderRadius: 3,
            cursor: "pointer",
            fontFamily: "Arial, sans-serif",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
