"use client";

import { useMemo, useState, useCallback } from "react";
import type { ScrapeRun, Provider } from "@/components/dashboard/types";
import { ALL_PROVIDERS, PROVIDER_LABELS } from "@/components/dashboard/types";

type PartnerDiscoveryTabProps = {
  runs?: ScrapeRun[];
  partnerLeaderboard: Array<{ url: string; count: number; prompts: string[] }>;
  brandWebsites?: string[];
};

function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname.replace(/^(www\.|m\.)/, "");
  } catch {
    return url.toLowerCase();
  }
}

function extractPath(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return url;
  }
}

type SortKey = "citations" | "pages" | "prompts" | "domain";

const CHART_COLORS = [
  "#4285f4", "#ea4335", "#fbbc05", "#34a853", "#8ab4f8",
  "#f28b82", "#fde293", "#81c995", "#c589f9", "#9aa0a6"
];

const EXCLUDED_DOMAINS = new Set([
  "support.google.com",
  "policies.google.com",
  "policy.google.com"
]);

/* ── 자체 제작 SVG 도넛 차트 컴포넌트 ── */
function DonutChart({ data, title, totalLabel }: { data: { label: string; value: number; color: string }[], title: string, totalLabel: string }) {
  const total = data.reduce((acc, curr) => acc + curr.value, 0);
  let cumulativePercent = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 rounded-xl border border-th-border bg-th-card p-5 shadow-sm flex-1">
      <div className="relative w-36 h-36 shrink-0">
        <svg viewBox="0 0 42 42" className="w-full h-full -rotate-90 transform">
          <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="var(--th-border-subtle)" strokeWidth="6" />
          {data.map((slice, i) => {
            if (slice.value === 0) return null;
            const percent = (slice.value / total) * 100;
            const offset = 100 - cumulativePercent;
            cumulativePercent += percent;
            
            return (
              <circle
                key={i}
                cx="21" cy="21" r="15.91549430918954"
                fill="transparent"
                stroke={slice.color}
                strokeWidth="6"
                strokeDasharray={`${percent} ${100 - percent}`}
                strokeDashoffset={offset}
                className="transition-all duration-1000 ease-out hover:stroke-[7px]"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-black text-th-text">{total}</span>
          <span className="text-[10px] text-th-text-muted font-bold uppercase tracking-wide">{totalLabel}</span>
        </div>
      </div>

      <div className="flex-1 w-full space-y-2">
        <h3 className="text-[13px] font-bold text-th-text mb-2 uppercase tracking-wide">{title}</h3>
        <div className="space-y-1.5 max-h-28 overflow-y-auto pr-2">
          {data.map((slice, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 truncate">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                <span className="truncate text-th-text-secondary font-medium" title={slice.label}>
                  {slice.label}
                </span>
              </div>
              <span className="font-bold text-th-text shrink-0 ml-2">
                {slice.value} <span className="text-[10px] text-th-text-muted font-normal ml-0.5">({total > 0 ? Math.round((slice.value / total) * 100) : 0}%)</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PartnerDiscoveryTab({ runs = [], partnerLeaderboard, brandWebsites = [] }: PartnerDiscoveryTabProps) {
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"domain" | "url">("domain");
  const [expandedDomains, setExpandedDomains] = useState<Record<string, boolean>>({});
  const [sortBy, setSortBy] = useState<SortKey>("citations");
  const [selectedModel, setSelectedModel] = useState<string>("all");

  // 0. AI 모델별 실행(Runs) 필터링
  const filteredRuns = useMemo(() => {
    if (!selectedModel || selectedModel === "all") return runs;
    return runs.filter((r) => r.provider === selectedModel);
  }, [runs, selectedModel]);

  // 0.5. 필터링된 실행 데이터 기준의 로컬 파트너 리더보드 재구성
  const localPartnerLeaderboard = useMemo(() => {
    const junkHosts = [
      "cloudfront.net", "cdn.prod.website-files.com", "cdn.jsdelivr.net",
      "cdnjs.cloudflare.com", "unpkg.com", "fastly.net", "akamaihd.net",
      "connect.facebook.net", "facebook.net", "google-analytics.com",
      "googletagmanager.com", "doubleclick.net", "w3.org", "schema.org",
      "amazonaws.com", "cloudflare.com", "hotjar.com", "sentry.io",
      "support.google.com", "policies.google.com", "policy.google.com"
    ];
    const junkExtPattern = /\.(png|jpe?g|gif|svg|webp|avif|ico|css|js|woff2?|ttf|eot|mp4|webm)(\?|$)/i;

    function isCleanUrl(url: string): boolean {
      try {
        const parsed = new URL(url);
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
    filteredRuns.forEach((run) => {
      (run.sources || []).filter(isCleanUrl).forEach((source) => {
        const existing = map.get(source) ?? { count: 0, prompts: new Set<string>() };
        existing.count += 1;
        existing.prompts.add(run.prompt);
        map.set(source, existing);
      });
    });

    return [...map.entries()]
      .map(([url, data]) => ({ url, count: data.count, prompts: [...data.prompts] }))
      .sort((a, b) => b.count - a.count);
  }, [filteredRuns]);

  // 1. 전체 수집 풀 (내 브랜드 언급과 무관하게 노이즈만 제거)
  const cleanedLeaderboard = useMemo(() => {
    return localPartnerLeaderboard.filter(
      (item) => !EXCLUDED_DOMAINS.has(extractDomain(item.url))
    );
  }, [localPartnerLeaderboard]);

  // 💡 [수정됨] cleanedLeaderboard에 포함된 URL(쓰레기 없는 깨끗한 URL)만 판별하기 위한 셋
  const cleanUrlSet = useMemo(() => new Set(cleanedLeaderboard.map(c => c.url)), [cleanedLeaderboard]);

  // 2. 내 브랜드 인용 풀 (내 브랜드가 언급된 응답에서 추출 + 쓰레기 URL 철저히 배제)
  const brandLeaderboard = useMemo(() => {
    const map = new Map<string, { count: number; prompts: Set<string> }>();
    const runsWithBrand = filteredRuns.filter((r) => (r.brandMentions?.length ?? 0) > 0);

    runsWithBrand.forEach((run) => {
      (run.sources || []).forEach((url) => {
        const domain = extractDomain(url);
        if (EXCLUDED_DOMAINS.has(domain)) return;
        
        // 💡 [버그 수정] 차트(64)와 표(65)의 불일치 원인이던 노이즈 URL을 완벽하게 걸러냅니다.
        if (!cleanUrlSet.has(url)) return; 

        const existing = map.get(url) ?? { count: 0, prompts: new Set<string>() };
        existing.count += 1;
        existing.prompts.add(run.prompt);
        map.set(url, existing);
      });
    });

    return [...map.entries()].map(([url, data]) => ({
      url, count: data.count, prompts: [...data.prompts]
    }));
  }, [filteredRuns, cleanUrlSet]);

  // 3. '전체 수집 개수' 계산을 위해 전체 URL을 도메인별로 묶어둠
  const allUrlsByDomain = useMemo(() => {
    const m = new Map<string, string[]>();
    cleanedLeaderboard.forEach((item) => {
      const domain = extractDomain(item.url);
      const list = m.get(domain) ?? [];
      list.push(item.url);
      m.set(domain, list);
    });
    return m;
  }, [cleanedLeaderboard]);

  // 4. 아코디언 테이블용 그룹화
  const domainGroups = useMemo(() => {
    const m = new Map<string, {
      urls: Set<string>;
      totalCollectedCount: number;
      brandCitationCount: number;
      prompts: Set<string>;
    }>();

    cleanedLeaderboard.forEach(({ url, count, prompts }) => {
      const domain = extractDomain(url);
      const existing = m.get(domain) ?? { urls: new Set(), totalCollectedCount: 0, brandCitationCount: 0, prompts: new Set() };
      existing.urls.add(url);
      existing.totalCollectedCount += count;
      prompts.forEach(p => existing.prompts.add(p));
      m.set(domain, existing);
    });

    brandLeaderboard.forEach(({ url, count }) => {
      const domain = extractDomain(url);
      if (m.has(domain)) {
        m.get(domain)!.brandCitationCount += count;
      }
    });

    return [...m.entries()]
      .map(([domain, data]) => ({
        domain,
        allUrls: [...data.urls],
        totalCollectedUrls: data.urls.size,
        brandCitationCount: data.brandCitationCount,
        prompts: [...data.prompts],
        isOwn: brandWebsites.length > 0 ? brandWebsites.some((w) => domain === extractDomain(w)) : false,
      }))
      .sort((a, b) => b.brandCitationCount - a.brandCitationCount || b.totalCollectedUrls - a.totalCollectedUrls);
  }, [cleanedLeaderboard, brandLeaderboard, brandWebsites, allUrlsByDomain]);

  // 5. 도넛 차트 수식
  const { brandCitationChartData, allCitationChartData } = useMemo(() => {
    const formatChart = (sortedList: { label: string, value: number }[]) => {
      // 최대 10개까지 고유 도메인을 표시하되, 수집된 개수가 2개 이상인 경우만 고유 노출
      const uniqueList: typeof sortedList = [];
      const othersList: typeof sortedList = [];

      sortedList.forEach((d) => {
        if (uniqueList.length < 10 && d.value >= 2) {
          uniqueList.push(d);
        } else {
          othersList.push(d);
        }
      });

      const chartSlices = uniqueList.map((d, i) => ({
        label: d.label,
        value: d.value,
        color: CHART_COLORS[i % CHART_COLORS.length]
      }));

      const othersValue = othersList.reduce((acc, curr) => acc + curr.value, 0);
      if (othersValue > 0) {
        chartSlices.push({
          label: "기타 도메인",
          value: othersValue,
          color: "#9aa0a6" // 세련된 중립 회색 지정
        });
      }

      return chartSlices;
    };

    const brandData = [...domainGroups]
      .filter(d => d.brandCitationCount > 0)
      .map(d => ({ label: d.domain, value: d.brandCitationCount }))
      .sort((a, b) => b.value - a.value);

    const allData = [...domainGroups]
      .map(d => ({ label: d.domain, value: d.totalCollectedUrls }))
      .sort((a, b) => b.value - a.value);

    return {
      brandCitationChartData: formatChart(brandData),
      allCitationChartData: formatChart(allData)
    };
  }, [domainGroups]);

  // 필터 및 정렬
  const filtered = useMemo(() => {
    const q = search.toLowerCase();

    if (view === "domain") {
      let list = domainGroups.filter((d) => !q || d.domain.toLowerCase().includes(q));
      if (sortBy === "domain") list = list.sort((a, b) => a.domain.localeCompare(b.domain));
      else if (sortBy === "pages") list = list.sort((a, b) => b.totalCollectedUrls - a.totalCollectedUrls);
      else if (sortBy === "citations") list = list.sort((a, b) => b.brandCitationCount - a.brandCitationCount);
      else if (sortBy === "prompts") list = list.sort((a, b) => b.prompts.length - a.prompts.length);
      return list;
    }

    let urlList = cleanedLeaderboard.map(item => {
      const bCount = brandLeaderboard.find(b => b.url === item.url)?.count || 0;
      return { ...item, brandCitationCount: bCount };
    }).filter((p) => !q || p.url.toLowerCase().includes(q));

    if (sortBy === "domain") urlList = urlList.sort((a, b) => extractDomain(a.url).localeCompare(extractDomain(b.url)));
    else if (sortBy === "citations") urlList = urlList.sort((a, b) => b.brandCitationCount - a.brandCitationCount);
    else if (sortBy === "pages") urlList = urlList.sort((a, b) => b.count - a.count);
    else if (sortBy === "prompts") urlList = urlList.sort((a, b) => b.prompts.length - a.prompts.length);
    return urlList;
  }, [search, view, domainGroups, cleanedLeaderboard, brandLeaderboard, sortBy]);

  const totalBrandCitations = useMemo(() => brandLeaderboard.reduce((a, b) => a + b.count, 0), [brandLeaderboard]);
  const uniquePrompts = useMemo(() => new Set(cleanedLeaderboard.flatMap((p) => p.prompts)).size, [cleanedLeaderboard]);

  const exportCsv = useCallback(() => {
    let csv = "도메인,URL,내 브랜드 인용 횟수,전체 수집 횟수,관련 프롬프트\n";
    cleanedLeaderboard.forEach((item) => {
      const bCount = brandLeaderboard.find(b => b.url === item.url)?.count || 0;
      csv += `"${extractDomain(item.url)}","${item.url}",${bCount},${item.count},"${item.prompts.join(" | ")}"\n`;
    });
    const bom = "\uFEFF";
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `인용통계-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [cleanedLeaderboard, brandLeaderboard]);

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      
      <div className="flex flex-col lg:flex-row gap-4">
        <DonutChart data={brandCitationChartData} title="브랜드가 인용된 도메인 통계" totalLabel="도메인 수" />
        <DonutChart data={allCitationChartData} title="수집된 전체 도메인 통계" totalLabel="도메인 수" />
      </div>

      <div className="h-px bg-th-border/60 w-full" />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-5">
          <Stat label="도메인 수" value={domainGroups.length} />
          <Stat label="내 브랜드 인용수" value={totalBrandCitations} />
          <Stat label="전체 수집 개수" value={cleanedLeaderboard.length} />
          <Stat label="프롬프트 수" value={uniquePrompts} />
        </div>

        <div className="flex items-center gap-2">
          <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="bd-input rounded-md px-2 py-1 text-xs">
            <option value="all">모든 AI 모델</option>
            {ALL_PROVIDERS.map((p) => (
              <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>
            ))}
          </select>

          <div className="flex rounded-md border border-th-border text-xs">
            <button onClick={() => setView("domain")} className={`px-2.5 py-1 rounded-l-md transition-colors ${view === "domain" ? "bg-th-accent-soft text-th-text font-medium" : "text-th-text-muted hover:text-th-text-secondary"}`}>도메인 뷰</button>
            <button onClick={() => setView("url")} className={`px-2.5 py-1 rounded-r-md transition-colors ${view === "url" ? "bg-th-accent-soft text-th-text font-medium" : "text-th-text-muted hover:text-th-text-secondary"}`}>URL 뷰</button>
          </div>

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} className="bd-input rounded-md px-2 py-1 text-xs">
            <option value="citations">정렬: 인용 많은 순</option>
            <option value="pages">정렬: 수집 많은 순</option>
            <option value="prompts">정렬: 프롬프트 많은 순</option>
            <option value="domain">정렬: 이름순 (A-Z)</option>
          </select>

          <button onClick={exportCsv} className="rounded-md border border-th-border px-2 py-1 text-xs text-th-text-muted hover:bg-th-card-hover hover:text-th-text-secondary transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg></button>
        </div>
      </div>

      <div className="relative">
        <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-th-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="도메인 또는 URL로 필터링..." className="bd-input w-full rounded-md py-1.5 pl-9 pr-8 text-sm" />
        {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-th-text-muted hover:text-th-text text-xs">✕</button>}
      </div>

      <div className="rounded-lg border border-th-border overflow-hidden">
        <div className="grid grid-cols-[1fr_120px_70px_80px] gap-2 bg-th-card px-4 py-2 text-xs font-medium uppercase tracking-wider text-th-text-muted border-b border-th-border">
          <span>{view === "domain" ? "출처" : "URL"}</span>
          <span className="text-right">내 브랜드 인용 횟수</span>
          <span className="text-right">수집 개수</span>
          <span className="text-right">프롬프트 수</span>
        </div>

        <div className="max-h-[520px] overflow-auto divide-y divide-th-border/60">
          {view === "domain"
            ? (filtered as typeof domainGroups).map((item, idx) => {
                const isOpen = expandedDomains[item.domain];
                return (
                  <div key={item.domain}>
                    <button onClick={() => setExpandedDomains((prev) => ({ ...prev, [item.domain]: !prev[item.domain] }))} className={`grid w-full grid-cols-[1fr_120px_70px_80px] gap-2 items-center px-4 py-2.5 text-left transition-colors hover:bg-th-card-hover ${isOpen ? "bg-th-card-hover/50" : idx % 2 === 0 ? "bg-th-card" : "bg-th-card-alt"}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-th-text-muted">{isOpen ? "▾" : "▸"}</span>
                        <span className="text-sm font-medium text-th-text truncate">{item.domain}</span>
                        {item.isOwn && <span className="shrink-0 rounded bg-th-success-soft px-1.5 py-0.5 text-[10px] font-semibold text-th-success uppercase tracking-wide">내 사이트 (You)</span>}
                      </div>
                      <span className="text-right text-sm font-semibold text-th-text tabular-nums">{item.brandCitationCount}</span>
                      <span className="text-right text-sm text-th-text-secondary tabular-nums">{item.totalCollectedUrls}</span>
                      <span className="text-right text-sm text-th-text-secondary tabular-nums">{item.prompts.length}</span>
                    </button>

                    {isOpen && (
                      <div className="border-t border-th-border/40 bg-th-card-alt/50">
                        {item.allUrls
                          .sort((a, b) => {
                            const bA = brandLeaderboard.find((e) => e.url === a)?.count || 0;
                            const bB = brandLeaderboard.find((e) => e.url === b)?.count || 0;
                            if (bA !== bB) return bB - bA;
                            const tA = cleanedLeaderboard.find((e) => e.url === a)?.count || 0;
                            const tB = cleanedLeaderboard.find((e) => e.url === b)?.count || 0;
                            return tB - tA;
                          })
                          .map((url) => {
                          const brandEntry = brandLeaderboard.find((e) => e.url === url);
                          return (
                            <div key={url} className="grid grid-cols-[1fr_120px_70px_80px] gap-2 items-center px-4 py-2 pl-10 border-b border-th-border/30 last:border-b-0">
                              <a href={url} target="_blank" rel="noreferrer" className="text-sm text-th-text-accent hover:underline truncate min-w-0" title={url}>{extractPath(url)}</a>
                              <span className="text-right text-xs font-medium text-th-text tabular-nums">{brandEntry?.count ?? 0}</span>
                              {/* 💡 [수정 요청] 자식의 수집 개수 표기를 삭제하고 - 로 깔끔하게 정리했습니다 */}
                              <span className="text-right text-xs text-th-text-muted tabular-nums">-</span>
                              <span className="text-right text-xs text-th-text-muted tabular-nums">{cleanedLeaderboard.find(e => e.url === url)?.prompts.length ?? 0}</span>
                            </div>
                          );
                        })}

                        {item.prompts.length > 0 && (
                          <div className="px-4 py-2 pl-10 flex flex-wrap gap-1.5">
                            {item.prompts.slice(0, 5).map((p, i) => <span key={i} className="inline-block max-w-[260px] truncate rounded bg-th-accent-soft/60 px-2 py-0.5 text-xs text-th-text-secondary" title={p}>{p.length > 55 ? p.slice(0, 52) + "…" : p}</span>)}
                            {item.prompts.length > 5 && <span className="text-xs text-th-text-muted self-center">+ 그 외 {item.prompts.length - 5}개</span>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            : (filtered as any[]).map((item, idx) => (
                <div key={item.url} className={`grid grid-cols-[1fr_120px_70px_80px] gap-2 items-center px-4 py-2.5 ${idx % 2 === 0 ? "bg-th-card" : "bg-th-card-alt"}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="shrink-0 text-xs text-th-text-muted">{extractDomain(item.url)}</span>
                    <a href={item.url} target="_blank" rel="noreferrer" className="text-sm text-th-text-accent hover:underline truncate min-w-0" title={item.url}>{extractPath(item.url)}</a>
                  </div>
                  <span className="text-right text-sm font-semibold text-th-text tabular-nums">{item.brandCitationCount}</span>
                  <span className="text-right text-sm text-th-text-secondary tabular-nums">{item.count}</span>
                  <span className="text-right text-sm text-th-text-secondary tabular-nums">{item.prompts.length}</span>
                </div>
              ))}

          {(filtered as unknown[]).length === 0 && <div className="py-8 text-center text-sm text-th-text-muted">필터와 일치하는 인용 결과가 없습니다.</div>}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-xl font-bold text-th-text tabular-nums">{value}</span>
      <span className="text-xs text-th-text-muted">{label}</span>
    </div>
  );
}