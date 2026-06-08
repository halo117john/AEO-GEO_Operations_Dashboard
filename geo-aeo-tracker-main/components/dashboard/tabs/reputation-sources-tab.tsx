"use client";

import { useMemo, useState } from "react";
import type { ScrapeRun, RunDelta, Provider } from "@/components/dashboard/types";
import { ALL_PROVIDERS, PROVIDER_LABELS } from "@/components/dashboard/types";
import { Trash2, CheckSquare, Square, MinusSquare } from "lucide-react";

type ReputationSourcesTabProps = {
  runs: ScrapeRun[];
  brandTerms: string[];
  competitorTerms: string[];
  runDeltas?: RunDelta[];
  onDeleteRun?: (index: number) => void;
  onBulkDeleteRuns: (runs: ScrapeRun[]) => void;
};

// 💡 텍스트 내에서 브랜드/별칭이 '실제 등장한 모든 횟수' 카운팅
function countMentions(text: string, terms: string[]): number {
  if (!text || !terms || terms.length === 0) return 0;
  const sorted = [...terms].sort((a, b) => b.length - a.length);
  const escaped = sorted.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`(${escaped.join("|")})`, "gi");
  return (text.match(regex) || []).length;
}

function normalizeAnswerForDisplay(answer: string): string {
  let text = answer;
  if (/^\s*[{\[]/.test(text)) {
    try {
      const parsed = JSON.parse(text);
      const extract = (obj: unknown): string => {
        if (typeof obj === "string") return obj;
        if (Array.isArray(obj)) return obj.map(extract).filter(Boolean).join("\n\n");
        if (obj && typeof obj === "object") {
          const rec = obj as Record<string, unknown>;
          for (const key of ["answer", "response", "output", "text", "content", "message", "body"]) {
            if (typeof rec[key] === "string" && (rec[key] as string).trim()) return (rec[key] as string).trim();
          }
          return Object.values(rec).map(extract).filter(Boolean).join("\n\n");
        }
        return String(obj ?? "");
      };
      const extracted = extract(parsed);
      if (extracted.trim().length > 20) text = extracted;
    } catch {
      text = text.replace(/[{}\[\]"]/g, " ").replace(/\\n/g, "\n").replace(/\\t/g, " ");
    }
  }

  return text
    .replace(/\r\n?/g, "\n")
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```/g, ""))
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function HighlightedText({ text, brandTerms, competitorTerms }: { text: string; brandTerms: string[]; competitorTerms: string[]; }) {
  if (brandTerms.length === 0 && competitorTerms.length === 0) return <span>{text}</span>;

  const allTerms = [
    ...brandTerms.map((t) => ({ term: t, type: "brand" as const })),
    ...competitorTerms.map((t) => ({ term: t, type: "competitor" as const })),
  ].sort((a, b) => b.term.length - a.term.length);

  const escaped = allTerms.map((t) => ({ ...t, pattern: t.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") }));
  const regex = new RegExp(`(${escaped.map((t) => t.pattern).join("|")})`, "gi");
  const parts = text.split(regex);

  return (
    <span>
      {parts.map((part, i) => {
        const match = allTerms.find((t) => t.term.toLowerCase() === part.toLowerCase());
        if (match) {
          return (
            <mark
              key={i}
              className={match.type === "brand" ? "rounded-sm bg-th-brand-bg px-0.5 font-medium text-th-brand-text" : "rounded-sm bg-th-competitor-bg px-0.5 font-medium text-th-competitor-text"}
              title={match.type === "brand" ? "내 브랜드" : "경쟁사"}
            >
              {part}
            </mark>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

function SentimentBadge({ sentiment }: { sentiment: string }) {
  const colors: Record<string, string> = {
    positive: "bg-th-success-soft text-th-success border-th-success/30",
    neutral: "bg-th-accent-soft text-th-text-accent border-th-accent/30",
    negative: "bg-th-danger-soft text-th-danger border-th-danger/30",
    "not-mentioned": "bg-th-card-alt text-th-text-muted border-th-border",
  };
  const labels: Record<string, string> = {
    positive: "긍정적",
    neutral: "중립적",
    negative: "부정적",
    "not-mentioned": "언급 안 됨",
  };
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium uppercase ${colors[sentiment] ?? colors["neutral"]}`}>
      {labels[sentiment] ?? "중립적"}
    </span>
  );
}

const PROVIDER_COLORS: Record<Provider, string> = {
  chatgpt: "#fad726",
  gemini: "#4285f4",
  google_ai: "#ea4335",
  naver_ai: "#03C75A",
};

function ProviderBadge({ provider }: { provider: Provider }) {
  const bg = PROVIDER_COLORS[provider] ?? "#4285f4";
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: bg + "22", color: bg, border: `1px solid ${bg}44` }}
    >
      {PROVIDER_LABELS[provider] ?? provider}
    </span>
  );
}

