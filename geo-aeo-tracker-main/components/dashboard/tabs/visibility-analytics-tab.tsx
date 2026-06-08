import { useCallback } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ScrapeRun } from "@/components/dashboard/types";

type VisibilityAnalyticsTabProps = {
  data: Array<{ day: string; visibility: number }>;
  runs: ScrapeRun[];
};

function downloadCsv(filename: string, content: string) {
  // 한글 깨짐 방지를 위해 BOM(Byte Order Mark) 추가
  const bom = "\uFEFF";
  const blob = new Blob([bom + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function VisibilityAnalyticsTab({ data, runs }: VisibilityAnalyticsTabProps) {
  const exportRunsCsv = useCallback(() => {
    const header =
      "날짜,AI 모델,프롬프트,가시성 점수,감성,브랜드 언급,경쟁사 언급,출처 수\n";
    const rows = runs
      .map((r) =>
        [
          r.createdAt,
          r.provider,
          `"${r.prompt.replace(/"/g, '""')}"`,
          r.visibilityScore ?? 0,
          r.sentiment ?? "",
          (r.brandMentions ?? []).join("; "),
          (r.competitorMentions ?? []).join("; "),
          r.sources.length,
        ].join(","),
      )
      .join("\n");
    downloadCsv(`aeo-실행기록-${new Date().toISOString().slice(0, 10)}.csv`, header + rows);
  }, [runs]);

  const exportTrendCsv = useCallback(() => {
    const header = "날짜,평균 가시성 (%)\n";
    const rows = data.map((d) => `${d.day},${d.visibility}`).join("\n");
    downloadCsv(`aeo-가시성추이-${new Date().toISOString().slice(0, 10)}.csv`, header + rows);
  }, [data]);

  // 감성(Sentiment) 분포 계산
  const sentimentCounts = runs.reduce(
    (acc, r) => {
      const s = r.sentiment ?? "neutral";
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const avgVisibility =
    runs.length > 0
      ? Math.round(runs.reduce((a, r) => a + (r.visibilityScore ?? 0), 0) / runs.length)
      : 0;

  const sentimentLabels: Record<string, string> = {
    positive: "긍정적",
    neutral: "중립적",
    negative: "부정적",
    "not-mentioned": "언급 안 됨",
  };

  return (
    <div className="space-y-4">
      {/* 요약 지표 (Summary metrics) */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        <div className="rounded-lg border border-th-border bg-th-card px-3 py-2.5">
          <div className="text-xs uppercase tracking-wider text-th-text-muted">평균 가시성</div>
          <div className="mt-0.5 text-xl font-bold text-th-text">{avgVisibility}%</div>
        </div>
        {(["positive", "neutral", "negative", "not-mentioned"] as const).map((s) => {
          const colors: Record<string, string> = {
            positive: "text-th-success",
            neutral: "text-th-text-accent",
            negative: "text-th-danger",
            "not-mentioned": "text-th-text-muted",
          };
          return (
            <div key={s} className="rounded-lg border border-th-border bg-th-card px-3 py-2.5">
              <div className="text-xs uppercase tracking-wider text-th-text-muted">{sentimentLabels[s]}</div>
              <div className={`mt-0.5 text-xl font-bold ${colors[s]}`}>{sentimentCounts[s] || 0}</div>
            </div>
          );
        })}
      </div>

      {/* 차트 (Chart) */}
      {data.length === 0 ? (
        <div className="rounded-lg border border-th-border bg-th-card-alt p-8 text-center text-sm text-th-text-secondary">
          아직 추이 데이터가 없습니다. 프롬프트를 실행하여 가시성 추이 데이터를 생성해 보세요.
        </div>
      ) : (
        <div className="h-80 w-full rounded-lg border border-th-border bg-th-card-alt p-2">
          <ResponsiveContainer>
            <LineChart data={data}>
              <CartesianGrid stroke="var(--th-chart-grid)" strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fill: "var(--th-chart-axis)", fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fill: "var(--th-chart-axis)", fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--th-card)",
                  border: "1px solid var(--th-border)",
                  borderRadius: "8px",
                  color: "var(--th-text)",
                }}
              />
              <Line
                type="monotone"
                dataKey="visibility"
                name="평균 가시성 (%)"
                stroke="var(--th-accent)"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "var(--th-accent)" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 내보내기 버튼 */}
      <div className="flex gap-2">
        <button
          onClick={exportRunsCsv}
          disabled={runs.length === 0}
          className="bd-chip rounded-lg px-4 py-2 text-sm disabled:opacity-40"
        >
          모든 실행 기록 내보내기 (CSV)
        </button>
        <button
          onClick={exportTrendCsv}
          disabled={data.length === 0}
          className="bd-chip rounded-lg px-4 py-2 text-sm disabled:opacity-40"
        >
          가시성 추이 내보내기 (CSV)
        </button>
      </div>
    </div>
  );
}