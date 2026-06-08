import { useState } from "react";
import type { Battlecard, Competitor } from "@/components/dashboard/types";

type BattlecardsTabProps = {
  competitors: Competitor[];
  battlecards: Battlecard[];
  onCompetitorsChange: (value: Competitor[]) => void;
  onBuildBattlecards: () => void;
};

function SentimentBadge({ sentiment }: { sentiment: string }) {
  const styles: Record<string, string> = {
    positive: "bg-th-success-soft text-th-success",
    neutral: "bg-th-accent-soft text-th-text-accent",
    negative: "bg-th-danger-soft text-th-danger",
  };
  
  const labels: Record<string, string> = {
    positive: "긍정적",
    neutral: "중립적",
    negative: "부정적",
  };

  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[sentiment] ?? styles.neutral}`}>
      {labels[sentiment] ?? sentiment}
    </span>
  );
}

export function BattlecardsTab({
  competitors,
  battlecards,
  onCompetitorsChange,
  onBuildBattlecards,
}: BattlecardsTabProps) {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  function addCompetitor() {
    const name = newName.trim();
    if (!name) return;
    onCompetitorsChange([...competitors, { name, aliases: [], websites: [] }]);
    setNewName("");
  }

  function removeCompetitor(index: number) {
    onCompetitorsChange(competitors.filter((_, i) => i !== index));
  }

  function updateCompetitor(index: number, patch: Partial<Competitor>) {
    onCompetitorsChange(competitors.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  return (
    <div className="space-y-4">
      <label className="text-sm font-medium uppercase tracking-wider text-th-text-muted">
        경쟁사 목록
      </label>

      {/* 경쟁사 리스트 (Competitor list) */}
      {competitors.length > 0 && (
        <div className="space-y-2">
          {competitors.map((comp, i) => (
            <div key={i} className="rounded-lg border border-th-border bg-th-card p-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-th-text">{comp.name}</span>
                {comp.aliases.length > 0 && (
                  <span className="text-xs text-th-text-muted">
                    별칭: {comp.aliases.join(", ")}
                  </span>
                )}
                <button
                  onClick={() => removeCompetitor(i)}
                  className="ml-auto rounded p-1 text-xs text-th-text-muted hover:bg-th-danger-soft hover:text-th-danger"
                  title="삭제"
                >
                  ✕
                </button>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <input
                  value={comp.aliases.join(", ")}
                  onChange={(e) =>
                    updateCompetitor(i, {
                      aliases: e.target.value.split(",").map((a) => a.trim()).filter(Boolean),
                    })
                  }
                  placeholder="별칭 (쉼표로 구분)"
                  className="bd-input rounded-lg p-2 text-xs"
                />
                <input
                  value={comp.websites.join(", ")}
                  onChange={(e) =>
                    updateCompetitor(i, {
                      websites: e.target.value.split(",").map((w) => w.trim()).filter(Boolean),
                    })
                  }
                  placeholder="웹사이트 (쉼표로 구분)"
                  className="bd-input rounded-lg p-2 text-xs"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 경쟁사 추가 (Add competitor) */}
      <div className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCompetitor(); } }}
          placeholder="경쟁사 이름 입력..."
          className="bd-input flex-1 rounded-lg p-2.5 text-sm"
        />
        <button
          onClick={addCompetitor}
          disabled={!newName.trim()}
          className="rounded-lg bg-th-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-th-accent-hover disabled:opacity-50"
        >
          추가
        </button>
      </div>

      <button
        onClick={onBuildBattlecards}
        className="bd-btn-primary rounded-lg px-4 py-2.5 text-sm"
      >
        배틀카드 생성
      </button>

      {battlecards.length === 0 && (
        <div className="rounded-lg border border-th-border bg-th-card-alt p-8 text-center text-sm text-th-text-muted">
          아직 배틀카드가 없습니다. 경쟁사를 추가하고 [배틀카드 생성] 버튼을 클릭하세요.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {battlecards.map((card) => {
          const isExpanded = expandedCard === card.competitor;
          return (
            <div
              key={card.competitor}
              className="rounded-xl border border-th-border bg-th-card shadow-sm overflow-hidden"
            >
              {/* 카드 헤더 (Card header) */}
              <button
                onClick={() => setExpandedCard(isExpanded ? null : card.competitor)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-th-card-hover transition-colors"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-th-accent-soft">
                  <span className="text-sm font-bold text-th-text-accent">
                    {card.competitor.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-semibold text-th-text truncate">{card.competitor}</div>
                </div>
                <SentimentBadge sentiment={card.sentiment} />
                <span className="text-xs text-th-text-muted">{isExpanded ? "▲" : "▼"}</span>
              </button>

              {/* 요약 (Summary - always visible) */}
              <div className="border-t border-th-border px-4 py-3">
                <p className="text-sm leading-relaxed text-th-text-secondary">{card.summary}</p>
              </div>

              {/* 상세 세션 (Structured sections - expandable) */}
              {isExpanded && card.sections && card.sections.length > 0 && (
                <div className="border-t border-th-border px-4 py-3 space-y-3">
                  {card.sections.map((section) => {
                    // 서버가 영어로 응답한 제목을 한국어로 치환 (필요시)
                    let headingKor = section.heading;
                    if (headingKor === "Strengths") headingKor = "장점 (Strengths)";
                    else if (headingKor === "Weaknesses") headingKor = "단점 (Weaknesses)";
                    else if (headingKor === "Pricing Insights" || headingKor === "Pricing") headingKor = "가격 정책 (Pricing)";
                    else if (headingKor === "AI Visibility") headingKor = "AI 가시성";
                    else if (headingKor === "Key Differentiators") headingKor = "핵심 차별화 요소";

                    return (
                      <div key={section.heading}>
                        <h4 className="text-sm font-semibold text-th-text mb-1.5">{headingKor}</h4>
                        <ul className="space-y-1">
                          {section.points.map((point, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-th-text-secondary">
                              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-th-accent shrink-0" />
                              <span className="leading-relaxed">{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 힌트 문구 (Expand hint when sections exist but collapsed) */}
              {!isExpanded && card.sections && card.sections.length > 0 && (
                <div className="border-t border-th-border-subtle px-4 py-2">
                  <span className="text-xs text-th-text-muted">
                    {card.sections.length}개의 세부 분석 섹션 — 클릭하여 펼치기
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}