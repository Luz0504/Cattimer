/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, RotateCw, Coffee, Brain, BatteryLow, Zap, Plus, Minus } from 'lucide-react';
import { PomodoroModeType, PomodoroModeConfig } from '../types';
import { sendNotification } from '@tauri-apps/plugin-notification';
import { emit, listen } from '@tauri-apps/api/event';
import type { PomodoroWidgetState } from '../widgets/types';
import MinnityMascot, { MinnityExpression } from './MinnityMascot';

const POMODORO_MODES: PomodoroModeConfig[] = [
  {
    name: 'Clásico',
    workDuration: 25,
    breakDuration: 5,
    description: '25m trabajo · 5m descanso. La fórmula perfecta para balancear tu enfoque diario.',
  },
  {
    name: 'Concentración',
    workDuration: 50,
    breakDuration: 10,
    description: '50m trabajo · 10m descanso. Diseñado para sesiones profundas del cerebro.',
  },
  {
    name: 'Energía Baja',
    workDuration: 15,
    breakDuration: 5,
    description: '15m trabajo · 5m descanso. Ideal para empezar de a poco cuando cuesta arrancar.',
  },
];

const BREAK_SUGGESTIONS = [
  'Tomar un buen vaso de agua para hidratarte 🚰',
  'Estirar tus brazos, cuello y espalda por unos minutos 🧘‍♀️',
  'Descansar la vista mirando a un punto lejano por la ventana 👀',
  'Caminar un poco de forma relajada y mover tus piernas 🚶‍♂️',
  'Hacer 5 respiraciones profundas inhalando calma y exhalando estrés 🌬️',
];

interface PomodoroTimerProps {
  activeTab?: string;
  setActiveTab?: (tab: 'dashboard' | 'timer') => void;
  theme?: 'light' | 'dark';
}

// Web Audio Helper to play custom synthetic notification sounds
const playTimerSound = (type: 'start' | 'finish') => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const ctx = new AudioContextClass();
    
    // Resume context if suspended (browser security autoplays guard)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    if (type === 'start') {
      // Pleasant starting double beep: Low than High
      const playStartNote = (freq: number, timeOffset: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + timeOffset);
        
        gain.gain.setValueAtTime(0, ctx.currentTime + timeOffset);
        gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + timeOffset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + timeOffset + 0.18);
        
        osc.start(ctx.currentTime + timeOffset);
        osc.stop(ctx.currentTime + timeOffset + 0.2);
      };
      
      playStartNote(440.00, 0);     // A4 (warm starting signal)
      playStartNote(554.37, 0.12);  // C#5 (positive major chord)
    } else if (type === 'finish') {
      // Melodious major arpeggio finishing chime
      const playTone = (freq: number, startDelay: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + startDelay);
        
        gain.gain.setValueAtTime(0, ctx.currentTime + startDelay);
        gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + startDelay + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startDelay + duration);
        
        osc.start(ctx.currentTime + startDelay);
        osc.stop(ctx.currentTime + startDelay + duration);
      };
      
      playTone(523.25, 0, 0.35);     // C5
      playTone(659.25, 0.10, 0.35);  // E5
      playTone(783.99, 0.20, 0.35);  // G5
      playTone(1046.50, 0.30, 0.55); // C6 (complete triumph sound!)
    }
  } catch (error) {
    console.warn('AudioContext not supported or blocked by user interaction gesture', error);
  }
};

