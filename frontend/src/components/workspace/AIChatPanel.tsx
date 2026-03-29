"use client";

import { useState, useRef, useEffect } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useAuth } from "@/context/AuthContext";
import { runCalc } from "@/lib/api-client";
import type { CalcRequest } from "@/types/calc";
import InlineResultCard from "./InlineResultCard";
import { MODULE_LABELS } from "./InlineResultCard";
import DualChoiceCard, { type DualChoicePayload } from "./DualChoiceCard";

// --- Element categories ---

type SubType = { name: string; desc: string; prompt: string };

const RC_ELEMENTS: { id: string; sub: string }[] = [
  { id: "Slab",        sub: "Solid · Ribbed · Waffle · Flat · Hollow pot" },
  { id: "Beam",        sub: "Simply supported · Continuous · Cantilever · T-Beam" },
  { id: "Column",      sub: "Axial · Uniaxial · Biaxial · Short · Slender" },
  { id: "Foundation",  sub: "Isolated pad · Strip · Combined · Raft · Pile cap" },
  { id: "Ancillaries", sub: "Retaining wall · Tank · Staircase · Shear wall" },
];

const ELEMENT_SUBTYPES: Record<string, SubType[]> = {
  Slab: [
    { name: "Solid Two-Way",  desc: "Two-way spanning, supported on 4 sides",          prompt: "Design a solid two-way RC slab, 4mx5m, 175mm thick, Gk=5kN/m2, Qk=3kN/m2, C35, fy460, BS 8110" },
    { name: "Solid One-Way",  desc: "One-way spanning, supported on 2 sides",           prompt: "Design a solid one-way RC slab, 4m span, 150mm thick, Gk=4kN/m2, Qk=3kN/m2, C35, fy460, BS 8110" },
    { name: "Ribbed Slab",    desc: "Ribs with topping slab, reduces weight",           prompt: "Design a ribbed RC slab, 6m span, 300mm deep, 150mm ribs at 600mm c/c, Gk=5kN/m2, Qk=3kN/m2, C35, BS 8110" },
    { name: "Flat Slab",      desc: "Slab directly on columns, no beams",               prompt: "Design a flat slab, 7x7m panel, 250mm thick, internal column strip, Gk=6kN/m2, Qk=4kN/m2, C35, BS 8110" },
    { name: "Hollow Pot",     desc: "Hollow blocks reduce slab self-weight",             prompt: "Design a hollow pot slab, 5m span, 250mm deep, Gk=5kN/m2, Qk=3kN/m2, C35, BS 8110" },
  ],
  Beam: [
    { name: "Simply Supported", desc: "Spans between two supports, pinned ends",  prompt: "Design a simply supported RC beam, 6m span, 300x500mm, Gk=15kN/m, Qk=10kN/m, C35, fy460, BS 8110" },
    { name: "Continuous Beam",  desc: "Multiple spans, moment redistribution",    prompt: "Design a continuous RC beam, 3 spans of 5m, 300x500mm, Gk=12kN/m, Qk=8kN/m, C35, fy460, BS 8110" },
    { name: "Cantilever",       desc: "Fixed at one end, free at the other",      prompt: "Design a cantilever RC beam, 2.5m projection, 300x500mm, Gk=10kN/m, Qk=6kN/m, C35, fy460, BS 8110" },
    { name: "T-Beam",           desc: "Beam with integral floor slab flange",     prompt: "Design a T-beam, 6m span, web 300x500mm, flange 900x150mm, Gk=15kN/m, Qk=10kN/m, C35, BS 8110" },
  ],
  Column: [
    { name: "Axially Loaded",   desc: "Concentric load only, no bending",   prompt: "Design an axially loaded RC column, 300x300mm, 3.5m height, N=1500kN, C35, fy460, BS 8110" },
    { name: "Uniaxial Bending", desc: "Axial load + bending about one axis", prompt: "Design an RC column, 300x400mm, 3.5m, N=1200kN, Mx=80kNm, C35, fy460, BS 8110" },
    { name: "Biaxial Bending",  desc: "Axial load + bending about both axes", prompt: "Design a biaxially loaded RC column, 350x350mm, 4m, N=900kN, Mx=60kNm, My=45kNm, C35, BS 8110" },
    { name: "Slender Column",   desc: "High slenderness, additional moments",  prompt: "Design a slender RC column, 250x250mm, 6m effective height, N=600kN, C35, fy460, BS 8110" },
  ],
  Foundation: [
    { name: "Isolated Pad",     desc: "Single column footing on firm soil",               prompt: "Design an isolated pad foundation, soil 150kN/m2, column N=1200kN, depth 1.5m, C35, BS 8004" },
    { name: "Strip Foundation", desc: "Continuous footing under wall or row of columns",  prompt: "Design a strip foundation, wall load 120kN/m, soil 100kN/m2, depth 1.0m, C35, BS 8004" },
    { name: "Combined Footing", desc: "Single footing shared by two columns",             prompt: "Design a combined footing, two columns 1200kN each at 3m centres, soil 150kN/m2, C35, BS 8004" },
    { name: "Raft Foundation",  desc: "Full building footprint, poor soil",               prompt: "Design a raft foundation, 12x8m, UDL 60kN/m2, soil 80kN/m2, C35, BS 8004" },
    { name: "Pile Cap",         desc: "Cap connecting group of piles",                    prompt: "Design a pile cap for 4 piles, column N=2400kN, pile diameter 450mm, C35, BS 8004" },
  ],
  Ancillaries: [
    { name: "Retaining Wall",  desc: "Cantilever wall retaining soil or fill", prompt: "Design a cantilever retaining wall, retained height 3m, soil unit weight 18kN/m3, phi=30 deg, BS 8110" },
    { name: "Shear Wall",      desc: "RC wall resisting lateral loads",        prompt: "Design an RC shear wall, 200mm thick, 3m wide, 3m high, lateral load 150kN, C35, BS 8110" },
    { name: "Staircase",       desc: "RC stair flight with landings",          prompt: "Design an RC staircase, 3.3m floor height, 175mm risers, 250mm treads, Qk=4kN/m2, C35, BS 8110" },
    { name: "Water Tank",      desc: "Rectangular below or above ground tank", prompt: "Design a rectangular RC water tank 4x3x2m, C35, fy460, BS 8007" },
  ],
};

const ELEMENT_PROMPTS: Record<string, { name: string; text: string }[]> = {
  Slab: [
    { name: "Two-Way Slab",    text: "Design a solid two-way RC slab, 4mx5m, 175mm thick, Gk=5kN/m2, Qk=3kN/m2, C35, fy460, BS 8110" },
    { name: "One-Way Slab",    text: "Design a solid one-way RC slab, 4m span, 150mm thick, Gk=4kN/m2, Qk=3kN/m2, C35, fy460, BS 8110" },
    { name: "Ribbed Slab",     text: "Design a ribbed RC slab, 6m span, 300mm deep, 150mm ribs at 600mm c/c, Gk=5kN/m2, C35" },
    { name: "Flat Slab",       text: "Design a flat slab, 7x7m panel, 250mm thick, Gk=6kN/m2, Qk=4kN/m2, C35, BS 8110" },
  ],
  Beam: [
    { name: "Simply Supported", text: "Design a simply supported RC beam, 6m span, 300x500mm, Gk=15kN/m, C35, BS 8110" },
    { name: "Continuous Beam",  text: "Design a continuous RC beam, 3 spans of 5m, 300x500mm, Gk=12kN/m, C35, BS 8110" },
    { name: "Cantilever Beam",  text: "Design a cantilever RC beam, 2.5m projection, 300x500mm, Gk=10kN/m, C35, fy460, BS 8110" },
    { name: "T-Beam",           text: "Design a T-beam, 6m span, web 300x500mm, flange 900x150mm, Gk=15kN/m, C35, BS 8110" },
  ],
  Column: [
    { name: "Axially Loaded",   text: "Design an axially loaded RC column, 300x300mm, 3.5m height, N=1500kN, C35, BS 8110" },
    { name: "Uniaxial Bending", text: "Design an RC column, 300x400mm, 3.5m, N=1200kN, Mx=80kNm, C35, fy460, BS 8110" },
    { name: "Biaxial Bending",  text: "Biaxial RC column, 350x350mm, N=900kN, Mx=60kNm, My=45kNm, C35, BS 8110" },
    { name: "Slender Column",   text: "Slender RC column, 250x250mm, 6m effective height, N=600kN, C35, BS 8110" },
  ],
  Foundation: [
    { name: "Isolated Pad",     text: "Isolated pad foundation, soil 150kN/m2, column N=1200kN, depth 1.5m, C35" },
    { name: "Strip Foundation", text: "Strip foundation, wall load 120kN/m, soil 100kN/m2, depth 1.0m, C35, BS 8004" },
    { name: "Raft Foundation",  text: "Raft foundation, 12x8m, UDL 60kN/m2, soil 80kN/m2, C35, BS 8004" },
    { name: "Pile Cap",         text: "Pile cap for 4 piles, column N=2400kN, pile diam 450mm, C35" },
  ],
  Ancillaries: [
    { name: "Retaining Wall",  text: "Cantilever retaining wall, retained height 3m, soil unit wt 18kN/m3, phi=30 deg" },
    { name: "Shear Wall",      text: "RC shear wall, 200mm thick, 3m wide, 3m high, lateral load 150kN, C35" },
    { name: "Staircase",       text: "RC staircase, 3.3m floor height, 175mm risers, 250mm treads, Qk=4kN/m2, C35" },
    { name: "Water Tank",      text: "RC water tank, 4x3x2m, C35, fy460, BS 8007" },
  ],
};

