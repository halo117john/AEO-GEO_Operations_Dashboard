"use client";

import { useState, useMemo } from "react";
import type { TaggedPrompt } from "@/components/dashboard/types";
import { Play, Trash2, CheckSquare, Square } from "lucide-react";

type PromptHubTabProps = {
  customPrompts: TaggedPrompt[];
  brandName: string;
  busy: boolean;
  activeProviderCount: number;
  onAddCustomPrompt: (val: string) => void;
  onRemoveCustomPrompt: (val: string, del: boolean) => void;
  onUpdatePromptTags: (text: string, tags: string[]) => void;
  onRunPrompt: (prompt: string) => void;
  onBatchRunSelected: (texts: string[]) => void;
  onBulkDeletePrompts: (texts: string[]) => void;
};

export function PromptHubTab({
  customPrompts,
  brandName,
  busy,
  activeProviderCount,
  onAddCustomPrompt,
  onRemoveCustomPrompt,
  onUpdatePromptTags,
  onRunPrompt,
  onBatchRunSelected,
  onBulkDeletePrompts,
}: PromptHubTabProps) {
  const [input, setInput] = useState("");
  const [selectedTexts, setSelectedTexts] = useState<string[]>([]);

  // 마스터 체크박스 핸들러
  const isAllSelected = useMemo(() => {
    return customPrompts.length > 0 && selectedTexts.length === customPrompts.length;
  }, [customPrompts, selectedTexts]);

  const handleToggleAll = () => {
    if (isAllSelected) {
      setSelectedTexts([]);
    } else {
      setSelectedTexts(customPrompts.map((p) => p.text));
    }
  };

  const handleToggleSelect = (text: string) => {
    setSelectedTexts((prev) =>
      prev.includes(text) ? prev.filter((t) => t !== text) : [...prev, text]
    );
  };

  return (
    <div className="space-y-4">
      {/* 등록 바 */}
      <form
        onSubmit={(e) => { e.preventDefault(); if(input.trim()){ onAddCustomPrompt(input); setInput(""); } }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="새로운 추적 프롬프트를 입력하세요... ({brand} 치환자 사용 가능)"
          className="bd-input flex-1 rounded-lg px-3 py-2 text-sm"
        />
        <button type="submit" disabled={busy} className="rounded-lg bg-th-accent px-4 py-2 text-sm font-semibold text-th-text-inverse hover:bg-th-accent/90">
          추가
        </button>
      </form>

      {/* 💡 상단 일괄 액션 컨트롤바 영역 */}
      <div className="flex items-center justify-between rounded-lg border border-th-border bg-th-card px-4 py-2.5 text-sm">
        <div className="flex items-center gap-2">
          <button type="button" onClick={handleToggleAll} className="text-th-text-muted hover:text-th-text">
            {isAllSelected ? <CheckSquare className="h-5 w-5 text-th-accent" /> : <Square className="h-5 w-5" />}
          </button>
          <span className="font-medium text-th-text-secondary">
            전체 선택 ({selectedTexts.length} / {customPrompts.length})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { onBatchRunSelected(selectedTexts); }}
            disabled={busy || selectedTexts.length === 0}
            className="flex items-center gap-1.5 rounded-lg bg-th-accent-soft px-3 py-1.5 text-xs font-bold text-th-text-accent hover:bg-th-accent/20 disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5" /> 선택된 프롬프트 전체 실행 ({activeProviderCount}개 모델)
          </button>
          <button
            onClick={() => {
              if (window.confirm(`선택한 ${selectedTexts.length}개의 프롬프트를 일괄 삭제하시겠습니까?`)) {
                onBulkDeletePrompts(selectedTexts);
                setSelectedTexts([]);
              }
            }}
            disabled={selectedTexts.length === 0}
            className="flex items-center gap-1.5 rounded-lg bg-th-danger-soft px-3 py-1.5 text-xs font-bold text-th-danger hover:bg-th-danger/20 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" /> 선택 삭제
          </button>
        </div>
      </div>

      {/* 리스트 목록 */}
      <div className="divide-y divide-th-border overflow-hidden rounded-lg border border-th-border bg-th-card">
        {customPrompts.map((p) => {
          const isSelected = selectedTexts.includes(p.text);
          const replacedText = p.text.replace(/\{brand\}/gi, brandName || "내 브랜드");

          return (
            <div key={p.text} className="flex items-center gap-3 px-4 py-3 hover:bg-th-card-hover">
              <button type="button" onClick={() => handleToggleSelect(p.text)} className="text-th-text-muted hover:text-th-text shrink-0">
                {isSelected ? <CheckSquare className="h-5 w-5 text-th-accent" /> : <Square className="h-5 w-5" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-th-text">{p.text}</p>
                <p className="text-xs text-th-text-muted mt-0.5 truncate italic">실제 검색어: {replacedText}</p>
              </div>
              <button
                onClick={() => onRunPrompt(replacedText)}
                disabled={busy}
                className="rounded p-1 text-th-text-muted hover:bg-th-accent-soft hover:text-th-text-accent"
                title="단일 실행"
              >
                <Play className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}