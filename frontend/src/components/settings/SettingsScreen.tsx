"use client";

import Link from "next/link";

// ─── Parity: "settings" screen ───────────────────────────

export default function SettingsScreen() {
  return (
    <div className="min-h-screen bg-surface text-text p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold">Settings</h1>
          <Link
            href="/"
            className="text-sm text-text-muted hover:text-text transition-colors"
          >
            ← Workspace
          </Link>
        </div>

        {/* Sprint 3: user, units, notification preferences */}
        <div className="rounded-lg border border-border bg-surface-card p-6 text-sm text-text-muted text-center">
          Settings — Sprint 3 implementation
        </div>
      </div>
    </div>
  );
}
