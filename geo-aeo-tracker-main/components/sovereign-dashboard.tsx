"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { loadSovereignValue, saveSovereignValue, clearSovereignStore } from "@/lib/client/sovereign-store";
import { DEMO_STATE } from "@/lib/demo-data";
import { AeoAuditTab } from "@/components/dashboard/tabs/aeo-audit-tab";
import { AutomationTab } from "@/components/dashboard/tabs/automation-tab-v2";
import { BattlecardsTab } from "@/components/dashboard/tabs/battlecards-tab";
import { CitationOpportunitiesTab } from "@/components/dashboard/tabs/citation-opportunities-tab";
import { NicheExplorerTab } from "@/components/dashboard/tabs/niche-explorer-tab";
import { FanOutTab } from "@/components/dashboard/tabs/fan-out-tab";
import { PartnerDiscoveryTab } from "@/components/dashboard/tabs/partner-discovery-tab";
import { ProjectSettingsTab } from "@/components/dashboard/tabs/project-settings-tab";
import { PromptHubTab } from "@/components/dashboard/tabs/prompt-hub-tab";
import { ReputationSourcesTab } from "@/components/dashboard/tabs/reputation-sources-tab";
import { VisibilityAnalyticsTab } from "@/components/dashboard/tabs/visibility-analytics-tab";
import { DocumentationTab } from "@/components/dashboard/tabs/documentation-tab";
import { SROAnalysisTab } from "@/components/dashboard/tabs/sro-analysis-tab";
import { AiExecutionLogsTab } from "@/components/dashboard/tabs/ai-execution-logs-tab";

// 💡 [수정됨] 기존 AppState를 BaseAppState로 부르고, 여기서 로그 타입을 확장합니다.
import type { AppState as BaseAppState, Battlecard, DriftAlert, Provider, RunDelta, ScheduleInterval, ScrapeRun, TabKey, TaggedPrompt, Workspace } from "@/components/dashboard/types";
import { ALL_PROVIDERS, PROVIDER_LABELS, SCHEDULE_OPTIONS, tabs } from "@/components/dashboard/types";


// 💡 [추가] 탭 활성화 여부를 TRUE/FALSE로 관리하는 설정 객체
const TAB_VISIBILITY: Record<TabKey, boolean> = {
  "Project Settings": true,
  "Prompt Hub": true,
  "Persona Fan-Out": false,
  "Niche Explorer": false,
  "Automation": true,           // 스케줄링
  "Competitor Battlecards": true,
  "Responses": true,            // AI 응답 결과
  "AI Logs": true,
  "Visibility Analytics": true,
  "Citations": true,            // 인용 통계
  "Citation Opportunities": false,
  "AEO Audit": false,
  "SRO Analysis": false,
  "Documentation": false,
};



// 💡 [추가됨] 실행 로그 타입 정의
export type ExecutionLog = {
  id: string;
  timestamp: string;
  prompt: string;
  provider: string;
  status: "success" | "error";
  message?: string;
};

// 💡 [추가됨] 로그 배열이 포함된 새로운 AppState 정의 (types.ts를 건드릴 필요가 없어집니다)
export type AppState = BaseAppState & {
  logs: ExecutionLog[];
};

/* ── Inline SVG icon helpers (16×16) ─────────────────────────────── */
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      {children}
    </svg>
  );
}

const tabIcons: Record<TabKey, ReactNode> = {
  "Project Settings": (
    <Icon>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Icon>
  ),
  "Prompt Hub": (
    <Icon>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </Icon>
  ),
  "Persona Fan-Out": (
    <Icon>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Icon>
  ),
  "Niche Explorer": (
    <Icon>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </Icon>
  ),
  Automation: (
    <Icon>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </Icon>
  ),
  "Competitor Battlecards": (
    <Icon>
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </Icon>
  ),
  Responses: (
    <Icon>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <path d="M8 9h8M8 13h6" />
    </Icon>
  ),
  "AI Logs": (
    <Icon>
      <path d="M4 17l6-6-6-6" />
      <path d="M12 19h8" />
    </Icon>
  ),
  "Visibility Analytics": (
    <Icon>
      <path d="M3 3v18h18" />
      <path d="m19 9-5 5-4-4-3 3" />
    </Icon>
  ),
  Citations: (
    <Icon>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </Icon>
  ),
  "Citation Opportunities": (
    <Icon>
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6" />
      <path d="M10 22h4" />
    </Icon>
  ),
  "AEO Audit": (
    <Icon>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </Icon>
  ),
  "SRO Analysis": (
    <Icon>
      <path d="M12 20V10" />
      <path d="M18 20V4" />
      <path d="M6 20v-4" />
    </Icon>
  ),
  Documentation: (
    <Icon>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <path d="M8 7h8M8 11h6" />
    </Icon>
  ),
};

const STORAGE_KEY = "sovereign-aeo-tracker-v1";
const WORKSPACES_KEY = "sovereign-workspaces";
const ACTIVE_WS_KEY = "sovereign-active-workspace";
const THEME_KEY = "sovereign-theme";

