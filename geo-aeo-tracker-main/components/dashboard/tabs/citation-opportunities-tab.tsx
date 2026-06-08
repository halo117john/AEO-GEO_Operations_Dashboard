"use client";

import { useMemo, useState, useCallback } from "react";
import type { ScrapeRun } from "@/components/dashboard/types";
import { AlertCircle, Target, ExternalLink } from "lucide-react";

type CitationOpportunitiesTabProps = {
  runs: ScrapeRun[];
  brandWebsites?: string[];
};

// 💡 [정제 로직 1] 도메인 추출 시 www. 와 m. 을 완벽히 제거
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

// 💡 [정제 로직 2] KPI 카드와 완벽히 동일한 쓰레기 및 구글 노이즈 필터링
const EXCLUDED_DOMAINS = new Set([
  "support.google.com",
  "policies.google.com",
  "policy.google.com",
  "cloudfront.net", "cdn.prod.website-files.com", "cdn.jsdelivr.net",
  "cdnjs.cloudflare.com", "unpkg.com", "fastly.net", "akamaihd.net",
  "connect.facebook.net", "facebook.net", "google-analytics.com",
  "googletagmanager.com", "doubleclick.net", "w3.org", "schema.org",
  "amazonaws.com", "cloudflare.com", "hotjar.com", "sentry.io"
]);

type SortKey = "citations" | "pages" | "competitors" | "priority" | "domain";