const DEFAULT_PROMPTS = [
  { name: "RC Slab",    text: "Design a solid two-way RC slab, 4mx5m, 175mm thick, Gk=5kN/m2, Qk=3kN/m2, C35, fy460, BS 8110" },
  { name: "RC Beam",    text: "Design a simply supported RC beam, 6m span, 300x500mm, Gk=15kN/m, Qk=10kN/m, C35, fy460, BS 8110" },
  { name: "RC Column",  text: "Design an axially loaded RC column, 300x300mm, 3.5m height, N=1500kN, C35, fy460, BS 8110" },
  { name: "Foundation", text: "Design an isolated pad foundation, soil 150kN/m2, column N=1200kN, depth 1.5m, C35, BS 8004" },
];


// Phase step IDs
type Phase = 1 | 2 | 3 | 4;

// ─── Element ID generator ─────────────────────────────────────────────────────
const ELEM_PREFIX: Record<string, string> = {
  rc_beam_bs_v1:       "BM",
  rc_slab_bs_v1:       "S",
  rc_column_bs_v1:     "C",
  rc_foundation_bs_v1: "FO",
  steel_beam_bs_v1:    "BM",
  steel_column_bs_v1:  "C",
  steel_truss_bs_v1:   "TR",
  steel_portal_bs_v1:  "PF",
};
const ELEM_COUNTER_KEY = "ssad_elem_counters";
function generateElemId(module: string): string {
  const prefix = ELEM_PREFIX[module] ?? module.replace(/_bs_v\d+$/, "").replace(/_/g, "").toUpperCase().slice(0, 4);
  let counters: Record<string, number> = {};
  try { const s = localStorage.getItem(ELEM_COUNTER_KEY); if (s) counters = JSON.parse(s); } catch { /* ignore */ }
  const next = (counters[prefix] ?? 0) + 1;
  counters[prefix] = next;
  try { localStorage.setItem(ELEM_COUNTER_KEY, JSON.stringify(counters)); } catch { /* ignore */ }
  return `${prefix}${next.toString().padStart(2, "0")}`;
}

