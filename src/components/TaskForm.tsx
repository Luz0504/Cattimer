/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent } from 'react';
import { motion } from 'motion/react';
import { Calendar, Clock, AlertCircle, Plus, Minus } from 'lucide-react';
import { Task, ImportanceLevel } from '../types';

interface TaskFormProps {
  onAddTask: (taskData: Omit<Task, 'id' | 'completed' | 'createdAt'>) => void;
  dailyLimit: number;
  onClose?: () => void;
  googleConnected?: boolean;
  onConnectGoogle?: () => Promise<string | null>;
}

const ESTIMATED_TIME_OPTIONS = [
  { value: 15, label: '15 minutos', angle: 90 },
  { value: 30, label: '30 minutos', angle: 180 },
  { value: 60, label: '1 hora', angle: 360 },
  { value: 120, label: '2 horas', angle: 60 },
  { value: 1440, label: '1 día', angle: 0 }, // represented by full circle or special indicator
];

export default function TaskForm({
  onAddTask,
  dailyLimit,
  onClose,
  googleConnected = false,
  onConnectGoogle,
}: TaskFormProps) {
  const [name, setName] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(30); // default: 30 min
  const [importance, setImportance] = useState<ImportanceLevel>('Medio');
  
  // Google Calendar integration states
  const [syncToCalendar, setSyncToCalendar] = useState<boolean>(false);
  const [reminderMins, setReminderMins] = useState<number>(30); // default 30 min before

  
  // Calendar variables
  const currentDate = new Date(); // Dynamic current date
  const [selectedDate, setSelectedDate] = useState<Date>(currentDate);
  const [viewYear, setViewYear] = useState(currentDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(currentDate.getMonth()); // 0-indexed

  // State to toggle popups/views inside form if needed
  const [showCalendarWidget, setShowCalendarWidget] = useState(false);

  // Helper to format estimated time label
  const formatEstimateLabel = (mins: number) => {
    if (mins >= 1440) {
      const days = Math.floor(mins / 1440);
      return `${days} ${days === 1 ? 'día' : 'días'}`;
    }
    const hrs = Math.floor(mins / 60);
    const m = mins % 60;
    if (hrs > 0 && m > 0) {
      return `${hrs} h ${m} m`;
    } else if (hrs > 0) {
      return `${hrs} ${hrs === 1 ? 'hora' : 'horas'}`;
    } else {
      return `${m} minutos`;
    }
  };

  const adjustHours = (amount: number) => {
    const currentHours = Math.floor(estimatedMinutes / 60);
    const currentMinutes = estimatedMinutes % 60;
    const nextHrs = Math.max(0, Math.min(24, currentHours + amount));
    const nextMins = (nextHrs * 60) + currentMinutes;
    if (nextMins > 0) {
      setEstimatedMinutes(nextMins);
    }
  };

  const adjustMinutes = (amount: number) => {
    const currentHours = Math.floor(estimatedMinutes / 60);
    const currentMinutes = estimatedMinutes % 60;
    let nextTotal = (currentHours * 60) + currentMinutes + amount;
    nextTotal = Math.max(5, Math.min(1440, nextTotal)); // clamp between 5 mins and 24 hours
    setEstimatedMinutes(nextTotal);
  };

  // Form submit
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let canSync = syncToCalendar;
    if (syncToCalendar && !googleConnected) {
      if (onConnectGoogle) {
        try {
          const token = await onConnectGoogle();
          if (!token) {
            canSync = false;
          }
        } catch (err) {
          console.error('No se pudo conectar con Google Calendar:', err);
          alert('No se pudo conectar a tu cuenta de Google. Tu tarea se creará de forma local sin sincronizarse con el calendario.');
          canSync = false;
        }
      } else {
        canSync = false;
      }
    }

    // Format date as YYYY-MM-DD
    const yyyy = selectedDate.getFullYear();
    const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const dd = String(selectedDate.getDate()).padStart(2, '0');
    const dueDateString = `${yyyy}-${mm}-${dd}`;

    onAddTask({
      name: name.trim(),
      estimatedTime: estimatedMinutes,
      estimatedTimeLabel: formatEstimateLabel(estimatedMinutes),
      dueDate: dueDateString,
      importance,
      calendarSync: canSync,
      reminderMinutes: canSync ? reminderMins : undefined,
    });

    // Reset simple parts
    setName('');
    setImportance('Medio');
    setEstimatedMinutes(30);
    setSyncToCalendar(false);
    setReminderMins(30);
    setSelectedDate(new Date());
    if (onClose) onClose();
  };

  // Helper to generate days of the month for custom grid
  const getDaysInMonth = (year: number, month: number) => {
    const days = [];
    const firstDayIndex = new Date(year, month, 1).getDay(); // day of week (0-6)
    const totalDays = new Date(year, month + 1, 0).getDate(); // days in month

    // Add padding days for start of week (Sunday start)
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }

    // Add actual days
    for (let d = 1; d <= totalDays; d++) {
      days.push(new Date(year, month, d));
    }

    return days;
  };

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const calendarDays = getDaysInMonth(viewYear, viewMonth);

  // Math for clock hands based on selected estimated time
  const getClockHandsRotation = () => {
    // defaults
    let hourAngle = 0;
    let minuteAngle = 0;
    let showDayIndicator = false;

    if (estimatedMinutes >= 1440) {
      showDayIndicator = true;
    } else {
      // Dynamic angles for custom minutes & hours
      minuteAngle = (estimatedMinutes % 60) * 6; // 360 / 60 = 6 deg per minute
      hourAngle = ((estimatedMinutes / 60) % 12) * 30 + (estimatedMinutes % 60) * 0.5; // 30 deg per hour
    }

    return { hourAngle, minuteAngle, showDayIndicator };
  };

  const { hourAngle, minuteAngle, showDayIndicator } = getClockHandsRotation();

  // Prev/next month for calendar
  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  return (
    <form
      id="task-dialog-form"
      onSubmit={handleSubmit}
      className="space-y-6 bg-app-card border border-app-border p-4 sm:p-6 rounded-3xl shadow-lg w-full min-w-0 overflow-hidden"
    >
      <div className="flex justify-between items-center pb-2 border-b border-zinc-100 dark:border-zinc-800">
        <div>
          <h3 className="text-lg font-bold text-app-text flex items-center gap-2">
            <span className="p-1.5 bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400 rounded-xl">
              <Plus size={18} />
            </span>
            Agregar Nueva Tarea
          </h3>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
            Las tareas chicas y variadas ayudan a combatir la procrastinación. Se adaptará a tu límite de {dailyLimit} tareas diarias.
          </p>
        </div>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <label htmlFor="task-name-input" className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          ¿Qué tenés que hacer hoy o pronto?
        </label>
        <input
          id="task-name-input"
          type="text"
          required
          placeholder="Ej: Estudiar para el examen de Historia, Lavar los platos..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-3 rounded-2xl border-2 border-app-border focus:border-violet-500 dark:focus:border-violet-500 bg-app-bg text-app-text text-sm outline-none transition-all"
        />
      </div>

      {/* Grid containing visually advanced pickers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Visual Clock selector */}
        <div className="space-y-3 bg-app-bg p-3.5 sm:p-4 rounded-2xl border border-app-border">
          <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
            <Clock size={16} className="text-violet-600 dark:text-violet-400" />
            Tiempo Estimado (Reloj)
          </label>
          
          <div className="flex flex-col items-center gap-4 py-1">
            
            {/* Visual Cat Clock Design */}
            <div className="relative w-28 h-28 bg-app-card rounded-full border-4 border-violet-500 flex items-center justify-center shadow-inner">
              {/* Cat ears on clock */}
              <div className="absolute -top-3.5 -left-1 w-5 h-5 bg-violet-500 rounded-tl-full rotate-45 transform origin-bottom-right" />
              <div className="absolute -top-3.5 -right-1 w-5 h-5 bg-violet-500 rounded-tr-full -rotate-45 transform origin-bottom-left" />

              {/* Clock dots */}
              <div className="absolute top-1 w-1.5 h-1.5 bg-zinc-300 rounded-full" />
              <div className="absolute right-1 w-1.5 h-1.5 bg-zinc-300 rounded-full" />
              <div className="absolute bottom-1 w-1.5 h-1.5 bg-zinc-300 rounded-full" />
              <div className="absolute left-1 w-1.5 h-1.5 bg-zinc-300 rounded-full" />

              {showDayIndicator ? (
                // 1 Day icon (sun & clouds)
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="text-amber-500 text-2xl font-bold flex flex-col items-center"
                >
                  ☀️
                  <span className="text-[10px] text-zinc-400 tracking-wider">DÍA</span>
                </motion.div>
              ) : (
                // Clock Center hands
                <div id="visual-clock-face" className="absolute inset-0 flex items-center justify-center rounded-full pointer-events-none">
                  <div className="w-2.5 h-2.5 bg-violet-600 rounded-full z-10" />
                  
                  {/* Hour Hand */}
                  <div
                    className="absolute bg-zinc-800 dark:bg-zinc-100 rounded-full origin-bottom"
                    style={{
                      height: '24px',
                      width: '3.5px',
                      bottom: '50%',
                      transform: `rotate(${hourAngle}deg)`,
                      transition: 'transform 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28)',
                    }}
                  />
                  {/* Minute Hand */}
                  <div
                    className="absolute bg-violet-600 rounded-full origin-bottom"
                    style={{
                      height: '34px',
                      width: '2px',
                      bottom: '50%',
                      transform: `rotate(${minuteAngle}deg)`,
                      transition: 'transform 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28)',
                    }}
                  />
                </div>
              )}
            </div>

            {/* Manual adjustment controls */}
            <div id="manual-estimate-adjuster" className="flex flex-col items-center justify-center p-2 sm:p-2.5 bg-app-card border border-app-border rounded-xl w-full gap-1">
              <div className="flex items-center justify-between w-full">
                <span className="text-[10px] font-black text-zinc-450 dark:text-zinc-500 uppercase tracking-wider">
                  Ajustar Estimación
                </span>
                <span className="text-xs font-black text-violet-600 dark:text-violet-400 font-mono">
                  {formatEstimateLabel(estimatedMinutes)}
                </span>
              </div>
              
              <div className="flex items-center gap-1 justify-center w-full flex-nowrap min-w-0">
                {/* Hours column */}
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Horas</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      id="btn-task-hours-dec"
                      onClick={() => adjustHours(-1)}
                      disabled={Math.floor(estimatedMinutes / 60) <= 0}
                      className="w-7 h-7 flex items-center justify-center rounded-lg border border-app-border bg-app-bg text-zinc-650 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 enabled:active:scale-95 disabled:opacity-45 transition-all cursor-pointer p-0"
                      title="Restar 1 hora"
                    >
                      <Minus size={11} />
                    </button>
                    <span className="min-w-[22px] text-center font-mono font-bold text-xs text-app-text">
                      {Math.floor(estimatedMinutes / 60)}h
                    </span>
                    <button
                      type="button"
                      id="btn-task-hours-inc"
                      onClick={() => adjustHours(1)}
                      disabled={Math.floor(estimatedMinutes / 60) >= 24}
                      className="w-7 h-7 flex items-center justify-center rounded-lg border border-app-border bg-app-bg text-zinc-650 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 enabled:active:scale-95 disabled:opacity-45 transition-all cursor-pointer p-0"
                      title="Sumar 1 hora"
                    >
                      <Plus size={11} />
                    </button>
                  </div>
                </div>

                <div className="text-xs font-bold text-zinc-400 dark:text-zinc-500 mt-2.5 font-mono px-0.5">:</div>

                {/* Minutes column */}
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider font-sans">Minutos</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      id="btn-task-minutes-dec"
                      onClick={() => adjustMinutes(-5)}
                      disabled={estimatedMinutes <= 5}
                      className="w-7 h-7 flex items-center justify-center rounded-lg border border-app-border bg-app-bg text-zinc-650 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 enabled:active:scale-95 disabled:opacity-45 transition-all cursor-pointer p-0"
                      title="Restar 5 minutos"
                    >
                      <Minus size={11} />
                    </button>
                    <span className="min-w-[22px] text-center font-mono font-bold text-xs text-app-text">
                      {estimatedMinutes % 60}m
                    </span>
                    <button
                      type="button"
                      id="btn-task-minutes-inc"
                      onClick={() => adjustMinutes(5)}
                      disabled={estimatedMinutes >= 1440}
                      className="w-7 h-7 flex items-center justify-center rounded-lg border border-app-border bg-app-bg text-zinc-650 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 enabled:active:scale-95 disabled:opacity-45 transition-all cursor-pointer p-0"
                      title="Sumar 5 minutos"
                    >
                      <Plus size={11} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Selector Options pills */}
            <div className="grid grid-cols-2 min-[380px]:grid-cols-3 sm:grid-cols-5 md:grid-cols-3 gap-1.5 w-full pt-1">
              {ESTIMATED_TIME_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  id={`clock-timing-pill-${opt.value}`}
                  onClick={() => setEstimatedMinutes(opt.value)}
                  className={`py-1.5 px-2 rounded-xl text-xs font-semibold text-center border transition-all active:scale-95 ${
                    estimatedMinutes === opt.value
                      ? 'bg-violet-600 text-white border-violet-600 dark:bg-violet-500 dark:border-violet-500 shadow-sm shadow-violet-500/25'
                      : 'border-app-border hover:border-violet-200 bg-app-card text-app-text'
                  }`}
                >
                  {opt.label.replace(' minutos', 'm').replace(' horas', 'h').replace(' hora', 'h')}
                </button>
              ))}
            </div>
            
          </div>
        </div>

        {/* Calendar visual pickers */}
        <div className="space-y-3 bg-app-bg p-4 rounded-2xl border border-app-border">
          <div className="flex justify-between items-center">
            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Calendar size={16} className="text-violet-600 dark:text-violet-400" />
              Fecha Limite (Entrega)
            </label>
            <button
              type="button"
              id="btn-calendar-expand"
              onClick={() => setShowCalendarWidget(!showCalendarWidget)}
              className="text-xs text-violet-600 dark:text-violet-400 font-semibold hover:underline"
            >
              {showCalendarWidget ? 'Cerrar Vista' : 'Cambiar Fecha'}
            </button>
          </div>

          {!showCalendarWidget ? (
            /* Compressed selected date view */
            <div
              onClick={() => setShowCalendarWidget(true)}
              className="flex items-center justify-between p-3.5 bg-app-card border-2 border-dashed border-app-border hover:border-violet-400 dark:hover:border-violet-500 rounded-2xl cursor-pointer transition-all active:scale-98"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl" id="calendar-emoji-indicator">📅</span>
                <div className="text-left">
                  <p className="font-extrabold text-sm text-zinc-800 dark:text-zinc-200">
                    {selectedDate.getDate()} de {monthNames[selectedDate.getMonth()]} de {selectedDate.getFullYear()}
                  </p>
                  <p
                    style={{ color: '#959595' }}
                    className="text-[11px] font-mono"
                  >
                    {selectedDate.getTime() === currentDate.getTime() ? '¡Es Hoy mismo!' : 'Fecha futura seleccionada'}
                  </p>
                </div>
              </div>
              <span
                style={{ backgroundColor: '#7e3bf2', color: '#e0d4ff' }}
                className="text-xs font-bold px-2.5 py-1 rounded-lg"
              >
                Editar
              </span>
            </div>
          ) : (
            /* Visual Month Calendar Component */
            <div id="visual-calendar-grid" className="bg-app-card p-3 rounded-2xl border border-app-border space-y-3">
              <div className="flex justify-between items-center">
                <button
                  type="button"
                  id="btn-calendar-prev"
                  onClick={handlePrevMonth}
                  className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-300"
                >
                  ◀
                </button>
                <span className="text-xs font-bold text-app-text font-sans tracking-wide">
                  {monthNames[viewMonth]} {viewYear}
                </span>
                <button
                  type="button"
                  id="btn-calendar-next"
                  onClick={handleNextMonth}
                  className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-300"
                >
                  ▶
                </button>
              </div>

              {/* Calendar Grid Header */}
              <div className="grid grid-cols-7 gap-1 text-center font-mono text-[10px] text-zinc-400 font-semibold uppercase">
                <span>D</span><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span>
              </div>

              {/* Day Grid */}
              <div className="grid grid-cols-7 gap-1 text-center font-sans text-xs">
                {calendarDays.map((day, idx) => {
                  if (!day) return <div key={`padding-${idx}`} />;
                  
                  const isSelected = selectedDate.getDate() === day.getDate() &&
                                     selectedDate.getMonth() === day.getMonth() &&
                                     selectedDate.getFullYear() === day.getFullYear();
                  
                  const isToday = currentDate.getDate() === day.getDate() &&
                                  currentDate.getMonth() === day.getMonth() &&
                                  currentDate.getFullYear() === day.getFullYear();

                  const todayMidnight = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
                  const isPast = day < todayMidnight;

                  return (
                    <button
                      type="button"
                      key={day.toISOString()}
                      id={`calendar-day-${day.getDate()}`}
                      disabled={isPast}
                      onClick={() => {
                        setSelectedDate(day);
                        setShowCalendarWidget(false); // compress on click
                      }}
                      className={`w-7 h-7 flex items-center justify-center rounded-full font-semibold transition-all ${
                        isSelected
                          ? 'bg-violet-600 text-white font-black'
                          : isToday
                          ? 'border-2 border-violet-400 text-violet-600 dark:text-violet-400'
                          : isPast
                          ? 'text-zinc-300 dark:text-zinc-600 cursor-not-allowed line-through'
                          : 'text-zinc-700 dark:text-zinc-300 hover:bg-violet-50 dark:hover:bg-violet-950/30'
                      }`}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Level of Importance */}
      <div className="space-y-2 bg-gradient-to-r from-violet-500/5 to-transparent p-4 rounded-2xl border border-violet-500/10 dark:border-violet-500/5">
        <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
          <AlertCircle size={16} className="text-violet-600 dark:text-violet-400" />
          Nivel de Importancia
        </label>
        
        <div className="grid grid-cols-3 gap-2">
          {([
            { id: 'Alto', color: 'border-rose-300 text-rose-800 hover:border-rose-450 bg-rose-50/20', active: 'bg-rose-600 text-white border-rose-600 dark:bg-rose-500 dark:border-rose-500' },
            { id: 'Medio', color: 'border-amber-300 text-amber-800 hover:border-amber-450 bg-amber-50/20', active: 'bg-amber-600 text-white border-amber-600 dark:bg-amber-500 dark:border-amber-500' },
            { id: 'Bajo', color: 'border-emerald-300 text-emerald-800 hover:border-emerald-450 bg-emerald-50/20', active: 'bg-emerald-600 text-white border-emerald-600 dark:bg-emerald-500 dark:border-emerald-500' }
          ] as const).map((lv) => (
            <button
              type="button"
              key={lv.id}
              id={`importance-btn-${lv.id}`}
              onClick={() => setImportance(lv.id)}
              className={`py-3.5 px-3 rounded-2xl text-center text-xs font-bold border transition-all active:scale-95 ${
                importance === lv.id ? lv.active : `${lv.color} bg-white dark:bg-zinc-800 dark:border-zinc-800 dark:text-zinc-300`
              }`}
            >
              {lv.id}
            </button>
          ))}
        </div>
      </div>

      {/* Sincronización con Google Calendar */}
      <div className="space-y-3 bg-gradient-to-r from-violet-500/5 to-transparent p-4 rounded-2xl border border-violet-500/10 dark:border-violet-500/5 text-left">
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            id="chk-google-calendar-sync"
            checked={syncToCalendar}
            onChange={(e) => setSyncToCalendar(e.target.checked)}
            className="rounded text-violet-600 focus:ring-violet-500 w-4 h-4 cursor-pointer accent-violet-600"
          />
          <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
            📅 Agregar a Google Calendar
          </span>
        </label>

        {syncToCalendar && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-3 mt-2 pt-2 border-t border-zinc-150/50 dark:border-zinc-800/50"
          >
            {!googleConnected && (
              <p id="google-auth-warning" className="text-xs text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/20 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/30">
                ⚠️ Sincronización pendiente: Se te solicitará iniciar sesión con tu cuenta de Google al crear la tarea.
              </p>
            )}

            <div className="space-y-1">
              <label htmlFor="reminder-select" className="block text-xs font-bold text-zinc-500 dark:text-zinc-400">
                ¿Cuándo querés recibir el recordatorio?
              </label>
              <select
                id="reminder-select"
                value={reminderMins}
                onChange={(e) => setReminderMins(Number(e.target.value))}
                className="w-full px-3 py-2 bg-app-card border border-app-border rounded-xl text-app-text text-xs focus:ring-1 focus:ring-violet-500 max-w-xs focus:border-violet-500 outline-none"
              >
                <option value={0}>Sin recordatorios automáticos</option>
                <option value={15}>15 minutos antes</option>
                <option value={30}>30 minutos antes</option>
                <option value={60}>1 hora antes</option>
                <option value={120}>2 horas antes</option>
                <option value={1440}>1 día antes</option>
              </select>
            </div>

            {importance === 'Alto' ? (
              <div id="tip-high-importance-reminder" className="bg-amber-500/10 dark:bg-amber-500/5 p-2.5 rounded-xl border border-outline border-amber-500/15 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                🐾 <strong>Miny aconseja:</strong> Parece importante. Te recomiendo activar recordatorios. Como esta tarea es de <strong>Importancia Alta</strong>, Minnity la reforzará programando avisos extras automáticos (a los 15 minutos, 2 horas y 1 día de anticipación) para que no se te pase.
              </div>
            ) : (
              <div className="text-[11px] text-zinc-400 leading-relaxed">
                🐾 ¡Miau! Sincronicé tu tarea para que no se te pase la fecha de entrega.
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-2">
        {onClose && (
          <button
            type="button"
            id="btn-add-task-cancel"
            onClick={onClose}
            className="flex-1 py-3 px-4 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all text-sm active:scale-95"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          id="btn-add-task-submit"
          className="flex-3 py-3 px-4 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-2xl text-sm shadow-md shadow-violet-500/20 transition-all active:scale-95"
        >
          Agregar Tarea 🐾
        </button>
      </div>
    </form>
  );
}
