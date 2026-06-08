"use client";

import { useMemo } from "react";
import type { TaggedPrompt } from "@/components/dashboard/types";
import { CheckSquare, Square, Layers, Clock, AlertTriangle, BellRing, Play, AlarmClock } from "lucide-react";

type AutomationTabProps = {
  scheduleEnabled: boolean;
  scheduleIntervalMs: number;
  scheduleTime: string; // 💡 신규: HH:mm 포맷
  lastScheduledRun: string | null;
  driftAlerts: any[];
  busy: boolean;
  customPrompts: TaggedPrompt[];
  automationPrompts: string[];
  onUpdateAutomationPrompts: (next: string[]) => void;
  onToggleSchedule: (enabled: boolean) => void;
  onIntervalChange: (interval: number) => void;
  onTimeChange: (time: string) => void; // 💡 신규: 시간 변경 함수
  onRunNow: () => void;
  onDismissAlert: (id: string) => void;
  onDismissAllAlerts: () => void;
};

const FIXED_SCHEDULE_OPTIONS = [
  { value: 6 * 60 * 60 * 1000, label: "6시간마다", desc: "자주 변동되는 키워드 모니터링용" },
  { value: 12 * 60 * 60 * 1000, label: "12시간마다", desc: "주요 모델 응답을 하루 2번 체크" },
  { value: 24 * 60 * 60 * 1000, label: "24시간마다", desc: "일반적인 일간 가시성 모니터링" },
  { value: 7 * 24 * 60 * 60 * 1000, label: "매주 (7일)", desc: "장기적인 브랜드 언급 변화 추적" },
];

