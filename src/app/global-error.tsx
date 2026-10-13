"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "Georgia, serif", background: "#f7f4ee", color: "#121212", padding: "6rem 1.5rem", textAlign: "center" }}>
        <h1 style={{ fontWeight: 400, fontSize: "2.4rem" }}>Something went wrong</h1>
        <p style={{ fontFamily: "system-ui, sans-serif", color: "#5f5a52" }}>
          Please try again in a moment.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{ marginTop: "1.5rem", padding: "0.9rem 1.8rem", background: "#121212", color: "#f7f4ee", border: 0, cursor: "pointer" }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