function storageKeyForWorkspace(wsId: string) {
  return wsId === "default" ? STORAGE_KEY : `sovereign-aeo-tracker-${wsId}`;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// 💡 [수정됨] defaultState에 logs: [] 추가
const defaultState: AppState = {
  brand: {
    automationPrompts: [], // 💡 [신규] 자동화 탭에서 선택된 프롬프트 텍스트들을 저장할 배열
    brandName: "",
    brandAliases: "",
    websites: [],
    industry: "",
    scheduleTime: "09:00", // 💡 [신규] 기본 실행 기준 시각 (오전 9시)
    keywords: "",
    description: "",
  },
  provider: "chatgpt",
  activeProviders: ["chatgpt"],
  prompt:
    "What is the strongest value proposition for sovereign AI analytics tools in 2026? Include sources.",
  customPrompts: [
    { text: "{brand}의 브랜드 인지도와 브랜드 이미지, 장단점 분석해줘.", tags: [] },
    { text: "신뢰도 있는 소스에서만 추려서 {brand}를 구매/선택할 주요한 3가지 근거 알려줘.", tags: [] },
    { text: "{brand}의 시장상황을 최신 기준으로 분석하고 주요경쟁사 상황도 함께 조사해줘.", tags: [] }
  ],
  personas: "CMO\nSEO Lead\nProduct Marketing Manager\nFounder",
  fanoutPrompts: [],
  niche: "AI SEO platform for B2B SaaS",
  nicheQueries: [],
  cronExpr: "0 */6 * * *",
  githubWorkflow:
    "name: sovereign-aeo\non:\n  schedule:\n    - cron: '0 */6 * * *'\njobs:\n  track:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: npm ci && npm run test:scraper",
  competitors: [
    { name: "삼성전자", aliases: [], websites: [] },
    { name: "Perplexity.ai", aliases: [], websites: [] },
    { name: "마뗑킴", aliases: [], websites: [] },
  ],
  battlecards: [],
  runs: [],
  logs: [], // 💡 추가됨
  auditUrl: "https://example.com",
  auditReport: null,
  scheduleEnabled: false,
  scheduleIntervalMs: 21600000,
  lastScheduledRun: null,
  driftAlerts: [],
};

const tabMeta: Record<TabKey, { title: string; tooltip: string; details: string }> = {
  "Project Settings": {
    title: "프로젝트 설정",
    tooltip: "브랜드, 사이트, 키워드 및 컨텍스트를 설정합니다.",
    details:
      "추적할 정확한 브랜드와 웹사이트를 정의하세요. 이 정보는 모든 분석 과정에서 재사용되어 비즈니스에 최적화된 결과를 제공합니다.",
  },
  "Prompt Hub": {
    title: "프롬프트 허브",
    tooltip: "추적 프롬프트 라이브러리를 관리합니다.",
    details:
      "추적할 프롬프트 라이브러리를 구축하세요. {brand}를 사용하여 브랜드 이름을 삽입할 수 있습니다. 개별 프롬프트를 실행하거나 선택한 모델 전체에 일괄 실행하세요.",
  },
  "Persona Fan-Out": {
    title: "페르소나 확장",
    tooltip: "페르소나별 프롬프트 변형을 생성하고 실행합니다.",
    details:
      "하나의 핵심 질문을 작성하고, 페르소나를 정의하여 대상별 변형을 만듭니다. 각각을 독립적으로 실행하여 타겟 청중에 따라 AI 응답이 어떻게 변하는지 비교하세요.",
  },
  "Niche Explorer": {
    title: "틈새 시장 탐색",
    tooltip: "구매 의도가 높은 GEO/AEO 검색어를 생성합니다.",
    details:
      "발견성, 인용 및 구매 의도에 초점을 맞춘 재사용 가능한 틈새 프롬프트 뱅크를 구축하여 추적 범위를 넓고 촘촘하게 유지하세요.",
  },
  Automation: {
    title: "스케줄링",
    tooltip: "크론(cron)이나 워크플로우를 통한 반복 실행을 설정합니다.",
    details:
      "Vercel Cron 및 GitHub Actions용 배포 템플릿을 저장하여 추적이 지정된 주기에 맞춰 자동으로 실행되도록 합니다.",
  },
  "Competitor Battlecards": {
    title: "경쟁사 분석",
    tooltip: "경쟁사 대비 AI 모델의 감성 및 평가를 비교합니다.",
    details:
      "경쟁사 요약 및 감성 분석을 나란히 생성합니다. 내 브랜드와 함께 어떤 경쟁사가 언급되는지 확인하고 부족한 점을 파악하세요.",
  },
  Responses: {
    title: "AI 응답 결과",
    tooltip: "브랜드가 강조 표시된 AI 모델 응답을 찾아봅니다.",
    details:
      "수집된 모든 AI 응답을 확인하세요. 브랜드 및 경쟁사 언급이 문맥 내에서 강조 표시됩니다. 응답별 가시성 점수, 감성, 인용된 출처를 볼 수 있습니다.",
  },
  "AI Logs": {
    title: "AI 실행 로그",
    tooltip: "프롬프트 실행 기록과 상세 오류 내역을 확인합니다.",
    details:
      "일괄 실행 또는 개별 실행 시 발생한 모든 프롬프트의 성공/실패 여부, 시간, 그리고 에러 발생 시 그 원인(예: 404 영역 찾을 수 없음)을 상세하게 추적하고 모니터링합니다.",
  },
  "Visibility Analytics": {
    title: "가시성 분석",
    tooltip: "시간 경과에 따른 가시성 점수 및 감성 추이를 추적합니다.",
    details:
      "시간에 따른 브랜드 가시성 점수를 모니터링하고, 응답 전반의 감성 분포를 추적하며, 심층 분석을 위해 데이터를 CSV로 내보냅니다.",
  },
  Citations: {
    title: "인용 통계",
    tooltip: "도메인별로 그룹화된 인용 출처를 분석합니다.",
    details:
      "AI 응답에서 가장 많이 인용된 도메인과 URL을 확인하세요. 도메인별로 묶어 인용 허브를 찾거나, 특정 출처를 URL로 검색할 수 있습니다. CSV 내보내기도 지원합니다.",
  },
  "Citation Opportunities": {
    title: "인용 기회 발굴",
    tooltip: "경쟁사는 인용되지만 내 브랜드는 누락된 출처를 찾습니다.",
    details:
      "가치가 높은 홍보 대상을 발견하세요: AI 모델이 경쟁사는 인용하면서 내 브랜드는 언급하지 않은 URL들입니다. 각 기회에는 홍보(아웃리치) 지침이 포함되어 있습니다.",
  },
  "AEO Audit": {
    title: "AEO 사이트 진단",
    tooltip: "LLM이 사이트를 잘 발견할 수 있는지 진단합니다.",
    details:
      "llms.txt, 스키마 신호, 두괄식(BLUF) 명확성 지표 등을 검사하여 대상 URL이 AI 답변용으로 얼마나 잘 준비되어 있는지 빠르게 평가합니다.",
  },
  "SRO Analysis": {
    title: "SRO 분석",
    tooltip: "다양한 AI 플랫폼에서의 선택률 최적화(SRO)를 분석합니다.",
    details:
      "전체 SRO 파이프라인(Gemini 그라운딩, 교차 플랫폼 인용 확인, SERP 분석 등)을 실행하여 LLM 응답 내 선택률을 높이기 위한 AI 맞춤형 제안을 받습니다.",
  },
  Documentation: {
    title: "사용 설명서",
    tooltip: "트래커의 모든 기능에 대해 알아봅니다.",
    details:
      "모든 탭, 기능, 채점 방식, 지원되는 모델 및 데이터 개인정보 보호에 대한 포괄적인 가이드입니다. 검색 및 탐색이 가능합니다.",
  },
};

export function SovereignDashboard({ demoMode = false }: { demoMode?: boolean } = {}) {
  const [activeTab, setActiveTab] = useState<TabKey>("Prompt Hub");
  // 💡 타입 호환성 우회
  const [state, setState] = useState<AppState>(demoMode ? DEMO_STATE as unknown as AppState : defaultState);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(demoMode ? "Demo mode — read-only preview" : "");
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWsId, setActiveWsId] = useState<string>("default");
  const [showWsPicker, setShowWsPicker] = useState(false);
  const [showScoreInfo, setShowScoreInfo] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /** Apply theme class to <html> */
  const applyTheme = useCallback((t: "light" | "dark" | "system") => {
    const root = document.documentElement;
    if (t === "dark") {
      root.classList.add("dark");
    } else if (t === "light") {
      root.classList.remove("dark");
    } else {
      // system
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }
  }, []);

  function cycleTheme() {
    const order: ("light" | "dark" | "system")[] = ["light", "dark", "system"];
    const next = order[(order.indexOf(theme) + 1) % 3];
    setTheme(next);
    applyTheme(next);
    if (!demoMode) localStorage.setItem(THEME_KEY, next);
  }

  /** Load workspaces on mount */
  useEffect(() => {
    // Theme
    const savedTheme = localStorage.getItem(THEME_KEY) as "light" | "dark" | "system" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    }

    if (demoMode) return; // Skip workspace loading in demo mode

    // Workspaces
    try {
      const raw = localStorage.getItem(WORKSPACES_KEY);
      const parsed: Workspace[] = raw ? JSON.parse(raw) : [];
      if (parsed.length === 0) {
        // Create default workspace
        const defaultWs: Workspace = { id: "default", brandName: "Default", createdAt: new Date().toISOString() };
        parsed.push(defaultWs);
        localStorage.setItem(WORKSPACES_KEY, JSON.stringify(parsed));
      }
      setWorkspaces(parsed);
      const savedActiveId = localStorage.getItem(ACTIVE_WS_KEY) ?? parsed[0].id;
      setActiveWsId(savedActiveId);
    } catch {
      const defaultWs: Workspace = { id: "default", brandName: "Default", createdAt: new Date().toISOString() };
      setWorkspaces([defaultWs]);
      setActiveWsId("default");
    }
  }, [applyTheme]);

  /** Load app state for active workspace */
  useEffect(() => {
    if (demoMode || !activeWsId) return;
    let mounted = true;
    const key = storageKeyForWorkspace(activeWsId);
    loadSovereignValue<AppState>(key, defaultState).then((data) => {
      if (mounted) {
        // Merge saved state with defaults so new fields are never undefined
        const merged: AppState = {
          ...defaultState,
          ...data,
          brand: { ...defaultState.brand, ...(data.brand ?? {}) },
          logs: data.logs || [], // 💡 저장된 로그 복원
          provider: ALL_PROVIDERS.includes(data.provider as Provider)
            ? (data.provider as Provider)
            : defaultState.provider,
          activeProviders: Array.isArray(data.activeProviders)
            ? data.activeProviders.filter((provider): provider is Provider =>
                ALL_PROVIDERS.includes(provider as Provider),
              )
            : [],
        };
        // Migrate legacy single website → websites array
        const brandAny = data.brand as Record<string, unknown> | undefined;
        if (brandAny && typeof brandAny.website === "string" && !Array.isArray(brandAny.websites)) {
          merged.brand.websites = brandAny.website ? [brandAny.website] : [];
        }
        // Migrate legacy comma-separated competitors string → Competitor[]
        if (typeof (data as Record<string, unknown>).competitors === "string") {
          merged.competitors = (data as Record<string, unknown>).competitors
            ? ((data as Record<string, unknown>).competitors as string)
                .split(",")
                .map((c: string) => c.trim())
                .filter(Boolean)
                .map((name: string) => ({ name, aliases: [], websites: [] }))
            : [];
        }
        // Migrate legacy plain-string customPrompts → TaggedPrompt[]
        if (Array.isArray(merged.customPrompts) && merged.customPrompts.length > 0 && typeof merged.customPrompts[0] === "string") {
          merged.customPrompts = (merged.customPrompts as unknown as string[]).map((t) => ({ text: t, tags: [] }));
        }
        if (merged.activeProviders.length === 0) {
          merged.activeProviders = [merged.provider];
        }
        setState(merged);
      }
    });
    return () => {
      mounted = false;
    };
  }, [activeWsId]);

  useEffect(() => {
    if (demoMode || !activeWsId) return;
    saveSovereignValue(storageKeyForWorkspace(activeWsId), state);
    // Update workspace brandName if changed
    if (state.brand.brandName) {
      setWorkspaces((prev) => {
        const updated = prev.map((ws) =>
          ws.id === activeWsId ? { ...ws, brandName: state.brand.brandName || ws.brandName } : ws,
        );
        localStorage.setItem(WORKSPACES_KEY, JSON.stringify(updated));
        return updated;
      });
    }
  }, [state, activeWsId]);

  /** ref to the scheduler interval so we can clear/re-create it */
  const schedulerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** ref to latest state so the scheduler callback doesn't close over stale state */
  const stateRef = useRef(state);
  stateRef.current = state;
  const busyRef = useRef(busy);
  busyRef.current = busy;

  /** ref to latest callScrapeOne so the scheduler callback doesn't use stale brand terms */
  const callScrapeOneRef = useRef<(prompt: string, provider: Provider) => Promise<ScrapeRun | null>>(
    async () => null,
  );

  /** Detect drift after a batch of new runs */
  function detectDrift(newRuns: ScrapeRun[], existingRuns: ScrapeRun[]): DriftAlert[] {
    const alerts: DriftAlert[] = [];
    const DRIFT_THRESHOLD = 10; // minimum score change to trigger alert

    newRuns.forEach((newRun) => {
      // Find the most recent existing run with same prompt+provider
      const prev = existingRuns.find(
        (r) => r.prompt === newRun.prompt && r.provider === newRun.provider,
      );
      if (!prev) return;
      const delta = (newRun.visibilityScore ?? 0) - (prev.visibilityScore ?? 0);
      if (Math.abs(delta) >= DRIFT_THRESHOLD) {
        alerts.push({
          id: `drift-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          prompt: newRun.prompt,
          provider: newRun.provider,
          oldScore: prev.visibilityScore ?? 0,
          newScore: newRun.visibilityScore ?? 0,
          delta,
          createdAt: new Date().toISOString(),
          dismissed: false,
        });
      }
    });

    return alerts;
  }

  /** Run a scheduled batch and detect drift (💡 병렬 실행 및 브랜드명 자동 치환 적용) */
  /** Run a scheduled batch and detect drift */
  const runScheduledBatch = useCallback(async () => {
    const s = stateRef.current;
    if (busyRef.current) return; 

    // 💡 [수정] 자동화 선택 대지에 등록된 프롬프트가 있다면 그것만 실행하고, 비어있다면 전체를 실행합니다.
    const rawPrompts = s.customPrompts.length > 0 ? s.customPrompts.map((p) => p.text) : [s.prompt];
    const targetTemplates = s.automationPrompts && s.automationPrompts.length > 0
      ? rawPrompts.filter(t => s.automationPrompts.includes(t))
      : rawPrompts;

    const prompts = targetTemplates.map((p) =>
      p.replace(/\{brand\}/gi, s.brand.brandName || "our brand"),
    );
    
    const providers = s.activeProviders;
    if (prompts.length === 0 || providers.length === 0) return;

    setBusy(true);
    setMessage(`자동화 스케줄: ${prompts.length * providers.length}개 작업 병렬 실행 중...`);

    const jobs = prompts.flatMap((prompt) =>
      providers.map((p) => callScrapeOneRef.current(prompt, p)),
    );
    const results = await Promise.allSettled(jobs);

    const allRuns: ScrapeRun[] = [];
    for (const r of results) {
      if (r.status === "fulfilled" && r.value) allRuns.push(r.value);
    }

    const newAlerts = detectDrift(allRuns, s.runs);

    setState((prev) => ({
      ...prev,
      runs: [...allRuns, ...prev.runs].slice(0, 500),
      lastScheduledRun: new Date().toISOString(),
      driftAlerts: [...newAlerts, ...prev.driftAlerts].slice(0, 100),
    }));

    setMessage(`자동화 실행 완료: ${allRuns.length}개 수집됨.`);
    setBusy(false);
  }, []);

  /** Set up / tear down the scheduler interval */
  useEffect(() => {
    if (schedulerRef.current) {
      clearInterval(schedulerRef.current);
      schedulerRef.current = null;
    }
    if (!demoMode && state.scheduleEnabled && state.scheduleIntervalMs > 0) {
      schedulerRef.current = setInterval(runScheduledBatch, state.scheduleIntervalMs);
    }
    return () => {
      if (schedulerRef.current) {
        clearInterval(schedulerRef.current);
        schedulerRef.current = null;
      }
    };
  }, [state.scheduleEnabled, state.scheduleIntervalMs, runScheduledBatch]);

  function dismissAlert(id: string) {
    setState((prev) => ({
      ...prev,
      driftAlerts: prev.driftAlerts.map((a) =>
        a.id === id ? { ...a, dismissed: true } : a,
      ),
    }));
  }

  function dismissAllAlerts() {
    setState((prev) => ({
      ...prev,
      driftAlerts: prev.driftAlerts.map((a) => ({ ...a, dismissed: true })),
    }));
  }

  function switchWorkspace(wsId: string) {
    if (demoMode) { setMessage("Demo mode — workspaces are read-only"); return; }
    // Save current state first
    saveSovereignValue(storageKeyForWorkspace(activeWsId), state);
    setActiveWsId(wsId);
    localStorage.setItem(ACTIVE_WS_KEY, wsId);
    setShowWsPicker(false);
    setMessage(`Switched to ${workspaces.find((w) => w.id === wsId)?.brandName ?? "workspace"}`);
  }

  function createWorkspace(name: string) {
    if (demoMode) { setMessage("Demo mode — workspaces are read-only"); return; }
    const ws: Workspace = { id: generateId(), brandName: name, createdAt: new Date().toISOString() };
    const updated = [...workspaces, ws];
    setWorkspaces(updated);
    localStorage.setItem(WORKSPACES_KEY, JSON.stringify(updated));
    // Save current, switch to new
    saveSovereignValue(storageKeyForWorkspace(activeWsId), state);
    setState({ ...defaultState, brand: { ...defaultState.brand, brandName: name } });
    setActiveWsId(ws.id);
    localStorage.setItem(ACTIVE_WS_KEY, ws.id);
    setShowWsPicker(false);
    setMessage(`Created workspace: ${name}`);
  }

  function deleteWorkspace(wsId: string) {
    if (demoMode) { setMessage("Demo mode — workspaces are read-only"); return; }
    if (workspaces.length <= 1) return;
    if (!window.confirm("Delete this workspace and all its data?")) return;
    const updated = workspaces.filter((w) => w.id !== wsId);
    setWorkspaces(updated);
    localStorage.setItem(WORKSPACES_KEY, JSON.stringify(updated));
    clearSovereignStore(storageKeyForWorkspace(wsId));
    if (activeWsId === wsId) {
      switchWorkspace(updated[0].id);
    }
  }

  const partnerLeaderboard = useMemo(() => {
    // 💡 쓰레기 URL 필터링 목록
    const junkHosts = [
      "cloudfront.net", "cdn.prod.website-files.com", "cdn.jsdelivr.net",
      "cdnjs.cloudflare.com", "unpkg.com", "fastly.net", "akamaihd.net",
      "connect.facebook.net", "facebook.net", "google-analytics.com",
      "googletagmanager.com", "doubleclick.net", "w3.org", "schema.org",
      "amazonaws.com", "cloudflare.com", "hotjar.com", "sentry.io",
      "support.google.com", "policies.google.com", "policy.google.com" // 블랙리스트 추가!
    ];
    const junkExtPattern = /\.(png|jpe?g|gif|svg|webp|avif|ico|css|js|woff2?|ttf|eot|mp4|webm)(\?|$)/i;

    function isCleanUrl(url: string): boolean {
      try {
        const parsed = new URL(url);
        // 💡 www. 와 m. 을 제거하여 도메인 규격 통일
        const host = parsed.hostname.toLowerCase().replace(/^(www\.|m\.)/, "");
        if (junkHosts.some((j) => host === j || host.endsWith(`.${j}`))) return false;
        if (junkExtPattern.test(parsed.pathname)) return false;
        if (parsed.search.length > 200) return false;
        return true;
      } catch {
        return false;
      }
    }

    const map = new Map<string, { count: number; prompts: Set<string> }>();
    state.runs.forEach((run) => {
      run.sources.filter(isCleanUrl).forEach((source) => {
        const existing = map.get(source) ?? { count: 0, prompts: new Set<string>() };
        existing.count += 1;
        existing.prompts.add(run.prompt);
        map.set(source, existing);
      });
    });

    return [...map.entries()]
      .map(([url, data]) => ({ url, count: data.count, prompts: [...data.prompts] }))
      .sort((a, b) => b.count - a.count);
      // 💡 기존에 있던 .slice(0, 50) 제거: 이제 꼬리 데이터가 잘리지 않고 인용 통계 탭으로 100% 넘어갑니다!
  }, [state.runs]);

  const visibilityTrend = useMemo(() => {
    const byDay = new Map<string, { total: number; sum: number }>();

    state.runs.forEach((run) => {
      const day = run.createdAt.slice(0, 10);
      const row = byDay.get(day) ?? { total: 0, sum: 0 };
      row.total += 1;
      row.sum += run.visibilityScore ?? 0;
      byDay.set(day, row);
    });

    return [...byDay.entries()]
      .map(([day, { total, sum }]) => ({
        day,
        visibility: total > 0 ? Math.round(sum / total) : 0,
      }))
      .sort((a, b) => a.day.localeCompare(b.day));
  }, [state.runs]);

  // 💡 [수정됨] 날것의 개수가 아닌, 정제된 리더보드의 카운트를 합산하여 인용 탭과 숫자를 100% 일치시킵니다.
  const totalSources = useMemo(
    () => partnerLeaderboard.reduce((acc, item) => acc + item.count, 0),
    [partnerLeaderboard],
  );

  // 💡 [수정] 인용 기회 KPI: 탭과 100% 동일한 정제 로직을 거친 고유 '도메인 수(2개)' 기준으로 집계
  const citationOpportunities = useMemo(() => {
    const junkHosts = [
      "cloudfront.net", "cdn.prod.website-files.com", "cdn.jsdelivr.net",
      "cdnjs.cloudflare.com", "unpkg.com", "fastly.net", "akamaihd.net",
      "connect.facebook.net", "facebook.net", "google-analytics.com",
      "googletagmanager.com", "doubleclick.net", "w3.org", "schema.org",
      "amazonaws.com", "cloudflare.com", "hotjar.com", "sentry.io",
      "support.google.com", "policies.google.com", "policy.google.com"
    ];
    const junkExtPattern = /\.(png|jpe?g|gif|svg|webp|avif|ico|css|js|woff2?|ttf|eot|mp4|webm)(\?|$)/i;
    
    // 내 브랜드 사이트는 기회 대상에서 제외하기 위한 리스트
    const websiteDomains = state.brand.websites.map(w => {
      try { return new URL(w).hostname.replace(/^(www\.|m\.)/, ""); } catch { return w; }
    });

    const validDomains = new Set<string>();

    state.runs
      .filter((r) => r.sentiment === "not-mentioned" || (r.brandMentions?.length ?? 0) === 0)
      .forEach((r) => {
        r.sources.forEach((url) => {
          try {
            const parsed = new URL(url);
            const host = parsed.hostname.toLowerCase().replace(/^(www\.|m\.)/, "");
            
            // 동일한 4중 필터링 적용
            if (junkHosts.some((j) => host === j || host.endsWith(`.${j}`))) return;
            if (junkExtPattern.test(parsed.pathname)) return;
            if (parsed.search.length > 200) return;
            if (websiteDomains.includes(host)) return;

            validDomains.add(host); // 💡 URL 대신 도메인(host)을 저장하여 중복을 제거합니다.
          } catch { /* skip */ }
        });
      });
      
    return validDomains.size; // 💡 고유한 기회 도메인 수(2개) 반환
  }, [state.runs, state.brand.websites]);

  // 💡 [신규 변수] 내 브랜드가 언급된 응답에서 나온 유효 인용 횟수만 합산 (64개 동기화용)
  // 💡 [수정] 너무 긴 파라미터 URL을 걸러내는 로직이 추가되어 인용 탭과 100% 동기화됩니다.
  const brandCitationsCount = useMemo(() => {
    const junkHosts = [
      "cloudfront.net", "cdn.prod.website-files.com", "cdn.jsdelivr.net",
      "cdnjs.cloudflare.com", "unpkg.com", "fastly.net", "akamaihd.net",
      "connect.facebook.net", "facebook.net", "google-analytics.com",
      "googletagmanager.com", "doubleclick.net", "w3.org", "schema.org",
      "amazonaws.com", "cloudflare.com", "hotjar.com", "sentry.io",
      "support.google.com", "policies.google.com", "policy.google.com"
    ];
    const junkExtPattern = /\.(png|jpe?g|gif|svg|webp|avif|ico|css|js|woff2?|ttf|eot|mp4|webm)(\?|$)/i;
    
    let count = 0;
    state.runs.forEach((run) => {
      // 내 브랜드가 언급된 응답(Run)에서만 집계
      if ((run.brandMentions?.length ?? 0) > 0) {
        const cleanSources = run.sources.filter((url) => {
          try {
            const parsed = new URL(url);
            const host = parsed.hostname.toLowerCase().replace(/^(www\.|m\.)/, "");
            if (junkHosts.some((j) => host === j || host.endsWith(`.${j}`))) return false;
            if (junkExtPattern.test(parsed.pathname)) return false;
            
            // 💡 [핵심] 빠져있던 이 한 줄을 추가합니다!
            if (parsed.search.length > 200) return false; 
            
            return true;
          } catch { return false; }
        });
        count += cleanSources.length;
      }
    });
    return count;
  }, [state.runs]);

  const latestRun = state.runs[0];

  /** Compute score deltas: for each prompt+provider, compare latest run to the previous one */
  const runDeltas: RunDelta[] = useMemo(() => {
    const grouped = new Map<string, ScrapeRun[]>();
    state.runs.forEach((run) => {
      const key = `${run.prompt}|||${run.provider}`;
      const list = grouped.get(key) ?? [];
      list.push(run);
      grouped.set(key, list);
    });

    const deltas: RunDelta[] = [];
    grouped.forEach((runs) => {
      // Sort newest first
      const sorted = [...runs].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      if (sorted.length < 2) return;
      const curr = sorted[0];
      const prev = sorted[1];
      const d = (curr.visibilityScore ?? 0) - (prev.visibilityScore ?? 0);
      if (d !== 0) {
        deltas.push({
          prompt: curr.prompt,
          provider: curr.provider,
          currentScore: curr.visibilityScore ?? 0,
          previousScore: prev.visibilityScore ?? 0,
          delta: d,
          currentRun: curr,
          previousRun: prev,
        });
      }
    });

    return deltas.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  }, [state.runs]);

  /** Top movers — biggest absolute delta changes */
  const movers = useMemo(() => runDeltas.slice(0, 5), [runDeltas]);

  /** KPI delta: compare current period avg visibility vs prior period */
  const kpiVisibilityDelta = useMemo(() => {
    if (state.runs.length < 2) return null;
    const sorted = [...state.runs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const mid = Math.floor(sorted.length / 2);
    const recentHalf = sorted.slice(0, mid);
    const olderHalf = sorted.slice(mid);
    if (recentHalf.length === 0 || olderHalf.length === 0) return null;
    const recentAvg = recentHalf.reduce((a, r) => a + (r.visibilityScore ?? 0), 0) / recentHalf.length;
    const olderAvg = olderHalf.reduce((a, r) => a + (r.visibilityScore ?? 0), 0) / olderHalf.length;
    return Math.round(recentAvg - olderAvg);
  }, [state.runs]);

  /** Unread drift alerts count */
  const unreadAlertCount = useMemo(
    () => state.driftAlerts.filter((a) => !a.dismissed).length,
    [state.driftAlerts],
  );

  /** Brand context string injected into AI prompts when available */
  const brandCtx = state.brand.brandName
    ? `Context: Brand "${state.brand.brandName}"${state.brand.websites.length > 0 ? ` (${state.brand.websites.join(", ")})` : ""}${state.brand.industry ? `, industry: ${state.brand.industry}` : ""}${state.brand.keywords ? `, keywords: ${state.brand.keywords}` : ""}. `
    : "";

  /** Build list of brand names/aliases to detect */
  function getBrandTerms(): string[] {
    const terms: string[] = [];
    if (state.brand.brandName?.trim()) terms.push(state.brand.brandName.trim());
    if (state.brand.brandAliases?.trim()) {
      (state.brand.brandAliases ?? "").split(",").forEach((a) => {
        const t = a.trim();
        if (t) terms.push(t);
      });
    }
    return terms;
  }

  function getCompetitorTerms(): string[] {
    return state.competitors.flatMap((c) => [c.name, ...c.aliases]).filter(Boolean);
  }

  /** 💡 [수정됨] 텍스트 내에서 브랜드/별칭이 '실제 등장한 모든 횟수'를 카운팅 */
  function findMentions(text: string, terms: string[]): string[] {
    if (terms.length === 0) return [];
    
    // 1. 긴 단어부터 우선 매칭되도록 정렬 (중복 카운팅 방지)
    const sortedTerms = [...terms].sort((a, b) => b.length - a.length);
    const escaped = sortedTerms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    
    // 2. 텍스트 전체에서 일치하는 모든 단어 싹쓸이
    const regex = new RegExp(`(${escaped.join("|")})`, "gi");
    const matches = text.match(regex);
    
    return matches || [];
  }

  /** Detect basic sentiment toward brand in answer (Korean + English support) */
  function detectSentiment(
    answer: string,
    brandTerms: string[],
  ): "positive" | "neutral" | "negative" | "not-mentioned" {
    if (brandTerms.length === 0) return "not-mentioned";
    
    // 분석의 정확도를 높이기 위해 텍스트에서 줄바꿈과 특수문자를 최소화
    const lower = answer.toLowerCase();
    
    // 1. 브랜드가 언급되었는지 확인
    const mentioned = brandTerms.some((t) => lower.includes(t.toLowerCase()));
    if (!mentioned) return "not-mentioned";

    // 2. 긍정 키워드 사전 (영어 + 한국어)
    const positiveWords = [
      // English
      "best", "leading", "top", "excellent", "recommend", "great", "outstanding",
      "innovative", "trusted", "powerful", "superior", "preferred", "popular",
      "reliable", "impressive", "standout", "strong", "ideal",
      // Korean (형태소 변화를 고려해 어간 위주로 작성)
      "추천", "만족", "훌륭", "좋은", "좋다", "좋고", "뛰어", "다양", "특화", "인기", "필수", "신속", 
      "편리", "긍정적", "장점", "떡상", "필수템", "깔끔", "신속", "편안","꿀템", "최적화", "단 한번도", 
      "완벽", "혁신", "성공", "유용", "최고", "압도적", "인기", "감각적", "잘산템", "극대화", "강점", "수상"
    ];

    // 3. 부정 키워드 사전 (영어 + 한국어)
    const negativeWords = [
      // English
      "worst", "poor", "bad", "avoid", "lacking", "weak", "inferior",
      "disappointing", "overpriced", "limited", "outdated", "risky",
      "problematic", "concern", "drawback", "downside",
      // Korean
      "단점", "불만", "아쉽", "나쁜", "나쁘", "피하", "최악", "불편", "붕", 
      "고장", "비싸", "부담", "부족", "실망", "한계", "우려", "문제", "다만",
      "오류", "번거", "별로", "제한적", "어렵다", "어려워요", "어렵습니다"
    ];

    let posScore = 0;
    let negScore = 0;
    
    // 단순 포함 여부를 넘어, 단어가 몇 번 등장했는지 가중치를 줍니다.
    positiveWords.forEach((w) => { 
      const count = (lower.match(new RegExp(w, "g")) || []).length;
      posScore += count; 
    });
    
    negativeWords.forEach((w) => { 
      const count = (lower.match(new RegExp(w, "g")) || []).length;
      negScore += count; 
    });

    // 4. 점수 판정 (한국어는 수식어가 많으므로 임계치를 살짝 조정)
    // 긍정 단어가 부정 단어보다 확연히(2개 이상) 많으면 긍정
    if (posScore > negScore + 1) return "positive";
    // 부정 단어가 긍정 단어보다 확연히 많으면 부정
    if (negScore > posScore + 1) return "negative";
    
    // 비슷하면 중립
    return "neutral";
  }

  /** Calculate 0-100 visibility score */
  function calcVisibilityScore(
    answer: string,
    sources: string[],
    brandTerms: string[],
  ): number {
    if (brandTerms.length === 0) return 0;
    const lower = answer.toLowerCase();
    let score = 0;

    // Brand mentioned at all? +30
    const mentioned = brandTerms.some((t) => lower.includes(t.toLowerCase()));
    if (!mentioned) return 0;
    score += 30;

    // Mentioned in first 200 chars (prominent position)? +20
    const first200 = lower.slice(0, 200);
    if (brandTerms.some((t) => first200.includes(t.toLowerCase()))) score += 20;

    // Multiple mentions? +15 (💡 별칭 포함 정확한 합산)
    const sortedForScore = [...brandTerms].sort((a, b) => b.length - a.length);
    const escapedForScore = sortedForScore.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const mentionRegex = new RegExp(`(${escapedForScore.join("|")})`, "gi");
    const mentionCount = (lower.match(mentionRegex) || []).length;
    if (mentionCount >= 4) score += 15;
    else if (mentionCount >= 2) score += 8;

    // Brand website in sources? +20
    const websiteDomains = state.brand.websites
      .map((w) => w.replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase())
      .filter(Boolean);
    if (websiteDomains.length > 0 && sources.some((s) => {
      const sl = s.toLowerCase();
      return websiteDomains.some((d) => sl.includes(d));
    })) {
      score += 20;
    }

    // Positive sentiment bonus +15
    const sent = detectSentiment(answer, brandTerms);
    if (sent === "positive") score += 15;
    else if (sent === "neutral") score += 5;

    return Math.min(100, score);
  }

  /** 💡 텍스트 내부의 URL(마크다운 괄호 포함)을 완벽하게 추출하는 함수 */
  function extractUrlsFromText(text: string): string[] {
    if (!text) return [];
    // 마크다운 [text](URL) 문법 등에서 URL만 정확히 끊어내는 정규식
    const urlRegex = /https?:\/\/[^\s)\]'"><]+/g;
    const matches = text.match(urlRegex) || [];
    return Array.from(new Set(matches));
  }

  async function callScrapeOne(prompt: string, provider: Provider): Promise<ScrapeRun | null> {
    if (demoMode) { setMessage("Demo mode — API calls are disabled"); return null; }
    
    // ────────── 🤖 1. Gemini 연동 ──────────
    if (provider === "gemini") {
      try {
        const res = await fetch("/api/gemini", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        });
        const data = await res.json();
        
        // 🚨 API가 에러를 뱉었거나 텍스트가 비어있으면 강제로 에러를 발생시켜 catch 블록으로 보냅니다.
        if (!res.ok) throw new Error(data.error || "Gemini API 통신 실패");
        const answerText = data.text || "";
        if (!answerText.trim()) throw new Error("Gemini 응답 내용이 비어있습니다.");
        
        const geminiSources = data.sources && data.sources.length > 0 
          ? data.sources 
          : extractUrlsFromText(answerText);
        
        const successLog: ExecutionLog = {
          id: generateId(),
          timestamp: new Date().toLocaleString("ko-KR"),
          prompt: prompt,
          provider: "gemini",
          status: "success",
          message: "Gemini API(웹 검색 그라운딩)를 통해 실시간 답변을 생성했습니다."
        };

        setState((prev) => ({ ...prev, logs: [successLog, ...(prev.logs || [])].slice(0, 500) }));

        return {
          provider: "gemini",
          prompt: prompt,
          answer: answerText,
          sources: geminiSources,
          createdAt: new Date().toISOString(),
          visibilityScore: calcVisibilityScore(answerText, geminiSources, getBrandTerms()),
          sentiment: detectSentiment(answerText, getBrandTerms()),
          brandMentions: findMentions(answerText, getBrandTerms()),
          competitorMentions: findMentions(answerText, getCompetitorTerms()),
        };
      } catch (error) {
        // 🚨 진짜 실패했을 때만 에러 로그를 남깁니다.
        const errorLog: ExecutionLog = {
          id: generateId(),
          timestamp: new Date().toLocaleString("ko-KR"),
          prompt: prompt,
          provider: "gemini",
          status: "error",
          message: error instanceof Error ? error.message : "Gemini 알 수 없는 에러"
        };
        setState((prev) => ({ ...prev, logs: [errorLog, ...(prev.logs || [])].slice(0, 500) }));
        return null;
      }
    }

    // ────────── 🤖 2. OpenAI (ChatGPT) 연동 ──────────
    if (provider === "chatgpt") {
      try {
        const res = await fetch("/api/openai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        });
        const data = await res.json();
        
        // 🚨 에러 방어 로직
        if (!res.ok) throw new Error(data.error || "OpenAI API 통신 실패");
        const answerText = data.text || "";
        if (!answerText.trim()) throw new Error("OpenAI 응답 내용이 비어있습니다.");
        
        const openaiSources = data.sources && data.sources.length > 0 
          ? data.sources 
          : extractUrlsFromText(answerText);
        
        const successLog: ExecutionLog = {
          id: generateId(),
          timestamp: new Date().toLocaleString("ko-KR"),
          prompt: prompt,
          provider: "chatgpt",
          status: "success",
          message: "OpenAI API(웹 검색)를 통해 실시간 답변을 생성했습니다."
        };

        setState((prev) => ({ ...prev, logs: [successLog, ...(prev.logs || [])].slice(0, 500) }));

        return {
          provider: "chatgpt",
          prompt: prompt,
          answer: answerText,
          sources: openaiSources,
          createdAt: new Date().toISOString(),
          visibilityScore: calcVisibilityScore(answerText, openaiSources, getBrandTerms()),
          sentiment: detectSentiment(answerText, getBrandTerms()),
          brandMentions: findMentions(answerText, getBrandTerms()),
          competitorMentions: findMentions(answerText, getCompetitorTerms()),
        };
      } catch (error) {
        const errorLog: ExecutionLog = {
          id: generateId(),
          timestamp: new Date().toLocaleString("ko-KR"),
          prompt: prompt,
          provider: "chatgpt",
          status: "error",
          message: error instanceof Error ? error.message : "OpenAI 알 수 없는 에러"
        };
        setState((prev) => ({ ...prev, logs: [errorLog, ...(prev.logs || [])].slice(0, 500) }));
        return null;
      }
    }

    // ────────── 🌐 3. 기타 모델 (더미 API / 기존 스크래퍼) ──────────
    try {
      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, prompt, requireSources: true }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "수집 요청 실패");

      const answerText = data.answer || "";
      const sourceList = data.sources || [];
      const brandTerms = getBrandTerms();
      const competitorTerms = getCompetitorTerms();

      const successLog: ExecutionLog = {
        id: generateId(),
        timestamp: new Date().toLocaleString("ko-KR"),
        prompt: data.prompt || prompt,
        provider: data.provider || provider,
        status: "success",
        message: "더미 서버에서 성공적으로 데이터를 가져왔습니다."
      };

      setState((prev) => ({ ...prev, logs: [successLog, ...(prev.logs || [])].slice(0, 500) }));

      return {
        provider: data.provider,
        prompt: data.prompt,
        answer: answerText,
        sources: sourceList,
        createdAt: data.createdAt || new Date().toISOString(),
        visibilityScore: calcVisibilityScore(answerText, sourceList, brandTerms),
        sentiment: detectSentiment(answerText, brandTerms),
        brandMentions: findMentions(answerText, brandTerms),
        competitorMentions: findMentions(answerText, competitorTerms),
      };
    } catch (error) {
      const errorLog: ExecutionLog = {
        id: generateId(),
        timestamp: new Date().toLocaleString("ko-KR"),
        prompt: prompt,
        provider: provider,
        status: "error",
        message: error instanceof Error ? error.message : "알 수 없는 에러 발생"
      };

      setState((prev) => ({ ...prev, logs: [errorLog, ...(prev.logs || [])].slice(0, 500) }));
      return null;
    }
  }

  // Keep the ref up-to-date so the scheduler always uses latest brand/competitor terms
  callScrapeOneRef.current = callScrapeOne;

  /** Run a prompt across all activeProviders in parallel */
  async function callScrape(prompt: string) {
    const providers = state.activeProviders.length > 0
      ? state.activeProviders
      : [state.provider];
    const count = providers.length;
    setBusy(true);
    setMessage(`Running across ${count} model${count > 1 ? "s" : ""}...`);

    try {
      const results = await Promise.allSettled(
        providers.map((p) => callScrapeOne(prompt, p)),
      );

      const runs: ScrapeRun[] = results
        .map((r) => (r.status === "fulfilled" ? r.value : null))
        .filter((r): r is ScrapeRun => r !== null);

      if (runs.length === 0) {
        setMessage("모든 AI요청 실행 실패.");
        return;
      }

      setState((prev) => ({
        ...prev,
        runs: [...runs, ...prev.runs].slice(0, 500),
      }));

      const failed = count - runs.length;
      setMessage(
        `수집 완료: ${runs.length}/${count} AI ${count > 1 ? "" : ""} 결과 수집${failed > 0 ? ` ${failed} 실패` : ""}`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "스크래퍼 실행 실패");
    } finally {
      setBusy(false);
    }
  }

  /** Batch run all custom prompts across all active providers — fully parallel */
  async function batchRunAllPrompts() {
    const prompts = state.customPrompts.map((p) =>
      p.text.replace(/\{brand\}/gi, state.brand.brandName || "our brand"),
    );
    if (prompts.length === 0) {
      setMessage("No tracking prompts to run. Add prompts first.");
      return;
    }
    const providers = state.activeProviders.length > 0
      ? state.activeProviders
      : [state.provider];
    const totalJobs = prompts.length * providers.length;
    setBusy(true);
    setMessage(`${totalJobs} 프롬프트 동시 실행중...`);

    // Fire ALL prompt × provider combinations at once
    const jobs = prompts.flatMap((prompt) =>
      providers.map((p) => callScrapeOne(prompt, p)),
    );
    const results = await Promise.allSettled(jobs);

    const allRuns: ScrapeRun[] = [];
    let failed = 0;
    for (const r of results) {
      if (r.status === "fulfilled" && r.value) {
        allRuns.push(r.value);
      } else {
        failed++;
      }
    }

    setState((prev) => ({
      ...prev,
      runs: [...allRuns, ...prev.runs].slice(0, 500),
    }));

    setMessage(
      `Batch complete: ${allRuns.length} results from ${prompts.length} prompts × ${providers.length} models.${failed > 0 ? ` ${failed} failed.` : ""}`,
    );
    setBusy(false);
  }

  function generatePersonaFanout() {
    const personas = state.personas
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const fanout = personas.map(
      (persona) => `${persona}: ${state.prompt} Respond with sources and direct claims first.`,
    );

    setState((prev) => ({ ...prev, fanoutPrompts: fanout }));
  }

  function addCustomPrompt(value: string) {
    const cleaned = value.trim();
    if (!cleaned) return;
    setState((prev) => {
      if (prev.customPrompts.some((p) => p.text === cleaned)) return prev;
      return { ...prev, customPrompts: [{ text: cleaned, tags: [] }, ...prev.customPrompts].slice(0, 50) };
    });
    setMessage("Tracking prompt added.");
  }

  function removeCustomPrompt(value: string, deleteResponses?: boolean) {
    setState((prev) => ({
      ...prev,
      customPrompts: prev.customPrompts.filter((entry) => entry.text !== value),
      runs: deleteResponses
        ? prev.runs.filter((r) => r.prompt !== value && r.prompt !== value.replace(/\{brand\}/gi, prev.brand.brandName || "our brand"))
        : prev.runs,
    }));
  }

  function updatePromptTags(text: string, tags: string[]) {
    setState((prev) => ({
      ...prev,
      customPrompts: prev.customPrompts.map((p) =>
        p.text === text ? { ...p, tags } : p,
      ),
    }));
  }

  function deleteRun(index: number) {
    setState((prev) => ({
      ...prev,
      runs: prev.runs.filter((_, i) => i !== index),
    }));
  }

  function extractNicheQueries(payload: unknown) {
    const data = payload as {
      text?: unknown;
      output?: unknown;
      response?: unknown;
      content?: unknown;
    };

    const directText = [data.text, data.output, data.response, data.content].find(
      (value) => typeof value === "string" && value.trim().length > 0,
    ) as string | undefined;

    const raw = directText ?? "";
    // Strip markdown fences entirely
    const cleaned = raw.replace(/```[\w]*\n?/g, "").trim();

    // Try JSON array first
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        const parsed = JSON.parse(arrayMatch[0]) as unknown;
        if (Array.isArray(parsed)) {
          const items = parsed
            .map((item) => (typeof item === "string" ? item.trim() : ""))
            .filter((line) => line.length > 10)
            .slice(0, 20);
          if (items.length > 0) return items;
        }
      } catch {
        // fall through to line parsing
      }
    }

    // Line-by-line parsing
    const fromLines = cleaned
      .split("\n")
      .map((line) =>
        line
          .replace(/^\s*[-*•]\s+/, "")
          .replace(/^\s*\d+[.)]\s+/, "")
          .replace(/^\s*"|"\s*$/g, "")
          .replace(/^\*\*(.+?)\*\*$/, "$1")
          .replace(/^"+|"+$/g, "")
          .trim(),
      )
      .filter((line) => line.length > 10 && line.length < 300)
      .filter((line) => !/^(here\s+(are|is)|high[- ]intent|sure|certainly|below|the following)\b/i.test(line))
      .filter((line) => line.includes(" ")); // must have at least 2 words

    return fromLines.slice(0, 20);
  }

  // 💡 1. 프롬프트 허브: 선택된 프롬프트들만 그룹 병렬 실행하는 함수
  async function batchRunSelectedPrompts(selectedTexts: string[]) {
    if (selectedTexts.length === 0) {
      setMessage("선택된 프롬프트가 없습니다.");
      return;
    }
    const prompts = selectedTexts.map((t) =>
      t.replace(/\{brand\}/gi, state.brand.brandName || "our brand"),
    );
    const providers = state.activeProviders.length > 0 ? state.activeProviders : [state.provider];
    const totalJobs = prompts.length * providers.length;
    setBusy(true);
    setMessage(`${totalJobs}개 선택 프롬프트 동시 실행 중...`);

    const jobs = prompts.flatMap((prompt) => providers.map((p) => callScrapeOne(prompt, p)));
    const results = await Promise.allSettled(jobs);

    const allRuns: ScrapeRun[] = [];
    for (const r of results) {
      if (r.status === "fulfilled" && r.value) allRuns.push(r.value);
    }
    setState((prev) => {
      const newRuns = [...allRuns, ...prev.runs];
      // id를 기준으로 중복 제거
      const uniqueRuns = Array.from(new Map(newRuns.map(r => [r.id || r.createdAt, r])).values());
      return { ...prev, runs: uniqueRuns.slice(0, 500) };
    });
    setMessage(`선택 실행 완료: ${allRuns.length}개 결과 수집.`);
    setBusy(false);
  }

  // 💡 2. 프롬프트 허브: 선택된 프롬프트들을 일괄 삭제하는 함수
  function bulkDeletePrompts(textsToDelete: string[]) {
    if (textsToDelete.length === 0) return;
    setState((prev) => ({
      ...prev,
      customPrompts: prev.customPrompts.filter((p) => !textsToDelete.includes(p.text)),
      // 필요 시 관련 자동화 타겟 지정 목록에서도 함께 지워줍니다.
      automationPrompts: (prev.automationPrompts || []).filter((t) => !textsToDelete.includes(t)),
    }));
    setMessage("선택한 프롬프트가 일괄 삭제되었습니다.");
  }

  // 💡 3. AI 응답 결과: 선택된 응답(Run) 카드를 일괄 싹쓸이 삭제하는 함수
  function bulkDeleteRuns(runsToDelete: ScrapeRun[]) {
    if (runsToDelete.length === 0) return;
    setState((prev) => ({
      ...prev,
      runs: prev.runs.filter((r) => !runsToDelete.some(
        (target) => target.prompt === r.prompt && target.provider === r.provider && target.createdAt === r.createdAt
      )),
    }));
    setMessage("선택된 AI 응답 기록이 삭제되었습니다.");
  }

  // 💡 4. AI 실행 로그: 로그 배열을 깔끔하게 비워버리는 초기화 함수
  function clearAllLogs() {
    setState((prev) => ({ ...prev, logs: [] }));
    setMessage("실행 로그가 초기화되었습니다.");
  }

  async function runNicheExplorer() {
    if (demoMode) { setMessage("Demo mode — API calls are disabled"); return; }
    setBusy(true);
    setMessage("Generating niche queries...");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `${brandCtx}Generate exactly 12 high-intent search queries that a buyer or researcher would type into an AI assistant (ChatGPT, Perplexity, Gemini) when exploring this niche: "${state.niche}".

Requirements:
- Each query should be realistic and conversational
- Include source-seeking phrasing like "with sources", "according to experts", etc.
- Mix informational, comparison, and decision-stage queries
- Return ONLY a numbered list, one query per line, no explanations`,
          maxTokens: 1500,
          skipCache: true,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Niche generation failed");

      const queries = extractNicheQueries(data);

      setState((prev) => ({ ...prev, nicheQueries: queries }));
      setMessage(
        queries.length > 0
          ? "Niche queries updated."
          : "No valid niche queries returned. Try a more specific niche.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed generating queries.");
    } finally {
      setBusy(false);
    }
  }

  async function runBattlecards() {
    if (demoMode) { setMessage("Demo mode — API calls are disabled"); return; }
    setBusy(true);
    setMessage("Building competitor battlecards...");

    try {
      const competitorList = state.competitors
        .map((c) => c.name.trim())
        .filter(Boolean);

      if (competitorList.length === 0) {
        setMessage("Add at least one competitor first.");
        setBusy(false);
        return;
      }

      const exampleJson = JSON.stringify([
        {
          competitor: "example.com",
          sentiment: "positive",
          summary: "Strong brand presence with frequent citations.",
          sections: [
            { heading: "Strengths", points: ["High domain authority", "Frequent AI citations"] },
            { heading: "Weaknesses", points: ["Limited product range"] },
            { heading: "Pricing", points: ["Premium tier: $99/mo", "Free plan available"] },
            { heading: "AI Visibility", points: ["Mentioned in 8/10 tested prompts"] },
          ],
        },
      ]);

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `${brandCtx}You are an AI search visibility analyst. Analyze how AI models (ChatGPT, Perplexity, Gemini, Copilot, Google AI, Grok) likely perceive each of these competitors: ${competitorList.join(", ")}.

For EACH competitor, provide a JSON object with:
- "competitor": the name exactly as given
- "sentiment": one of "positive", "neutral", or "negative" based on likely AI recommendation tone
- "summary": 2-3 sentences overview
- "sections": an array of objects with "heading" (string) and "points" (string[]) covering:
  * "Strengths" — what the competitor does well in AI visibility
  * "Weaknesses" — gaps or disadvantages
  * "Pricing Insights" — known pricing tiers or cost perception
  * "AI Visibility" — how often/prominently they appear in AI responses
  * "Key Differentiators" — what sets them apart

Return ONLY a valid JSON array. No markdown fences. No extra text. Example format:
${exampleJson}

Now analyze all ${competitorList.length} competitors:`,
          maxTokens: Math.max(2000, Math.min(4096, 500 * competitorList.length)),
          temperature: 0.3,
          skipCache: true,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Battlecard generation failed");

      const text = String(data.text ?? "").trim();

      let parsed: Battlecard[] | null = null;

      const normalizeBattlecards = (arr: unknown): Battlecard[] => {
        if (!Array.isArray(arr)) return [];
        const mapped = arr
          .map((item) => {
            const record = (item ?? {}) as Record<string, unknown>;
            const competitor = String(record.competitor ?? "").trim();
            if (!competitor) return null;
            const sentimentRaw = String(record.sentiment ?? "neutral").toLowerCase();
            const sentiment = (["positive", "neutral", "negative"].includes(sentimentRaw)
              ? sentimentRaw
              : "neutral") as "positive" | "neutral" | "negative";
            const summary = String(record.summary ?? record.analysis ?? "No summary provided.").trim();
            // Parse structured sections
            const rawSections = Array.isArray(record.sections) ? record.sections : [];
            const sections = rawSections
              .map((s: unknown) => {
                const sec = (s ?? {}) as Record<string, unknown>;
                const heading = String(sec.heading ?? "").trim();
                const points = Array.isArray(sec.points) ? sec.points.map((p: unknown) => String(p).trim()).filter(Boolean) : [];
                return heading && points.length > 0 ? { heading, points } : null;
              })
              .filter((s): s is { heading: string; points: string[] } => s !== null);
            return { competitor, sentiment, summary, sections: sections.length > 0 ? sections : undefined } as Battlecard;
          });
        return mapped.filter((entry): entry is Battlecard => entry !== null);
      };

      const parseCandidate = (candidate: string): Battlecard[] => {
        try {
          return normalizeBattlecards(JSON.parse(candidate));
        } catch {
          return [];
        }
      };

      const direct = parseCandidate(text);
      if (direct.length > 0) {
        parsed = direct;
      }

      if (!parsed) {
        const noFence = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
        const fromNoFence = parseCandidate(noFence);
        if (fromNoFence.length > 0) parsed = fromNoFence;
      }

      if (!parsed) {
        const start = text.indexOf("[");
        if (start >= 0) {
          for (let i = text.length - 1; i > start; i -= 1) {
            if (text[i] !== "]") continue;
            const candidate = text.slice(start, i + 1);
            const maybe = parseCandidate(candidate);
            if (maybe.length > 0) {
              parsed = maybe;
              break;
            }
          }
        }
      }

      // Fallback: use raw text split by competitor names
      if (!parsed || parsed.length === 0) {
        parsed = competitorList.map((name) => {
          // Try to find a section about this competitor in the raw text
          const namePattern = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
          const idx = text.search(namePattern);
          const snippet = idx >= 0 ? text.slice(idx, idx + 300).replace(/[#*`]/g, "").trim() : "";
          return {
            competitor: name,
            sentiment: "neutral" as const,
            summary: snippet || `AI could not generate structured analysis. Raw response: ${text.slice(0, 200)}`,
          };
        });
      }

      setState((prev) => ({ ...prev, battlecards: parsed! }));
      setMessage(`Battlecards ready for ${parsed!.length} competitors.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed building battlecards.");
    } finally {
      setBusy(false);
    }
  }

  async function runAudit() {
    if (demoMode) { setMessage("Demo mode — API calls are disabled"); return; }
    setBusy(true);
    setMessage("Running AEO audit...");

    try {
      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: state.auditUrl }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Audit failed");

      setState((prev) => ({ ...prev, auditReport: data }));
      setMessage("분석 완료.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed running audit.");
    } finally {
      setBusy(false);
    }
  }

  async function handleResetData() {
    if (demoMode) { setMessage("Demo mode — data cannot be modified"); return; }
    if (!window.confirm("This will delete ALL saved data (runs, prompts, settings). Continue?")) return;
    await clearSovereignStore(storageKeyForWorkspace(activeWsId));
    setState(defaultState);
    setMessage("All data cleared.");
  }

  function renderActiveTab() {
    if (activeTab === "Project Settings") {
      return (
        <ProjectSettingsTab
          brand={state.brand}
          onBrandChange={(patch) =>
            setState((prev) => ({ ...prev, brand: { ...prev.brand, ...patch } }))
          }
          onReset={handleResetData}
        />
      );
    }

    if (activeTab === "Prompt Hub") {
      return (
        <PromptHubTab
          customPrompts={state.customPrompts}
          brandName={state.brand.brandName}
          busy={busy}
          activeProviderCount={state.activeProviders.length}
          onAddCustomPrompt={addCustomPrompt}
          onRemoveCustomPrompt={removeCustomPrompt}
          onUpdatePromptTags={updatePromptTags}
          onRunPrompt={callScrape}
          onBatchRunSelected={batchRunSelectedPrompts}
          onBulkDeletePrompts={bulkDeletePrompts}
        />
      );
    }

    if (activeTab === "Persona Fan-Out") {
      return (
        <FanOutTab
          prompt={state.prompt}
          personas={state.personas}
          fanoutPrompts={state.fanoutPrompts}
          busy={busy}
          onPromptChange={(value) => setState((prev) => ({ ...prev, prompt: value }))}
          onPersonasChange={(value) => setState((prev) => ({ ...prev, personas: value }))}
          onGenerateFanout={generatePersonaFanout}
          onRunPrompt={callScrape}
        />
      );
    }

    if (activeTab === "Niche Explorer") {
      return (
        <NicheExplorerTab
          niche={state.niche}
          nicheQueries={state.nicheQueries}
          trackedPrompts={state.customPrompts.map((p) => p.text)}
          onNicheChange={(value) => setState((prev) => ({ ...prev, niche: value }))}
          onGenerateQueries={runNicheExplorer}
          onAddToTracking={addCustomPrompt}
        />
      );
    }

    if (activeTab === "Automation") {
      return (
        <AutomationTab
          scheduleEnabled={state.scheduleEnabled}
          scheduleIntervalMs={state.scheduleIntervalMs}
          scheduleTime={state.scheduleTime || "09:00"} // 💡 시간 상태 주입
          onTimeChange={(time) => setState((prev) => ({ ...prev, scheduleTime: time }))} // 💡 시간 변경 핸들러 주입
          lastScheduledRun={state.lastScheduledRun}
          driftAlerts={state.driftAlerts}
          busy={busy}
          // 💡 자동화 대상 프롬프트 선택 기능용 Props 주입
          customPrompts={state.customPrompts}
          automationPrompts={state.automationPrompts || []}
          onUpdateAutomationPrompts={(nextPrompts) => 
            setState(prev => ({ ...prev, automationPrompts: nextPrompts }))
          }
          onToggleSchedule={(enabled) => setState((prev) => ({ ...prev, scheduleEnabled: enabled }))}
          onIntervalChange={(interval) => setState((prev) => ({ ...prev, scheduleIntervalMs: interval }))}
          onRunNow={runScheduledBatch}
          onDismissAlert={dismissAlert}
          onDismissAllAlerts={dismissAllAlerts}
        />
      );
    }

    if (activeTab === "Competitor Battlecards") {
      return (
        <BattlecardsTab
          competitors={state.competitors}
          battlecards={state.battlecards}
          onCompetitorsChange={(competitors) => setState((prev) => ({ ...prev, competitors }))}
          onBuildBattlecards={runBattlecards}
        />
      );
    }

    if (activeTab === "Responses") {
      return (
        <ReputationSourcesTab
          runs={state.runs}
          brandTerms={getBrandTerms()}
          competitorTerms={getCompetitorTerms()}
          runDeltas={runDeltas}
          onDeleteRun={deleteRun}
          onBulkDeleteRuns={bulkDeleteRuns}
        />
      );
    }

    // 💡 [수정됨] 실제 state.logs 데이터를 컴포넌트로 넘겨줍니다.
    if (activeTab === "AI Logs") {
      // 💡 여기서 clearAllLogs 함수를 onClearLogs라는 이름표를 붙여서 넘겨줍니다!
      return <AiExecutionLogsTab logs={state.logs} onClearLogs={clearAllLogs} />; 
    }

    if (activeTab === "Visibility Analytics") {
      return <VisibilityAnalyticsTab data={visibilityTrend} runs={state.runs} />;
    }

    if (activeTab === "Citations") {
      // 💡 runs={state.runs} 추가
      return <PartnerDiscoveryTab runs={state.runs} partnerLeaderboard={partnerLeaderboard} brandWebsites={state.brand.websites} />;
    }

    if (activeTab === "Citation Opportunities") {
      return <CitationOpportunitiesTab runs={state.runs} brandWebsites={state.brand.websites} />;
    }

    if (activeTab === "SRO Analysis") {
      return null; // rendered persistently below to preserve state
    }

    if (activeTab === "Documentation") {
      return <DocumentationTab />;
    }

    return (
      <AeoAuditTab
        auditUrl={state.auditUrl}
        auditReport={state.auditReport}
        onAuditUrlChange={(value) => setState((prev) => ({ ...prev, auditUrl: value }))}
        onRunAudit={runAudit}
      />
    );
  }

  const themeIcon = theme === "dark" ? "🌙" : theme === "light" ? "☀️" : "💻";

  return (
    <div className="flex h-screen overflow-hidden text-th-text">
      {/* ── Mobile sidebar backdrop ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      {/* ── Sidebar ──────────────────────────────────── */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[250px] shrink-0 flex-col border-r border-th-border bg-th-sidebar transition-transform duration-200 md:static md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Brand / Workspace switcher */}
        <div className="border-b border-th-border px-4 py-3">
          {demoMode ? (
            <div className="flex items-center gap-2 px-1 py-0.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-th-accent">
                <span className="text-xs font-bold text-th-text-inverse">
                  {(state.brand.brandName || "AE").slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-th-text">
                  {state.brand.brandName || "AEO Tracker"}
                </div>
                <div className="text-xs text-th-text-muted">Demo workspace</div>
              </div>
            </div>
          ) : (
          <>
          <button
            onClick={() => setShowWsPicker(!showWsPicker)}
            className="flex w-full items-center gap-2 rounded-lg px-1 py-0.5 text-left hover:bg-th-card-hover transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-th-accent">
              <span className="text-xs font-bold text-th-text-inverse">
                {(state.brand.brandName || "AE").slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-th-text">
                {state.brand.brandName || "AEO Tracker"}
              </div>
              {state.brand.websites.length > 0 && (
                <div className="truncate text-xs text-th-text-muted">{state.brand.websites[0].replace(/^https?:\/\//, "")}{state.brand.websites.length > 1 ? ` +${state.brand.websites.length - 1}` : ""}</div>
              )}
            </div>
            <span className="text-xs text-th-text-muted">{showWsPicker ? "▲" : "▼"}</span>
          </button>

          {/* Workspace dropdown */}
          {showWsPicker && (
            <div className="mt-2 rounded-lg border border-th-border bg-th-card p-2 shadow-lg">
              <div className="mb-2 text-xs font-medium text-th-text-muted uppercase tracking-wider">Workspaces</div>
              <div className="max-h-[200px] space-y-1 overflow-auto">
                {workspaces.map((ws) => (
                  <div key={ws.id} className="flex items-center gap-1">
                    <button
                      onClick={() => switchWorkspace(ws.id)}
                      className={`flex-1 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                        ws.id === activeWsId
                          ? "bg-th-accent-soft text-th-text-accent font-medium"
                          : "text-th-text-secondary hover:bg-th-card-hover"
                      }`}
                    >
                      {ws.brandName || "Untitled"}
                    </button>
                    {workspaces.length > 1 && (
                      <button
                        onClick={() => deleteWorkspace(ws.id)}
                        className="rounded p-1 text-xs text-th-text-muted hover:text-th-danger hover:bg-th-danger-soft"
                        title="Delete workspace"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  const name = window.prompt("Brand / workspace name:");
                  if (name?.trim()) createWorkspace(name.trim());
                }}
                className="mt-2 flex w-full items-center gap-1.5 rounded-md border border-dashed border-th-border px-2 py-1.5 text-sm text-th-text-accent hover:bg-th-accent-soft transition-colors"
              >
                <span className="text-base">+</span> New Brand
              </button>
            </div>
          )}
          </>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-2">
          {tabs.filter(tab => TAB_VISIBILITY[tab]).map((tab) => {
            const active = activeTab === tab;
            const isSettings = tab === "Project Settings"; 
            return (
              <div key={tab}>
                {isSettings && (
                  <div className="mb-1 px-2 text-xs font-medium uppercase tracking-wider text-th-text-muted">
                  
                  </div>
                )}
                <button
                  title={tabMeta[tab].tooltip}
                  onClick={() => { setActiveTab(tab); setSidebarOpen(false); }}
                  className={`group mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                    active
                      ? "bg-th-accent-soft text-th-text font-medium"
                      : "text-th-text-secondary hover:bg-th-card-hover hover:text-th-text"
                  }`}
                  style={active ? { boxShadow: "inset 6px 0 0 var(--th-accent)" } : undefined}
                >
                  <span className={active ? "text-th-text-accent" : "text-th-text-muted group-hover:text-th-text-secondary"}>
                    {tabIcons[tab]}
                  </span>
                  {tabMeta[tab].title}
                  {tab === "Automation" && unreadAlertCount > 0 && (
                    <span className="ml-auto rounded-full bg-th-danger px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                      {unreadAlertCount}
                    </span>
                  )}
                </button>
                {isSettings && (
                  <div className="mb-1 mt-2 border-t border-th-border pt-2 px-2 text-xs font-medium uppercase tracking-wider text-th-text-muted">
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      {/* ── Main content ───────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Demo banner */}
        {demoMode && (
          <div className="flex shrink-0 items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm">
            <span>🎯</span>
            <span>You&apos;re viewing a read-only demo — data is pre-loaded and API calls are disabled</span>
          </div>
        )}
        {/* Toolbar */}
        <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-th-border bg-th-card px-3 py-2 md:gap-3 md:px-5 md:py-2.5">
          {/* Hamburger for mobile */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-md border border-th-border p-1.5 text-th-text-muted hover:bg-th-card-hover md:hidden"
            aria-label="Toggle sidebar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <h1 className="mr-auto text-sm font-semibold text-th-text md:text-base">{tabMeta[activeTab].title}</h1>
          <label className="hidden text-sm text-th-text-muted sm:inline">Models</label>
          <div className="flex items-center gap-1 overflow-x-auto">
            {ALL_PROVIDERS.map((p) => {
              const active = state.activeProviders.includes(p);
              return (
                <button
                  key={p}
                  onClick={() =>
                    setState((prev) => {
                      const next = active
                        ? prev.activeProviders.filter((x) => x !== p)
                        : [...prev.activeProviders, p];
                      if (next.length === 0) return prev;
                      return { ...prev, activeProviders: next, provider: next[0] };
                    })
                  }
                  className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                    active
                      ? "bg-th-accent text-th-text-inverse"
                      : "bg-th-card-alt text-th-text-muted hover:bg-th-card-hover hover:text-th-text-secondary"
                  }`}
                  title={active ? `Deselect ${PROVIDER_LABELS[p]}` : `Select ${PROVIDER_LABELS[p]}`}
                >
                  {PROVIDER_LABELS[p]}
                </button>
              );
            })}
            <button
              onClick={() =>
                setState((prev) => ({
                  ...prev,
                  activeProviders: prev.activeProviders.length === ALL_PROVIDERS.length ? [prev.provider] : [...ALL_PROVIDERS],
                }))
              }
              className="ml-1 rounded-md border border-th-border px-2 py-1 text-xs text-th-text-muted hover:bg-th-card-hover hover:text-th-text-secondary"
              title={state.activeProviders.length === ALL_PROVIDERS.length ? "Select only one" : "Select all models"}
            >
              {state.activeProviders.length === ALL_PROVIDERS.length ? "1" : "All"}
            </button>
          </div>

          {/* Theme toggle */}
          <button
            onClick={cycleTheme}
            className="rounded-md border border-th-border px-2 py-1 text-sm hover:bg-th-card-hover transition-colors"
            title={`Theme: ${theme}`}
          >
            {themeIcon}
          </button>

          <span className={`rounded-md px-2.5 py-1 text-xs ${busy ? "animate-pulse bg-th-accent-soft text-th-text-accent" : "bg-th-card-alt text-th-text-muted"}`}>
            {message || "대기중"}
          </span>
        </header>

        {/* Scrollable body */}
        <main className="flex-1 overflow-y-auto bg-th-bg px-3 py-3 md:px-5 md:py-6">
          {/* KPI Strip */}
          <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            
            {/* 1. 평균 가시성 (가로 확장형 반원 게이지 - 2칸 차지) */}
            <GaugeCard
              label="평균 가시성"
              value={
                state.runs.length > 0
                  ? Math.round(state.runs.reduce((a, r) => a + (r.visibilityScore ?? 0), 0) / state.runs.length)
                  : 0
              }
              delta={kpiVisibilityDelta}
              onInfoClick={() => setShowScoreInfo(!showScoreInfo)}
            />

            {/* 2. 총 등록 프롬프트 개수 */}
            <KpiCard 
              label="등록된 프롬프트" 
              value={`${state.customPrompts.length}개`} 
            />

            {/* 3. 브랜드 노출 (💡 위계가 다른 nn/nn 포맷 적용) */}
            <KpiCard
              label="브랜드 노출"
              value={
                <span className="flex items-baseline font-medium">
                  <span>{state.runs.filter((r) => (r.brandMentions?.length ?? 0) > 0).length}</span>
                  <span className="text-[25px] font-medium text-th-text-muted mx-1">/</span>
                  <span className="text-[25px] font-medium text-th-text-muted">{state.runs.length}</span>
                </span>
              }
              subLabel="전체 응답 중 브랜드가 언급된 횟수"
            />

            {/* 4. 내 브랜드 인용 출처 */}
            <KpiCard 
              label="브랜드 인용 도메인" 
              value={`${brandCitationsCount}개`} 
            />

            {/* 5. 인용 기회 */}
            <KpiCard 
              label="인용 기회" 
              value={`${citationOpportunities}건`} 
            />
          </section>
          


          {/* ── Movers strip ── */}
          {movers.length > 0 && (
            <section className="mb-4 rounded-xl border border-th-border bg-th-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-base">📊</span>
                <h3 className="text-sm font-semibold text-th-text">순위 급변동</h3>
                <span className="text-xs text-th-text-muted">이전 실행 대비 가시성 점수가 가장 크게 변한 항목</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {movers.map((m, i) => {
                  const up = m.delta > 0;
                  return (
                    <div
                      key={`${m.prompt.slice(0, 20)}-${m.provider}-${i}`}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
                        up
                          ? "border-th-success/30 bg-th-success-soft"
                          : "border-th-danger/30 bg-th-danger-soft"
                      }`}
                    >
                      <span className={`text-lg font-bold ${up ? "text-th-success" : "text-th-danger"}`}>
                        {up ? "↑" : "↓"}{Math.abs(m.delta)}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-xs font-medium text-th-text" style={{ maxWidth: "180px" }}>
                          {m.prompt.length > 50 ? m.prompt.slice(0, 47) + "…" : m.prompt}
                        </div>
                        <div className="text-xs text-th-text-muted">
                          {PROVIDER_LABELS[m.provider]} · {m.previousScore}→{m.currentScore}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Scoring explanation */}
          {showScoreInfo && (
            <section className="mb-4 rounded-xl border border-th-border bg-th-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-th-text">가시성 점수 산정 방식</h3>
                <button onClick={() => setShowScoreInfo(false)} className="text-th-text-muted hover:text-th-text text-lg">✕</button>
              </div>
              <p className="text-sm text-th-text-secondary mb-3">
                가시성 점수(0~100점)는 내 브랜드가 AI 모델의 응답에서 얼마나 눈에 띄게 나타나는지를 측정합니다. 각 요소는 다음의 점수를 더해줍니다:
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <ScoreFactorCard emoji="🔍" label="브랜드 언급됨" points="+30" desc="응답에 내 브랜드 이름이나 별칭이 직접 나타남" />
                <ScoreFactorCard emoji="🏆" label="눈에 띄는 위치" points="+20" desc="브랜드가 첫 200자 이내의 상단에 노출됨" />
                <ScoreFactorCard emoji="🔁" label="반복 언급됨" points="+8 ~ +15" desc="브랜드가 2회 이상(+8점) 또는 3회 이상(+15점) 나타남" />
                <ScoreFactorCard emoji="🔗" label="웹사이트 인용됨" points="+20" desc="인용된 출처 링크에 내 웹사이트 URL이 포함됨" />
                <ScoreFactorCard emoji="👍" label="긍정적 감성" points="+15" desc="응답에서 내 브랜드에 대해 긍정적인 단어를 사용함" />
                <ScoreFactorCard emoji="😐" label="중립적 감성" points="+5" desc="비교적 중립적인 문맥에서 브랜드를 언급함" />
              </div>
            </section>
          )}

          {/* Active tab panel */}
          <section className="rounded-xl border border-th-border bg-th-card p-5 shadow-sm">{renderActiveTab()}</section>
          {/* SRO Analysis stays mounted to preserve in-flight state */}
          <div className={activeTab === "SRO Analysis" ? "" : "hidden"}>
            <section className="rounded-xl border border-th-border bg-th-card p-5 shadow-sm">
              <SROAnalysisTab />
            </section>
          </div>
          <section className="mt-3 rounded-lg border border-th-border bg-th-card px-4 py-3">
            <div className="text-xs uppercase tracking-wider font-medium text-th-text-muted">이 탭의 기능</div>
            <p className="mt-1 text-sm leading-relaxed text-th-text-secondary">{tabMeta[activeTab].details}</p>
          </section>
        </main>
      </div>
    </div>
  );
}

/* ── Score Factor Card ────────────────────────────────────────── */
function ScoreFactorCard({ emoji, label, points, desc }: { emoji: string; label: string; points: string; desc: string }) {
  return (
    <div className="rounded-lg border border-th-border bg-th-card-alt px-3 py-2.5">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">{emoji}</span>
        <span className="text-sm font-medium text-th-text">{label}</span>
        <span className="ml-auto text-sm font-semibold text-th-accent">{points}</span>
      </div>
      <p className="text-xs text-th-text-muted leading-relaxed">{desc}</p>
    </div>
  );
}

/* ── [수정] 25px 폰트 사이즈가 적용된 Compact KPI Card ─────────────────────────── */
function KpiCard({ label, value, subLabel }: { label: string; value: React.ReactNode; subLabel?: string }) {
  return (
    <div className="rounded-xl border border-th-border bg-th-card p-4 shadow-sm flex flex-col justify-between min-h-[108px]">
      <div className="py-0.5">
        <div className="text-[13px] font-medium uppercase tracking-wider text-th-text-muted">{label}</div>
        {/* 💡 텍스트 크기를 정확히 25px로 설정했습니다. */}
        <div className="mt-1.5 text-[25px] font-medium tracking-tight text-th-text leading-none">
          {value}
        </div>
      </div>
      <div className="text-[11px] text-th-text-muted font-medium min-h-[16px]">
        {subLabel || ""}
      </div>
    </div>
  );
}

/* ── 반원형(180도) 게이지 차트 KPI 카드 ─────────────────────────── */
function GaugeCard({ label, value, delta, onInfoClick }: { label: string; value: number; delta?: number | null; onInfoClick?: () => void }) {
  // 반지름과 viewBox를 조절하여 가로로 길고 완만한 반원을 그립니다.
  const radius = 65;
  const strokeWidth = 11;
  const circumference = Math.PI * radius; 
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="col-span-2 rounded-xl border border-th-border bg-th-card p-4 shadow-sm flex items-center justify-between min-h-[108px]">
      <div className="flex flex-col justify-between h-full py-0.5">
        <div>
          <div className="flex items-center gap-1">
            <div className="text-[15px] font-medium uppercase tracking-wider text-th-text-muted">{label}</div>
            {onInfoClick && (
              <button onClick={onInfoClick} className="text-th-text-muted hover:text-th-text-accent text-xs">ⓘ</button>
            )}
          </div>
          <div className="mt-1.5 flex items-baseline gap-2 text-th-text">
            <span className="text-4xl font-bold tracking-tight text-th-text">{value}%</span>
            {delta != null && delta !== 0 && (
              <span className={`text-md font-bold flex items-center ${delta > 0 ? "text-th-success" : "text-th-danger"}`}>
                {delta > 0 ? "↑" : "↓"}{Math.abs(delta)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 💡 가로 비율을 w-40으로 늘려 크기를 훨씬 키운 반원 영역 */}
      <div className="relative flex items-end justify-center w-60 h-16 overflow-hidden">
        <svg className="absolute w-50 h-32 top-0" viewBox="0 0 140 140">
          {/* 배경 트랙 */}
          <circle
            cx="70" cy="70" r={radius}
            fill="none"
            stroke="var(--th-border-subtle)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={0}
            transform="rotate(180 70 70)"
            strokeLinecap="round"
          />
          {/* 채워지는 트랙 */}
          <circle
            cx="70" cy="70" r={radius}
            fill="none"
            stroke="var(--th-accent)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            style={{ strokeDashoffset, transition: "stroke-dashoffset 0.8s ease-in-out" }}
            transform="rotate(180 70 70)"
            strokeLinecap="round"
          />
        </svg>
        {/* 반원 중앙에 위치하는 정밀 스코어 */}
        <span className="absolute bottom-0 text-xl font-bold text-th-text tracking-tight mb-0.5">{value}</span>
      </div>
    </div>
  );
}