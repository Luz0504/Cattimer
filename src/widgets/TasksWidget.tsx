import { useState, useEffect, useRef, useCallback } from 'react';
import { emit, listen } from '@tauri-apps/api/event';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import MinnityMascot from '../components/MinnityMascot';
import { saveWidgetPosition } from './windowManager';
import type { TasksWidgetState } from './types';

const getImportanceColor = (level: string) => {
  switch (level) {
    case 'Alto': return 'bg-rose-600 text-white dark:bg-rose-950/30 dark:text-rose-400 border border-rose-700 dark:border-rose-900/40 font-bold';
    case 'Medio': return 'bg-amber-600 text-white dark:bg-amber-950/30 dark:text-amber-400 border border-amber-700 dark:border-amber-900/40 font-bold';
    default: return 'bg-emerald-600 text-white dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-700 dark:border-emerald-900/40 font-bold';
  }
};

export default function TasksWidget() {
  const [state, setState] = useState<TasksWidgetState | null>(null);
  const positionSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unlisten = listen<TasksWidgetState>('TASKS_STATE_UPDATE', (event) => {
      setState(event.payload);
      const theme = event.payload.theme;
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    });

    const appWindow = getCurrentWebviewWindow();
    const unlistenMove = appWindow.onMoved(({ payload: pos }) => {
      if (positionSaveTimer.current) clearTimeout(positionSaveTimer.current);
      positionSaveTimer.current = setTimeout(() => {
        saveWidgetPosition('tasks', pos.x, pos.y);
      }, 500);
    });
    const unlistenClose = appWindow.onCloseRequested(async () => {
      console.log('[TasksWidget] Close requested via X button');
      const pos = await appWindow.outerPosition();
      console.log('[TasksWidget] Saving position:', pos);
      await saveWidgetPosition('tasks', pos.x, pos.y);
      console.log('[TasksWidget] Emitting WIDGET_CLOSED');
      await emit('WIDGET_CLOSED', { type: 'tasks' });
      console.log('[TasksWidget] WIDGET_CLOSED emitted, window will be destroyed by onCloseRequested');
    });

    return () => {
      unlisten.then((fn) => fn());
      unlistenMove.then((fn) => fn());
      unlistenClose.then((fn) => fn());
      if (positionSaveTimer.current) clearTimeout(positionSaveTimer.current);
    };
  }, []);

  const handleToggleTask = useCallback((id: string) => {
    emit('TASK_TOGGLE', { id });
  }, []);

  const handleOpenMain = () => {
    emit('OPEN_MAIN_WINDOW');
  };

  if (!state) {
    return (
      <div className="min-h-screen bg-app-bg text-app-text font-sans flex items-center justify-center">
        <p className="text-sm text-zinc-400">Esperando conexión...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-bg text-app-text font-sans flex flex-col p-4 select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-base">📋</span>
          <span className="text-sm font-extrabold">Tareas de Hoy</span>
        </div>
        <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-lg">
          {state.todayTasks.length} tareas
        </span>
      </div>

      {/* Task List - scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-1.5 pr-1 -mr-1">
        {state.todayTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <span className="text-2xl mb-1">🐈</span>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              No hay tareas planeadas para hoy
            </p>
          </div>
        ) : (
          state.todayTasks.map((task) => (
            <div
              key={task.id}
              className={`flex items-start gap-2.5 p-2.5 rounded-xl bg-app-card border border-app-border transition-all ${
                task.completed ? 'opacity-60' : ''
              }`}
            >
              <button
                type="button"
                onClick={() => handleToggleTask(task.id)}
                className={`mt-0.5 shrink-0 transition-colors focus:outline-none cursor-pointer ${
                  task.completed ? 'text-violet-600 dark:text-violet-400' : 'text-zinc-400 hover:text-violet-500'
                }`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {task.completed ? (
                    <>
                      <rect x="3" y="3" width="18" height="18" rx="2" className="fill-violet-50 dark:fill-violet-950/20" />
                      <polyline points="9 11 12 14 22 4" />
                    </>
                  ) : (
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                  )}
                </svg>
              </button>

              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold break-words leading-snug ${
                  task.completed ? 'line-through text-zinc-400 dark:text-zinc-500' : ''
                }`}>
                  {task.name}
                </p>
                <div className="flex flex-wrap items-center gap-1 mt-1">
                  {!task.completed && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${getImportanceColor(task.importance)}`}>
                      {task.importance}
                    </span>
                  )}
                  <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-medium">
                    {task.estimatedTimeLabel}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Minnity */}
      <div className="mt-2 shrink-0">
        <MinnityMascot expression={state.mascotExpression} bubbleText={state.mascotText} compact />
      </div>

      {/* Open main link */}
      <button
        type="button"
        onClick={handleOpenMain}
        className="w-full py-2 mt-1 text-center text-xs font-bold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors cursor-pointer shrink-0"
      >
        Open Cattimer →
      </button>
    </div>
  );
}
