type FanOutTabProps = {
  prompt: string;
  personas: string;
  fanoutPrompts: string[];
  busy: boolean;
  onPromptChange: (value: string) => void;
  onPersonasChange: (value: string) => void;
  onGenerateFanout: () => void;
  onRunPrompt: (prompt: string) => void;
};

export function FanOutTab({
  prompt,
  personas,
  fanoutPrompts,
  busy,
  onPromptChange,
  onPersonasChange,
  onGenerateFanout,
  onRunPrompt,
}: FanOutTabProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        <label className="text-sm font-medium uppercase tracking-wider text-th-text-muted">
          코어 프롬프트
        </label>
        <textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          className="bd-input h-28 w-full rounded-lg p-2.5 text-sm"
        />
        <label className="text-sm font-medium uppercase tracking-wider text-th-text-muted">
          페르소나 (한 줄에 하나씩 입력)
        </label>
        <textarea
          value={personas}
          onChange={(e) => onPersonasChange(e.target.value)}
          className="bd-input h-32 w-full rounded-lg p-2.5 text-sm"
          placeholder={"최고 마케팅 책임자 (CMO)\nSEO 팀장\n제품 마케팅 매니저\n창업자"}
        />
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onGenerateFanout}
            className="bd-btn-primary rounded-lg px-4 py-2.5 text-sm"
          >
            페르소나별 변형 프롬프트 생성
          </button>
          <button
            disabled={busy}
            onClick={() => onRunPrompt(prompt)}
            className="bd-chip rounded-lg px-4 py-2.5 text-sm disabled:opacity-60"
          >
            코어 프롬프트만 실행
          </button>
        </div>
      </div>

      {/* 페르소나별 변형 프롬프트 대기열 사이드바 */}
      <div className="rounded-xl border border-th-border bg-th-card-alt p-4">
        <div className="mb-3 text-sm font-medium uppercase tracking-wider text-th-text-muted">
          실행 대기열 
        </div>
        {fanoutPrompts.length === 0 && (
          <p className="text-sm text-th-text-secondary">
            [페르소나별 변형 프롬프트 생성] 버튼을 누르면 여기에 목록이 채워집니다.
          </p>
        )}
        <ul className="max-h-[420px] space-y-2 overflow-auto pr-1 text-sm">
          {fanoutPrompts.map((item, index) => (
            <li
              key={`${item}-${index}`}
              className="rounded-lg border border-th-border bg-th-card p-3"
            >
              <div className="mb-2 line-clamp-3 text-th-text">{item}</div>
              <button
                onClick={() => onRunPrompt(item)}
                className="bd-btn-primary rounded-md px-3 py-1.5 text-xs"
              >
                실행
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}