export function CitationOpportunitiesTab({ runs, brandWebsites = [] }: CitationOpportunitiesTabProps) {
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"domain" | "url">("domain");
  const [sortBy, setSortBy] = useState<SortKey>("priority");
  const [expandedDomains, setExpandedDomains] = useState<Record<string, boolean>>({});

  // 1. 내 브랜드가 언급되지 않은 '기회' 데이터 정제 및 그룹화
  const opportunities = useMemo(() => {
    const map = new Map<string, {
      urls: Set<string>;
      totalCitations: number;
      competitorsMentioned: Set<string>;
      prompts: Set<string>;
    }>();

    const junkExtPattern = /\.(png|jpe?g|gif|svg|webp|avif|ico|css|js|woff2?|ttf|eot|mp4|webm)(\?|$)/i;

    // 내 브랜드가 없는 응답(Run)들만 필터링
    const missedRuns = runs.filter(r => (r.brandMentions?.length ?? 0) === 0 || r.sentiment === "not-mentioned");

    missedRuns.forEach((run) => {
      const comps = run.competitorMentions || [];
      
      (run.sources || []).forEach((url) => {
        try {
          const parsed = new URL(url);
          const domain = extractDomain(url);
          
          // 노이즈, 블랙리스트, 너무 긴 파라미터 제외 (KPI 카드와 100% 동일한 기준)
          if (EXCLUDED_DOMAINS.has(domain) || junkExtPattern.test(parsed.pathname) || parsed.search.length > 200) return;

          const existing = map.get(domain) ?? {
            urls: new Set(),
            totalCitations: 0,
            competitorsMentioned: new Set(),
            prompts: new Set(),
          };

          existing.urls.add(url);
          existing.totalCitations += 1;
          existing.prompts.add(run.prompt);
          comps.forEach(c => existing.competitorsMentioned.add(c));
          
          map.set(domain, existing);
        } catch { /* skip invalid urls */ }
      });
    });

    return [...map.entries()].map(([domain, data]) => {
      const compCount = data.competitorsMentioned.size;
      const isHighPriority = compCount > 0;
      return {
        domain,
        urls: [...data.urls],
        totalCitations: data.totalCitations,
        competitorsMentioned: [...data.competitorsMentioned],
        competitorCount: compCount,
        prompts: [...data.prompts],
        isHighPriority,
        isOwn: brandWebsites.some(w => domain === extractDomain(w)),
      };
    }).filter(d => !d.isOwn); // 내 사이트는 당연히 기회 대상에서 제외
  }, [runs, brandWebsites]);

  // URL 단위로 풀어헤친 리스트 (URL 뷰 용)
  const urlOpportunities = useMemo(() => {
    const list: Array<{ url: string, domain: string, count: number, competitors: string[], prompts: string[], isHighPriority: boolean }> = [];
    opportunities.forEach(group => {
      group.urls.forEach(url => {
        let urlCount = 0;
        const comps = new Set<string>();
        const prompts = new Set<string>();
        
        runs.filter(r => (r.brandMentions?.length ?? 0) === 0 || r.sentiment === "not-mentioned").forEach(r => {
          if (r.sources.includes(url)) {
            urlCount++;
            prompts.add(r.prompt);
            (r.competitorMentions || []).forEach(c => comps.add(c));
          }
        });
        
        list.push({
          url,
          domain: group.domain,
          count: urlCount,
          competitors: [...comps],
          prompts: [...prompts],
          isHighPriority: comps.size > 0
        });
      });
    });
    return list;
  }, [opportunities, runs]);

  // 필터 및 정렬
  const filtered = useMemo(() => {
    const q = search.toLowerCase();

    if (view === "domain") {
      let list = opportunities.filter((d) => !q || d.domain.toLowerCase().includes(q));
      if (sortBy === "domain") list = list.sort((a, b) => a.domain.localeCompare(b.domain));
      else if (sortBy === "pages") list = list.sort((a, b) => b.urls.length - a.urls.length);
      else if (sortBy === "citations") list = list.sort((a, b) => b.totalCitations - a.totalCitations);
      else if (sortBy === "competitors") list = list.sort((a, b) => b.competitorCount - a.competitorCount);
      else if (sortBy === "priority") list = list.sort((a, b) => (b.isHighPriority ? 1 : 0) - (a.isHighPriority ? 1 : 0) || b.totalCitations - a.totalCitations);
      return list;
    }

    let urlList = urlOpportunities.filter((p) => !q || p.url.toLowerCase().includes(q) || p.competitors.some(c => c.toLowerCase().includes(q)));
    if (sortBy === "domain") urlList = urlList.sort((a, b) => a.domain.localeCompare(b.domain));
    else if (sortBy === "citations") urlList = urlList.sort((a, b) => b.count - a.count);
    else if (sortBy === "competitors") urlList = urlList.sort((a, b) => b.competitors.length - a.competitors.length);
    else if (sortBy === "priority") urlList = urlList.sort((a, b) => (b.isHighPriority ? 1 : 0) - (a.isHighPriority ? 1 : 0) || b.count - a.count);
    return urlList;
  }, [search, view, opportunities, urlOpportunities, sortBy]);

  // 상단 통계 수치
  const totalOpps = useMemo(() => opportunities.reduce((a, b) => a + b.urls.length, 0), [opportunities]);
  const highPriorityOpps = useMemo(() => opportunities.filter(o => o.isHighPriority).length, [opportunities]);
  const totalCompetitors = useMemo(() => {
    const s = new Set<string>();
    opportunities.forEach(o => o.competitorsMentioned.forEach(c => s.add(c)));
    return s.size;
  }, [opportunities]);

  const exportCsv = useCallback(() => {
    let csv = "도메인,URL,우선순위,인용 횟수,언급된 경쟁사,관련 프롬프트\n";
    urlOpportunities.forEach((item) => {
      csv += `"${item.domain}","${item.url}","${item.isHighPriority ? '높음' : '보통'}",${item.count},"${item.competitors.join(", ")}","${item.prompts.join(" | ")}"\n`;
    });
    const bom = "\uFEFF";
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `기회발굴-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [urlOpportunities]);

  if (runs.length === 0 || opportunities.length === 0) {
    return (
      <div className="rounded-lg border border-th-border bg-th-card-alt p-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-th-accent-soft">
          <Target className="text-th-text-accent" />
        </div>
        <p className="text-sm font-medium text-th-text">발견된 인용 기회가 없습니다.</p>
        <p className="mt-1 text-sm text-th-text-secondary">
          AI 모델이 내 브랜드를 언급하지 않고 출처를 인용하는 경우 이곳에 표시됩니다.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-th-accent tabular-nums">{totalOpps}</span>
            <span className="text-xs text-th-text-muted">총 기회 발견</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-th-text tabular-nums">{opportunities.length}</span>
            <span className="text-xs text-th-text-muted">도메인 수</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-th-danger tabular-nums">{highPriorityOpps}</span>
            <span className="text-xs font-medium text-th-danger">우선순위 높음</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-th-text tabular-nums">{totalCompetitors}</span>
            <span className="text-xs text-th-text-muted">경쟁사 발견됨</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-th-border text-xs">
            <button onClick={() => setView("domain")} className={`px-2.5 py-1 rounded-l-md transition-colors ${view === "domain" ? "bg-th-accent-soft text-th-text font-medium" : "text-th-text-muted hover:text-th-text-secondary"}`}>도메인 뷰</button>
            <button onClick={() => setView("url")} className={`px-2.5 py-1 rounded-r-md transition-colors ${view === "url" ? "bg-th-accent-soft text-th-text font-medium" : "text-th-text-muted hover:text-th-text-secondary"}`}>URL 뷰</button>
          </div>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} className="bd-input rounded-md px-2 py-1 text-xs">
            <option value="priority">정렬: 우선순위 높은 순</option>
            <option value="citations">정렬: 인용 많은 순</option>
            <option value="pages">정렬: 페이지 많은 순</option>
            <option value="competitors">정렬: 경쟁사 많은 순</option>
          </select>
          <button onClick={exportCsv} className="rounded-md border border-th-border px-2 py-1 text-xs text-th-text-muted hover:bg-th-card-hover hover:text-th-text-secondary transition-colors" title="CSV 내보내기">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-th-border bg-th-card-alt p-3 flex gap-3 text-sm">
        <AlertCircle className="h-5 w-5 text-th-text-muted shrink-0" />
        <p className="text-th-text-secondary leading-relaxed">
          AI 모델이 응답할 때 내 브랜드를 언급하지 않고 인용한 URL 목록입니다. 이 페이지들에 내 브랜드가 노출되도록 작업하면 AI 가시성을 높일 수 있습니다. <span className="font-semibold text-th-danger">우선순위 높음(High)</span>으로 표시된 항목은 경쟁사들이 이미 언급되고 있는 곳입니다.
        </p>
      </div>

      <div className="relative">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="도메인, URL, 또는 경쟁사 이름으로 필터링..." className="bd-input w-full rounded-md py-1.5 pl-9 pr-8 text-sm" />
        <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-th-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
        {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-th-text-muted hover:text-th-text text-xs">✕</button>}
      </div>

      <div className="rounded-lg border border-th-border overflow-hidden">
        <div className="grid grid-cols-[1fr_64px_64px_80px_80px] gap-2 bg-th-card px-4 py-2 text-xs font-medium uppercase tracking-wider text-th-text-muted border-b border-th-border">
          <span>출처 (Source)</span>
          <span className="text-right">인용 횟수</span>
          <span className="text-right">{view === "domain" ? "페이지 수" : ""}</span>
          <span className="text-right">경쟁사 수</span>
          <span className="text-right">우선순위</span>
        </div>

        <div className="max-h-[520px] overflow-auto divide-y divide-th-border/60">
          {view === "domain"
            ? (filtered as typeof opportunities).map((item, idx) => {
                const isOpen = expandedDomains[item.domain];
                return (
                  <div key={item.domain}>
                    <button onClick={() => setExpandedDomains((prev) => ({ ...prev, [item.domain]: !prev[item.domain] }))} className={`grid w-full grid-cols-[1fr_64px_64px_80px_80px] gap-2 items-center px-4 py-2.5 text-left transition-colors hover:bg-th-card-hover ${isOpen ? "bg-th-card-hover/50" : idx % 2 === 0 ? "bg-th-card" : "bg-th-card-alt"}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-th-text-muted">{isOpen ? "▾" : "▸"}</span>
                        <span className="text-sm font-medium text-th-text truncate">{item.domain}</span>
                      </div>
                      <span className="text-right text-sm font-semibold text-th-text tabular-nums">{item.totalCitations}</span>
                      <span className="text-right text-sm text-th-text-secondary tabular-nums">{item.urls.length}</span>
                      <span className="text-right text-sm text-th-text-secondary tabular-nums">{item.competitorCount}</span>
                      <span className="text-right">
                        {item.isHighPriority ? <span className="rounded bg-th-danger-soft px-1.5 py-0.5 text-[10px] font-bold text-th-danger">높음</span> : <span className="text-xs text-th-text-muted">—</span>}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="border-t border-th-border/40 bg-th-card-alt/50">
                        {item.urls.map((url) => {
                          const urlData = urlOpportunities.find(u => u.url === url);
                          return (
                            <div key={url} className="grid grid-cols-[1fr_64px_64px_80px_80px] gap-2 items-center px-4 py-2 pl-10 border-b border-th-border/30 last:border-b-0">
                              <div className="flex items-center gap-2 min-w-0">
                                <a href={url} target="_blank" rel="noreferrer" className="text-sm text-th-text-accent hover:underline truncate" title={url}>{extractPath(url)}</a>
                                <ExternalLink className="h-3 w-3 text-th-text-muted shrink-0" />
                              </div>
                              <span className="text-right text-xs text-th-text-secondary tabular-nums">{urlData?.count}</span>
                              <span />
                              <div className="text-right text-xs text-th-text-muted truncate" title={urlData?.competitors.join(", ")}>
                                {urlData && urlData.competitors.length > 0 ? urlData.competitors[0] + (urlData.competitors.length > 1 ? ` 외 ${urlData.competitors.length - 1}` : "") : "—"}
                              </div>
                              <span className="text-right">
                                {urlData?.isHighPriority ? <span className="rounded bg-th-danger-soft px-1.5 py-0.5 text-[10px] font-bold text-th-danger">높음</span> : <span className="text-xs text-th-text-muted">—</span>}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            : (filtered as typeof urlOpportunities).map((item, idx) => (
                <div key={item.url} className={`grid grid-cols-[1fr_64px_64px_80px_80px] gap-2 items-center px-4 py-2.5 ${idx % 2 === 0 ? "bg-th-card" : "bg-th-card-alt"}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="shrink-0 text-xs text-th-text-muted">{item.domain}</span>
                    <a href={item.url} target="_blank" rel="noreferrer" className="text-sm text-th-text-accent hover:underline truncate min-w-0" title={item.url}>{extractPath(item.url)}</a>
                  </div>
                  <span className="text-right text-sm font-semibold text-th-text tabular-nums">{item.count}</span>
                  <span />
                  <div className="text-right text-xs text-th-text-muted truncate" title={item.competitors.join(", ")}>
                    {item.competitors.length > 0 ? item.competitors[0] + (item.competitors.length > 1 ? ` 외 ${item.competitors.length - 1}` : "") : "—"}
                  </div>
                  <span className="text-right">
                    {item.isHighPriority ? <span className="rounded bg-th-danger-soft px-1.5 py-0.5 text-[10px] font-bold text-th-danger">높음</span> : <span className="text-xs text-th-text-muted">—</span>}
                  </span>
                </div>
              ))}
          {(filtered as unknown[]).length === 0 && <div className="py-8 text-center text-sm text-th-text-muted">일치하는 기회가 없습니다.</div>}
        </div>
      </div>
      <div className="text-right text-xs text-th-text-muted">
        총 {view === "domain" ? `${opportunities.length}개의 도메인` : `${urlOpportunities.length}개의 기회`} 중 {(filtered as unknown[]).length}개 표시됨
      </div>
    </div>
  );
}