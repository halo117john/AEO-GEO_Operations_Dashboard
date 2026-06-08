"use client";

import { useState } from "react";

type DocSection = {
  id: string;
  title: string;
  icon: string;
  content: string[];
};

const sections: DocSection[] = [
  {
    id: "overview",
    title: "개요",
    icon: "📖",
    content: [
      "GEO/AEO 트래커는 내 브랜드가 다양한 AI 모델에서 어떻게 나타나는지 모니터링하는 로컬 퍼스트 오픈소스 인텔리전스 대시보드입니다.",
      "주요 기능: 다중 모델 브랜드 추적, 가시성 점수 측정, 감성 분석, 인용 출처 발굴, 경쟁사 분석, AEO 사이트 진단 및 자동화 템플릿 제공.",
    ],
  },
  {
    id: "project-settings",
    title: "프로젝트 설정",
    icon: "⚙️",
    content: [
      "브랜드의 정체성을 구성하세요: 이름, 별칭, 웹사이트 URL, 산업군, 타겟 키워드 및 간략한 설명을 입력합니다.",
      "이 컨텍스트는 모든 AI 프롬프트에 주입되어 분석 결과가 실제 비즈니스 상황에 맞게 도출되도록 돕습니다.",
      "브랜드 별칭을 사용하면 약어나 비공식 명칭(예: 'Youtube'를 'YT'로 인식)도 함께 추적할 수 있습니다.",
      "새로운 시작이 필요하다면 이 탭에서 모든 데이터를 초기화할 수 있습니다.",
    ],
  },
  {
    id: "prompt-hub",
    title: "프롬프트 허브",
    icon: "💬",
    content: [
      "추적할 프롬프트 라이브러리를 구축하세요. {brand} 태그를 사용하면 실행 시 자동으로 실제 브랜드 이름으로 바뀝니다.",
      "단일 프롬프트를 모든 활성 모델에 실행하거나, 전체 라이브러리를 일괄 실행할 수 있습니다.",
      "프롬프트는 워크스페이스별로 저장되므로, 브랜드마다 독립적인 프롬프트 세트를 관리할 수 있습니다.",
      "팁: 프롬프트에 '출처 포함' 또는 '참고 문헌 포함'이라는 문구를 넣으면 AI 모델이 '인용 통계' 탭에서 분석할 수 있는 URL을 더 잘 제공합니다.",
    ],
  },
  {
    id: "persona-fanout",
    title: "페르소나 확장",
    icon: "👥",
    content: [
      "하나의 핵심 질문을 작성하고 페르소나 목록(CMO, SEO 팀장, 창업자 등)을 정의하세요.",
      "시스템이 페르소나별 맞춤형 프롬프트 변형을 자동으로 생성합니다.",
      "각 변형을 독립적으로 실행하여 타겟 청중의 관점에 따라 AI의 응답과 브랜드 가시성이 어떻게 변하는지 비교해 보세요.",
      "이를 통해 내 브랜드가 어떤 고객 페르소나에게 가장 강력하게 인식되는지 파악할 수 있습니다.",
    ],
  },
  {
    id: "niche-explorer",
    title: "틈새 시장 탐색",
    icon: "🔍",
    content: [
      "타겟 시장이나 제품 카테고리를 입력하여 실제 구매자가 AI 비서에게 물어볼 법한 구매 의도가 높은 검색어를 생성하세요.",
      "생성된 질문들은 정보 탐색, 비교, 결정 단계의 의도를 포함하고 있습니다.",
      "생성된 질문 중 마음에 드는 것을 프롬프트 허브에 직접 추가하여 지속적으로 모니터링할 수 있습니다.",
      "직접 생각하기 어려운 포괄적인 모니터링 세트를 구축하는 데 활용하세요.",
    ],
  },
  {
    id: "responses",
    title: "AI 응답 결과",
    icon: "📝",
    content: [
      "프롬프트별로 그룹화된 모든 AI 모델의 응답을 찾아보세요.",
      "각 응답에는 제공자 뱃지, 가시성 점수(0~100), 감성 태그, 브랜드/경쟁사 강조 표시 및 인용 출처가 표시됩니다.",
      "모델별, 감성별로 필터링하거나 날짜 또는 점수순으로 정렬할 수 있습니다.",
      "상단 요약 바에서는 평균 점수, 브랜드 언급률, 감성 분포 및 모델별 평균 통계를 보여줍니다.",
      "응답 카드를 펼치면 내 브랜드는 파란색, 경쟁사는 주황색으로 강조된 전체 답변을 읽을 수 있습니다.",
    ],
  },
  {
    id: "visibility-analytics",
    title: "가시성 분석",
    icon: "📊",
    content: [
      "추세선 차트를 통해 브랜드의 평균 가시성 점수 변화를 추적하세요.",
      "차트는 모든 프롬프트와 모델에 걸친 일일 평균 가시성 비율(%)을 표시합니다.",
      "요약 카드를 통해 전반적인 평균 가시성과 감성 분포(긍정, 중립, 부정, 언급 안 됨)를 확인할 수 있습니다.",
      "외부 분석을 위해 모든 실행 데이터나 추세 데이터를 CSV 파일로 내보낼 수 있습니다.",
    ],
  },
  {
    id: "citations",
    title: "인용 통계",
    icon: "🔗",
    content: [
      "AI 모델이 응답에서 가장 자주 인용하는 URL과 도메인을 분석하세요.",
      "최다 인용 도메인 차트를 확인하고 URL/도메인 검색, 다양한 기준(인용수/페이지수/프롬프트수/이름순)으로 정렬이 가능합니다.",
      "도메인 단위 뷰와 개별 URL 단위 뷰를 전환하며 볼 수 있습니다.",
      "최소 인용 횟수로 필터링하고 전체 테이블을 CSV로 내보낼 수 있습니다.",
      "자사 웹사이트는 '내 사이트' 아이콘으로 표시되어 내 도메인이 인용되고 있는지 쉽게 확인 가능합니다.",
      "인용 기회 KPI: 내 브랜드는 언급되지 않았지만 경쟁사가 언급된 응답에서 인용된 고유 도메인 수를 계산합니다. 이는 핵심 홍보 타겟이 됩니다.",
    ],
  },
  {
    id: "battlecards",
    title: "경쟁사 분석",
    icon: "🏆",
    content: [
      "경쟁사 이름을 입력하여 AI 기반의 배틀카드를 생성하세요.",
      "각 배틀카드에는 감성 평가, 요약, 장점, 단점, 가격 정책 인사이트, AI 가시성 메모 및 핵심 차별화 요소가 포함됩니다.",
      "배틀카드는 감성에 따라 색상으로 구분됩니다 (초록=긍정, 노랑=중립, 빨강=부정).",
      "AI 모델이 내 브랜드와 비교하여 경쟁사를 어떻게 인식하는지 파악하는 데 활용하세요.",
    ],
  },
  {
    id: "aeo-audit",
    title: "AEO 사이트 진단",
    icon: "✅",
    content: [
      "특정 URL을 입력하여 답변 엔진 최적화(AEO) 진단을 실행하세요.",
      "검사 항목: llms.txt 존재 여부, 스키마/구조화 데이터 신호, 콘텐츠 명확성(BLUF), 기술적 준비 상태 등.",
      "각 검사는 카테고리별로 분류되며 통과 여부와 상세 설명을 제공합니다.",
      "종합 점수(0~100)는 해당 페이지가 AI 생성 답변에 노출될 준비가 얼마나 되었는지를 나타냅니다.",
    ],
  },
  {
    id: "sro-analysis",
    title: "SRO 분석",
    icon: "📡",
    content: [
      "선택률 최적화(SRO)는 특정 URL+키워드 조합에 대해 6단계 심층 분석 파이프라인을 실행합니다.",
      "1단계 — Gemini 그라운딩: Google Gemini 모델이 그라운딩 메타데이터를 통해 내 콘텐츠를 인용하는지 확인합니다.",
      "2단계 — 교차 플랫폼 인용: 6개 AI 플랫폼에서 내 URL을 인용하는지 스캔합니다.",
      "3단계 — SERP 데이터: 실제 유기적 검색 결과를 가져와 내 순위와 주요 경쟁사를 파악합니다.",
      "4단계 — 페이지 스크래핑: 타겟 페이지와 경쟁사 페이지를 긁어와 콘텐츠를 비교합니다.",
      "5단계 — 사이트 컨텍스트: 홈페이지에서 핵심 정보를 추출하여 맞춤형 권장 사항을 생성합니다.",
      "6단계 — LLM 분석: 수집된 모든 데이터를 종합하여 SRO 점수, 실행 가능한 권장 사항, 콘텐츠 격차 및 경쟁사 인사이트를 도출합니다.",
      "결과에는 종합 점수 링, 플랫폼별 인용 현황, SERP 순위표, 우선순위 권장 사항 등이 포함됩니다.",
      "SRO 탭은 백그라운드에서 유지되므로 분석이 진행되는 동안 다른 탭을 오가도 진행 상황이 소실되지 않습니다.",
      "참고: 플랫폼 인용 확인 단계는 다수 플랫폼의 데이터를 수집하므로 몇 분 정도 소요될 수 있습니다.",
    ],
  },
  {
    id: "automation",
    title: "자동화",
    icon: "⚡",
    content: [
      "반복적인 프롬프트 실행을 위한 스케줄링 템플릿을 확인하세요."
    ],
  },
  {
    id: "workspaces",
    title: "멀티 브랜드 워크스페이스",
    icon: "🏢",
    content: [
      "추적하는 각 브랜드나 클라이언트별로 별도의 워크스페이스를 만드세요.",
      "각 워크스페이스는 설정, 프롬프트, 실행 기록 등이 완전히 분리되어 관리됩니다.",
      "사이드바의 브랜드 선택기를 통해 워크스페이스를 즉시 전환할 수 있습니다.",
      "모든 워크스페이스 데이터는 브라우저에 로컬로 저장됩니다.",
    ],
  },
  {
    id: "scoring",
    title: "가시성 점수 산정",
    icon: "🎯",
    content: [
      "각 AI 응답은 브랜드가 얼마나 눈에 띄게 나타나는지에 따라 0~100점으로 채점됩니다:",
      "• 브랜드가 한 번이라도 언급됨 → +30점",
      "• 첫 200자 이내에 언급됨 (상단 노출) → +20점",
      "• 반복 언급: 2회 이상 → +8점, 3회 이상 → +15점",
      "• 자사 웹사이트 URL이 출처에 포함됨 → +20점",
      "• 긍정적 감성 감지 → +15점, 중립적 → +5점",
      "최대 점수는 100점으로 제한됩니다. 0점은 브랜드가 전혀 언급되지 않았음을 의미합니다.",
    ],
  },
  {
    id: "models",
    title: "지원되는 AI 모델",
    icon: "🤖",
    content: [
      "트래커는 Bright Data의 Scraper API를 통해 6가지 모델을 지원합니다:",
      "• ChatGPT — OpenAI의 대화형 모델",
      "• Perplexity — 실시간 인용 중심의 검색 AI",
      "• Copilot — Microsoft의 AI 비서",
      "• Gemini — Google의 멀티모달 AI",
      "• Google AI — Google의 검색 결과 요약(AI Overview/SGE)",
      "• Grok — xAI의 모델",
      "상단 툴바에서 모델을 켜고 끌 수 있으며, 여러 모델에서 동시에 프롬프트를 실행할 수 있습니다.",
    ],
  },
  {
    id: "api-routes",
    title: "API 경로 안내",
    icon: "🛰️",
    content: [
      "트래커는 /api/ 경로 아래 9개의 API 경로를 노출합니다:",
      "• POST /api/scrape — Bright Data를 통해 AI 모델을 조회합니다. 구조화된 분석 결과를 반환합니다.",
      "• POST /api/analyze — 배틀카드, 틈새 쿼리 생성 등에 사용되는 LLM 추론 경로입니다.",
      "• POST /api/audit — AEO 사이트 진단을 위해 URL을 크롤링하고 체크리스트를 실행합니다.",
      "• POST /api/sro-analyze — 모든 데이터를 종합하여 최종 SRO 점수와 권장 사항을 도출합니다.",
      "• POST /api/serp — 특정 키워드에 대한 실제 유기적 검색 결과를 가져옵니다.",
      "• POST /api/site-context — 홈페이지 컨텍스트를 추출합니다.",
      "• POST /api/unlocker — Bright Data Web Unlocker를 통해 URL을 스크래핑합니다.",
      "• POST /api/brightdata-platforms — AI 플랫폼의 인용 여부를 폴링합니다.",
      "• POST /api/bulk-sro — 여러 키워드에 대한 SRO 분석을 실행하는 스트리밍 엔드포인트입니다.",
      "대부분의 경로는 비용 절감을 위해 메모리 캐싱을 사용하며 입력 유효성 검사가 포함되어 있습니다.",
    ],
  },
  {
    id: "environment",
    title: "환경 설정",
    icon: "🔑",
    content: [
      "앱을 실행하려면 .env 파일에 3가지 API 키가 필요합니다:",
      "• OPENROUTER_KEY — LLM 분석 기능을 위한 키입니다.",
      "• GEMINI_API_KEY — SRO 분석의 Gemini 그라운딩 단계를 위한 키입니다.",
      "• CHATGPT, PERPLEXITY, COPILOT, GEMINI, GOOGLE_AI, GROK용 데이터셋 ID",
      "설정을 시작하려면 .env.example 파일을 .env로 복사하고 키를 입력하세요.",
    ],
  },
];