function ModelResponseCard({
  run,
  brandTerms,
  competitorTerms,
  delta,
  showPrompt = false,
  onDelete,
}: {
  run: ScrapeRun;
  brandTerms: string[];
  competitorTerms: string[];
  delta?: number | null;
  showPrompt?: boolean;
  onDelete?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const rawDisplay = normalizeAnswerForDisplay(run.answer ?? "");
  const isGarbage = !rawDisplay || rawDisplay.toLowerCase().trim() === (run.prompt || "").toLowerCase().trim() || /^https?:\/\/\S+$/i.test(rawDisplay.trim());
  const display = isGarbage ? "" : rawDisplay;
  const preview = display.length > 300 ? display.slice(0, 300) + "…" : display;
  const uniqueSources = [...new Set(run.sources)];

  const actualBrandCount = countMentions(run.answer || "", brandTerms);
  const actualCompetitorCount = countMentions(run.answer || "", competitorTerms);

  return (
    <div className="group relative rounded-lg border border-th-border bg-th-card">
      <button onClick={() => setExpanded(!expanded)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-th-card-hover">
        {showPrompt ? (
          <div className="flex flex-col flex-1 min-w-0 gap-1">
            <span className="text-[13px] font-bold text-th-text truncate max-w-lg" title={run.prompt}>
              Q. {run.prompt}
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-th-text-muted">
                점수: <span className="font-semibold text-th-text">{run.visibilityScore}</span>/100
              </span>
              {delta != null && delta !== 0 && (
                <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-bold ${delta > 0 ? "bg-th-success-soft text-th-success" : "bg-th-danger-soft text-th-danger"}`}>
                  {delta > 0 ? "↑" : "↓"}{Math.abs(delta)}
                </span>
              )}
              <SentimentBadge sentiment={run.sentiment ?? "neutral"} />
              
              {actualBrandCount > 0 && (
                <span className="text-xs text-th-brand-text">
                  내 브랜드 언급 {actualBrandCount}회
                </span>
              )}
              {actualCompetitorCount > 0 && (
                <span className="text-xs text-th-text-muted">
                  경쟁사 언급 {actualCompetitorCount}회
                </span>
              )}

              {uniqueSources.length > 0 && (
                <span className="text-xs text-th-text-muted">
                  출처 {uniqueSources.length}개
                </span>
              )}
            </div>
          </div>
        ) : (
          <>
            <ProviderBadge provider={run.provider} />
            <div className="flex flex-1 items-center gap-3">
              <span className="text-xs text-th-text-muted">
                점수: <span className="font-semibold text-th-text">{run.visibilityScore}</span>/100
              </span>
              {delta != null && delta !== 0 && (
                <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-bold ${delta > 0 ? "bg-th-success-soft text-th-success" : "bg-th-danger-soft text-th-danger"}`}>
                  {delta > 0 ? "↑" : "↓"}{Math.abs(delta)}
                </span>
              )}
              <SentimentBadge sentiment={run.sentiment ?? "neutral"} />
              
              {actualBrandCount > 0 && (
                <span className="text-xs text-th-brand-text">
                  내 브랜드 언급 {actualBrandCount}회
                </span>
              )}
              {actualCompetitorCount > 0 && (
                <span className="text-xs text-th-text-muted">
                  경쟁사 언급 {actualCompetitorCount}회
                </span>
              )}

              {uniqueSources.length > 0 && (
                <span className="text-xs text-th-text-muted">
                  출처 {uniqueSources.length}개
                </span>
              )}
            </div>
          </>
        )}

        <div className="flex items-center gap-3">
          <span className="text-xs text-th-text-muted">{run.createdAt.slice(0, 10)}</span>
          {onDelete && (
            <div
              onClick={(e) => { e.stopPropagation(); if (window.confirm("삭제하시겠습니까?")) onDelete(); }}
              className="rounded p-1 text-th-text-muted opacity-0 transition-opacity hover:bg-th-danger-soft hover:text-th-danger group-hover:opacity-100 hover:cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
            </div>
          )}
          <span className="text-xs text-th-text-muted w-4 text-center">{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {!expanded && (
        <div className="border-t border-th-border/40 px-4 py-2.5 text-sm leading-relaxed text-th-text-secondary">
          {preview ? <HighlightedText text={preview} brandTerms={brandTerms} competitorTerms={competitorTerms} /> : <span className="italic text-th-text-muted">응답 텍스트가 없습니다.</span>}
        </div>
      )}

      {expanded && (
        <div className="space-y-3 border-t border-th-border px-4 py-3">
          <div className="max-h-[400px] overflow-auto whitespace-pre-wrap break-words pr-1 text-sm leading-7 text-th-text">
            {display ? <HighlightedText text={display} brandTerms={brandTerms} competitorTerms={competitorTerms} /> : <span className="italic text-th-text-muted">응답 텍스트가 없습니다.</span>}
          </div>
          {uniqueSources.length > 0 && (
            <div>
              <div className="mb-1.5 text-xs font-medium uppercase tracking-wider text-th-text-muted">인용된 출처</div>
              <div className="flex flex-wrap gap-1.5">
                {uniqueSources.map((source, i) => {
                  const safeUrl = typeof source === 'string' ? source : (source as any)?.url || "";
                  if (!safeUrl) return null; 
                  return <a key={`${safeUrl}-${i}`} href={safeUrl} target="_blank" className="rounded bg-th-card-alt px-2 py-1 text-xs text-th-text-accent hover:underline">{safeUrl.length > 50 ? safeUrl.slice(0, 47) + "..." : safeUrl}</a>;
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ReputationSourcesTab({
  runs,
  brandTerms,
  competitorTerms,
  runDeltas = [],
  onDeleteRun,
  onBulkDeleteRuns,
}: ReputationSourcesTabProps) {
  const [selectedRuns, setSelectedRuns] = useState<ScrapeRun[]>([]);
  // 💡 선택된 데이터를 CSV로 변환하여 다운로드하는 함수
  const exportSelectedToCsv = () => {
    if (selectedRuns.length === 0) {
      alert("출력할 응답 결과를 먼저 선택해주세요.");
      return;
    }

    // 1. 엑셀에서 한글이 깨지지 않도록 BOM(\uFEFF) 추가
    const BOM = "\uFEFF";
    
    // 2. CSV 헤더 정의
    const headers = [
      "프롬프트", 
      "AI 모델", 
      "가시성 점수", 
      "감성", 
      "내 브랜드 언급", 
      "경쟁사 언급", 
      "응답 내용", 
      "출처 URL", 
      "수집 시간"
    ];

    // 3. 데이터 매핑 (쉼표나 줄바꿈이 CSV 구조를 깨지 않도록 따옴표로 감싸줍니다)
    const rows = selectedRuns.map(r => {
      const escape = (text: string | number | undefined) => 
        `"${String(text || "").replace(/"/g, '""').replace(/\n/g, ' ')}"`;

      return [
        escape(r.prompt),
        escape(r.provider),
        escape(r.visibilityScore),
        escape(r.sentiment),
        escape(r.brandMentions?.join(", ")),
        escape(r.competitorMentions?.join(", ")),
        escape(r.answer),
        escape(r.sources?.join(", ")),
        escape(new Date(r.createdAt).toLocaleString("ko-KR"))
      ].join(",");
    });

    // 4. 최종 CSV 문자열 조합 및 다운로드 트리거
    const csvContent = BOM + headers.join(",") + "\n" + rows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = `ai_responses_export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // 💡 [신규] 뷰 모드 상태 추가
  const [viewMode, setViewMode] = useState<"prompt" | "model">("prompt");

  // 💡 [신규] 뷰 모드 전환 시 아코디언 열림 상태 초기화
  const handleToggleViewMode = (mode: "prompt" | "model") => {
    setViewMode(mode);
    setExpandedGroups({});
  };

  const promptGroups = useMemo(() => {
    const m = new Map<string, ScrapeRun[]>();
    runs.forEach((run) => {
      const key = run.prompt;
      const group = m.get(key) ?? [];
      group.push(run);
      m.set(key, group);
    });
    return [...m.entries()].map(([prompt, groupRuns]) => ({
      prompt,
      runs: groupRuns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    }));
  }, [runs]);

  const providerGroups = useMemo(() => {
    const m = new Map<Provider, ScrapeRun[]>();
    runs.forEach((run) => {
      const key = run.provider;
      const group = m.get(key) ?? [];
      group.push(run);
      m.set(key, group);
    });
    return [...m.entries()].map(([provider, groupRuns]) => ({
      provider,
      runs: groupRuns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    }));
  }, [runs]);

  const isAllSelected = runs.length > 0 && selectedRuns.length === runs.length;
  
  const handleToggleAllMaster = () => {
    if (isAllSelected) {
      setSelectedRuns([]);
    } else {
      setSelectedRuns([...runs]);
    }
  };

  const handleToggleGroup = (groupRuns: ScrapeRun[]) => {
    const allInGroupSelected = groupRuns.every((r) => selectedRuns.includes(r));
    if (allInGroupSelected) {
      setSelectedRuns((prev) => prev.filter((r) => !groupRuns.includes(r)));
    } else {
      setSelectedRuns((prev) => {
        const filtered = prev.filter((r) => !groupRuns.includes(r));
        return [...filtered, ...groupRuns];
      });
    }
  };

  const handleToggleSingleRun = (run: ScrapeRun) => {
    setSelectedRuns((prev) =>
      prev.includes(run) ? prev.filter((r) => r !== run) : [...prev, run]
    );
  };

  if (runs.length === 0) return <div className="text-center p-8 text-th-text-muted">응답이 없습니다.</div>;

  return (
    <div className="space-y-4">
      {/* 💡 상단 계층형 일괄 제어 툴바 */}
      <div className="flex items-center justify-between rounded-lg border border-th-border bg-th-card px-4 py-2.5 text-sm">
        <div className="flex items-center gap-2">
          <button onClick={handleToggleAllMaster} className="text-th-text-muted hover:text-th-text">
            {isAllSelected ? <CheckSquare className="h-5 w-5 text-th-accent" /> : <Square className="h-5 w-5" />}
          </button>
          <span className="font-medium text-th-text-secondary">
            전체 결과 선택 ({selectedRuns.length} / {runs.length}개 응답카드)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* 💡 [신규] 뷰 옵션 토글 */}
          <div className="flex rounded-md border border-th-border text-xs mr-2">
            <button
              onClick={() => handleToggleViewMode("prompt")}
              className={`px-2.5 py-1.5 rounded-l-md transition-colors ${
                viewMode === "prompt"
                  ? "bg-th-accent-soft text-th-text font-medium"
                  : "text-th-text-muted hover:text-th-text-secondary"
              }`}
            >
              프롬프트 뷰
            </button>
            <button
              onClick={() => handleToggleViewMode("model")}
              className={`px-2.5 py-1.5 rounded-r-md transition-colors ${
                viewMode === "model"
                  ? "bg-th-accent-soft text-th-text font-medium"
                  : "text-th-text-muted hover:text-th-text-secondary"
              }`}
            >
              모델 뷰
            </button>
          </div>

          <button
            onClick={() => {
              if (window.confirm(`선택한 ${selectedRuns.length}개의 수집 결과를 영구 삭제하시겠습니까?`)) {
                onBulkDeleteRuns(selectedRuns);
                setSelectedRuns([]);
              }
            }}
            disabled={selectedRuns.length === 0}
            className="flex items-center gap-1.5 rounded-lg bg-th-danger-soft px-3 py-1.5 text-xs font-bold text-th-danger hover:bg-th-danger/20 disabled:opacity-50 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" /> 선택된 응답 일괄 삭제
          </button>

          {/* 💡 [신규] CSV 내보내기 버튼 */}
          <button
            onClick={exportSelectedToCsv}
            disabled={selectedRuns.length === 0}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              selectedRuns.length > 0
                ? "bg-th-accent text-th-text-inverse hover:bg-th-accent-strong"
                : "bg-th-card-alt text-th-text-muted cursor-not-allowed opacity-50"
            }`}
          >
            <span className="text-base">📥</span>
            선택 항목 CSV 내보내기
          </button>
        </div>
      </div>

      {/* 그룹별 렌더링 층위 */}
      <div className="space-y-3">
        {viewMode === "prompt"
          ? promptGroups.map(({ prompt, runs: groupRuns }, groupIdx) => {
              const open = expandedGroups[prompt] ?? groupIdx === 0;
              const isGroupAllSelected = groupRuns.every((r) => selectedRuns.includes(r));
              const isGroupPartSelected = groupRuns.some((r) => selectedRuns.includes(r)) && !isGroupAllSelected;

              return (
                <div key={`prompt-group-${prompt}`} className="rounded-xl border border-th-border bg-th-card-alt overflow-hidden">
                  {/* 프롬프트 부모 헤더 층위 */}
                  <div className="flex items-center gap-3 bg-th-card-hover/40 px-4 py-2.5 border-b border-th-border/50">
                    <button onClick={() => handleToggleGroup(groupRuns)} className="text-th-text-muted hover:text-th-text">
                      {isGroupAllSelected ? (
                        <CheckSquare className="h-4 w-4 text-th-accent" />
                      ) : isGroupPartSelected ? (
                        <MinusSquare className="h-4 w-4 text-th-accent-muted" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => setExpandedGroups((prev) => ({ ...prev, [prompt]: !open }))}
                      className="flex-1 text-left text-sm font-semibold text-th-text truncate"
                    >
                      <span className="text-xs text-th-text-muted mr-1">{open ? "▼" : "▶"}</span> {prompt}
                    </button>
                    <span className="text-xs font-medium text-th-text-muted shrink-0 bg-th-card border border-th-border px-2 py-0.5 rounded-full">
                      응답 {groupRuns.length}개
                    </span>
                  </div>

                  {/* 하위 모델 리스트 층위 */}
                  {open && (
                    <div className="p-3 space-y-2 bg-th-card">
                      {groupRuns.map((run, i) => {
                        const isRunSelected = selectedRuns.includes(run);
                        return (
                          <div key={(run as any).id || `run-prompt-${groupIdx}-${i}`} className="flex items-start gap-3">
                            <button onClick={() => handleToggleSingleRun(run)} className="mt-4 text-th-text-muted hover:text-th-text shrink-0">
                              {isRunSelected ? <CheckSquare className="h-5 w-5 text-th-accent" /> : <Square className="h-5 w-5" />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <ModelResponseCard run={run} brandTerms={brandTerms} competitorTerms={competitorTerms} delta={null} onDelete={() => onDeleteRun?.(runs.indexOf(run))} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          : providerGroups.map(({ provider, runs: groupRuns }, groupIdx) => {
              const open = expandedGroups[provider] ?? groupIdx === 0;
              const isGroupAllSelected = groupRuns.every((r) => selectedRuns.includes(r));
              const isGroupPartSelected = groupRuns.some((r) => selectedRuns.includes(r)) && !isGroupAllSelected;
              const providerLabel = PROVIDER_LABELS[provider] ?? provider;

              return (
                <div key={`provider-group-${provider}`} className="rounded-xl border border-th-border bg-th-card-alt overflow-hidden">
                  {/* 모델 부모 헤더 층위 */}
                  <div className="flex items-center gap-3 bg-th-card-hover/40 px-4 py-2.5 border-b border-th-border/50">
                    <button onClick={() => handleToggleGroup(groupRuns)} className="text-th-text-muted hover:text-th-text">
                      {isGroupAllSelected ? (
                        <CheckSquare className="h-4 w-4 text-th-accent" />
                      ) : isGroupPartSelected ? (
                        <MinusSquare className="h-4 w-4 text-th-accent-muted" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => setExpandedGroups((prev) => ({ ...prev, [provider]: !open }))}
                      className="flex-1 text-left text-sm font-semibold text-th-text truncate"
                    >
                      <span className="text-xs text-th-text-muted mr-1">{open ? "▼" : "▶"}</span> {providerLabel}
                    </button>
                    <span className="text-xs font-medium text-th-text-muted shrink-0 bg-th-card border border-th-border px-2 py-0.5 rounded-full">
                      응답 {groupRuns.length}개
                    </span>
                  </div>

                  {/* 하위 모델 리스트 층위 */}
                  {open && (
                    <div className="p-3 space-y-2 bg-th-card">
                      {groupRuns.map((run, i) => {
                        const isRunSelected = selectedRuns.includes(run);
                        return (
                          <div key={(run as any).id || `run-provider-${groupIdx}-${i}`} className="flex items-start gap-3">
                            <button onClick={() => handleToggleSingleRun(run)} className="mt-4 text-th-text-muted hover:text-th-text shrink-0">
                              {isRunSelected ? <CheckSquare className="h-5 w-5 text-th-accent" /> : <Square className="h-5 w-5" />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <ModelResponseCard
                                run={run}
                                brandTerms={brandTerms}
                                competitorTerms={competitorTerms}
                                delta={null}
                                showPrompt={true}
                                onDelete={() => onDeleteRun?.(runs.indexOf(run))}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
      </div>
    </div>
  );
}