export default function AIChatPanel() {
  const {
    messages,
    addMessage,
    extractedParams,
    setExtractedParams,
    setCalcResult,
    calcResult,
    goScreen,
    projectId,
    elementId,
    clearChat,
    popMessage,
    designElementId,
    setDesignElementId,
  } = useWorkspace();

  const { effectiveTier } = useAuth();
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [phase, setPhase] = useState<Phase>(1);
  const [pickerState, setPickerState] = useState<"elements" | "subtypes" | "chat">("elements");
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const [isListening, setIsListening] = useState(false);
  const [redesignMode, setRedesignMode] = useState(false);
  const [aiProvider, setAiProvider] = useState<string>("");

  // Fetch which AI provider is active
  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
    const authKey = process.env.NEXT_PUBLIC_API_AUTH_KEY ?? "";
    fetch(`${apiUrl}/api/v1/ai/status`, { headers: { "X-API-Key": authKey } })
      .then(r => r.json())
      .then((d: { provider?: string; model?: string }) => setAiProvider(d.provider ?? ""))
      .catch(() => {});
  }, []);

  // Chat history is preserved in WorkspaceContext — only cleared explicitly
  // (via Redesign / Edit buttons) so returning from the report screen keeps
  // the full previous conversation intact.

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isProcessing]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 80) + "px";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleVoice = () => {
    if (isListening) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      recognitionRef.current?.stop();
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("Voice input requires Chrome or Edge. Please try a different browser.");
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const rec = new SR() as EventTarget & {
      lang: string; continuous: boolean; interimResults: boolean;
      start(): void; stop(): void;
      onstart: (() => void) | null;
      onend: (() => void) | null;
      onerror: (() => void) | null;
      onresult: ((e: SREvent) => void) | null;
    };
    type SREvent = Event & { results: Array<{ isFinal: boolean; [i: number]: { transcript: string } }> };
    rec.lang = "en-GB";
    rec.continuous = false;
    rec.interimResults = true;
    rec.onstart = () => setIsListening(true);
    rec.onend = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);
    rec.onresult = (event: SREvent) => {
      const transcript = Array.from(event.results)
        .map(r => (r as { [i: number]: { transcript: string } })[0].transcript)
        .join("");
      setInput(transcript);
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
        inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 80) + "px";
      }
      if (event.results[event.results.length - 1].isFinal) {
        const finalTranscript = transcript;
        setTimeout(() => void handleSend(finalTranscript), 350);
      }
    };
    recognitionRef.current = rec;
    rec.start();
  };

  const handleSend = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || isProcessing) return;
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    setPickerState("chat");
    addMessage({ role: "user", content: text });
    setIsProcessing(true);
    setPhase(2);

    // Call AI extraction endpoint
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
      const authKey = process.env.NEXT_PUBLIC_API_AUTH_KEY ?? "";
      const res = await fetch(`${apiUrl}/api/v1/ai/extract`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": authKey,
        },
        body: JSON.stringify({ description: text }),
      });

      if (res.ok) {
        const data = await res.json() as { module: string; extracted: Record<string, unknown>; summary: string; provider?: string; model?: string };
        const d = data as Record<string, unknown>;

        if (d.requires_user_choice === true) {
          // Dual-mode: models disagree — let the user choose
          setDesignElementId(generateElemId(data.module));
          addMessage({
            role: "assistant",
            content: `__DUAL_CHOICE__${JSON.stringify({
              module: data.module,
              convergence: d.convergence as number,
              divergent_fields: (d.divergent_fields ?? []) as DualChoicePayload["divergent_fields"],
              deepseek_result: d.deepseek_result as DualChoicePayload["deepseek_result"],
              claude_result: d.claude_result as DualChoicePayload["claude_result"],
            } satisfies DualChoicePayload)}`,
          });
          setPhase(3);
        } else {
          setExtractedParams({ ...data.extracted, module: data.module } as unknown as import("@/types/calc").ExtractedParams);
          setDesignElementId(generateElemId(data.module));
          addMessage({
            role: "assistant",
            content: `__EXTRACTED__${JSON.stringify({
              module: data.module,
              extracted: data.extracted,
              summary: data.summary ?? "Parameters extracted. Please confirm to proceed.",
              confidence: d.confidence ?? "high",
              missing: d.missing ?? [],
              provider: data.provider ?? "",
              model: data.model ?? "",
            })}`,
          });
          setPhase(3);
        }
      } else {
        // AI endpoint not yet live — show helpful message
        addMessage({
          role: "assistant",
          content: "I've received your description. The AI extraction endpoint is being configured — calculations will be available shortly. You can describe your structural element and I'll extract the parameters automatically.",
        });
        setPhase(1);
      }
    } catch {
      addMessage({
        role: "assistant",
        content: "Could not reach the AI service. Please check that the backend is running on localhost:5000.",
      });
      setPhase(1);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = async (envelope: { module: string; extracted: Record<string, unknown>; designCode?: string }) => {
    setIsProcessing(true);
    setPhase(4);

    const ext = envelope.extracted;
    const request: CalcRequest = {
      requestId: `req_${Date.now()}`,
      module: envelope.module,
      code: (envelope.designCode ?? "BS") as CalcRequest["code"],
      version: "1.0",
      project: { projectId: projectId ?? undefined, elementId: elementId ?? undefined },
      inputs: {
        geometry:  ext.geometry  as Record<string, unknown> | undefined,
        materials: ext.materials as Record<string, unknown> | undefined,
        loads:     ext.loads     as Record<string, unknown> | undefined,
        design:    ext.design    as Record<string, unknown> | undefined,
      },
    };

    try {
      const response = await runCalc(request);
      if (response.status === "ok") {
        setCalcResult(response);
        addMessage({ role: "assistant", content: "__RESULT__" });
        setPhase(1);
      } else {
        const details = (response.error as { details?: { field: string; issue: string }[] }).details;
        const detailText = details?.map(d => `${d.field}: ${d.issue}`).join("; ") ?? "";
        addMessage({
          role: "assistant",
          content: `Calculation error: ${response.error.message}${detailText ? `\n\nDetails: ${detailText}` : ""}`,
        });
        setPhase(3);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error — could not reach calculation service.";
      addMessage({
        role: "assistant",
        content: `Calculation failed: ${msg}`,
      });
      setPhase(3);
    } finally {
      setIsProcessing(false);
    }
  };

  const stepClass = (n: Phase) => {
    if (phase > n) return "ai-step done";
    if (phase === n) return "ai-step active";
    return "ai-step";
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#f5f1eb" }}>

      {/* ── TOP BAR ── */}
      <div style={{ flexShrink: 0, position: "relative", zIndex: 2, background: "#f5f1eb", borderBottom: "1px solid #ddd8cf", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Animated online status ring */}
          <div style={{ position: "relative", width: 36, height: 36, flexShrink: 0 }}>
            {/* Rotating dashed orbit */}
            <div style={{
              position: "absolute", inset: -4,
              borderRadius: "50%",
              border: "1.5px dashed rgba(34,197,94,0.45)",
              animation: "orbit 4s linear infinite",
            }} />
            {/* Breathing glow ring */}
            <div style={{
              position: "absolute", inset: 0,
              borderRadius: "50%",
              border: "2px solid #4ade80",
              animation: "breathe 2.4s ease-in-out infinite",
            }} />
            {/* Avatar */}
            <div style={{
              width: 36, height: 36,
              borderRadius: "50%",
              background: "#1a4a8a",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxSizing: "border-box",
            }}>
              <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
                <rect x="13" y="12" width="22" height="17" rx="4" fill="rgba(255,255,255,0.18)" stroke="white" strokeWidth="1.3"/>
                <rect x="16" y="17" width="6" height="4" rx="1.5" fill="#c8960c"/>
                <rect x="26" y="17" width="6" height="4" rx="1.5" fill="#c8960c"/>
                <rect x="16" y="24" width="16" height="3" rx="1" fill="rgba(200,150,12,0.4)" stroke="rgba(200,150,12,0.7)" strokeWidth="1"/>
                <rect x="11" y="32" width="26" height="10" rx="3" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
              </svg>
            </div>
            {/* Online dot */}
            <div style={{
              position: "absolute", bottom: 1, right: 1,
              width: 8, height: 8, borderRadius: "50%",
              background: "#22c55e",
              border: "2px solid #f5f1eb",
              boxShadow: "0 0 6px 1px rgba(34,197,94,0.6)",
              animation: "pulse 2s ease-in-out infinite",
            }} />
          </div>
          <div>
            <div style={{ fontFamily: "var(--ser)", fontSize: 14, fontWeight: 700, color: "var(--txt)", lineHeight: 1.2 }}>RC Design Assistant</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "#16a34a", fontWeight: 600, letterSpacing: "0.4px" }}>● Online</span>
              {aiProvider && (
                <span style={{ fontFamily: "var(--mono)", fontSize: 8, fontWeight: 700, color: aiProvider === "DeepSeek" ? "#2563eb" : "#7c3aed", background: aiProvider === "DeepSeek" ? "rgba(37,99,235,0.1)" : "rgba(124,58,237,0.1)", border: `1px solid ${aiProvider === "DeepSeek" ? "rgba(37,99,235,0.3)" : "rgba(124,58,237,0.3)"}`, borderRadius: 4, padding: "1px 5px", letterSpacing: "0.3px" }}>
                  {aiProvider === "DeepSeek" ? "⚡" : "◆"} {aiProvider}
                </span>
              )}
            </div>
          </div>
        </div>
        <button onClick={() => goScreen("workspace")} style={{ background: "rgba(200,150,12,.1)", border: "1px solid rgba(200,150,12,.35)", color: "var(--blu)", padding: "5px 10px", borderRadius: 8, fontFamily: "var(--mono)", fontSize: 9, cursor: "pointer", fontWeight: 700 }}>
          ← Back
        </button>
      </div>

      {/* ── WARM IVORY CONTENT ZONE ── */}
      <div style={{ flex: 1, display: "flex", background: "#f5f1eb", overflow: "hidden", minHeight: 0 }}>

        {/* LEFT: Phase bar + Chat + Input */}
        <div className="ai-chat-col">

          {/* Phase progress bar */}
          <div className="ai-phase">
            <div style={{ display: "flex", alignItems: "center", gap: 0, width: "100%" }}>
              <div className={stepClass(1)}>
                <span className="step-num">1</span>
                <span className="step-lbl">Describe</span>
              </div>
              <div className="step-arr">›</div>
              <div className={stepClass(2)}>
                <span className="step-num">2</span>
                <span className="step-lbl">Extract</span>
              </div>
              <div className="step-arr">›</div>
              <div className={stepClass(3)}>
                <span className="step-num">3</span>
                <span className="step-lbl">Confirm</span>
              </div>
              <div className="step-arr">›</div>
              <div className={stepClass(4)}>
                <span className="step-num">4</span>
                <span className="step-lbl">Design</span>
              </div>
            </div>
          </div>

          {/* ── Installation-style progress bar ── */}
          <div style={{ flexShrink: 0, height: 4, background: "#e8e2d9", position: "relative", overflow: "hidden" }}>
            <div style={{
              position: "absolute", left: 0, top: 0, bottom: 0,
              width: `${(phase / 4) * 100}%`,
              background: "linear-gradient(90deg,#1a4a8a 0%,#2563b0 60%,#4ade80 100%)",
              transition: "width 0.5s cubic-bezier(.4,0,.2,1)",
              borderRadius: "0 2px 2px 0",
            }} />
          </div>

          {/* ── Persistent Element Navigation ── */}
          <div style={{ flexShrink: 0, background: "#e8e2d9", borderBottom: "1px solid #ddd8cf" }}>
            {/* Element pills row */}
            <div style={{ display: "flex", gap: 5, padding: "8px 14px 5px", overflowX: "auto", alignItems: "center" }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 8, color: "rgba(26,74,138,.55)", letterSpacing: ".6px", flexShrink: 0, marginRight: 4, fontWeight: 700, textTransform: "uppercase" }}>Element:</span>
              {RC_ELEMENTS.map(el => (
                <button
                  key={el.id}
                  onClick={() => { setSelectedElement(el.id); setPickerState("subtypes"); }}
                  style={{
                    fontFamily: "var(--mono)", fontSize: 9,
                    fontWeight: selectedElement === el.id ? 700 : 500,
                    padding: "4px 11px", borderRadius: 20, cursor: "pointer", flexShrink: 0,
                    border: selectedElement === el.id
                      ? "1px solid rgba(200,150,12,.8)"
                      : "1px solid rgba(26,74,138,.28)",
                    background: selectedElement === el.id
                      ? "rgba(200,150,12,.16)"
                      : "rgba(26,74,138,.07)",
                    color: selectedElement === el.id ? "#c8960c" : "rgba(26,74,138,.75)",
                    transition: "all .18s",
                  }}
                >
                  {el.id}
                </button>
              ))}
              {selectedElement && (
                <button
                  onClick={() => { setSelectedElement(null); setPickerState("elements"); }}
                  style={{ fontFamily: "var(--mono)", fontSize: 8, padding: "3px 8px", marginLeft: 4, borderRadius: 20, cursor: "pointer", border: "1px solid rgba(200,150,12,.25)", background: "none", color: "rgba(200,150,12,.6)", flexShrink: 0 }}
                >× clear</button>
              )}
            </div>

          </div>

          {/* ── Chat messages (only scrollable area) ── */}
          <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>

            {/* Subtype cards — scroll with chat */}
            {selectedElement && (
              <div style={{ padding: "10px 14px 6px", display: "flex", flexDirection: "column", gap: 5, background: "#e8e2d9", borderBottom: "1px solid #ddd8cf" }}>
                {(ELEMENT_SUBTYPES[selectedElement] ?? []).map(sub => (
                  <div
                    key={sub.name}
                    className="elem-card"
                    role="button"
                    tabIndex={0}
                    onClick={() => { setInput(sub.prompt); setTimeout(() => void handleSend(), 0); }}
                    onKeyDown={e => { if (e.key === "Enter") { setInput(sub.prompt); setTimeout(() => void handleSend(), 0); } }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "var(--ser)", fontSize: 12, fontWeight: 700, color: "var(--txt)", marginBottom: 1 }}>{sub.name}</div>
                      <div style={{ fontSize: 10, color: "var(--mut)", fontFamily: "var(--mono)" }}>{sub.desc}</div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--blu)" strokeWidth="1.8"><path d="M3 7h8M7 3l4 4-4 4"/></svg>
                  </div>
                ))}
                <div style={{ padding: "4px 2px 2px", fontFamily: "var(--mono)", fontSize: 9, color: "var(--mut)" }}>
                  Or describe in your own words below ↓
                </div>
              </div>
            )}

          <div
            id="ai-chat"
            style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 11, background: "#f5f1eb" }}
          >
            {messages.length === 0 && !selectedElement && (
              <div>
                {/* AI Introduction bubble */}
                <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "flex-start" }}>
                  <div className="ai-av ag" style={{ flexShrink: 0, marginTop: 2 }}>
                    <svg width="22" height="22" viewBox="0 0 48 48" fill="none">
                      <circle cx="24" cy="24" r="23" fill="#1a4a8a"/>
                      <circle cx="24" cy="24" r="23" stroke="#c8960c" strokeWidth="1.5"/>
                      <rect x="13" y="12" width="22" height="17" rx="4" fill="rgba(255,255,255,0.15)" stroke="white" strokeWidth="1.2"/>
                      <rect x="16" y="17" width="6" height="4" rx="1.5" fill="#c8960c"/>
                      <rect x="26" y="17" width="6" height="4" rx="1.5" fill="#c8960c"/>
                      <rect x="16" y="24" width="16" height="3" rx="1" fill="rgba(200,150,12,0.4)" stroke="rgba(200,150,12,0.7)" strokeWidth="1"/>
                      <rect x="11" y="32" width="26" height="10" rx="3" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.35)" strokeWidth="1"/>
                    </svg>
                  </div>
                  <div className="bbl ag" style={{ fontSize: 13, lineHeight: 1.65 }}>
                    <div style={{ fontFamily: "var(--ser)", fontWeight: 700, fontSize: 13, marginBottom: 5, color: "var(--txt)" }}>Hello! I am your RC Design Assistant.</div>
                    <div style={{ fontFamily: "var(--ui)", color: "var(--mut)" }}>
                      I specialise in reinforced concrete design to <strong>BS 8110</strong> and <strong>EC2</strong>. I can help you size and check slabs, beams, columns, foundations, and ancillary elements — step by step.
                    </div>
                    <div style={{ fontFamily: "var(--ui)", color: "var(--mut)", marginTop: 8 }}>
                      To get started, <strong>select the element type</strong> you want to design from the options below:
                    </div>
                  </div>
                </div>
                {RC_ELEMENTS.map(el => (
                  <div
                    key={el.id}
                    className="elem-card"
                    role="button"
                    tabIndex={0}
                    onClick={() => { setSelectedElement(el.id); setPickerState("subtypes"); }}
                    onKeyDown={e => { if (e.key === "Enter") { setSelectedElement(el.id); setPickerState("subtypes"); } }}
                    style={{ marginBottom: 6 }}
                  >
                    <div className="elem-card-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blu)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        {el.id === "Slab"        && <rect x="2" y="9" width="20" height="6" rx="1"/>}
                        {el.id === "Beam"        && <><rect x="2" y="8" width="20" height="8" rx="1"/><line x1="6" y1="4" x2="6" y2="8"/><line x1="18" y1="4" x2="18" y2="8"/><line x1="6" y1="4" x2="18" y2="4"/></>}
                        {el.id === "Column"      && <><rect x="8" y="2" width="8" height="20" rx="1"/><line x1="5" y1="2" x2="19" y2="2"/><line x1="5" y1="22" x2="19" y2="22"/></>}
                        {el.id === "Foundation"  && <><line x1="10" y1="3" x2="10" y2="12"/><rect x="4" y="12" width="16" height="6" rx="1"/><line x1="1" y1="20" x2="23" y2="20"/><line x1="3" y1="22" x2="6" y2="20"/><line x1="8" y1="22" x2="11" y2="20"/><line x1="13" y1="22" x2="16" y2="20"/><line x1="18" y1="22" x2="21" y2="20"/></>}
                        {el.id === "Ancillaries" && <><line x1="8" y1="3" x2="8" y2="21"/><rect x="5" y="18" width="14" height="3" rx="1"/><line x1="8" y1="7" x2="18" y2="7"/><line x1="8" y1="11" x2="18" y2="11"/><line x1="8" y1="15" x2="18" y2="15"/></>}
                      </svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "var(--ser)", fontSize: 13, fontWeight: 700, color: "var(--txt)", marginBottom: 1 }}>{el.id}</div>
                      <div style={{ fontSize: 10, color: "var(--mut)", fontFamily: "var(--mono)" }}>{el.sub}</div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--blu)" strokeWidth="1.8"><path d="M3 7h8M7 3l4 4-4 4"/></svg>
                  </div>
                ))}
              </div>
            )}
            {messages.length === 0 && selectedElement && (
              <div style={{ textAlign: "center", padding: "24px 16px 8px" }}>
                <div style={{ fontFamily: "var(--ser)", fontSize: 13, fontWeight: 700, color: "var(--txt)", marginBottom: 6 }}>
                  {selectedElement} selected
                </div>
                <div style={{ fontFamily: "var(--ui)", fontSize: 12, color: "var(--mut)", lineHeight: 1.6 }}>
                  Pick a sub-type from the list above — or describe your element in your own words below.
                </div>
              </div>
            )}
            {messages.map((m) => {
              if (m.role === "assistant" && m.content.startsWith("__DUAL_CHOICE__")) {
                let dualPayload: DualChoicePayload | null = null;
                try { dualPayload = JSON.parse(m.content.replace(/^__DUAL_CHOICE__/, "")) as DualChoicePayload; } catch { /* ignore */ }
                if (!dualPayload) return null;
                const payload = dualPayload;
                return (
                  <DualChoiceCard
                    key={m.id}
                    content={m.content}
                    elementId={designElementId}
                    onChoose={({ provider, result }) => {
                      setExtractedParams({ ...result.extracted, module: payload.module } as unknown as import("@/types/calc").ExtractedParams);
                      addMessage({
                        role: "assistant",
                        content: `__EXTRACTED__${JSON.stringify({
                          module: payload.module,
                          extracted: result.extracted,
                          summary: result.summary,
                          confidence: result.confidence,
                          missing: result.missing,
                          provider,
                          model: result.model,
                        })}`,
                      });
                      setPhase(3);
                    }}
                  />
                );
              }
              if (m.role === "assistant" && m.content.startsWith("__EXTRACTED__")) {
                return <ExtractedCard key={m.id} content={m.content} elementId={designElementId} autoEdit={redesignMode} onConfirm={(env) => { setRedesignMode(false); void handleConfirm(env); }} onEdit={() => { clearChat(); setPhase(1); setPickerState("elements"); setSelectedElement(null); }} />;
              }
              if (m.role === "assistant" && m.content === "__RESULT__" && calcResult) {
                return <InlineResultCard key={m.id} calcResult={calcResult} elementId={designElementId} onViewReport={() => goScreen("report")} onViewDetails={() => goScreen("detailing")} onRedesign={() => { popMessage(); setCalcResult(null); setPhase(3); setRedesignMode(true); }} />;
              }
              return (
                <div key={m.id} className={`ai-msg ${m.role === "user" ? "usr" : ""}`}>
                  <div className={`ai-av ${m.role === "user" ? "us" : "ag"}`}>
                    {m.role === "user" ? "👤" : (
                      <svg width="22" height="22" viewBox="0 0 48 48" fill="none">
                        <circle cx="24" cy="24" r="23" fill="#1a4a8a"/>
                        <circle cx="24" cy="24" r="23" stroke="#c8960c" strokeWidth="1.5"/>
                        <rect x="13" y="12" width="22" height="17" rx="4" fill="rgba(255,255,255,0.15)" stroke="white" strokeWidth="1.2"/>
                        <rect x="16" y="17" width="6" height="4" rx="1.5" fill="#c8960c"/>
                        <rect x="26" y="17" width="6" height="4" rx="1.5" fill="#c8960c"/>
                        <rect x="16" y="24" width="16" height="3" rx="1" fill="rgba(200,150,12,0.4)" stroke="rgba(200,150,12,0.7)" strokeWidth="1"/>
                        <rect x="11" y="32" width="26" height="10" rx="3" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.35)" strokeWidth="1"/>
                      </svg>
                    )}
                  </div>
                  <div className={`bbl ${m.role === "user" ? "us" : "ag"}`}>
                    {m.content}
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {isProcessing && (
              <div className="typ-row">
                <div className="ai-av ag">
                  <svg width="22" height="22" viewBox="0 0 48 48" fill="none">
                    <circle cx="24" cy="24" r="23" fill="#1a4a8a"/>
                    <circle cx="24" cy="24" r="23" stroke="#c8960c" strokeWidth="1.5"/>
                    <rect x="13" y="12" width="22" height="17" rx="4" fill="rgba(255,255,255,0.15)" stroke="white" strokeWidth="1.2"/>
                    <rect x="16" y="17" width="6" height="4" rx="1.5" fill="#c8960c"/>
                    <rect x="26" y="17" width="6" height="4" rx="1.5" fill="#c8960c"/>
                    <rect x="16" y="24" width="16" height="3" rx="1" fill="rgba(200,150,12,0.4)" stroke="rgba(200,150,12,0.7)" strokeWidth="1"/>
                    <rect x="11" y="32" width="26" height="10" rx="3" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.35)" strokeWidth="1"/>
                  </svg>
                </div>
                <div className="typ-dots">
                  <div className="td" /><div className="td" /><div className="td" />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
          </div>{/* /chat-scroll */}

          {/* End conversation button */}
          <div style={{ flexShrink: 0, display: "flex", justifyContent: "flex-end", padding: "3px 14px 0", background: "#f5f1eb" }}>
            <button
              onClick={() => { clearChat(); goScreen("workspace"); }}
              style={{ fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, color: "#94a3b8", background: "transparent", border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, letterSpacing: ".3px" }}
            >
              <svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="2" y1="2" x2="12" y2="12"/><line x1="12" y1="2" x2="2" y2="12"/></svg>
              End conversation
            </button>
          </div>
          {/* Input area */}
          <div className="ai-input-area">
            <button
              className="mic-btn"
              onClick={handleVoice}
              title={isListening ? "Stop recording" : "Voice input (speak your description)"}
              style={{
                background: isListening ? "rgba(239,68,68,.1)" : "transparent",
                border: isListening ? "1px solid rgba(239,68,68,.4)" : "1px solid var(--bdr2)",
                borderRadius: 8, cursor: "pointer",
                width: 32, height: 32, padding: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
                animation: isListening ? "pulse 1.2s ease-in-out infinite" : "none",
                transition: "background .2s, border-color .2s",
              }}
            >
              {isListening ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="1" y="1" width="5" height="12" rx="1.5" fill="#ef4444"/>
                  <rect x="8" y="1" width="5" height="12" rx="1.5" fill="#ef4444"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--mut)" strokeWidth="1.5" strokeLinecap="round">
                  <rect x="4.5" y="1" width="5" height="8" rx="2.5" fill="none"/>
                  <path d="M2 7c0 2.76 2.24 5 5 5s5-2.24 5-5" fill="none"/>
                  <line x1="7" y1="12" x2="7" y2="13.5"/>
                  <line x1="4" y1="13.5" x2="10" y2="13.5"/>
                </svg>
              )}
            </button>
            <textarea
              ref={inputRef}
              className="ai-inp"
              placeholder="Describe your structural element…"
              rows={1}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={isProcessing}
              style={{ background: "#fff", color: "var(--txt)", borderColor: "var(--bdr2)" }}
            />
            <button
              className="ai-send"
              onClick={() => void handleSend()}
              disabled={isProcessing || !input.trim()}
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 7.5L2 2l2.5 5.5L2 13l11-5.5z"/>
              </svg>
            </button>
          </div>

        </div>{/* /ai-chat-col */}

        {/* RIGHT: Prompt suggestions — desktop only */}
        <div className="ai-suggest-col">
          <div style={{ height: 38, padding: "0 14px", borderBottom: "1px solid #ddd8cf", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", boxSizing: "border-box" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, color: "rgba(26,74,138,.7)", letterSpacing: "1px", textTransform: "uppercase" }}>{selectedElement ? selectedElement + " Prompts" : "Prompt Examples"}</div>
            <div style={{ fontFamily: "var(--ui)", fontSize: 9, color: "var(--dim)" }}>Tap to use</div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
            {(selectedElement ? (ELEMENT_PROMPTS[selectedElement] ?? DEFAULT_PROMPTS) : DEFAULT_PROMPTS).map(p => (
              <div
                key={p.name}
                className="ai-sug-card"
                onClick={() => { setInput(p.text); inputRef.current?.focus(); }}
                role="button"
                tabIndex={0}
              >
                <div className="ai-sug-card-name">{p.name}</div>
                <div className="ai-sug-card-text">{p.text}</div>
              </div>
            ))}
          </div>
        </div>

      </div>{/* /ivory content zone */}

      {/* Bottom nav */}
      <div className="bnav" style={{ background: "rgba(245,241,235,.96)", position: "relative", zIndex: 2 }}>
        <div className="bni" onClick={() => goScreen("workspace")} role="button" tabIndex={0}>
          <div className="bni-ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12l9-9 9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9"/>
            </svg>
          </div>
          <span>Home</span>
        </div>
        <div className="bni on" role="button" tabIndex={0}>
          <div className="bni-ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M12 2a2 2 0 012 2v1a7 7 0 11-4 0V4a2 2 0 012-2zM8 21h8M12 17v4"/>
            </svg>
          </div>
          <span>Agent</span>
        </div>
        <div className="bni" onClick={() => goScreen("projects")} role="button" tabIndex={0}>
          <div className="bni-ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M3 7h18M3 12h18M3 17h18"/>
            </svg>
          </div>
          <span>Projects</span>
        </div>
        <div className="bni" onClick={() => goScreen("settings")} role="button" tabIndex={0}>
          <div className="bni-ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
          </div>
          <span>Settings</span>
        </div>
      </div>

    </div>
  );
}

// ─── Parameter full-names & units ────────────────────────────
const PARAM_META: Record<string, { label: string; unit: string }> = {
  // General
  element_type:      { label: "Element Type",                 unit: ""      },
  support_type:      { label: "Support Condition",            unit: ""      },
  // Geometry
  span:              { label: "Span",                         unit: "m"     },
  h:                 { label: "Overall Depth",                unit: "mm"    },
  b:                 { label: "Width",                        unit: "mm"    },
  cover:             { label: "Cover to Reinforcement",       unit: "mm"    },
  slab_type:         { label: "Slab Type",                    unit: ""      },
  lateral_restraint: { label: "Lateral Restraint",            unit: ""      },
  le_x:              { label: "Effective Length (x-axis)",    unit: "mm"    },
  le_y:              { label: "Effective Length (y-axis)",    unit: "mm"    },
  le_z:              { label: "Effective Length (z-axis)",    unit: "m"     },
  le:                { label: "Member Length",                unit: "m"     },
  L:                 { label: "Pad Length",                   unit: "m"     },
  B:                 { label: "Pad Breadth",                  unit: "m"     },
  col_b:             { label: "Column Width",                 unit: "mm"    },
  col_h:             { label: "Column Depth",                 unit: "mm"    },
  // Materials
  fcu:               { label: "Concrete Cube Strength",       unit: "N/mm²" },
  fy:                { label: "Steel Yield Strength",         unit: "N/mm²" },
  py:                { label: "Steel Design Strength",        unit: "N/mm²" },
  // Loads
  gk:                { label: "Dead Load",                    unit: "kN/m"  },
  qk:                { label: "Imposed Load",                 unit: "kN/m"  },
  N_Ed:              { label: "Design Axial Force",           unit: "kN"    },
  Mx:                { label: "Bending Moment (x-axis)",      unit: "kN·m"  },
  My:                { label: "Bending Moment (y-axis)",      unit: "kN·m"  },
  N_sls:             { label: "Axial Load (SLS)",             unit: "kN"    },
  N_uls:             { label: "Axial Load (ULS)",             unit: "kN"    },
  M_sls:             { label: "Bending Moment (SLS)",         unit: "kN·m"  },
  qa:                { label: "Allowable Bearing Pressure",   unit: "kPa"   },
  F_Ed:              { label: "Design Member Force",          unit: "kN"    },
};

// Slab modules use area loads (kPa) not linear loads (kN/m)
function getParamUnit(key: string, mod: string): string {
  if (mod.startsWith("rc_slab") && (key === "gk" || key === "qk")) return "kPa";
  return PARAM_META[key]?.unit ?? "";
}

// Design code options per module family
type CodeOption = { id: string; label: string; standard: string; available: boolean };
const RC_CODES: CodeOption[] = [
  { id: "BS",  label: "BS 8110",  standard: "British Standard",   available: true  },
  { id: "EC2", label: "EC 2",     standard: "Eurocode 2",         available: false },
  { id: "ACI", label: "ACI 318",  standard: "ACI / USD",          available: false },
];
const STEEL_CODES: CodeOption[] = [
  { id: "BS",  label: "BS 5950",  standard: "British Standard",   available: true  },
  { id: "EC3", label: "EC 3",     standard: "Eurocode 3",         available: false },
  { id: "AISC",label: "AISC 360", standard: "AISC / LRFD",        available: false },
];

// Per-parameter default values (used to detect inferred/defaulted params)
const PARAM_DEFAULTS: Record<string, string[]> = {
  fy:                ["460"],
  cover:             ["25", "20", "40", "50"],
  support_type:      ["simply_supported"],
  lateral_restraint: ["full"],
  Mx:                ["0"],
  My:                ["0"],
  M_sls:             ["0"],
};

function getVerifStatus(key: string, val: string, miss: string[]): "verified" | "inferred" | "missing" {
  const inMissing = miss.some(m => m.toLowerCase() === key.toLowerCase() || m.toLowerCase().includes(key.toLowerCase()));
  if (inMissing && (!val || val === "null" || val === "undefined" || val === "")) return "missing";
  if (PARAM_DEFAULTS[key]?.includes(val.trim())) return "inferred";
  return "verified";
}

// Section visual config
const SECTION_CFG: Record<string, { color: string; bg: string; border: string; title: string }> = {
  GENERAL:    { color: "#44337a", bg: "#faf5ff", border: "#d9b8fd", title: "General Information"       },
  GEOMETRY:   { color: "#1e3a8a", bg: "#eff6ff", border: "#bfdbfe", title: "Geometry & Dimensions"    },
  MATERIALS:  { color: "#78350f", bg: "#fffbeb", border: "#fde68a", title: "Material Properties"       },
  LOADS:      { color: "#7f1d1d", bg: "#fff1f2", border: "#fecdd3", title: "Design Loads (Unfactored)" },
  DESIGN:     { color: "#14532d", bg: "#f0fdf4", border: "#bbf7d0", title: "Design Parameters"         },
  PARAMETERS: { color: "#374151", bg: "#f9fafb", border: "#e5e7eb", title: "Parameters"                },
};

const SECTION_ICONS: Record<string, React.ReactNode> = {
  GENERAL: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  GEOMETRY: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>
    </svg>
  ),
  MATERIALS: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/>
    </svg>
  ),
  LOADS: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="2" x2="12" y2="14"/><polyline points="6 8 12 14 18 8"/><line x1="4" y1="20" x2="20" y2="20"/>
    </svg>
  ),
  DESIGN: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  ),
  PARAMETERS: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  ),
};

