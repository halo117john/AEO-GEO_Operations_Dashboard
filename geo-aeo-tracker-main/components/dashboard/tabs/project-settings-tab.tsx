import { useState, useSyncExternalStore } from "react";
import type { BrandConfig } from "@/components/dashboard/types";
import {
  isCloudAvailable,
  isCloudEnabledByUser,
  setCloudEnabledByUser,
} from "@/lib/client/cloud-mode";

type ProjectSettingsTabProps = {
  brand: BrandConfig;
  onBrandChange: (patch: Partial<BrandConfig>) => void;
  onReset?: () => void;
};

export function ProjectSettingsTab({ brand, onBrandChange, onReset }: ProjectSettingsTabProps) {
  return (
    <div className="space-y-5">
      <div>
        <div className="mb-3 text-base font-semibold text-th-text">브랜드 및 웹사이트 설정</div>
        <p className="mb-4 text-sm leading-relaxed text-th-text-muted">
          브랜드 정보를 설정하여 모든 프롬프트, 진단 및 분석이 내 웹사이트에 맞춤화되도록 하세요.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Field
          label="브랜드 / 회사명"
          placeholder="예: 애플리케이션 코퍼레이션"
          value={brand.brandName}
          onChange={(v) => onBrandChange({ brandName: v })}
        />
        <Field
          label="브랜드 별칭 (쉼표로 구분)"
          placeholder="예: 앱코, 앱코퍼레이션, appco.com"
          value={brand.brandAliases}
          onChange={(v) => onBrandChange({ brandAliases: v })}
        />
        <div className="xl:col-span-2">
          <WebsiteListField
            websites={brand.websites}
            onChange={(websites) => onBrandChange({ websites })}
          />
        </div>
        <Field
          label="산업 / 업종"
          placeholder="예: B2B SaaS, 전자상거래, 헬스케어..."
          value={brand.industry}
          onChange={(v) => onBrandChange({ industry: v })}
        />
        <Field
          label="타겟 키워드 (쉼표로 구분)"
          placeholder="예: AI 분석, 답변 엔진 최적화, GEO 툴"
          value={brand.keywords}
          onChange={(v) => onBrandChange({ keywords: v })}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-th-text-muted">
          브랜드 설명
        </label>
        <textarea
          value={brand.description}
          onChange={(e) => onBrandChange({ description: e.target.value })}
          placeholder="AI 모델이 연관성을 잘 평가할 수 있도록 제품이나 서비스에 대한 간략한 설명을 적어주세요..."
          className="bd-input h-28 w-full rounded-lg p-2.5 text-sm"
        />
      </div>

      {/* 설정 완료 상태 표시기 */}
      <div className="grid gap-2 sm:grid-cols-3">
        <StatusChip
          label="브랜드명"
          ok={brand.brandName.trim().length > 0}
        />
        <StatusChip
          label="웹사이트"
          ok={brand.websites.length > 0 && brand.websites.some((w) => w.trim().length > 0)}
        />
        <StatusChip
          label="키워드"
          ok={brand.keywords.trim().length > 0}
        />
      </div>

      

      {/* 위험 구역 (데이터 초기화) */}
      {onReset && (
        <div className="rounded-lg border border-th-danger/30 bg-th-danger-soft p-4">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-th-danger">데이터 초기화</div>
          <p className="mb-3 text-sm text-th-danger/70">실행 기록, 프롬프트, 설정 및 진단 결과를 포함한 모든 저장된 데이터를 삭제합니다. 이 작업은 되돌릴 수 없습니다.</p>
          <button
            onClick={onReset}
            className="rounded-lg border border-th-danger/40 bg-th-danger-soft px-4 py-2 text-sm font-medium text-th-danger hover:bg-th-danger/20"
          >
            모든 데이터 초기화
          </button>
        </div>
      )}
    </div>
  );
}

function subscribeToCloudPref(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: StorageEvent) => {
    if (e.key === "sovereign-cloud-sync") callback();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

function CloudSyncCard() {
  const enabled = useSyncExternalStore(
    subscribeToCloudPref,
    () => isCloudEnabledByUser(),
    () => true,
  );
  const available = useSyncExternalStore(
    () => () => {},
    () => isCloudAvailable(),
    () => false,
  );



  
}

function WebsiteListField({
  websites,
  onChange,
}: {
  websites: string[];
  onChange: (websites: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function addUrl() {
    const url = draft.trim();
    if (!url) return;
    onChange([...websites, url]);
    setDraft("");
  }

  return (
    <div>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-th-text-muted">
        웹사이트 주소 (URL)
      </label>
      {websites.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {websites.map((url, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 rounded-full bg-th-card-alt border border-th-border px-3 py-1 text-sm text-th-text"
            >
              {url.replace(/^https?:\/\//, "")}
              <button
                onClick={() => onChange(websites.filter((_, j) => j !== i))}
                className="rounded-full p-0.5 hover:bg-th-danger-soft hover:text-th-danger"
                title="삭제"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addUrl(); } }}
          placeholder="https://acme.com"
          className="bd-input flex-1 rounded-lg p-2.5 text-sm"
        />
        <button
          onClick={addUrl}
          disabled={!draft.trim()}
          className="rounded-lg bg-th-accent px-4 py-2 text-sm font-medium text-white hover:bg-th-accent-hover disabled:opacity-50"
        >
          추가
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-th-text-muted">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bd-input w-full rounded-lg p-2.5 text-sm"
      />
    </div>
  );
}

function StatusChip({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-th-border bg-th-card-alt px-3 py-2.5">
      <span
        className={`inline-block h-2.5 w-2.5 rounded-full ${ok ? "bg-th-success" : "bg-th-text-muted"}`}
      />
      <span className="text-sm text-th-text-secondary">{label}</span>
      <span className={`ml-auto text-xs font-medium ${ok ? "text-th-success" : "text-th-text-muted"}`}>
        {ok ? "입력됨" : "비어있음"}
      </span>
    </div>
  );
}