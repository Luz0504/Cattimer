/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Clock, AlertTriangle, CheckSquare, Square, Trash2, Trophy, Clock3, ChevronDown, ChevronUp, ArrowUp, ArrowDown, Sparkles } from 'lucide-react';
import { Task, OnboardingData } from '../types';

interface TaskListProps {
  tasks: Task[];
  todayTasks: Task[];
  pendingTasks: Task[];
  onToggleComplete: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onClearHistory?: () => void;
  dailyLimit: number;
  onTogglePlannedToday?: (id: string) => void;
  onReorganizeTasks?: () => void;
  onToggleCalendarSync?: (id: string) => void;
}

export default function TaskList({
  tasks,
  todayTasks,
  pendingTasks,
  onToggleComplete,
  onDeleteTask,
  onClearHistory,
  dailyLimit,
  onTogglePlannedToday,
  onReorganizeTasks,
  onToggleCalendarSync,
}: TaskListProps) {
  const [showHistory, setShowHistory] = useState(false);

  const completedTasks = tasks
    .filter((t) => t.completed)
    .sort((a, b) => {
      const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return dateB - dateA; // newest completed first
    });

  // Importance badge helper styles
  const getImportanceStyles = (lvl: string) => {
    switch (lvl) {
      case 'Alto':
        return 'bg-rose-600 text-white dark:bg-rose-950/30 dark:text-rose-400 border border-rose-700 dark:border-rose-900/40 shadow-xs font-bold';
      case 'Medio':
        return 'bg-amber-600 text-white dark:bg-amber-950/30 dark:text-amber-400 border border-amber-700 dark:border-amber-900/40 shadow-xs font-bold';
      case 'Bajo':
      default:
        return 'bg-emerald-600 text-white dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-700 dark:border-emerald-900/40 shadow-xs font-bold';
    }
  };

  // Helper to format due dates nicely
  const formatFriendlyDate = (dateString: string) => {
    const todayStr = '2026-06-03';
    if (dateString === todayStr) {
      return 'Hoy 📅';
    }
    
    // Parse
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthIndex = parseInt(parts[1]) - 1;
      const day = parts[2];
      const monthNames = [
        'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
        'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
      ];
      return `${day} de ${monthNames[monthIndex]}`;
    }
    return dateString;
  };

  const renderTaskCard = (task: Task, isTodayCard: boolean) => {
    return (
      <motion.div
        key={task.id}
        layoutId={task.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`group flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 bg-app-card rounded-2xl border border-app-border gap-3 sm:gap-4 transition-all ${
          task.completed
            ? 'opacity-70'
            : isTodayCard
            ? 'hover:border-violet-200 dark:hover:border-zinc-700 shadow-sm hover:shadow'
            : 'hover:border-zinc-300 dark:hover:border-zinc-700'
        }`}
      >
        <div className="flex items-start gap-3 flex-1 select-none min-w-0 w-full">
          {/* Custom animated checkbox */}
          <button
            type="button"
            id={`task-check-${task.id}`}
            onClick={() => onToggleComplete(task.id)}
            className={`mt-0.5 shrink-0 transition-colors focus:outline-none ${
              task.completed ? 'text-violet-600 dark:text-violet-400' : 'text-zinc-400 hover:text-violet-500'
            }`}
          >
            {task.completed ? (
              <CheckSquare className="w-5 h-5 fill-violet-50 dark:fill-violet-950/20" />
            ) : (
              <Square className="w-5 h-5" />
            )}
          </button>

          <div className="space-y-1.5 text-left flex-1 min-w-0">
            <h4
              id={`task-title-${task.id}`}
              className={`text-sm font-semibold transition-all break-words leading-snug ${
                task.completed ? 'line-through text-zinc-400 dark:text-zinc-500 font-normal' : 'text-app-text font-bold'
              }`}
            >
              {task.name}
            </h4>

            {/* Meta Tags rows */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-zinc-450 dark:text-zinc-400">
              {/* Due Date */}
              {!task.completed && (
                <span className="flex items-center gap-1 bg-app-bg px-2 py-0.5 rounded-lg font-medium border border-app-border">
                  <Calendar size={11} className="text-zinc-400" />
                  {formatFriendlyDate(task.dueDate)}
                </span>
              )}

              {/* Time Estimated */}
              <span className="flex items-center gap-1 bg-app-bg px-2 py-0.5 rounded-lg font-medium border border-app-border">
                <Clock size={11} className="text-zinc-400" />
                {task.estimatedTimeLabel}
              </span>

              {/* Importance level badge */}
              {!task.completed && (
                <span
                  style={{
                    backgroundColor: task.importance === 'Alto' ? '#651d2e' : '#623218',
                    color: '#ffffff'
                  }}
                  className="px-1.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider"
                >
                  {task.importance}
                </span>
              )}

              {/* Google Calendar status badge / toggle button */}
              {task.calendarSync ? (
                <span className="flex items-center gap-1 bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded-lg font-bold border border-violet-100 dark:border-violet-900/35 text-[10px]" title="🐾 Sincronizado con Google Calendar">
                  <span>📅 Sincronizado</span>
                  {onToggleCalendarSync && !task.completed && (
                    <button
                      type="button"
                      id={`btn-calendar-deactivate-${task.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleCalendarSync(task.id);
                      }}
                      className="text-[10px] text-zinc-450 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 font-bold ml-1 hover:underline focus:outline-none cursor-pointer"
                    >
                      Desactivar
                    </button>
                  )}
                </span>
              ) : (
                onToggleCalendarSync && !task.completed && (
                  <button
                    type="button"
                    id={`btn-calendar-activate-${task.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleCalendarSync(task.id);
                    }}
                    className="flex items-center gap-1 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-zinc-500 hover:text-violet-650 dark:text-zinc-400 dark:hover:text-violet-400 px-2 py-0.5 rounded-lg font-bold border border-zinc-250 dark:border-zinc-700 text-[10px] transition-colors cursor-pointer"
                    title="🐾 Sincronizar esta tarea con Google Calendar"
                  >
                    <span>📅 Agregar a Calendar</span>
                  </button>
                )
              )}

              {/* Completion date (for history only) */}
              {task.completed && task.completedAt && (
                <span className="text-[11px] font-mono text-zinc-400 flex items-center gap-1">
                  Hecha: {new Date(task.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons (Move + Delete) */}
        <div className="flex items-center justify-end gap-2 shrink-0 w-full sm:w-auto border-t border-zinc-100 dark:border-zinc-800/40 pt-2 sm:pt-0 sm:border-0">
          {!task.completed && onTogglePlannedToday && (
            isTodayCard ? (
              <button
                type="button"
                id={`btn-move-to-pending-${task.id}`}
                onClick={() => onTogglePlannedToday(task.id)}
                className="p-1.5 px-2.5 rounded-xl text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-850 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs"
                title="Postergar a Pendientes"
              >
                <ArrowDown size={11} />
                <span>Postergar</span>
              </button>
            ) : (
              <button
                type="button"
                id={`btn-move-to-today-${task.id}`}
                onClick={() => onTogglePlannedToday(task.id)}
                style={{ backgroundColor: '#7b49d6', color: '#ffffff' }}
                className="p-1.5 px-2.5 rounded-xl border border-violet-500/35 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs hover:opacity-90"
                title="Programar para hoy"
              >
                <ArrowUp size={11} />
                <span>Hacer Hoy</span>
              </button>
            )
          )}

          {/* Delete option - visible directly on mobile, hover-only on desktop */}
          <button
            type="button"
            id={`task-delete-btn-${task.id}`}
            onClick={() => onDeleteTask(task.id)}
            className="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-500 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-all cursor-pointer"
            title="Eliminar tarea"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </motion.div>
    );
  };

  return (
    <div id="task-manager-dashboard" className="space-y-8">
      
      {/* 1. Tareas de Hoy */}
      <div id="section-tasks-today" className="space-y-4">
        <div className="flex justify-between items-end border-b border-zinc-100 dark:border-zinc-800 pb-2">
          <div>
            <h3 className="text-base font-extrabold text-app-text tracking-tight flex items-center gap-1.5">
              <span className="text-violet-600">★</span> Tareas Planeadas para Hoy
            </h3>
            <p className="text-xs text-zinc-450 dark:text-zinc-500">
              Organizadas inteligentemente respetando tu límite saludable de {dailyLimit} tareas.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {tasks.filter((t) => !t.completed).length > 0 && onReorganizeTasks && (
              <button
                type="button"
                id="btn-reorganize-tasks"
                onClick={onReorganizeTasks}
                className="text-xs font-bold text-violet-600 hover:text-white dark:text-violet-400 dark:hover:text-white bg-violet-50 hover:bg-violet-600 dark:bg-violet-950/45 dark:hover:bg-violet-600/80 border border-violet-200/50 dark:border-violet-800/40 py-1 px-2.5 rounded-lg flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs"
                title="Restablecer el orden óptimo de todas las tareas activas utilizando el algoritmo inteligente"
              >
                <Sparkles size={11} className="shrink-0 animate-pulse" />
                <span>Reorganizar</span>
              </button>
            )}
            <span className="text-xs py-1 px-2.5 rounded-lg font-black text-violet-900 bg-violet-100 border border-violet-200 dark:bg-violet-950 dark:text-violet-400 dark:border-violet-850">
              {todayTasks.length} / {dailyLimit} slots
            </span>
          </div>
        </div>

        <div className="space-y-2.5">
          <AnimatePresence mode="popLayout">
            {todayTasks.length > 0 ? (
              todayTasks.map((task) => renderTaskCard(task, true))
            ) : (
              <motion.div
                key="empty-today"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-app-bg border border-dashed border-app-border p-8 rounded-2xl text-center"
              >
                <div className="text-3xl mb-1.5">🐈</div>
                <h4 className="text-sm font-black text-app-text">
                  {tasks.filter((t) => !t.completed).length === 0
                    ? '¡No hay tareas activas!'
                    : '¡Completaste tu plan diario!'}
                </h4>
                <p className="text-xs text-zinc-450 dark:text-zinc-550 mt-1 max-w-sm mx-auto leading-relaxed">
                  {tasks.filter((t) => !t.completed).length === 0
                    ? 'Agregá nuevas tareas arriba. Minnity las organizará para evitar que procrastines.'
                    : '¡Asombroso! Lograste tus metas de hoy. Miau 🐾 Aprovechá para relajarte o arrancar un bloque Pomodoro.'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 2. Tareas Pendientes */}
      <div id="section-tasks-pending" className="space-y-4">
        <div className="flex justify-between items-end border-b border-zinc-100 dark:border-zinc-800 pb-2">
          <div>
            <h3 className="text-base font-extrabold text-app-text tracking-tight flex items-center gap-1.5">
              <span className="text-zinc-450">◷</span> Bandeja de Tareas Pendientes
            </h3>
            <p className="text-xs text-zinc-450 dark:text-zinc-500">
              Tareas guardadas para futuros días de forma balanceada para evitar amontonamiento.
            </p>
          </div>
          <span
            style={{ color: '#c1c1c1' }}
            className="text-xs bg-zinc-100 dark:bg-zinc-800 py-1 px-2.5 rounded-lg font-extrabold text-zinc-900 dark:text-zinc-200 border border-zinc-250 dark:border-zinc-700"
          >
            {pendingTasks.length} acumuladas
          </span>
        </div>

        <div className="space-y-2.5">
          <AnimatePresence mode="popLayout">
            {pendingTasks.length > 0 ? (
              pendingTasks.map((task) => renderTaskCard(task, false))
            ) : (
              <motion.div
                key="empty-pending"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-app-bg border border-dashed border-app-border p-6 rounded-2xl text-center"
              >
                <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">
                  No tenés tareas en espera. ¡Todo tu progreso está al día de forma impecable! 🐾
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 3. Completed/Historial Log */}
      <div id="section-tasks-completed" className="space-y-4 pt-4">
        <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-2">
          <button
            type="button"
            id="btn-toggle-history"
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2.5 text-left hover:opacity-80 transition-opacity focus:outline-none group cursor-pointer"
          >
            <span
              style={{ backgroundColor: '#925151', color: '#ffffff' }}
              className="p-1 rounded-lg group-hover:scale-105 transition-transform shrink-0"
            >
              <Trophy size={14} />
            </span>
            <div>
              <h3 className="text-sm font-extrabold text-app-text flex items-center gap-1.5 flex-wrap">
                Historial de Tareas Completadas
                <span
                  style={{ color: '#5e5e5e' }}
                  className="text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-900 dark:text-zinc-100 font-mono font-extrabold border border-zinc-250 dark:border-zinc-700"
                >
                  {completedTasks.length}
                </span>
                {showHistory ? <ChevronUp size={14} className="text-zinc-400" /> : <ChevronDown size={14} className="text-zinc-400" />}
              </h3>
              <p className="text-[11px] text-zinc-450 dark:text-zinc-500">
                {showHistory ? 'Hacé clic para ocultar tus logros anotados.' : 'Hacé clic para ver tus logros y tareas finalizadas.'}
              </p>
            </div>
          </button>

          {completedTasks.length > 0 && onClearHistory && showHistory && (
            <button
              id="btn-clear-completed-history"
              type="button"
              onClick={onClearHistory}
              className="text-xs font-semibold text-rose-600 dark:text-rose-450 hover:underline hover:text-rose-700 bg-transparent py-1 px-2 border border-transparent hover:border-rose-100 dark:hover:border-rose-950/40 rounded-lg cursor-pointer"
            >
              Vaciar Historial
            </button>
          )}
        </div>

        <AnimatePresence initial={false}>
          {showHistory && (
            <motion.div
              id="history-items-container"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="max-h-56 overflow-y-auto pr-1 space-y-2 pb-2">
                <AnimatePresence mode="popLayout">
                  {completedTasks.length > 0 ? (
                    completedTasks.map((task) => renderTaskCard(task, false))
                  ) : (
                    <motion.div
                      key="empty-completed"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-4 bg-zinc-50/30 dark:bg-zinc-800/10 rounded-xl text-center"
                    >
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">
                        Tu baúl de logros está esperando tu primera victoria. ¡Iniciá hoy y completá una tarea! 🏆
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
