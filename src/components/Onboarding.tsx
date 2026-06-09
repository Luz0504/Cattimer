/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, Calendar, Clock, AlertCircle, Sun, Moon } from 'lucide-react';
import MinnityMascot, { MinnityExpression } from './MinnityMascot';
import { OnboardingData, Task } from '../types';
import TaskForm from './TaskForm';
import { getMascotMessage } from '../utils/mascotMessages';

interface OnboardingProps {
  onComplete: (data: OnboardingData) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export default function Onboarding({ onComplete, theme, toggleTheme }: OnboardingProps) {
  const [step, setStep] = useState<number>(0);
  const [reason, setReason] = useState<string>('');
  const [dailyLimit, setDailyLimit] = useState<number>(4);
  const [onboardingTasks, setOnboardingTasks] = useState<Task[]>([]);
  const [expression, setExpression] = useState<MinnityExpression>('friendly');
  const [bubbleText, setBubbleText] = useState<string>(
    '¡Hola, miau! 🐾 Soy Minnity, tu asistente virtual oficial de Cattimer. Estoy aquí para acompañarte a organizar tus tareas y mantener hábitos sanos, sin culpas ni presiones.'
  );

  const procrastinationReasons = [
    { id: 'Distracciones', label: 'Distracciones', icon: '⚡' },
    { id: 'Redes sociales', label: 'Redes sociales', icon: '📱' },
    { id: 'Videojuegos', label: 'Videojuegos', icon: '🎮' },
    { id: 'Falta de motivación', label: 'Falta de motivación', icon: '💭' },
    { id: 'Ansiedad', label: 'Ansiedad', icon: '😰' },
    { id: 'Demasiadas tareas', label: 'Demasiadas tareas', icon: '📚' },
    { id: 'Cansancio', label: 'Cansancio', icon: '😴' },
    { id: 'Dificultad para empezar', label: 'Dificultad para empezar', icon: '⏳' },
    { id: 'Otra', label: 'Otra razón', icon: '❓' },
  ];

  const handleNextStepFromWelcome = () => {
    setStep(1);
    setExpression('thinking');
    setBubbleText('¿Cuál es la principal razón por la que sentís que procrastinás? Decime con total confianza, aquí no juzgamos a nadie.');
  };

  const handleSelectReason = (selectedReason: string) => {
    setReason(selectedReason);
    setExpression('happy');
    setBubbleText(getMascotMessage(selectedReason, 'onboardingSelect'));
    // Auto-advance after small delay to show feedback
    setTimeout(() => {
      setStep(2);
      setExpression('friendly');
      setBubbleText('Para evitar sobrecargarte, ¿cuántas tareas creés que podés completar de forma realista en un día normal? Recomiendo entre 3 y 5.');
    }, 4500);
  };

  const handleLimitChange = (val: number) => {
    setDailyLimit(val);
    if (val <= 2) {
      setExpression('friendly');
      setBubbleText(`¡Miau! ${val} ${val === 1 ? 'tarea' : 'tareas'} al día es un comienzo excelente. Enfoque puro y sin apuros.`);
    } else if (val <= 5) {
      setExpression('happy');
      setBubbleText(`¡${val} tareas al día! Es una meta fantástica y equilibrada para avanzar de forma constante.`);
    } else {
      setExpression('thinking');
      setBubbleText(`¡Miau, ${val} tareas! Es un día bastante activo. Recordá dejar tiempo para hidratarte y estirarte.`);
    }
  };

  const handleNextToTasks = () => {
    setStep(3);
    setExpression('happy');
    setBubbleText('¡Excelente! Ahora anota tus tareas pendientes para que yo pueda organizártelas en un plan diario saludable. Escríbelas de cero, miau🐾');
  };

  const handleAddTask = (taskData: Omit<Task, 'id' | 'completed' | 'createdAt'>) => {
    const newTask: Task = {
      ...taskData,
      id: `task-onb-${Date.now()}-${Math.random()}`,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    setOnboardingTasks((prev) => [...prev, newTask]);
    setExpression('happy');
    setBubbleText('¡Buenísima tarea anotada! Podés seguir anotando más pendientes o continuar para que yo cree tu planificación.');
  };

  const handleRemoveTask = (taskId: string) => {
    setOnboardingTasks((prev) => prev.filter((t) => t.id !== taskId));
    setExpression('thinking');
    setBubbleText('Tarea descartada de tu lista preliminar, miau.');
  };

  const handleFinish = () => {
    if (onboardingTasks.length === 0) {
      setExpression('thinking');
      setBubbleText('Por favor escribe al menos una tarea para comenzar, miau. Así podré armarte el plan inteligente de hoy.');
      return;
    }
    setExpression('happy');
    setBubbleText('¡Miau, espectacular! Ya tengo tus tareas anotadas. Dejame que yo aplique mi priorización inteligente para organizarte la rutina diaria... 🐾');
    setTimeout(() => {
      onComplete({
        reason,
        dailyLimit,
        initialTasks: onboardingTasks,
      });
    }, 1800);
  };

  return (
    <div id="onboarding-screen" className="min-h-[80vh] flex flex-col justify-center items-center py-6 px-4">
      
      {/* Persistent Top bar for Theme Selector during Onboarding */}
      <div className={`w-full ${step === 3 ? 'max-w-5xl' : 'max-w-2xl'} flex justify-between items-center mb-4 px-2`}>
        <div className="flex items-center gap-2">
          <span className="text-2xl" role="img" aria-label="cattimer-logo">🐈‍⬛</span>
          <span className="font-extrabold font-display tracking-tight text-sm text-app-text">
            Cattimer <span className="text-violet-600 dark:text-violet-400">🐾</span>
          </span>
        </div>
        
        {/* Toggle Theme button */}
        <button
          type="button"
          id="btn-theme-toggle-onboarding"
          onClick={toggleTheme}
          className="p-2.5 rounded-xl bg-app-card text-zinc-650 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-app-border active:scale-95 transition-all cursor-pointer shadow-sm flex items-center gap-2 text-xs font-bold"
          title="Cambiar Modo Claro/Oscuro"
        >
          {theme === 'light' ? (
            <>
              <Moon size={14} className="text-zinc-600" />
              <span>Modo Oscuro</span>
            </>
          ) : (
            <>
              <Sun size={14} className="text-amber-400" />
              <span>Modo Claro</span>
            </>
          )}
        </button>
      </div>

      <div className={`w-full ${step === 3 ? 'max-w-5xl' : 'max-w-2xl'} bg-app-card rounded-3xl p-4 sm:p-6 md:p-8 shadow-xl border border-app-border transition-all duration-300 overflow-hidden min-w-0`}>
        
        {/* Minnity Mascot at the top or center of onboarding */}
        <div className="mb-8">
          <MinnityMascot expression={expression} bubbleText={bubbleText} />
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="step-welcome"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="text-center space-y-6"
            >
              <p className="text-zinc-600 dark:text-zinc-400 text-sm md:text-base leading-relaxed max-w-md mx-auto">
                Olvidate de las listas infinitas que estresan. Juntos crearemos hábitos sostenibles, organizando tus días de manera inteligente y usando el timer para que disfrutes descansar.
              </p>
              <div className="pt-2">
                <button
                  id="btn-onboarding-start"
                  onClick={handleNextStepFromWelcome}
                  className="w-full sm:w-auto px-8 py-3 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-2xl shadow-lg shadow-violet-500/20 active:scale-95 transition-all text-base duration-200"
                >
                  Comenzar miau 🐾
                </button>
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step-reason"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <div className="text-center">
                <h3 className="text-xl md:text-2xl font-black text-app-text">
                  ¿Cuál es tu principal obstáculo?
                </h3>
                <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  Seleccioná la opción con la que más te identifiques hoy
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {procrastinationReasons.map((item) => (
                  <button
                    key={item.id}
                    id={`reason-item-${item.id}`}
                    onClick={() => handleSelectReason(item.id)}
                    className={`flex items-center gap-3 p-3.5 rounded-2xl text-left border-2 text-sm font-medium transition-all active:scale-98 ${
                      reason === item.id
                        ? 'border-violet-600 bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-500'
                        : 'border-app-border hover:border-violet-200 bg-app-bg text-app-text hover:bg-violet-500/5'
                    }`}
                  >
                    <span className="text-xl bg-app-card shadow-sm w-9 h-9 flex items-center justify-center rounded-xl">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step-limit"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              <div className="text-center">
                <h3 className="text-xl md:text-2xl font-black text-app-text">
                  Tu límite diario de tareas
                </h3>
                <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  Enfocarse en menos tareas es la clave para no procrastinar
                </p>
              </div>

              <div className="bg-app-bg border border-app-border p-6 rounded-2xl space-y-6 max-w-md mx-auto">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Límite recomendado</span>
                  <span
                    style={{ backgroundColor: '#692ec8', color: '#ffffff' }}
                    className="text-2xl font-black font-mono px-4 py-1.5 rounded-xl border border-violet-200 dark:border-violet-900/40 animate-pulse"
                  >
                    {dailyLimit} {dailyLimit === 1 ? 'tarea' : 'tareas'}
                  </span>
                </div>

                <input
                  id="input-daily-limit"
                  type="range"
                  min="1"
                  max="10"
                  value={dailyLimit}
                  onChange={(e) => handleLimitChange(parseInt(e.target.value))}
                  className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-violet-600"
                />

                <div className="flex justify-between text-xs text-zinc-400 font-mono px-1">
                  <span>1 (Tranquilo)</span>
                  <span>5 (Equilibrado)</span>
                  <span>10 (Intenso)</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4 justify-center">
                <button
                  id="btn-limit-back"
                  onClick={() => {
                    setStep(1);
                    setExpression('thinking');
                    setBubbleText('¿Cuál es la principal razón por la que sentís que procrastinás?');
                  }}
                  style={{ color: '#cee6ff' }}
                  className="px-6 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 font-medium rounded-xl text-sm transition-all"
                >
                  Volver
                </button>
                <button
                  id="btn-limit-next"
                  onClick={handleNextToTasks}
                  className="px-8 py-3 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-xl text-sm shadow-md transition-all active:scale-95"
                >
                  Guardar y continuar 🐾
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step-tasks"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <div className="text-center">
                <h3 className="text-xl md:text-2xl font-black text-app-text">
                  Anotá tus tareas pendientes
                </h3>
                <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  Escribí las tareas reales que tenés que realizar. Minnity las organizará para evitar tu sobrecarga.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in">
                {/* Form column */}
                <div className="lg:col-span-7">
                  <TaskForm onAddTask={handleAddTask} dailyLimit={dailyLimit} />
                </div>

                {/* List column */}
                <div className="lg:col-span-5 bg-app-bg p-4 sm:p-5 rounded-3xl border border-app-border space-y-4">
                  <div className="flex justify-between items-center border-b border-zinc-150 dark:border-zinc-800 pb-2">
                    <span
                      style={{ color: '#595959' }}
                      className="font-bold text-sm"
                    >
                      Tus tareas anotadas ({onboardingTasks.length})
                    </span>
                    {onboardingTasks.length > 0 && (
                      <span className="text-xs font-mono bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300 px-2.5 py-0.5 rounded-full font-bold">
                        Borrador
                      </span>
                    )}
                  </div>

                  {onboardingTasks.length === 0 ? (
                    <div id="onboarding-empty-tasks" className="flex flex-col items-center justify-center text-center py-12 px-4 border-2 border-dashed border-app-border rounded-2xl bg-app-card">
                      <span className="text-3xl mb-2">📋</span>
                      <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                        No hay tareas anotadas todavía
                      </p>
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-[200px] mt-1 leading-normal text-center">
                        Escribí arriba el nombre, estimación de tiempo, fecha y dale a "Agregar Tarea 🐾"
                      </p>
                    </div>
                  ) : (
                    <div id="onboarding-tasks-list" className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                      {onboardingTasks.map((t) => (
                        <div
                          key={t.id}
                          className="p-3.5 bg-app-card border border-app-border rounded-2xl flex justify-between items-start hover:border-violet-200 dark:hover:border-violet-900 shadow-sm transition-all"
                        >
                          <div className="space-y-2 flex-1 min-w-0 mr-2">
                            <h4 className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 break-words leading-snug text-left">
                              {t.name}
                            </h4>
                            <div className="flex flex-wrap gap-1 text-[9px] font-mono">
                              <span className={`px-1.5 py-0.5 rounded-md font-bold ${
                                t.importance === 'Alto'
                                  ? 'bg-rose-600 text-white shadow-xs dark:bg-rose-950/45 dark:text-rose-300'
                                  : t.importance === 'Medio'
                                  ? 'bg-amber-600 text-white shadow-xs dark:bg-amber-950/45 dark:text-amber-300'
                                  : 'bg-emerald-600 text-white shadow-xs dark:bg-emerald-950/45 dark:text-emerald-300'
                              }`}>
                                {t.importance}
                              </span>
                              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                                <Clock size={8} /> {t.estimatedTimeLabel}
                              </span>
                              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                                <Calendar size={8} /> {t.dueDate}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveTask(t.id)}
                            className="p-1 text-zinc-400 hover:text-rose-500 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-zinc-100 dark:border-zinc-800 justify-between items-center">
                <button
                  id="btn-tasks-back"
                  type="button"
                  onClick={() => {
                    setStep(2);
                    setExpression('friendly');
                    setBubbleText('Para evitar sobrecargarte, ¿cuántas tareas creés que podés completar de forma realista en un día normal? Recomiendo entre 3 y 5.');
                  }}
                  className="w-full sm:w-auto px-6 py-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold rounded-2xl text-sm transition-all"
                >
                  Regresar al límite
                </button>
                <button
                  id="btn-tasks-finish"
                  type="button"
                  onClick={handleFinish}
                  disabled={onboardingTasks.length === 0}
                  className={`w-full sm:w-auto px-10 py-4 font-bold rounded-2xl text-base shadow-lg transition-all active:scale-95 ${
                    onboardingTasks.length > 0
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-violet-500/20'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed shadow-none'
                  }`}
                >
                  ¡Organizar mis tareas, miau! 🐾
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
