"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import type {
  ScreenName,
  CalcResponse,
  ExtractedParams,
} from "@/types/calc";
import type { ProjectInfo } from "@/lib/calc-storage";

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
  /** Project info for the currently displayed report */
  reportProjectInfo: ProjectInfo | null;
  /** Unique reference ID for the currently designed element */
  designElementId: string | null;
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
  setActiveProject: (projectId: string | null, elementId?: string) => void;
  setReportProjectInfo: (info: ProjectInfo | null) => void;
  setDesignElementId: (id: string | null) => void;
  resetWorkflow: () => void;
  clearChat: () => void;
  popMessage: () => void;
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
  reportProjectInfo: null,
  designElementId: null,
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
    (projectId: string | null, elementId?: string) => {
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

  const setReportProjectInfo = useCallback((info: ProjectInfo | null) => {
    setState((s) => ({ ...s, reportProjectInfo: info }));
  }, []);

  const setDesignElementId = useCallback((id: string | null) => {
    setState((s) => ({ ...s, designElementId: id }));
  }, []);

  const clearChat = useCallback(() => {
    setState((s) => ({ ...s, messages: [], extractedParams: null, calcResult: null, reportProjectInfo: null, designElementId: null }));
  }, []);

  const popMessage = useCallback(() => {
    setState((s) => ({ ...s, messages: s.messages.slice(0, -1) }));
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
        setReportProjectInfo,
        setDesignElementId,
        resetWorkflow,
        clearChat,
        popMessage,
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
