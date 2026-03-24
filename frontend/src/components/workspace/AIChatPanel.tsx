"use client";

import { useState, useRef, useEffect } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { runCalc } from "@/lib/api-client";
import type { CalcRequest } from "@/types/calc";

// ─── Parity: "ai" screen — chat, extraction, confirm, calc trigger ───

export default function AIChatPanel() {
  const {
    messages,
    addMessage,
    extractedParams,
    setExtractedParams,
    setCalcResult,
    goScreen,
    projectId,
    elementId,
  } = useWorkspace();

  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isProcessing) return;
    setInput("");
    addMessage({ role: "user", content: text });
    setIsProcessing(true);

    // Sprint 1 stub: AI extraction will call Claude API in Sprint 2
    addMessage({
      role: "assistant",
      content:
        "Parameters extracted (stub). Confirm to run deterministic calculation.",
    });
    setIsProcessing(false);
  };

  const handleConfirmAndCalculate = async () => {
    if (!extractedParams) return;
    setIsProcessing(true);

    const request: CalcRequest = {
      requestId: `req_${Date.now()}`,
      module: `${extractedParams.elementType}_bs_v1`,
      code: "BS",
      version: "1.0",
      project: { projectId: projectId ?? undefined, elementId: elementId ?? undefined },
      inputs: {
        geometry: extractedParams.geometry,
        materials: extractedParams.materials,
        loads: extractedParams.loads,
        design: extractedParams.design,
      },
    };

    try {
      const response = await runCalc(request);
      if (response.status === "ok") {
        setCalcResult(response);
        goScreen("result");
      } else {
        addMessage({
          role: "assistant",
          content: `Calculation error: ${response.error.message}`,
        });
      }
    } catch {
      addMessage({
        role: "assistant",
        content: "Network error — could not reach calculation service.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto w-full p-4">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
        {messages.length === 0 && (
          <p className="text-text-muted text-sm text-center mt-12">
            Describe your structural element and requirements.
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`rounded-lg px-4 py-2 text-sm max-w-lg ${
              m.role === "user"
                ? "bg-surface-card ml-auto text-text"
                : "bg-surface-elevated text-text"
            }`}
          >
            {m.content}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Confirm panel — shown when extraction complete */}
      {extractedParams && (
        <div className="mb-3 rounded-lg border border-accent/40 bg-surface-card p-3 text-sm">
          <p className="text-accent font-semibold mb-1">Confirm Parameters</p>
          <pre className="text-text-muted text-xs overflow-auto max-h-32">
            {JSON.stringify(extractedParams, null, 2)}
          </pre>
          <button
            onClick={handleConfirmAndCalculate}
            disabled={isProcessing}
            className="mt-2 px-4 py-1.5 rounded bg-accent text-surface text-xs font-semibold hover:bg-accent-muted disabled:opacity-50 transition-colors"
          >
            {isProcessing ? "Calculating…" : "Confirm & Calculate"}
          </button>
          <button
            onClick={() => setExtractedParams(null)}
            className="ml-2 text-text-muted text-xs hover:text-text"
          >
            Edit
          </button>
        </div>
      )}

      {/* Input row */}
      <form
        onSubmit={(e) => { e.preventDefault(); void handleSend(); }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe your design requirement…"
          className="flex-1 bg-surface-elevated border border-border rounded-lg px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent"
          disabled={isProcessing}
        />
        <button
          type="submit"
          disabled={isProcessing || !input.trim()}
          className="px-4 py-2.5 bg-accent text-surface text-sm font-semibold rounded-lg hover:bg-accent-muted disabled:opacity-50 transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}
