"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import type {
  ScreenName,
  CalcResponse,
  ExtractedParams,
} from "@/types/calc";

// ─── State shape ─────────────────────────────────────────

export interface WorkspaceState {
  screen: ScreenName;
  /** Active AI conversation messages */
  messages: ChatMessage[];
  /** Parameters extracted by AI (pending user confirm) */
  extractedParams: ExtractedParams | null;
  /** Last accepted deterministic result */
  calcResult: CalcResponse | null;
  /** Active project id */
  projectId: string | null;
  /** Active element id */
  elementId: string | null;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

// ─── Actions ─────────────────────────────────────────────

interface WorkspaceContextValue extends WorkspaceState {
  goScreen: (screen: ScreenName) => void;
  addMessage: (msg: Omit<ChatMessage, "id" | "timestamp">) => void;
  setExtractedParams: (params: ExtractedParams | null) => void;
  setCalcResult: (result: CalcResponse | null) => void;
  setActiveProject: (projectId: string, elementId?: string) => void;
  resetWorkflow: () => void;
}

// ─── Context ──────────────────────────────────────────────

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

const INITIAL_STATE: WorkspaceState = {
  screen: "workspace",
  messages: [],
  extractedParams: null,
  calcResult: null,
  projectId: null,
  elementId: null,
};

export function WorkspaceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<WorkspaceState>(INITIAL_STATE);

  const goScreen = useCallback((screen: ScreenName) => {
    setState((s) => ({ ...s, screen }));
  }, []);

  const addMessage = useCallback(
    (msg: Omit<ChatMessage, "id" | "timestamp">) => {
      setState((s) => ({
        ...s,
        messages: [
          ...s.messages,
          {
            ...msg,
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            timestamp: Date.now(),
          },
        ],
      }));
    },
    []
  );

  const setExtractedParams = useCallback(
    (params: ExtractedParams | null) => {
      setState((s) => ({ ...s, extractedParams: params }));
    },
    []
  );

  const setCalcResult = useCallback((result: CalcResponse | null) => {
    setState((s) => ({ ...s, calcResult: result }));
  }, []);

  const setActiveProject = useCallback(
    (projectId: string, elementId?: string) => {
      setState((s) => ({
        ...s,
        projectId,
        elementId: elementId ?? s.elementId,
      }));
    },
    []
  );

  const resetWorkflow = useCallback(() => {
    setState((s) => ({
      ...INITIAL_STATE,
      projectId: s.projectId,
      elementId: null,
      screen: "workspace",
    }));
  }, []);

  return (
    <WorkspaceContext.Provider
      value={{
        ...state,
        goScreen,
        addMessage,
        setExtractedParams,
        setCalcResult,
        setActiveProject,
        resetWorkflow,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used inside WorkspaceProvider");
  }
  return ctx;
}
