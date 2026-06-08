import { useState } from "react";
import type { AuditReport, AuditCheck } from "@/components/dashboard/types";

type AeoAuditTabProps = {
  auditUrl: string;
  auditReport: AuditReport | null;
  onAuditUrlChange: (value: string) => void;
  onRunAudit: () => void;
};

// 카테고리별 메타 데이터 한글화
const CATEGORY_META: Record<
  AuditCheck["category"],
  { label: string; icon: string; color: string }
> = {
  discovery: { label: "발견성", icon: "🔍", color: "var(--th-accent)" },
  structure: { label: "구조 및 스키마", icon: "🏗️", color: "#8b5cf6" },
  content: { label: "콘텐츠 품질", icon: "📝", color: "var(--th-success)" },
  technical: { label: "기술적 요소", icon: "⚙️", color: "var(--th-warning)" },
  rendering: { label: "서버 사이드 렌더링", icon: "🖥️", color: "#ec4899" },
};

function ScoreRing({ score }: { score: number }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const color =
    score >= 80 ? "var(--th-success)" : score >= 50 ? "var(--th-warning)" : "var(--th-danger)";
  return (
    <div className="relative flex items-center justify-center" style={{ width: 110, height: 110 }}>
      <svg width="110" height="110" viewBox="0 0 110 110">
        <circle cx="55" cy="55" r={r} fill="none" stroke="var(--th-score-ring-bg)" strokeWidth="8" />
        <circle
          cx="55"
          cy="55"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 55 55)"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <span className="absolute text-2xl font-bold" style={{ color }}>
        {score}
      </span>
    </div>
  );
}

function CheckRow({ check }: { check: AuditCheck }) {
  const [open, setOpen] = useState(false);
  
  // 서버에서 영어로 올 수 있는 항목 이름(label) 번역 보조 함수
  const translateLabel = (label: string) => {
    const map: Record<string, string> = {
      "llms.txt Present": "llms.txt 파일 존재 여부",
      "robots.txt AI Allowed": "robots.txt에서 AI 봇 허용 여부",
      "Schema.org Detected": "구조화된 데이터 (Schema.org) 감지",
      "Clear H1/H2 Hierarchy": "명확한 H1/H2 헤딩 구조",
      "Word Count (>300)": "단어 수 (300자 이상)",
      "BLUF (Bottom Line Up Front)": "두괄식 문장 구조 (BLUF)",
      "Title Tag": "타이틀 태그 (Title Tag)",
      "Meta Description": "메타 디스크립션 (Meta Description)",
      "SSR (No JS Render Needed)": "SSR 렌더링 (JS 렌더링 불필요)",
    };
    return map[label] ?? label;
  };

  return (
    <div className="rounded-lg border border-th-border bg-th-card-alt">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-th-card-hover transition-colors"
      >
        <span className={check.pass ? "text-th-success" : "text-th-danger"}>
          {check.pass ? "✓" : "✗"}
        </span>
        <span className="flex-1 font-medium text-th-text">{translateLabel(check.label)}</span>
        <span className="rounded-md bg-th-card-hover px-2 py-0.5 text-xs text-th-text-secondary">
          {check.value}
        </span>
        <span className="text-xs text-th-text-muted">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="border-t border-th-border px-4 py-2.5 text-sm text-th-text-secondary leading-relaxed">
          {check.detail}
        </div>
      )}
    </div>
  );
}

export function AeoAuditTab({
  auditUrl,
  auditReport,
  onAuditUrlChange,
  onRunAudit,
}: AeoAuditTabProps) {
  const categories: AuditCheck["category"][] = [
    "discovery",
    "structure",
    "content",
    "technical",
    "rendering",
  ];

  return (
    <div className="space-y-4">
      {/* ── 주소 입력바 (Input bar) ────────────────────────────── */}
      <div className="flex gap-2">
        <input
          value={auditUrl}
          onChange={(e) => onAuditUrlChange(e.target.value)}
          placeholder="https://example.com"
          className="bd-input flex-1 rounded-lg p-2.5 text-sm"
        />
        <button
          onClick={onRunAudit}
          className="bd-btn-primary whitespace-nowrap rounded-lg px-4 py-2.5 text-sm"
        >
          AEO 진단 실행
        </button>
      </div>

      {/* ── 결과 화면 (Results) ──────────────────────────────── */}
      {auditReport && (
        <div className="space-y-4">
          {/* 점수 헤더 (Score header) */}
          <div className="flex items-center gap-6 rounded-xl border border-th-border bg-th-card p-5 shadow-sm">
            <ScoreRing score={auditReport.score ?? 0} />
            <div>
              <div className="text-lg font-semibold text-th-text">
                AEO 점수
              </div>
              <div className="mt-1 text-sm text-th-text-secondary">
                <span className="text-th-text-accent font-medium">{auditReport.url}</span> 사이트에 대한 
                총 {(auditReport.checks ?? []).length}개의 검사 중 {(auditReport.checks ?? []).filter((c) => c.pass).length}개 통과
              </div>
              {/* 카테고리 요약 뱃지 (Category summary pills) */}
              <div className="mt-3 flex flex-wrap gap-2">
                {categories.map((cat) => {
                  const meta = CATEGORY_META[cat];
                  const group = (auditReport.checks ?? []).filter((c) => c.category === cat);
                  if (group.length === 0) return null;
                  const passed = group.filter((c) => c.pass).length;
                  return (
                    <span
                      key={cat}
                      className="inline-flex items-center gap-1 rounded-full border border-th-border bg-th-card-alt px-2.5 py-1 text-xs font-medium"
                      style={{ color: meta.color }}
                    >
                      {meta.icon} {meta.label}: {passed}/{group.length}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 카테고리별 세부 결과 (Category sections) */}
          {categories.map((cat) => {
            const meta = CATEGORY_META[cat];
            const group = (auditReport.checks ?? []).filter((c) => c.category === cat);
            if (group.length === 0) return null;
            return (
              <div key={cat}>
                <h3
                  className="mb-2 flex items-center gap-2 text-sm font-semibold"
                  style={{ color: meta.color }}
                >
                  {meta.icon} {meta.label}
                </h3>
                <div className="space-y-1.5">
                  {group.map((check) => (
                    <CheckRow key={check.id} check={check} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}