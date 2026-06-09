/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { motion } from 'motion/react';
import { BarChart2, Sparkles, Trophy, Calendar } from 'lucide-react';
import { Task } from '../types';
import { MinnityExpression } from './MinnityMascot';

interface TaskProgressChartProps {
  tasks: Task[];
  theme: 'light' | 'dark';
  onMascotReact: (expression: MinnityExpression, text: string) => void;
}

export default function TaskProgressChart({ tasks, theme, onMascotReact }: TaskProgressChartProps) {
  const [activeBarIndex, setActiveBarIndex] = useState<number | null>(null);

  // Helper to retrieve the last 7 calendar days
  const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateKey = `${yyyy}-${mm}-${dd}`;
      
      // Friendly label (e.g., "Lun 8")
      const label = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
      const formattedLabel = label.charAt(0).toUpperCase() + label.slice(1);
      
      days.push({
        dateKey,
        label: formattedLabel,
        rawName: d.toLocaleDateString('es-ES', { weekday: 'long' }),
        dateObj: d,
      });
    }
    return days;
  };

  const daysData = getLast7Days();

  // Map tasks to completion counts
  const chartData = daysData.map((day) => {
    const completedOnDay = tasks.filter((t) => {
      if (!t.completed || !t.completedAt) return false;
      try {
        const tDate = new Date(t.completedAt);
        const yyyy = tDate.getFullYear();
        const mm = String(tDate.getMonth() + 1).padStart(2, '0');
        const dd = String(tDate.getDate()).padStart(2, '0');
        const tKey = `${yyyy}-${mm}-${dd}`;
        return tKey === day.dateKey;
      } catch (e) {
        return false;
      }
    });

    return {
      name: day.label,
      fullDayName: day.rawName,
      completadas: completedOnDay.length,
      taskNames: completedOnDay.map((t) => t.name),
      dateKey: day.dateKey,
    };
  });

  const totalCompletadasSemana = chartData.reduce((acc, curr) => acc + curr.completadas, 0);

  // Handle bar click to trigger Minnity reaction
  const handleBarClick = (data: any, index: number) => {
    setActiveBarIndex(index);
    const dayName = data.fullDayName.charAt(0).toUpperCase() + data.fullDayName.slice(1);
    const count = data.completadas;

    let responseText = '';
    let expression: MinnityExpression = 'friendly';

    if (count === 0) {
      expression = 'thinking';
      responseText = `🐾 Miau, el ${dayName} no registramos tareas completadas. ¡Recordá que descansar y planificar también son parte del proceso! Mañana es un nuevo día. ✨💤`;
    } else if (count === 1) {
      expression = 'happy';
      responseText = `🐾 ¡Miau! El ${dayName} completaste 1 tarea ("${data.taskNames[0]}"). ¡Cada paso cuenta para ganarle a la procrastinación! Excelente esfuerzo. 💕`;
    } else if (count >= 2) {
      expression = 'focused';
      const taskListBullet = data.taskNames.map((name: string) => `• ${name}`).join(' y ');
      responseText = `🐾 ¡Increíble, miau! El ${dayName} estuviste con las garras super activas completando ${count} tareas (${data.taskNames.slice(0, 2).join(', ')}${data.taskNames.length > 2 ? ' y más' : ''}). ¡Estuviste mega enfocado! 🐱🏆✨`;
    }

    onMascotReact(expression, responseText);
  };

  // Overall weekly analysis trigger
  const triggerWeeklyAnalysis = () => {
    setActiveBarIndex(null);
    let responseText = '';
    let expression: MinnityExpression = 'friendly';

    if (totalCompletadasSemana === 0) {
      expression = 'thinking';
      responseText = `🐾 Miau... No veo tareas completadas esta semana en tu gráfico. ¡Pero no te preocupes! Siempre podemos empezar hoy con una tarea pequeña. ¡Yo te apoyo en cada pasito! 🌸🌱`;
    } else if (totalCompletadasSemana <= 2) {
      expression = 'friendly';
      responseText = `🐾 ¡Miau! Completaste ${totalCompletadasSemana} ${totalCompletadasSemana === 1 ? 'tarea' : 'tareas'} esta semana. ¡Es un buen comienzo para motivarnos! Continuemos sumando logros juntos. 🐱✨`;
    } else if (totalCompletadasSemana <= 6) {
      expression = 'focused';
      responseText = `🐾 ¡Muy bien hecho, miau! Llevás ${totalCompletadasSemana} tareas completadas en los últimos 7 días. Sentar una rutina diaria te ayuda a dominar el estrés. ¡Sigamos con este gran ritmo! 🔥🐾`;
    } else {
      expression = 'happy';
      responseText = `🐾 ¡Miau, miau, miauuu! 🔥 ¡Qué nivel de productividad! Llevás completadas ${totalCompletadasSemana} tareas esta semana. Minnity está super orgullosa de tu consistencia. ¡Te merecés un buen mimo y un gran descanso hoy! 🐾🏆⭐`;
    }

    onMascotReact(expression, responseText);
  };

  const isDark = theme === 'dark';

  return (
    <div className="bg-app-card border border-app-border rounded-3xl p-4 sm:p-5 md:p-6 shadow-xs space-y-4 w-full min-w-0 overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            style={{ backgroundColor: '#563496', color: '#ffffff' }}
            className="p-2 rounded-xl"
          >
            <BarChart2 size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-app-text tracking-tight font-display">
              Tu Progreso Semanal
            </h3>
            <p className="text-[11px] text-zinc-400 leading-none">
              Tareas completadas en los últimos 7 días
            </p>
          </div>
        </div>

        {/* Dynamic button to trigger full overview dialogue */}
        <button
          type="button"
          onClick={triggerWeeklyAnalysis}
          className="py-1.5 px-3 rounded-xl bg-violet-600 hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-600 text-white font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs"
        >
          <Sparkles size={13} />
          Analizar Semana
        </button>
      </div>

      {/* Chart container */}
      <div className="h-[210px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 10, left: -25, bottom: 5 }}
            onClick={(state) => {
              if (state && state.activeTooltipIndex !== undefined) {
                const idx = Number(state.activeTooltipIndex);
                if (idx >= 0 && idx < chartData.length) {
                  handleBarClick(chartData[idx], idx);
                }
              }
            }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}
            />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: isDark ? '#a1a1aa' : '#71717a', fontSize: 11, fontWeight: 500 }}
            />
            <YAxis
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
              tick={{ fill: isDark ? '#a1a1aa' : '#71717a', fontSize: 11 }}
            />
            <Tooltip
              cursor={{ fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', radius: 8 }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white dark:bg-zinc-950 p-3 rounded-xl border border-zinc-200 dark:border-zinc-850 shadow-md text-xs space-y-1 max-w-[200px]">
                      <p className="font-bold text-zinc-800 dark:text-zinc-200 capitalize">
                        {data.fullDayName}
                      </p>
                      <p className="text-violet-600 dark:text-violet-400 font-semibold">
                        Completadas: {data.completadas}
                      </p>
                      {data.completadas > 0 && (
                        <div className="border-t border-zinc-100 dark:border-zinc-900 pt-1.5 mt-1.5 space-y-1">
                          <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Tareas:</p>
                          <ul className="list-disc list-inside text-[10px] text-zinc-500 dark:text-zinc-400 space-y-0.5 truncate">
                            {data.taskNames.map((name: string, i: number) => (
                              <li key={i} className="truncate">
                                {name}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              dataKey="completadas"
              radius={[6, 6, 0, 0]}
              maxBarSize={32}
              className="cursor-pointer"
            >
              {chartData.map((entry, index) => {
                const isActive = activeBarIndex === index;
                let barColor = isDark ? '#7c3aed' : '#8b5cf6'; // default violet
                
                if (entry.completadas > 0) {
                  barColor = isDark ? '#a78bfa' : '#6d28d9'; // positive completion highlighting
                }
                if (isActive) {
                  barColor = isDark ? '#e9d5ff' : '#4c1d95'; // selected/active bar highlighting
                }

                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={barColor}
                    className="transition-colors duration-200"
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between text-[11px] text-zinc-400 border-t border-app-border/40 pt-2 bg-zinc-50/30 dark:bg-zinc-900/10 px-2 rounded-xl">
        <div className="flex items-center gap-1.5">
          <Calendar size={12} className="text-zinc-400" />
          <span>Periodo: Últimos 7 días</span>
        </div>
        <div className="flex items-center gap-1">
          <Trophy size={12} className="text-amber-500" />
          <span>Completadas: <strong className="text-violet-600 dark:text-violet-400 font-bold">{totalCompletadasSemana}</strong></span>
        </div>
      </div>
      <p className="text-[10px] text-center text-zinc-400/80 italic">
        💡 Haciendo clic en una barra verás el análisis de ese día por Minnity
      </p>
    </div>
  );
}
