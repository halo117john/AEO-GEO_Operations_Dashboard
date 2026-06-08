"use client";

import { useState, useCallback } from "react";
import type {
  GroundingResult,
  PlatformResult,
  SerpResult,
  ScrapedPage,
  SiteContext,
  LLMAnalysisResult,
  LLMRecommendation,
} from "@/lib/server/sro-types";

type AnalysisStage =
  | "idle"
  | "grounding"
  | "platforms"
  | "serp"
  | "scraping"
  | "context"
  | "analyzing"
  | "done"
  | "error";

interface SROState {
  targetUrl: string;
  keyword: string;
  stage: AnalysisStage;
  error: string | null;
  grounding: GroundingResult | null;
  platforms: PlatformResult[];
  serp: SerpResult | null;
  targetPage: ScrapedPage | null;
  competitorPages: ScrapedPage[];
  siteContext: SiteContext | null;
  llmAnalysis: LLMAnalysisResult | null;
}

const INITIAL: SROState = {
  targetUrl: "",
  keyword: "",
  stage: "idle",
  error: null,
  grounding: null,
  platforms: [],
  serp: null,
  targetPage: null,
  competitorPages: [],
  siteContext: null,
  llmAnalysis: null,
};

// 단계별 한글 레이블
const STAGE_LABELS: Record<AnalysisStage, string> = {
  idle: "준비됨",
  grounding: "Gemini 그라운딩 분석 중…",
  platforms: "AI 플랫폼 인용 확인 중…",
  serp: "검색 결과(SERP) 데이터 수집 중…",
  scraping: "페이지 스크래핑 중…",
  context: "사이트 컨텍스트 분석 중…",
  analyzing: "최종 SRO 분석 실행 중…",
  done: "분석 완료",
  error: "오류 발생",
};

// ── 보조 컴포넌트 (Helper components) ─────────────────────────────────────