export function AutomationTab({
  scheduleEnabled,
  scheduleIntervalMs,
  scheduleTime,
  lastScheduledRun,
  driftAlerts,
  busy,
  customPrompts,
  automationPrompts,
  onUpdateAutomationPrompts,
  onToggleSchedule,
  onIntervalChange,
  onTimeChange,
  onRunNow,
  onDismissAlert,
  onDismissAllAlerts,
}: AutomationTabProps) {
  const unreadAlerts = driftAlerts.filter((a) => !a.dismissed);

  const handleTogglePromptSelect = (text: string) => {
    if (automationPrompts.includes(text)) {
      onUpdateAutomationPrompts(automationPrompts.filter(t => t !== text));
    } else {
      onUpdateAutomationPrompts([...automationPrompts, text]);
    }
  };

  // 💡 [신규] 프롬프트 일괄 선택/해제 로직
  const isAllPromptsSelected = customPrompts.length > 0 && automationPrompts.length === customPrompts.length;
  const handleToggleAllPrompts = () => {
    if (isAllSelected) {
      onUpdateAutomationPrompts([]);
    } else {
      onUpdateAutomationPrompts(customPrompts.map(p => p.text));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── 1. 스케줄러 컨트롤 (상단) ── */}
      <div className="rounded-xl border border-th-border bg-th-card shadow-sm">
        <div className="border-b border-th-border p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-th-text-accent" />
                <h3 className="text-sm font-bold text-th-text">자동 실행 스케줄러</h3>
              </div>
              <p className="mt-1 text-xs text-th-text-muted">
                설정된 주기에 따라 선택된 프롬프트를 자동으로 실행합니다. 가시성 점수가 변동되면 알림이 생성됩니다.
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={scheduleEnabled}
                onChange={(e) => onToggleSchedule(e.target.checked)}
              />
              <div className="peer h-6 w-11 rounded-full bg-th-border after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-th-accent peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none" />
            </label>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {FIXED_SCHEDULE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onIntervalChange(opt.value)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  scheduleIntervalMs === opt.value
                    ? "border-th-accent bg-th-accent-soft text-th-text font-semibold"
                    : "border-th-border bg-th-card hover:bg-th-card-hover text-th-text-secondary"
                }`}
              >
                <div className="text-sm font-bold">{opt.label}</div>
                <div className="mt-1 text-xs opacity-80 leading-relaxed">{opt.desc}</div>
              </button>
            ))}
          </div>

          {/* 💡 [신규] 기준 실행 시각 설정 패널 */}
          <div className="rounded-lg border border-dashed border-th-border bg-th-card-alt/50 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlarmClock className="h-5 w-5 text-th-text-muted" />
              <div>
                <div className="text-xs font-bold text-th-text">실행 기준 시각 설정</div>
                <p className="text-[11px] text-th-text-muted mt-0.5">매일 또는 매주 지정된 시각을 기준으로 스케줄러가 작동합니다.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => onTimeChange(e.target.value)}
                className="bd-input rounded px-3 py-1.5 text-sm font-bold w-32 cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-th-card-alt p-3 text-sm">
            <div className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${scheduleEnabled ? "bg-th-success" : "bg-th-danger"}`} />
              <span className="font-medium text-th-text">
                스케줄러 {scheduleEnabled ? "켜짐" : "꺼짐"}
              </span>
              <span className="hidden text-th-text-muted sm:inline">
                · 현재 설정: <strong className="text-th-text-accent font-bold">{FIXED_SCHEDULE_OPTIONS.find(o => o.value === scheduleIntervalMs)?.label} {scheduleTime}</strong> 기준 작동
                {lastScheduledRun && ` · 최근 실행: ${lastScheduledRun.replace("T", " ").slice(0, 16)}`}
              </span>
            </div>
            <button
              onClick={onRunNow}
              disabled={busy}
              className="flex items-center gap-1.5 rounded bg-th-accent px-3 py-1.5 text-xs font-semibold text-th-text-inverse hover:bg-th-accent/90 disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5" />
              지금 즉시 실행
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. 자동화 대상 프롬프트 지정 대지 ── */}
      <div className="rounded-xl border border-th-border bg-th-card p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-th-border/60 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-th-text-accent" />
            <div>
              <h4 className="text-sm font-bold text-th-text">🎯 자동 실행 타겟 프롬프트 지정</h4>
              <p className="text-xs text-th-text-muted mt-0.5">
                스케줄러나 즉시 실행 버튼 클릭 시 자동으로 추적할 프롬프트들을 지정합니다.
              </p>
            </div>
          </div>
          {/* 💡 [신규] 일괄 선택/해제 컨트롤 */}
          <div className="flex items-center gap-4">
            <button 
              onClick={handleToggleAllPrompts} 
              className="flex items-center gap-1.5 text-xs font-medium text-th-text-muted hover:text-th-text"
            >
              {isAllPromptsSelected ? <CheckSquare className="h-4 w-4 text-th-accent" /> : <Square className="h-4 w-4" />}
              전체 선택
            </button>
            <div className="text-xs font-bold text-th-text-accent bg-th-accent-soft px-2 py-1 rounded">
              선택됨: {automationPrompts.length} / {customPrompts.length}
            </div>
          </div>
        </div>

        {customPrompts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-th-border p-6 text-center text-sm text-th-text-muted">
            프롬프트 허브에 등록된 프롬프트가 존재하지 않습니다. 먼저 프롬프트를 추가해주세요.
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-1 lg:grid-cols-2">
            {customPrompts.map((p) => {
              const isTargeted = automationPrompts.includes(p.text);
              return (
                <button
                  key={p.text}
                  type="button"
                  onClick={() => handleTogglePromptSelect(p.text)}
                  className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-all ${
                    isTargeted 
                      ? "border-th-accent/50 bg-th-accent-soft/40 text-th-text" 
                      : "border-th-border bg-th-card-alt text-th-text-secondary hover:bg-th-card-hover"
                  }`}
                >
                  <span className="mt-0.5 shrink-0">
                    {isTargeted ? <CheckSquare className="h-4 w-4 text-th-accent" /> : <Square className="h-4 w-4 text-th-text-muted" />}
                  </span>
                  <span className="text-xs font-medium leading-relaxed break-words">{p.text}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 3. 가이드 텍스트 (HOW IT WORKS) ── */}
      <div className="grid gap-4 rounded-xl border border-th-border bg-th-card-alt p-5 sm:grid-cols-3">
        <div>
          <div className="mb-2 flex items-center gap-2 font-bold text-th-text">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-th-accent-soft text-xs text-th-text-accent">1</span>
            자동 재실행
          </div>
          <p className="text-xs text-th-text-muted leading-relaxed">
            위에서 선택한 프롬프트들이 설정한 시간과 주기에 맞춰 백그라운드에서 다시 실행됩니다.
          </p>
        </div>
        <div>
          <div className="mb-2 flex items-center gap-2 font-bold text-th-text">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-th-accent-soft text-xs text-th-text-accent">2</span>
            결과 비교
          </div>
          <p className="text-xs text-th-text-muted leading-relaxed">
            실행된 각 결과는 동일한 프롬프트 및 모델의 이전 실행 결과(가시성 점수)와 자동으로 비교됩니다.
          </p>
        </div>
        <div>
          <div className="mb-2 flex items-center gap-2 font-bold text-th-text">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-th-accent-soft text-xs text-th-text-accent">3</span>
            변동 알림
          </div>
          <p className="text-xs text-th-text-muted leading-relaxed">
            가시성 점수가 이전보다 10점 이상 떨어지거나 오르면 하단에 알림 카드가 생성됩니다.
          </p>
        </div>
      </div>

      {/* ── 4. 변동 알림(Drift Alerts) 내역 ── */}
      <div className="rounded-xl border border-th-border bg-th-card shadow-sm">
        <div className="flex items-center justify-between border-b border-th-border p-4">
          <div className="flex items-center gap-2">
            <BellRing className="h-5 w-5 text-th-accent" />
            <h3 className="text-sm font-bold text-th-text">변동 알림</h3>
            {unreadAlerts.length > 0 && (
              <span className="rounded-full bg-th-danger px-2 py-0.5 text-xs font-bold text-white">
                {unreadAlerts.length}
              </span>
            )}
          </div>
          <button
            onClick={onDismissAllAlerts}
            disabled={unreadAlerts.length === 0}
            className="text-xs font-medium text-th-text-muted hover:text-th-text disabled:opacity-50"
          >
            모든 알림 읽음 처리
          </button>
        </div>

        <div className="divide-y divide-th-border max-h-[400px] overflow-y-auto">
          {unreadAlerts.length === 0 ? (
            <div className="p-8 text-center text-sm text-th-text-muted">
              새로운 변동 알림이 없습니다.
            </div>
          ) : (
            unreadAlerts.map((alert) => (
              <div key={alert.id} className="flex items-start gap-4 p-4 hover:bg-th-card-hover">
                <div className="mt-1 shrink-0 rounded-full bg-th-danger-soft p-1.5 text-th-danger">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center justify-between gap-4">
                    <span className="text-xs font-semibold uppercase text-th-text-muted">
                      {alert.provider}
                    </span>
                    <span className="text-xs text-th-text-muted">
                      {new Date(alert.createdAt).toLocaleString("ko-KR", {
                        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                      })}
                    </span>
                  </div>
                  <p className="mb-2 truncate text-sm font-medium text-th-text" title={alert.prompt}>
                    {alert.prompt}
                  </p>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-th-text-muted">점수 변동:</span>
                    <div className="flex items-center gap-1.5 font-bold">
                      <span className="text-th-text">{alert.oldScore}</span>
                      <span className="text-th-text-muted">→</span>
                      <span className={alert.newScore > alert.oldScore ? "text-th-success" : "text-th-danger"}>
                        {alert.newScore}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => onDismissAlert(alert.id)}
                  className="rounded p-1.5 text-th-text-muted hover:bg-th-card-alt hover:text-th-text transition-colors"
                  title="알림 무시"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}