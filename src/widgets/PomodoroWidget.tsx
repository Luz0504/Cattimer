import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Play, Pause, RotateCw } from 'lucide-react';
import { emit, listen } from '@tauri-apps/api/event';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import MinnityMascot, { MinnityExpression } from '../components/MinnityMascot';
import { saveWidgetPosition } from './windowManager';
import type { PomodoroWidgetState } from './types';

const BREAK_SUGGESTIONS = [
  'Tomar un buen vaso de agua para hidratarte 🚰',
  'Estirar tus brazos, cuello y espalda por unos minutos 🧘‍♀️',
  'Descansar la vista mirando a un punto lejano 👀',
  'Caminar un poco de forma relajada 🚶‍♂️',
  'Hacer respiraciones profundas 🌬️',
];

const CURRENT_MODE_NAMES = ['Clásico', 'Concentración', 'Energía Baja'];

export default function PomodoroWidget() {
  const [state, setState] = useState<PomodoroWidgetState | null>(null);
  const positionSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unlisten = listen<PomodoroWidgetState>('POMODORO_STATE_UPDATE', (event) => {
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
        saveWidgetPosition('pomodoro', pos.x, pos.y);
      }, 500);
    });
    const unlistenClose = appWindow.onCloseRequested(async () => {
      console.log('[PomodoroWidget] Close requested via X button');
      const pos = await appWindow.outerPosition();
      console.log('[PomodoroWidget] Saving position:', pos);
      await saveWidgetPosition('pomodoro', pos.x, pos.y);
      console.log('[PomodoroWidget] Emitting WIDGET_CLOSED');
      await emit('WIDGET_CLOSED', { type: 'pomodoro' });
      console.log('[PomodoroWidget] WIDGET_CLOSED emitted, window will be destroyed by onCloseRequested');
    });

    return () => {
      unlisten.then((fn) => fn());
      unlistenMove.then((fn) => fn());
      unlistenClose.then((fn) => fn());
      if (positionSaveTimer.current) clearTimeout(positionSaveTimer.current);
    };
  }, []);

  const handleToggle = () => {
    emit('POMODORO_TOGGLE');
  };

  const handleReset = () => {
    emit('POMODORO_RESET');
  };

  const handleOpenMain = () => {
    emit('OPEN_MAIN_WINDOW');
  };

  const getMascotConfig = (): { expression: MinnityExpression; text: string } => {
    if (!state) {
      return { expression: 'friendly', text: 'Bienvenido a Cattimer 🐾' };
    }
    if (!state.isActive && state.secondsLeft === state.totalSeconds) {
      return {
        expression: 'friendly',
        text: `¿Arrancamos ${state.currentModeName}? Dale play. 🐾`,
      };
    }
    if (!state.isActive) {
      return {
        expression: 'thinking',
        text: 'Pausado. Respirá hondo y continuemos.',
      };
    }
    if (state.isBreak) {
      const suggestion = BREAK_SUGGESTIONS[Math.floor(Math.random() * BREAK_SUGGESTIONS.length)];
      return {
        expression: 'sleeping',
        text: `¡Descanso! 🐾 ${suggestion}`,
      };
    }
    return {
      expression: 'focused',
      text: 'Modo foco activo. ¡Vos podés! 🐾',
    };
  };

  const minnityConfig = getMascotConfig();

  if (!state) {
    return (
      <div className="min-h-screen bg-app-bg text-app-text font-sans flex items-center justify-center">
        <p className="text-sm text-zinc-400">Esperando conexión...</p>
      </div>
    );
  }

  const progressRing = 2 * Math.PI * 55;

  return (
    <div className="min-h-screen bg-app-bg text-app-text font-sans flex flex-col p-4 select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">⏱️</span>
          <span className="text-sm font-extrabold">Pomodoro</span>
        </div>
        <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-lg uppercase tracking-wider">
          {state.currentModeName}
        </span>
      </div>

      {/* Timer Ring + Time */}
      <div className="flex-1 flex flex-col items-center justify-center gap-1">
        <div className="relative w-40 h-40 flex items-center justify-center">
          <svg className="absolute w-full h-full -rotate-90">
            <circle cx="50%" cy="50%" r="55" className="stroke-zinc-100 dark:stroke-zinc-800" strokeWidth="6" fill="transparent" />
            <motion.circle
              cx="50%" cy="50%" r="55"
              className={state.isBreak ? 'stroke-emerald-500' : 'stroke-violet-600 dark:stroke-violet-500'}
              strokeWidth="7" fill="transparent"
              strokeDasharray={progressRing}
              animate={{ strokeDashoffset: progressRing * (1 - state.progressPercent / 100) }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              strokeLinecap="round"
            />
          </svg>
          <div className="text-center z-10">
            <span
              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase mb-1 tracking-wider ${
                state.isBreak
                  ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                  : 'bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400'
              }`}
            >
              {state.isBreak ? '☕ Descanso' : '⚡ Concentrado'}
            </span>
            <h2 className="text-3xl font-black font-mono tracking-tighter">
              {state.formattedTime}
            </h2>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mt-2">
          <button
            type="button"
            onClick={handleToggle}
            className={`p-4 rounded-full text-white shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer ${
              state.isBreak
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-violet-600 hover:bg-violet-700'
            }`}
          >
            {state.isActive ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="p-2.5 rounded-full border border-app-border hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-all active:scale-90 cursor-pointer"
            title="Reiniciar"
          >
            <RotateCw size={16} />
          </button>
        </div>
      </div>

      {/* Minnity */}
      <div className="mb-2">
        <MinnityMascot expression={minnityConfig.expression} bubbleText={minnityConfig.text} compact />
      </div>

      {/* Open main link */}
      <button
        type="button"
        onClick={handleOpenMain}
        className="w-full py-2 text-center text-xs font-bold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors cursor-pointer"
      >
        Open Cattimer →
      </button>
    </div>
  );
}