function ScoreRing({ score, size = 100 }: { score: number; size?: number }) {
  const r = size * 0.36;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const color =
    score >= 70 ? "var(--th-success)" : score >= 40 ? "var(--th-warning)" : "var(--th-danger)";
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--th-score-ring-bg)" strokeWidth="7" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <span className="absolute text-xl font-bold" style={{ color }}>
        {score}
      </span>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: LLMRecommendation["priority"] }) {
  const colors: Record<string, string> = {
    high: "bg-red-500/15 text-red-400 border-red-500/30",
    medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    low: "bg-green-500/15 text-green-400 border-green-500/30",
  };
  
  const labels: Record<string, string> = {
    high: "높음",
    medium: "중간",
    low: "낮음",
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${colors[priority]}`}>
      {labels[priority] ?? priority}
    </span>
  );
}

function CategoryBadge({ category }: { category: LLMRecommendation["category"] }) {
  const icons: Record<string, string> = {
    content: "📝",
    structure: "🏗️",
    technical: "⚙️",
    strategy: "🎯",
  };

  const labels: Record<string, string> = {
    content: "콘텐츠",
    structure: "구조",
    technical: "기술",
    strategy: "전략",
  };

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-th-border bg-th-card-alt px-2 py-0.5 text-xs text-th-text-secondary">
      {icons[category] || "📋"} {labels[category] ?? category}
    </span>
  );
}

function ProgressBar({ stage }: { stage: AnalysisStage }) {
  const stages: AnalysisStage[] = ["grounding", "platforms", "serp", "scraping", "context", "analyzing", "done"];
  const currentIdx = stages.indexOf(stage);
  const pct = stage === "done" ? 100 : stage === "idle" ? 0 : Math.max(5, Math.round(((currentIdx + 0.5) / stages.length) * 100));

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-th-text-muted">
        <span>{STAGE_LABELS[stage]}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-th-card-alt">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            backgroundColor: stage === "error" ? "var(--th-danger)" : "var(--th-accent)",
          }}
        />
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 (Main Component) ────────────────────────────────────────

export function SROAnalysisTab() {
  const [s, setS] = useState<SROState>(INITIAL);

  const isRunning = !["idle", "done", "error"].includes(s.stage);

  const runFullAnalysis = useCallback(async () => {
    if (!s.targetUrl || !s.keyword) return;

    setS((prev) => ({ ...INITIAL, targetUrl: prev.targetUrl, keyword: prev.keyword, stage: "grounding" }));

    let grounding: GroundingResult | null = null;
    let platforms: PlatformResult[] = [];
    let serp: SerpResult | null = null;
    let targetPage: ScrapedPage | null = null;
    let competitorPages: ScrapedPage[] = [];
    let siteContext: SiteContext | null = null;
    let llmAnalysis: LLMAnalysisResult | null = null;

    try {
      // 1. Gemini 그라운딩 (서버 사이드에서 최종 처리됨)
      try {
        const resp = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: `Analyze the Gemini grounding for "${s.keyword}" targeting ${s.targetUrl}.`,
            maxTokens: 256,
          }),
        });
        void resp;
      } catch { /* 선택적 단계 */ }
      setS((prev) => ({ ...prev, grounding, stage: "platforms" }));

      // 2. 플랫폼 인용 확인
      try {
        const resp = await fetch("/api/brightdata-platforms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keyword: s.keyword, targetUrl: s.targetUrl }),
        });
        if (resp.ok) { platforms = await resp.json(); }
      } catch { /* 선택적 단계 */ }
      setS((prev) => ({ ...prev, platforms, stage: "serp" }));

      // 3. 검색 결과(SERP) 수집
      try {
        const resp = await fetch("/api/serp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keyword: s.keyword, targetUrl: s.targetUrl }),
        });
        if (resp.ok) { serp = await resp.json(); }
      } catch { /* 선택적 단계 */ }
      setS((prev) => ({ ...prev, serp, stage: "scraping" }));

      // 4. 페이지 스크래핑 (자사 + 경쟁사)
      try {
        const resp = await fetch("/api/unlocker", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: s.targetUrl }),
        });
        if (resp.ok) { targetPage = await resp.json(); }
      } catch { /* 선택적 단계 */ }

      if (serp && serp.topCompetitors.length > 0) {
        try {
          const resp = await fetch("/api/unlocker", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ urls: serp.topCompetitors.slice(0, 3) }),
          });
          if (resp.ok) { competitorPages = await resp.json(); }
        } catch { /* 선택적 단계 */ }
      }
      setS((prev) => ({ ...prev, targetPage, competitorPages, stage: "context" }));

      // 5. 사이트 컨텍스트 분석
      try {
        const resp = await fetch("/api/site-context", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: s.targetUrl }),
        });
        if (resp.ok) { siteContext = await resp.json(); }
      } catch { /* 선택적 단계 */ }
      setS((prev) => ({ ...prev, siteContext, stage: "analyzing" }));

      // 6. 최종 SRO 분석 실행
      try {
        const resp = await fetch("/api/sro-analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetUrl: s.targetUrl,
            keyword: s.keyword,
            grounding,
            platforms,
            serp,
            targetPage,
            competitorPages,
            siteContext,
          }),
        });
        if (resp.ok) { llmAnalysis = await resp.json(); }
      } catch { /* 선택적 단계 */ }

      setS((prev) => ({
        ...prev,
        grounding,
        platforms,
        serp,
        targetPage,
        competitorPages,
        siteContext,
        llmAnalysis,
        stage: "done",
      }));
    } catch (err) {
      setS((prev) => ({
        ...prev,
        stage: "error",
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }, [s.targetUrl, s.keyword]);

  // ── 렌더링 (Render) ────────────────────────────

  return (
    <div className="space-y-4">
      {/* 입력 바 (Input Bar) */}
      <div className="rounded-xl border border-th-border bg-th-card p-4 shadow-sm">
        <div className="mb-3 text-sm font-semibold text-th-text">SRO 심층 분석</div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={s.targetUrl}
            onChange={(e) => setS((prev) => ({ ...prev, targetUrl: e.target.value }))}
            placeholder="분석할 페이지 URL (예: https://example.com/blog-post)"
            className="bd-input flex-1 rounded-lg p-2.5 text-sm"
            disabled={isRunning}
          />
          <input
            value={s.keyword}
            onChange={(e) => setS((prev) => ({ ...prev, keyword: e.target.value }))}
            placeholder="타겟 키워드"
            className="bd-input w-full rounded-lg p-2.5 text-sm sm:w-48"
            disabled={isRunning}
          />
          <button
            onClick={runFullAnalysis}
            disabled={isRunning || !s.targetUrl || !s.keyword}
            className="bd-btn-primary whitespace-nowrap rounded-lg px-5 py-2.5 text-sm disabled:opacity-50"
          >
            {isRunning ? "분석 중…" : "분석 시작"}
          </button>
        </div>
        {isRunning && (
          <div className="mt-3">
            <ProgressBar stage={s.stage} />
          </div>
        )}
        {s.stage === "error" && s.error && (
          <div className="mt-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {s.error}
          </div>
        )}
      </div>

      {/* 결과 화면 (Results) */}
      {s.stage === "done" && (
        <div className="space-y-4">
          {/* 종합 점수 및 요약 (Overall Score + Summary) */}
          {s.llmAnalysis && (
            <div className="flex items-start gap-5 rounded-xl border border-th-border bg-th-card p-5 shadow-sm">
              <ScoreRing score={s.llmAnalysis.overallScore} />
              <div className="flex-1">
                <div className="text-lg font-semibold text-th-text">종합 SRO 점수</div>
                <p className="mt-1 text-sm leading-relaxed text-th-text-secondary">
                  {s.llmAnalysis.summary}
                </p>
              </div>
            </div>
          )}

          {/* 그라운딩 요약 (Grounding Summary) */}
          {s.grounding && (
            <div className="rounded-xl border border-th-border bg-th-card p-4 shadow-sm">
              <div className="mb-2 text-sm font-semibold text-th-text">🔬 Gemini 그라운딩 분석</div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="선택률" value={`${(s.grounding.selectionRate * 100).toFixed(1)}%`} />
                <Stat label="타겟 발견 여부" value={s.grounding.targetUrlFound ? "예" : "아니오"} />
                <Stat label="출처 청크 수" value={String(s.grounding.chunks.length)} />
                <Stat label="타겟 단어 비중" value={`${s.grounding.targetGroundingWords} / ${s.grounding.totalGroundingWords}`} />
              </div>
              {s.grounding.targetSnippets.length > 0 && (
                <div className="mt-3 space-y-1">
                  <div className="text-xs font-medium text-th-text-muted">내 페이지에서 인용된 텍스트 스니펫:</div>
                  {s.grounding.targetSnippets.slice(0, 3).map((snip, i) => (
                    <div key={i} className="rounded-lg border border-th-border bg-th-card-alt px-3 py-2 text-xs text-th-text-secondary">
                      &ldquo;{snip.slice(0, 300)}&rdquo;
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 플랫폼별 인용 현황 (Platform Citations) */}
          {s.platforms.length > 0 && (
            <div className="rounded-xl border border-th-border bg-th-card p-4 shadow-sm">
              <div className="mb-2 text-sm font-semibold text-th-text">🌐 교차 플랫폼 인용 현황</div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {s.platforms.map((p) => (
                  <div
                    key={p.platform}
                    className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-center ${
                      p.targetUrlCited
                        ? "border-green-500/40 bg-green-500/10"
                        : "border-th-border bg-th-card-alt"
                    }`}
                  >
                    <div className="text-xs font-medium text-th-text">{p.label}</div>
                    <div className={`text-lg font-bold ${p.targetUrlCited ? "text-green-400" : "text-th-text-muted"}`}>
                      {p.status === "done" ? (p.targetUrlCited ? "✓" : "✗") : p.status === "error" ? "⚠" : "…"}
                    </div>
                    <div className="text-[10px] text-th-text-muted">
                      {p.status === "done" ? `${p.citations.length}회 인용됨` : p.status}
                    </div>
                  </div>
                ))}
              </div>
              {(() => {
                const cited = s.platforms.filter((p) => p.targetUrlCited).length;
                const done = s.platforms.filter((p) => p.status === "done").length;
                return (
                  <div className="mt-2 text-xs text-th-text-muted">
                    총 {done}개의 플랫폼 중 {cited}개에서 인용됨
                  </div>
                );
              })()}
            </div>
          )}

          {/* SERP 랭킹 데이터 (SERP Data) */}
          {s.serp && (
            <div className="rounded-xl border border-th-border bg-th-card p-4 shadow-sm">
              <div className="mb-2 text-sm font-semibold text-th-text">📊 검색 엔진(SERP) 순위</div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Stat label="내 유기적 순위" value={s.serp.targetRank ? `${s.serp.targetRank}위` : "발견되지 않음"} />
                <Stat label="총 검색 결과 수" value={String(s.serp.totalResults)} />
                <Stat label="주요 경쟁사 수" value={String(s.serp.topCompetitors.length)} />
              </div>
              {s.serp.organicResults.length > 0 && (
                <div className="mt-3 space-y-1 max-h-48 overflow-y-auto">
                  {s.serp.organicResults.slice(0, 10).map((r) => (
                    <div
                      key={r.position}
                      className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs ${
                        r.isTarget ? "bg-th-accent/10 border border-th-accent/30" : "bg-th-card-alt"
                      }`}
                    >
                      <span className="w-5 shrink-0 font-bold text-th-text-muted">#{r.position}</span>
                      <span className={`flex-1 truncate ${r.isTarget ? "font-semibold text-th-text" : "text-th-text-secondary"}`}>
                        {r.title || r.url}
                      </span>
                      <span className="shrink-0 text-[10px] text-th-text-muted">{r.domain}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 권장 사항 (Recommendations) */}
          {s.llmAnalysis && s.llmAnalysis.recommendations.length > 0 && (
            <div className="rounded-xl border border-th-border bg-th-card p-4 shadow-sm">
              <div className="mb-3 text-sm font-semibold text-th-text">💡 개선을 위한 권장 사항</div>
              <div className="space-y-3">
                {s.llmAnalysis.recommendations.map((rec, i) => (
                  <div key={i} className="rounded-lg border border-th-border bg-th-card-alt p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <PriorityBadge priority={rec.priority} />
                      <CategoryBadge category={rec.category} />
                      <span className="text-sm font-medium text-th-text">{rec.title}</span>
                    </div>
                    <p className="text-xs text-th-text-secondary leading-relaxed mb-2">
                      {rec.description}
                    </p>
                    {rec.actionItems.length > 0 && (
                      <ul className="space-y-0.5">
                        {rec.actionItems.map((item, j) => (
                          <li key={j} className="flex items-start gap-1.5 text-xs text-th-text-muted">
                            <span className="mt-0.5 text-th-accent">→</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 콘텐츠 격차 및 경쟁사 인사이트 (Content Gaps + Competitor Insights) */}
          {s.llmAnalysis && (s.llmAnalysis.contentGaps.length > 0 || s.llmAnalysis.competitorInsights.length > 0) && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {s.llmAnalysis.contentGaps.length > 0 && (
                <div className="rounded-xl border border-th-border bg-th-card p-4 shadow-sm">
                  <div className="mb-2 text-sm font-semibold text-th-text">🔍 콘텐츠 격차 (Content Gaps)</div>
                  <ul className="space-y-1">
                    {s.llmAnalysis.contentGaps.map((gap, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-th-text-secondary">
                        <span className="mt-0.5 text-th-warning">•</span>
                        <span>{gap}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {s.llmAnalysis.competitorInsights.length > 0 && (
                <div className="rounded-xl border border-th-border bg-th-card p-4 shadow-sm">
                  <div className="mb-2 text-sm font-semibold text-th-text">🏆 경쟁사 인사이트</div>
                  <ul className="space-y-1">
                    {s.llmAnalysis.competitorInsights.map((insight, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-th-text-secondary">
                        <span className="mt-0.5 text-th-accent">•</span>
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* 타겟 페이지 정보 (Target Page Info) */}
          {s.targetPage && !s.targetPage.error && (
            <div className="rounded-xl border border-th-border bg-th-card p-4 shadow-sm">
              <div className="mb-2 text-sm font-semibold text-th-text">📄 타겟 페이지 요약</div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="제목(Title)" value={s.targetPage.title || "—"} />
                <Stat label="단어 수" value={`${s.targetPage.wordCount}자`} />
                <Stat label="헤딩(H태그) 수" value={`${s.targetPage.headings.length}개`} />
                <Stat label="도메인" value={s.targetPage.domain} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 비어있는 상태 (Empty state) */}
      {s.stage === "idle" && !s.llmAnalysis && (
        <div className="rounded-xl border border-th-border bg-th-card-alt p-8 text-center">
          <div className="text-2xl mb-2">🎯</div>
          <div className="text-sm font-medium text-th-text mb-1">선택률 최적화</div>
          <p className="text-xs text-th-text-muted max-w-md mx-auto leading-relaxed">
            타겟 URL과 키워드를 입력하여 내 콘텐츠가 AI 시스템의 답변 출처(Grounding source)로 얼마나 잘 선택되고 있는지 분석하세요. 
            Gemini 그라운딩, 교차 플랫폼 인용, SERP 순위 등을 종합 점검하고 실행 가능한 권장 사항을 제공합니다.
          </p>
        </div>
      )}
    </div>
  );
}

// ── 통계 셀 컴포넌트 (Stat cell) ─────────────────────────────

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-th-text-muted">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-th-text truncate">{value}</div>
    </div>
  );
}