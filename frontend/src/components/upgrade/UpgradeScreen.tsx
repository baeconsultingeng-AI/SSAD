"use client";

import Link from "next/link";

// ─── Parity: "upgrade" screen ────────────────────────────

export default function UpgradeScreen() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-xl font-semibold text-text mb-2">Upgrade to Pro</h1>
        <p className="text-text-muted text-sm mb-8">
          Unlock unlimited calculations, report export, and full detailing.
        </p>

        {/* Sprint 3: Paystack/Flutterwave payment integration */}
        <div className="rounded-xl border border-border bg-surface-card p-6 mb-4 text-sm text-text-muted text-center">
          Payment integration — Sprint 3 implementation
        </div>

        <Link
          href="/"
          className="text-sm text-text-muted hover:text-text transition-colors"
        >
          Maybe later
        </Link>
      </div>
    </div>
  );
}