export function DocumentationTab() {
  const [activeSection, setActiveSection] = useState("overview");
  const [search, setSearch] = useState("");

  const filteredSections = search.trim()
    ? sections.filter(
        (s) =>
          s.title.toLowerCase().includes(search.toLowerCase()) ||
          s.content.some((line) => line.toLowerCase().includes(search.toLowerCase())),
      )
    : sections;

  const current = sections.find((s) => s.id === activeSection);

  return (
    <div className="flex gap-4">
      {/* 사이드바 목차 (Sidebar TOC) */}
      <div className="w-52 shrink-0">
        <div className="mb-3">
          <input
            type="text"
            placeholder="문서 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bd-input w-full rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <nav className="space-y-0.5 max-h-[65vh] overflow-y-auto">
          {filteredSections.map((section) => (
            <button
              key={section.id}
              onClick={() => {
                setActiveSection(section.id);
                setSearch("");
              }}
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors ${
                activeSection === section.id
                  ? "bg-th-accent-soft text-th-text-accent font-medium"
                  : "text-th-text-secondary hover:bg-th-card-hover hover:text-th-text"
              }`}
            >
              <span className="text-sm">{section.icon}</span>
              <span className="truncate">{section.title}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* 본문 내용 (Content) */}
      <div className="min-w-0 flex-1">
        {current ? (
          <div>
            <div className="mb-4 flex items-center gap-3">
              <span className="text-2xl">{current.icon}</span>
              <h2 className="text-lg font-semibold text-th-text">{current.title}</h2>
            </div>
            <div className="space-y-3">
              {current.content.map((line, i) => {
                if (line.startsWith("• ")) {
                  return (
                    <div key={i} className="ml-4 flex items-start gap-2 text-sm text-th-text-secondary leading-relaxed">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-th-accent" />
                      <span>{line.slice(2)}</span>
                    </div>
                  );
                }
                return (
                  <p key={i} className="text-sm leading-relaxed text-th-text-secondary">
                    {line}
                  </p>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-th-text-muted">
            {search ? `"${search}"에 일치하는 문서가 없습니다.` : "사이드바에서 섹션을 선택하세요."}
          </div>
        )}

        {/* 퀵 내비게이션 (Quick nav) */}
        {current && (
          <div className="mt-6 flex items-center gap-2 border-t border-th-border pt-4">
            {(() => {
              const idx = sections.findIndex((s) => s.id === current.id);
              const prev = idx > 0 ? sections[idx - 1] : null;
              const next = idx < sections.length - 1 ? sections[idx + 1] : null;
              return (
                <>
                  {prev && (
                    <button
                      onClick={() => setActiveSection(prev.id)}
                      className="flex items-center gap-1.5 rounded-lg border border-th-border px-3 py-1.5 text-xs text-th-text-secondary hover:bg-th-card-hover transition-colors"
                    >
                      ← {prev.title}
                    </button>
                  )}
                  <div className="flex-1" />
                  {next && (
                    <button
                      onClick={() => setActiveSection(next.id)}
                      className="flex items-center gap-1.5 rounded-lg border border-th-border px-3 py-1.5 text-xs text-th-text-secondary hover:bg-th-card-hover transition-colors"
                    >
                      {next.title} →
                    </button>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}