// ─── Extracted parameters card ─────────────────────────────────
function ExtractedCard({
  content,
  elementId,
  onConfirm,
  onEdit,
  autoEdit,
}: {
  content: string;
  elementId: string | null;
  onConfirm: (env: { module: string; extracted: Record<string, unknown>; designCode: string }) => void;
  onEdit: () => void;
  autoEdit?: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const [editMode, setEditMode] = useState(false);
  useEffect(() => { if (autoEdit) setEditMode(true); }, [autoEdit]);

  let envelope: { module?: string; extracted?: Record<string, unknown>; summary?: string; confidence?: string; missing?: string[]; param_confidence?: Record<string, number>; provider?: string; model?: string } = {};
  try { envelope = JSON.parse(content.replace(/^__EXTRACTED__/, "")) as typeof envelope; } catch { /* ignore */ }

  const { module = "", extracted = {}, summary = "Parameters extracted. Please confirm to proceed.", confidence = "high", missing = [], param_confidence = {}, provider = "", model = "" } = envelope;
  const moduleLabel = MODULE_LABELS[module] ?? module.replace(/_/g, " ");

  const confColor = confidence === "high" ? "#15803d" : confidence === "medium" ? "#b45309" : "#b91c1c";
  const confBg    = confidence === "high" ? "#dcfce7" : confidence === "medium" ? "#fef3c7" : "#fee2e2";
  const confLabel = confidence === "high" ? "✓ High Confidence" : confidence === "medium" ? "⚠ Medium Confidence" : "✗ Low Confidence";

  // Determine code family from module
  const isSteel = module.startsWith("steel_");
  const codeOptions = isSteel ? STEEL_CODES : RC_CODES;
  const [designCode, setDesignCode] = useState<string>(codeOptions[0]!.id);

  // ── Build raw sections from extracted JSON ──
  const GENERAL_KEYS = new Set(["element_type", "support_type", "slab_type"]);
  const COVER_KEYS   = new Set(["cover"]);
  const GEOM_ORDER   = ["span", "h", "b"];
  const SECTION_ORDER_LIST = ["GENERAL", "GEOMETRY", "MATERIALS", "LOADS", "DESIGN", "PARAMETERS"];

  const rawSections: { label: string; entries: [string, string][] }[] = [];
  for (const [section, val] of Object.entries(extracted)) {
    if (section === "module") continue;
    if (typeof val === "object" && val !== null) {
      const entries = Object.entries(val as Record<string, unknown>).map(([k, v]): [string, string] => [k, String(v)]);
      if (entries.length > 0) rawSections.push({ label: section.toUpperCase(), entries });
    } else {
      const last = rawSections[rawSections.length - 1];
      if (last?.label === "PARAMETERS") last.entries.push([section, String(val)]);
      else rawSections.push({ label: "PARAMETERS", entries: [[section, String(val)]] });
    }
  }

  // Post-process: extract general keys, move cover to design, reorder geometry
  const GENERAL_PREF = ["slab_type", "element_type", "support_type"];
  const generalEntries: [string, string][] = [];
  const coverEntries:   [string, string][] = [];

  let workingSecs = rawSections.map(sec => {
    if (sec.label === "GEOMETRY") {
      const kept: [string, string][] = [];
      for (const entry of sec.entries) {
        if (GENERAL_KEYS.has(entry[0]))      generalEntries.push(entry);
        else if (COVER_KEYS.has(entry[0]))   coverEntries.push(entry);
        else                                 kept.push(entry);
      }
      // Reorder: span → h → b → rest
      const ordered: ([string, string] | undefined)[] = GEOM_ORDER.map(key => kept.find(([k]) => k === key));
      const rest = kept.filter(([k]) => !GEOM_ORDER.includes(k));
      return { ...sec, entries: [...ordered.filter((x): x is [string, string] => !!x), ...rest] };
    }
    const kept: [string, string][] = [];
    for (const entry of sec.entries) {
      if (GENERAL_KEYS.has(entry[0])) generalEntries.push(entry);
      else                            kept.push(entry);
    }
    return { ...sec, entries: kept };
  }).filter(sec => sec.entries.length > 0);

  // Add cover entries to DESIGN section (or create it)
  if (coverEntries.length > 0) {
    const di = workingSecs.findIndex(s => s.label === "DESIGN");
    if (di !== -1) {
      workingSecs = workingSecs.map((s, i) =>
        i === di ? { ...s, entries: [...coverEntries, ...s.entries] } : s
      );
    } else {
      workingSecs.push({ label: "DESIGN", entries: coverEntries });
    }
  }

  // Sort general entries: slab_type first, element_type, support_type, then others
  generalEntries.sort((a, b) => {
    const ai = GENERAL_PREF.indexOf(a[0]);
    const bi = GENERAL_PREF.indexOf(b[0]);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  // Build final ordered sections
  const orderedSections: { label: string; entries: [string, string][] }[] = [];
  if (generalEntries.length > 0) orderedSections.push({ label: "GENERAL", entries: generalEntries });
  for (const label of SECTION_ORDER_LIST.slice(1)) {
    const sec = workingSecs.find(s => s.label === label);
    if (sec && sec.entries.length > 0) orderedSections.push(sec);
  }
  for (const sec of workingSecs) {
    if (!SECTION_ORDER_LIST.includes(sec.label)) orderedSections.push(sec);
  }
  const sections = orderedSections;

  // ── Edits state: keyed by parameter name (k) only — unique across sections ──
  const [edits, setEdits] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    try {
      const env = JSON.parse(content.replace(/^__EXTRACTED__/, "")) as { extracted?: Record<string, unknown> };
      for (const [section, val] of Object.entries(env.extracted ?? {})) {
        if (section === "module") continue;
        if (typeof val === "object" && val !== null) {
          for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
            init[k] = String(v);
          }
        } else {
          init[section] = String(val);
        }
      }
    } catch { /* ignore */ }
    return init;
  });

  const isMissing = (key: string) =>
    (missing as string[]).some(m => m.toLowerCase() === key.toLowerCase() || m.toLowerCase().includes(key.toLowerCase()));

  // Map display sections → backend section keys.
  // GENERAL merges into "geometry"; all others map by name.
  const DISPLAY_TO_BACKEND: Record<string, string> = {
    GENERAL:    "geometry",
    GEOMETRY:   "geometry",
    MATERIALS:  "materials",
    LOADS:      "loads",
    DESIGN:     "design",
    PARAMETERS: "parameters",
  };

  // Per-key overrides: these params are displayed in a different section
  // than what the backend validates them against.
  const PARAM_BACKEND_SECTION: Record<string, string> = {
    cover:        "geometry",   // shown in Design display section
    support_type: "geometry",   // shown in General display section
    slab_type:    "geometry",   // shown in General display section
    element_type: "geometry",   // shown in General display section
  };

  function buildPayload(): { module: string; extracted: Record<string, unknown>; designCode: string } {
    const rebuilt: Record<string, Record<string, string | number>> = {};
    for (const sec of sections) {
      const defaultKey = DISPLAY_TO_BACKEND[sec.label] ?? sec.label.toLowerCase();
      if (!rebuilt[defaultKey]) rebuilt[defaultKey] = {};
      for (const [k] of sec.entries) {
        const backendKey = PARAM_BACKEND_SECTION[k] ?? defaultKey;
        if (!rebuilt[backendKey]) rebuilt[backendKey] = {};
        const raw = edits[k] ?? "";
        const num = parseFloat(raw);
        rebuilt[backendKey]![k] = !isNaN(num) && raw.trim() !== "" ? num : raw;
      }
    }
    return { module, extracted: rebuilt as Record<string, unknown>, designCode };
  }

  const totalParams = sections.reduce((a, s) => a + s.entries.length, 0);
  const selectedCodeOption = codeOptions.find(c => c.id === designCode) ?? codeOptions[0]!;

  return (
    <div className="ai-msg" style={{ alignItems: "flex-start", marginBottom: 12 }}>
      {/* Avatar */}
      <div className="ai-av ag" style={{ flexShrink: 0, marginTop: 4 }}>
        <svg width="26" height="26" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="23" fill="#1a4a8a"/>
          <circle cx="24" cy="24" r="23" stroke="#c8960c" strokeWidth="2"/>
          <rect x="13" y="12" width="22" height="17" rx="4" fill="rgba(255,255,255,0.15)" stroke="white" strokeWidth="1.2"/>
          <rect x="16" y="17" width="6" height="4" rx="1.5" fill="#c8960c"/>
          <rect x="26" y="17" width="6" height="4" rx="1.5" fill="#c8960c"/>
          <rect x="16" y="24" width="16" height="3" rx="1" fill="rgba(200,150,12,0.4)" stroke="rgba(200,150,12,0.7)" strokeWidth="1"/>
          <rect x="11" y="32" width="26" height="10" rx="3" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.35)" strokeWidth="1"/>
        </svg>
      </div>

      <div style={{ flex: 1, minWidth: 0, maxWidth: "98%" }}>

        {/* ── HEADER ── */}
        <div
          onClick={() => setExpanded(e => !e)}
          style={{
            display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
            background: "linear-gradient(135deg,#0f2d5a 0%,#1a4a8a 50%,#1e40af 100%)",
            borderRadius: expanded ? "13px 13px 0 0" : 13,
            cursor: "pointer", userSelect: "none",
            boxShadow: "0 2px 12px rgba(26,74,138,.4)",
          }}
        >
          {/* Checklist icon */}
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "var(--ser)", fontSize: 13, fontWeight: 700, color: "#fff", letterSpacing: ".2px", marginBottom: 3 }}>
              Parameters Extracted
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              {elementId && (
                <span style={{ fontFamily: "var(--mono)", fontSize: 10, fontWeight: 800, color: "#fff", background: "rgba(255,255,255,.18)", padding: "2px 9px", borderRadius: 5, border: "1px solid rgba(255,255,255,.35)", letterSpacing: ".4px" }}>
                  {elementId}
                </span>
              )}
              <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "rgba(200,150,12,.95)", background: "rgba(200,150,12,.18)", padding: "2px 9px", borderRadius: 5, border: "1px solid rgba(200,150,12,.5)", fontWeight: 700 }}>
                {moduleLabel || module}
              </span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 10, fontWeight: 700, color: confColor, background: confBg, padding: "2px 9px", borderRadius: 5 }}>
                {confLabel}
              </span>
              {provider && (
                <span style={{ fontFamily: "var(--mono)", fontSize: 10, fontWeight: 700, color: provider === "DeepSeek" ? "#60a5fa" : "#c084fc", background: provider === "DeepSeek" ? "rgba(96,165,250,0.18)" : "rgba(192,132,252,0.18)", padding: "2px 9px", borderRadius: 5, border: `1px solid ${provider === "DeepSeek" ? "rgba(96,165,250,0.4)" : "rgba(192,132,252,0.4)"}` }}>
                  {provider === "DeepSeek" ? "⚡" : "◆"} {provider}{model ? ` · ${model}` : ""}
                </span>
              )}
              {!expanded && (
                <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "rgba(255,255,255,.45)", marginLeft: "auto" }}>
                  {totalParams} params
                </span>
              )}
              {expanded && (
                <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "rgba(255,255,255,.45)", marginLeft: "auto" }}>
                  {totalParams} parameters
                </span>
              )}
            </div>
          </div>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="rgba(255,255,255,.6)" strokeWidth="2.2" strokeLinecap="round"
            style={{ flexShrink: 0, transform: expanded ? "rotate(180deg)" : "none", transition: "transform .22s" }}>
            <path d="M1 4l6 6 6-6"/>
          </svg>
        </div>

        {/* ── CARD BODY ── */}
        {expanded && (
          <div style={{
            border: "1.5px solid rgba(26,74,138,.18)", borderTop: "none",
            borderRadius: "0 0 13px 13px", background: "#fff",
            overflow: "hidden", boxShadow: "0 6px 24px rgba(26,74,138,.12)",
          }}>

            {/* AI summary */}
            {summary && (
              <div style={{
                padding: "12px 16px 11px",
                borderBottom: "2px solid #e8e2d9",
                background: "rgba(245,241,235,.6)",
                display: "flex", gap: 10, alignItems: "flex-start",
              }}>
                <div style={{ width: 3, flexShrink: 0, alignSelf: "stretch", borderRadius: 2, background: "#c8960c", minHeight: 16 }} />
                <p style={{ margin: 0, fontFamily: "var(--ui)", fontSize: 12.5, color: "#4b5563", lineHeight: 1.75, fontStyle: "italic" }}>
                  {summary}
                </p>
              </div>
            )}

            {/* Parameter sections */}
            {sections.map((sec, secIdx) => {
              const cfg = SECTION_CFG[sec.label] ?? SECTION_CFG.PARAMETERS!;
              const icon = SECTION_ICONS[sec.label] ?? SECTION_ICONS.PARAMETERS;
              return (
                <div key={sec.label} style={{ borderTop: secIdx === 0 ? "none" : `3px solid #f0f0f0` }}>

                  {/* Section header band */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 9,
                    padding: "9px 16px 8px",
                    background: cfg.bg,
                    borderBottom: `2px solid ${cfg.border}`,
                  }}>
                    <div style={{ color: cfg.color, display: "flex", alignItems: "center" }}>{icon}</div>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 12.5, fontWeight: 800, letterSpacing: ".6px", color: cfg.color, textTransform: "uppercase", flex: 1 }}>
                      {cfg.title}
                    </span>
                    <span style={{
                      fontFamily: "var(--mono)", fontSize: 9.5, color: cfg.color,
                      background: cfg.border, padding: "2px 8px", borderRadius: 10, fontWeight: 700,
                    }}>
                      {sec.entries.length} {sec.entries.length === 1 ? "param" : "params"}
                    </span>
                  </div>

                  {/* Parameter rows */}
                  <div style={{ background: "#fff" }}>
                    {sec.entries.map(([k, v], rowIdx) => {
                      const editKey = k;
                      const fullLabel = PARAM_META[k]?.label ?? k.replace(/_/g, " ");
                      const unit = getParamUnit(k, module);
                      const currentVal = edits[editKey] !== undefined ? edits[editKey] : v;
                      const missing_ = isMissing(k) && (!currentVal || currentVal === "null" || currentVal === "undefined" || currentVal === "");
                      // Per-parameter confidence from AI; fall back to status-derived estimate
                      const pct: number = (() => {
                        if (typeof param_confidence[k] === "number") return Math.round(param_confidence[k] as number);
                        const vs = getVerifStatus(k, currentVal, missing as string[]);
                        return vs === "verified" ? 92 : vs === "inferred" ? 60 : 10;
                      })();
                      const pctColor  = pct >= 80 ? "#166534" : pct >= 50 ? "#92400e" : "#b91c1c";
                      const pctBg     = pct >= 80 ? "#dcfce7" : pct >= 50 ? "#fef3c7" : "#fee2e2";
                      const pctBorder = pct >= 80 ? "#bbf7d0" : pct >= 50 ? "#fde68a" : "#fecdd3";

                      return (
                        <div
                          key={k}
                          style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "9px 16px",
                            borderBottom: rowIdx < sec.entries.length - 1 ? "1px solid rgba(0,0,0,.05)" : "none",
                            background: rowIdx % 2 === 0 ? "#fff" : "rgba(0,0,0,.018)",
                            transition: "background .12s",
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = cfg.bg)}
                          onMouseLeave={e => (e.currentTarget.style.background = rowIdx % 2 === 0 ? "#fff" : "rgba(0,0,0,.018)")}
                        >
                          {/* Left: full name + key */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: "var(--ui)", fontSize: 13, fontWeight: 600, color: "#1f2937", lineHeight: 1.3 }}>
                              {fullLabel}
                              {missing_ && (
                                <span style={{ marginLeft: 7, fontFamily: "var(--mono)", fontSize: 9, color: "#b91c1c", background: "#fee2e2", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>
                                  MISSING
                                </span>
                              )}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 1 }}>
                              <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "#9ca3af" }}>{k}</span>
                              {(() => {
                                const vs = getVerifStatus(k, currentVal, missing as string[]);
                                if (vs === "missing")  return <span style={{ fontFamily: "var(--mono)", fontSize: 8, fontWeight: 700, color: "#b91c1c", background: "#fee2e2", padding: "1px 5px", borderRadius: 3 }}>UNVERIFIED</span>;
                                if (vs === "inferred") return <span style={{ fontFamily: "var(--mono)", fontSize: 8, fontWeight: 700, color: "#92400e", background: "#fef3c7", padding: "1px 5px", borderRadius: 3 }}>INFERRED</span>;
                                return <span style={{ fontFamily: "var(--mono)", fontSize: 8, fontWeight: 700, color: "#166534", background: "#dcfce7", padding: "1px 5px", borderRadius: 3 }}>VERIFIED</span>;
                              })()}
                              <span style={{
                                fontFamily: "var(--mono)", fontSize: 8.5, fontWeight: 800,
                                color: pctColor, background: pctBg,
                                border: `1px solid ${pctBorder}`,
                                padding: "1px 5px", borderRadius: 3, letterSpacing: ".2px",
                              }}>
                                {pct}%
                              </span>
                            </div>
                          </div>

                          {/* Right: value + unit */}
                          <div style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
                            {editMode ? (
                              <input
                                type="text"
                                value={currentVal}
                                onChange={e => setEdits(prev => ({ ...prev, [editKey]: e.target.value }))}
                                onClick={e => e.stopPropagation()}
                                style={{
                                  fontFamily: "var(--mono)", fontSize: 13, fontWeight: 700,
                                  color: cfg.color,
                                  background: cfg.bg, border: `1.5px solid ${cfg.border}`,
                                  borderRadius: 7, padding: "5px 9px", width: 90, outline: "none",
                                  textAlign: "right",
                                }}
                              />
                            ) : (
                              <span style={{
                                fontFamily: "var(--mono)", fontSize: 14, fontWeight: 800,
                                color: missing_ ? "#b91c1c" : cfg.color,
                                minWidth: 48, textAlign: "right",
                              }}>
                                {missing_ ? "—" : currentVal}
                              </span>
                            )}
                            {unit && (
                              <span style={{
                                fontFamily: "var(--mono)", fontSize: 10, fontWeight: 600,
                                color: cfg.color, background: cfg.bg,
                                border: `1px solid ${cfg.border}`,
                                padding: "3px 7px", borderRadius: 6,
                                flexShrink: 0, whiteSpace: "nowrap",
                              }}>
                                {unit}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* ── DESIGN CODE SELECTOR ── */}
            <div style={{
              borderTop: "3px solid #e8e2d9",
              background: "linear-gradient(135deg,#f8faff 0%,#eff6ff 100%)",
              padding: "14px 16px 16px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 800, letterSpacing: ".8px", color: "#1e3a8a", textTransform: "uppercase" }}>
                  Design Standard
                </span>
                <span style={{ fontFamily: "var(--ui)", fontSize: 11, color: "#6b7280", marginLeft: 4 }}>
                  Select the code for this calculation
                </span>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {codeOptions.map(opt => {
                  const isActive = designCode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      disabled={!opt.available}
                      onClick={e => { e.stopPropagation(); if (opt.available) setDesignCode(opt.id); }}
                      style={{
                        position: "relative",
                        display: "inline-flex", alignItems: "center", gap: 5,
                        padding: "5px 12px",
                        borderRadius: 20,
                        border: isActive ? "2px solid #1e3a8a" : "1.5px solid #d1d5db",
                        background: isActive ? "linear-gradient(135deg,#1e3a8a,#1a4a8a)" : opt.available ? "#fff" : "#f9fafb",
                        cursor: opt.available ? "pointer" : "not-allowed",
                        opacity: opt.available ? 1 : 0.65,
                        transition: "all .2s",
                        boxShadow: isActive ? "0 2px 8px rgba(30,58,138,.3)" : "none",
                      }}
                    >
                      {isActive && (
                        <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="rgba(255,255,255,.9)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1.5 5l2.5 2.5 5-4.5"/>
                        </svg>
                      )}
                      <span style={{
                        fontFamily: "var(--mono)", fontSize: 11, fontWeight: 800,
                        color: isActive ? "#fff" : opt.available ? "#1e3a8a" : "#9ca3af",
                        letterSpacing: ".2px",
                      }}>
                        {opt.label}
                      </span>
                      {!opt.available && (
                        <span style={{
                          fontFamily: "var(--mono)", fontSize: 7.5, fontWeight: 700,
                          color: "#9ca3af", background: "#e5e7eb",
                          padding: "0px 4px", borderRadius: 3,
                        }}>
                          SOON
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── FOOTER TOOLBAR ── */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 16px", borderTop: "1.5px solid #e8e2d9",
              background: "rgba(245,241,235,.5)", gap: 8,
            }}>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={e => { e.stopPropagation(); setEditMode(m => !m); }}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    background: editMode ? "rgba(26,74,138,.1)" : "#fff",
                    border: editMode ? "1.5px solid #1a4a8a" : "1.5px solid #d1d5db",
                    borderRadius: 8, padding: "6px 13px", cursor: "pointer",
                    fontFamily: "var(--mono)", fontSize: 11, fontWeight: 700,
                    color: editMode ? "#1a4a8a" : "#374151",
                    transition: "all .18s",
                  }}
                >
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7.5 1.5l2 2-6 6H1.5v-2l6-6z"/>
                  </svg>
                  {editMode ? "Done" : "Edit Values"}
                </button>
                <button
                  onClick={e => { e.stopPropagation(); onEdit(); }}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    background: "#fff", border: "1.5px solid #d1d5db",
                    borderRadius: 8, padding: "6px 13px", cursor: "pointer",
                    fontFamily: "var(--mono)", fontSize: 11, fontWeight: 600,
                    color: "#6b7280", transition: "all .18s",
                  }}
                >
                  ↺ Start Over
                </button>
              </div>
              <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "#9ca3af" }}>
                {totalParams} parameters extracted
              </span>
            </div>

            {/* ── CONFIRM BUTTON ── */}
            <div style={{ padding: "0 16px 16px" }}>
              <button
                onClick={e => { e.stopPropagation(); onConfirm(buildPayload()); }}
                style={{
                  width: "100%", padding: "14px 0",
                  background: "linear-gradient(135deg,#14532d 0%,#15803d 50%,#16a34a 100%)",
                  border: "none", borderRadius: 11,
                  fontFamily: "var(--mono)", fontSize: 13, fontWeight: 800,
                  color: "#fff", letterSpacing: ".5px", cursor: "pointer",
                  boxSizing: "border-box", display: "flex", alignItems: "center",
                  justifyContent: "center", gap: 10,
                  boxShadow: "0 4px 18px rgba(21,128,61,.4)",
                  transition: "transform .15s, box-shadow .15s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 7px 24px rgba(21,128,61,.5)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "none"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 18px rgba(21,128,61,.4)"; }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 8l4.5 4.5 8-8"/>
                </svg>
                Confirm and Design
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