export default function PomodoroTimer({ activeTab = 'timer', setActiveTab, theme = 'light' }: PomodoroTimerProps) {
  const [activeModeIdx, setActiveModeIdx] = useState<number>(0);
  const currentMode = POMODORO_MODES[activeModeIdx];

  const [isBreak, setIsBreak] = useState<boolean>(false);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(currentMode.workDuration * 60);
  const [customTotalDuration, setCustomTotalDuration] = useState<number>(currentMode.workDuration * 60);
  
  // Track previous mode/state to avoid loops and show appropriate suggestions
  const [suggestion, setSuggestion] = useState<string>(BREAK_SUGGESTIONS[0]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Configure Minnity Mascot based on timer states
  const getMinnityMascotConfig = (): { expression: MinnityExpression; text: string } => {
    if (!isActive && secondsLeft === customTotalDuration) {
      // Clean/not started
      return {
        expression: 'friendly',
        text: `¿Arrancamos un bloque de Pomodoro ${currentMode.name}? Ponete cómodo, minimizá las distracciones y dale play. ¡Miau! 🐾`,
      };
    }
    if (!isActive) {
      // Paused
      return {
        expression: 'thinking',
        text: 'La sesión está en pausa, miau. Respirá hondo y cuando estés listo continuemos con lo tuyo.',
      };
    }
    if (isBreak) {
      // Break mode running
      return {
        expression: 'sleeping',
        text: `¡Felicidades, merecido recreo! 🐾 Yo te sugiero aprovechar este break para: ${suggestion}.`,
      };
    }
    // Work mode running
    return {
      expression: 'focused',
      text: 'Miau 🐾 Silenciá el celular, relajá los hombros y poné la mente en la tarea. ¡Estoy concentrada con vos!',
    };
  };

  const minnityConfig = getMinnityMascotConfig();

  // Reset timer whenever mode changes
  const handleModeChange = (index: number) => {
    setActiveModeIdx(index);
    setIsActive(false);
    setIsBreak(false);
    const secs = POMODORO_MODES[index].workDuration * 60;
    setSecondsLeft(secs);
    setCustomTotalDuration(secs);
  };

  // Switch between work phase & break phase
  const triggerPhaseTransition = (toBreak: boolean, silent = false) => {
    setIsBreak(toBreak);
    const m = POMODORO_MODES[activeModeIdx];
    const secs = (toBreak ? m.breakDuration : m.workDuration) * 60;
    setSecondsLeft(secs);
    setCustomTotalDuration(secs);
    setIsActive(true); // auto-start the next phase

    if (toBreak) {
      // Select new random suggestion for break
      const randIdx = Math.floor(Math.random() * BREAK_SUGGESTIONS.length);
      setSuggestion(BREAK_SUGGESTIONS[randIdx]);
      if (!silent) {
        playTimerSound('finish');
        sendNotification({ title: 'Cattimer', body: '¡Tiempo de descansar, miau! 🐾 — Terminó tu bloque de concentración.' });
      }
    } else {
      if (!silent) {
        playTimerSound('start');
        sendNotification({ title: 'Cattimer', body: '¡Hora de activarse, miau! ⚡ — Terminó tu descanso. Volvemos a enfocarnos.' });
      }
    }
  };

  // Manual Adjusters for Hours and Minutes
  const adjustHours = (amount: number) => {
    if (isActive) return;
    const currentHours = Math.floor(secondsLeft / 3600);
    const currentMinutes = Math.floor((secondsLeft % 3600) / 60);
    const nextHrs = Math.max(0, Math.min(24, currentHours + amount));
    const nextSecs = (nextHrs * 3600) + (currentMinutes * 60);
    if (nextSecs > 0) {
      setSecondsLeft(nextSecs);
      setCustomTotalDuration(nextSecs);
    }
  };

  const adjustMinutes = (amount: number) => {
    if (isActive) return;
    const currentHours = Math.floor(secondsLeft / 3600);
    const currentMinutes = Math.floor((secondsLeft % 3600) / 60);
    let nextMins = currentMinutes + amount;
    let nextHrs = currentHours;

    if (nextMins >= 60) {
      nextHrs = Math.min(24, nextHrs + Math.floor(nextMins / 60));
      nextMins = nextMins % 60;
    } else if (nextMins < 0) {
      const hrsDiff = Math.ceil(Math.abs(nextMins) / 60);
      if (nextHrs >= hrsDiff) {
        nextHrs -= hrsDiff;
        nextMins = (nextMins + hrsDiff * 60) % 60;
      } else {
        nextMins = 0;
        nextHrs = 0;
      }
    }

    const nextSecs = (nextHrs * 3600) + (nextMins * 60);
    if (nextSecs > 0) {
      setSecondsLeft(nextSecs);
      setCustomTotalDuration(nextSecs);
    }
  };

  // Dynamic ticking
  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            // transition to next phase with notification
            triggerPhaseTransition(!isBreak, false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, isBreak, activeModeIdx, customTotalDuration]);

  // Emit current Pomodoro state to widgets
  useEffect(() => {
    const payload: PomodoroWidgetState = {
      theme,
      secondsLeft,
      totalSeconds: customTotalDuration,
      isBreak,
      isActive,
      activeModeIdx,
      currentModeName: currentMode.name,
      progressPercent: ((customTotalDuration - secondsLeft) / customTotalDuration) * 100,
      formattedTime: formatTime(secondsLeft),
    };
    emit('POMODORO_STATE_UPDATE', payload);
  }, [secondsLeft, isBreak, isActive, activeModeIdx, customTotalDuration, theme]);

  // Format HH:MM:SS or MM:SS
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const progressPercent = ((customTotalDuration - secondsLeft) / customTotalDuration) * 100;

  const handleToggleTimer = () => {
    const nextActive = !isActive;
    setIsActive(nextActive);
    if (nextActive) {
      playTimerSound('start');
    }
  };

  const handleResetTimer = () => {
    setIsActive(false);
    setIsBreak(false);
    setSecondsLeft(customTotalDuration);
  };

  const handleSkipPhase = () => {
    setIsActive(false);
    triggerPhaseTransition(!isBreak, true);
  };

  // Refs for handler functions (used by widget event listeners to avoid stale closures)
  const handleToggleRef = useRef(handleToggleTimer);
  handleToggleRef.current = handleToggleTimer;
  const handleResetRef = useRef(handleResetTimer);
  handleResetRef.current = handleResetTimer;
  const handleSkipRef = useRef(handleSkipPhase);
  handleSkipRef.current = handleSkipPhase;

  // Listen for control events from widgets
  useEffect(() => {
    const toggleUnlisten = listen('POMODORO_TOGGLE', () => {
      handleToggleRef.current();
    });
    const resetUnlisten = listen('POMODORO_RESET', () => {
      handleResetRef.current();
    });
    const skipUnlisten = listen('POMODORO_SKIP', () => {
      handleSkipRef.current();
    });
    return () => {
      toggleUnlisten.then(fn => fn());
      resetUnlisten.then(fn => fn());
      skipUnlisten.then(fn => fn());
    };
  }, []);

  return (
    <div id="pomodoro-timer-view" className="space-y-6">
      
      {/* Unified Mascot & Tab Switcher Card */}
      <div className="bg-app-card rounded-3xl p-4 md:p-5 border border-app-border shadow-sm space-y-4">
        {/* Navigation Tab Menu - Merged visual block */}
        <div className="flex justify-center p-1 bg-zinc-100 dark:bg-zinc-900/50 rounded-2xl gap-2 max-w-sm mx-auto">
          <button
            type="button"
            id="tab-dashboard"
            onClick={() => setActiveTab?.('dashboard')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all active:scale-98 text-center cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-violet-600 text-white dark:bg-violet-500 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'
            }`}
          >
            Mi Jornada
          </button>
          <button
            type="button"
            id="tab-timer"
            onClick={() => setActiveTab?.('timer')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all active:scale-98 text-center cursor-pointer ${
              activeTab === 'timer'
                ? 'bg-violet-600 text-white dark:bg-violet-500 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'
            }`}
          >
            Modo Pomodoro ⏱️
          </button>
        </div>

        <div className="border-t border-app-border/40 my-1"></div>

        <MinnityMascot expression={minnityConfig.expression} bubbleText={minnityConfig.text} />
      </div>

      {/* Timer engine layout */}
      <div className="bg-app-card border border-app-border rounded-3xl p-4 sm:p-6 md:p-8 shadow-xl w-full min-w-0 overflow-hidden">
        
        {/* Toggle Mode headers */}
        <div className="flex flex-col sm:flex-row justify-center gap-2 mb-6">
          {POMODORO_MODES.map((mode, index) => {
            const isSelected = activeModeIdx === index;
            return (
              <button
                key={mode.name}
                id={`pomodoro-mode-tab-${mode.name.replace(' ', '-')}`}
                onClick={() => handleModeChange(index)}
                className={`flex-1 py-3 px-4 rounded-2xl border text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer ${
                  isSelected
                    ? 'bg-violet-600 text-white border-violet-600 dark:bg-violet-500 dark:border-violet-500 shadow-md shadow-violet-500/20'
                    : 'bg-zinc-50 border-zinc-100 hover:border-violet-200 text-zinc-600 dark:bg-zinc-800 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                {mode.name === 'Clásico' && <Zap size={16} />}
                {mode.name === 'Concentración' && <Brain size={16} />}
                {mode.name === 'Energía Baja' && <BatteryLow size={16} />}
                {mode.name}
              </button>
            );
          })}
        </div>

        {/* Short description of the current mode */}
        <p className="text-center text-xs text-zinc-400 dark:text-zinc-500 -mt-2 mb-6 font-medium">
          {currentMode.description}
        </p>

        {/* Manual adjustment controls */}
        <div
          id="manual-timer-adjuster"
          style={{ paddingLeft: '16px', paddingTop: '20px', paddingRight: '16px', paddingBottom: '20px' }}
          className="flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-800/20 border border-app-border rounded-2xl max-w-sm mx-auto mb-6 gap-3"
        >
          <div className="flex items-center justify-between w-full">
            <span
              style={{ width: '351px', textAlign: 'left', display: 'inline-block' }}
              className="text-xs font-black text-zinc-650 dark:text-zinc-300 uppercase tracking-wider"
            >
              Ajuste Manual
            </span>
            {isActive && (
              <span
                style={{ textAlign: 'center', width: '250px', display: 'inline-block' }}
                className="text-[10px] bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 px-2 py-0.5 rounded-md font-bold border border-amber-200/30"
              >
                Pausar para ajustar
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-6 justify-center">
            {/* Hours adjusting column */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] text-zinc-450 dark:text-zinc-500 font-bold uppercase tracking-wider">Horas</span>
              <div className="flex items-center gap-1">
                <button
                  id="btn-adjust-hours-dec"
                  onClick={() => adjustHours(-1)}
                  disabled={isActive || Math.floor(secondsLeft / 3600) <= 0}
                  className="p-1.5 rounded-lg border border-app-border bg-app-card text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 enabled:active:scale-90 disabled:opacity-40 transition-all cursor-pointer"
                  title="Restar 1 hora"
                >
                  <Minus size={14} />
                </button>
                <span className="min-w-[40px] text-center font-mono font-bold text-sm text-app-text">
                  {String(Math.floor(secondsLeft / 3600)).padStart(2, '0')}h
                </span>
                <button
                  id="btn-adjust-hours-inc"
                  onClick={() => adjustHours(1)}
                  disabled={isActive || Math.floor(secondsLeft / 3600) >= 24}
                  className="p-1.5 rounded-lg border border-app-border bg-app-card text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 enabled:active:scale-90 disabled:opacity-40 transition-all cursor-pointer"
                  title="Sumar 1 hora"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Separator */}
            <div className="text-xl font-bold text-zinc-350 dark:text-zinc-650 mt-4 font-mono">:</div>

            {/* Minutes adjusting column */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] text-zinc-450 dark:text-zinc-500 font-bold uppercase tracking-wider font-sans">Minutos</span>
              <div className="flex items-center gap-1">
                <button
                  id="btn-adjust-minutes-dec"
                  onClick={() => adjustMinutes(-1)}
                  disabled={isActive}
                  className="p-1.5 rounded-lg border border-app-border bg-app-card text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 enabled:active:scale-90 disabled:opacity-40 transition-all cursor-pointer"
                  title="Restar 1 minuto"
                >
                  <Minus size={14} />
                </button>
                <span className="min-w-[40px] text-center font-mono font-bold text-sm text-app-text">
                  {String(Math.floor((secondsLeft % 3600) / 60)).padStart(2, '0')}m
                </span>
                <button
                  id="btn-adjust-minutes-inc"
                  onClick={() => adjustMinutes(1)}
                  disabled={isActive}
                  className="p-1.5 rounded-lg border border-app-border bg-app-card text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 enabled:active:scale-90 disabled:opacity-40 transition-all cursor-pointer"
                  title="Sumar 1 minuto"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Circular visual chronometer */}
        <div id="timer-ring-container" className="flex flex-col items-center justify-center py-6">
          <div className="relative w-60 h-60 md:w-64 md:h-64 flex items-center justify-center">
            
            {/* SVG Background circular progress runner */}
            <svg className="absolute w-full h-full transform -rotate-90">
              {/* Backing circle track */}
              <circle
                cx="50%"
                cy="50%"
                r="110"
                className="stroke-zinc-100 dark:stroke-zinc-800"
                strokeWidth="8"
                fill="transparent"
              />
              {/* Active animated stroke */}
              <motion.circle
                cx="50%"
                cy="50%"
                r="110"
                className={isBreak ? 'stroke-emerald-500 dark:stroke-emerald-400' : 'stroke-violet-600 dark:stroke-violet-500'}
                strokeWidth="10"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 110}
                animate={{ strokeDashoffset: (2 * Math.PI * 110) * (1 - progressPercent / 100) }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                strokeLinecap="round"
              />
            </svg>

            {/* Inner text content */}
            <div className="text-center z-10 space-y-1">
              <span
                style={{ color: '#e0d7ff', backgroundColor: '#985aff' }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold font-sans uppercase mb-1 tracking-wider ${
                  isBreak
                    ? 'border border-emerald-100 dark:border-emerald-900/30'
                    : 'border border-violet-100 dark:border-violet-900/30'
                }`}
              >
                {isBreak ? (
                  <>
                    <Coffee size={12} />
                    Descanso
                  </>
                ) : (
                  <>
                    <Zap size={12} />
                    Concentrado
                  </>
                )}
              </span>

              <h2 id="timer-display-string" className="text-5xl md:text-6xl font-black font-mono tracking-tighter text-app-text">
                {formatTime(secondsLeft)}
              </h2>

              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">
                {isBreak ? 'Relajate un poco...' : 'Haciendo foco...'}
              </p>
            </div>
          </div>

          {/* Action controller buttons */}
          <div className="flex gap-4 mt-8 items-center justify-center">
            <button
              id="btn-timer-reset"
              onClick={handleResetTimer}
              className="p-3.5 rounded-full border border-app-border hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-650 dark:text-zinc-300 transition-all active:scale-90 cursor-pointer"
              title="Reiniciar paso"
            >
              <RotateCw size={18} />
            </button>

            <button
              id="btn-timer-toggle"
              onClick={handleToggleTimer}
              className={`p-5 rounded-full text-white shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer ${
                isBreak
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25'
                  : 'bg-violet-600 hover:bg-violet-700 shadow-violet-500/25'
              }`}
            >
              {isActive ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
            </button>

            <button
              id="btn-timer-skip"
              onClick={handleSkipPhase}
              className="py-2.5 px-4 rounded-xl border border-dashed border-app-border text-xs font-bold text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-all active:scale-95 cursor-pointer"
            >
              Omitir
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
