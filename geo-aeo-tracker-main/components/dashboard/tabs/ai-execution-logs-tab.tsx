"use client";

import type { ExecutionLog } from "@/components/sovereign-dashboard";
import { Trash2, ShieldAlert } from "lucide-react";

type AiExecutionLogsTabProps = {
  logs: ExecutionLog[];
  onClearLogs: () => void; // 💡 신규 초기화 액션 Props
};

export function AiExecutionLogsTab({ logs = [], onClearLogs }: AiExecutionLogsTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-th-text">크롤러 통신 기록 및 디버깅</h3>
          <p className="text-xs text-th-text-muted mt-0.5">최근 발생한 500개의 파이썬 통신 트랜잭션을 실시간 모니터링합니다.</p>
        </div>
        {/* 💡 로그 초기화 전용 쓰레기통 버튼 탑재 */}
        <button
          onClick={() => { if(window.confirm("모든 시스템 디버그 로그 기록을 초기화하시겠습니까?")) onClearLogs(); }}
          disabled={logs.length === 0}
          className="flex items-center gap-1.5 rounded-lg border border-th-border bg-th-card px-3 py-1.5 text-xs font-bold text-th-text-muted hover:bg-th-danger-soft hover:text-th-danger transition-colors disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" /> 로그 내역 비우기
        </button>
      </div>

      {logs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-th-border p-8 text-center text-sm text-th-text-muted">
          <ShieldAlert className="mx-auto h-8 w-8 opacity-40 mb-2" />
          현재 기록된 프롬프트 실행 로그가 없습니다.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-th-border bg-th-card text-xs divide-y divide-th-border max-h-[500px] overflow-y-auto font-mono">
          {logs.map((log) => (
            <div key={log.id} className="p-3 flex items-start gap-4 hover:bg-th-card-hover">
              <span className={`font-bold uppercase tracking-wider shrink-0 ${log.status === "success" ? "text-th-success" : "text-th-danger"}`}>
                [{log.status}]
              </span>
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-th-text font-medium break-all">{log.prompt}</p>
                {log.message && <p className="text-th-text-secondary bg-th-card-alt p-1.5 rounded border border-th-border/50 break-words">{log.message}</p>}
                <p className="text-[10px] text-th-text-muted">모델: {log.provider} · 시간: {log.timestamp}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}