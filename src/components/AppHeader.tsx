/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Clock, Calendar, Sun, Moon, Settings, Sunrise, Coffee } from 'lucide-react';

interface AppHeaderProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  onOpenSettings: () => void;
}

export default function AppHeader({ theme, toggleTheme, onOpenSettings }: AppHeaderProps) {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

  const dayName = days[currentTime.getDay()];
  const dayNum = currentTime.getDate();
  const monthName = months[currentTime.getMonth()];

  const formattedDate = `${dayName}, ${dayNum} de ${monthName}`;

  const getPeriod = (hoursVal: number) => {
    if (hoursVal >= 6 && hoursVal < 12) {
      return { 
        label: 'Mañana', 
        icon: <Sunrise className="w-3 h-3 text-amber-600 dark:text-amber-400 animate-pulse" />, 
        colorBg: 'bg-amber-100/95 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border-amber-350 dark:border-amber-800/50',
      };
    } else if (hoursVal >= 12 && hoursVal < 19) {
      return { 
        label: 'Tarde', 
        icon: <Sun className="w-3 h-3 text-orange-600 dark:text-orange-400 animate-pulse" />, 
        colorBg: 'bg-orange-100/95 dark:bg-orange-950/80 text-orange-900 dark:text-orange-200 border-orange-350 dark:border-orange-800/50',
      };
    } else if (hoursVal >= 19 && hoursVal < 23) {
      return { 
        label: 'Noche', 
        icon: <Moon className="w-3 h-3 text-violet-600 dark:text-violet-400" />, 
        colorBg: 'bg-violet-100/95 dark:bg-violet-950/80 text-violet-900 dark:text-violet-200 border-violet-350 dark:border-violet-800/50',
      };
    } else {
      return { 
        label: 'Madrugada', 
        icon: <Coffee className="w-3 h-3 text-indigo-600 dark:text-indigo-400 animate-pulse" />, 
        colorBg: 'bg-indigo-100/95 dark:bg-indigo-950/80 text-indigo-900 dark:text-indigo-200 border-indigo-350 dark:border-indigo-800/50',
      };
    }
  };

  const periodObj = getPeriod(currentTime.getHours());

  const hours = String(currentTime.getHours()).padStart(2, '0');
  const minutes = String(currentTime.getMinutes()).padStart(2, '0');

  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between bg-app-card border border-app-border p-3.5 md:p-4 rounded-3xl shadow-xs gap-3.5 relative overflow-hidden transition-all">
      
      {/* Top Row on mobile / Left group on desktop */}
      <div className="w-full md:w-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-xl md:text-2xl select-none" role="img" aria-label="cattimer-logo">🐈‍⬛</span>
          <div>
            <h1 className="text-base md:text-lg font-black font-display tracking-tight text-app-text flex items-center gap-1 leading-tight">
              Cattimer <span className="text-violet-600 dark:text-violet-400">🐾</span>
            </h1>
            <p className="text-[8px] md:text-[9px] uppercase tracking-widest font-extrabold opacity-75 font-mono">
              Socio de Productividad
            </p>
          </div>
        </div>

        {/* Action button controls - mobile only */}
        <div className="flex md:hidden items-center gap-1.5">
          <button
            type="button"
            id="btn-theme-toggle-mobile"
            onClick={toggleTheme}
            className="p-2 rounded-xl text-zinc-650 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-app-border active:scale-95 transition-all cursor-pointer"
            title="Cambiar Modo Claro/Oscuro"
          >
            {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
          </button>

          <button
            type="button"
            id="btn-settings-open-mobile"
            onClick={onOpenSettings}
            className="p-2 rounded-xl text-zinc-650 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-app-border active:scale-95 transition-all cursor-pointer"
            title="Ajustes Cattimer"
          >
            <Settings size={14} />
          </button>
        </div>
      </div>

      {/* Bottom container on mobile / Right container on desktop */}
      <div className="w-full md:w-auto flex flex-col md:flex-row md:items-center gap-3 md:justify-end">
        
        {/* Compact Integrated Real-Time Date & Clock block */}
        <div className={`w-full md:w-auto flex items-center justify-between md:justify-end gap-2.5 px-3 py-1.5 rounded-2xl border transition-all duration-300 shadow-xs ${
          theme === 'light' 
            ? 'bg-zinc-100 border-zinc-200 text-zinc-900' 
            : 'bg-zinc-950 border-zinc-850 text-zinc-100 shadow-md'
        }`}>
          
          {/* Calendar Day & Month */}
          <div className={`flex items-center gap-1.5 pr-2.5 border-r font-medium text-[10px] md:text-[11px] whitespace-nowrap font-sans ${
            theme === 'light' ? 'border-zinc-300 text-zinc-900' : 'border-zinc-800 text-zinc-200'
          }`}>
            <Calendar className={`w-3.5 h-3.5 ${theme === 'light' ? 'text-violet-700' : 'text-violet-400'}`} />
            <span className="font-extrabold tracking-tight">{formattedDate}</span>
            <span className={`hidden sm:inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md text-[8px] font-extrabold border uppercase font-mono ${periodObj.colorBg}`}>
              {periodObj.label}
            </span>
          </div>

          {/* Real-time Ticking Timer */}
          <div className="flex items-center font-mono tracking-wider select-none text-[11px] md:text-[12px] font-extrabold">
            <Clock className={`w-3.5 h-3.5 mr-1 text-zinc-400`} />
            <span className={theme === 'light' ? 'text-violet-850 font-black' : 'text-violet-300 font-extrabold md:font-black'}>
              {hours}
            </span>
            <span className={`animate-pulse px-0.5 text-zinc-400`}>:</span>
            <span className={theme === 'light' ? 'text-violet-850 font-black' : 'text-violet-300 font-extrabold md:font-black'}>
              {minutes}
            </span>
          </div>

        </div>

        {/* Action button controls - desktop only */}
        <div className="hidden md:flex items-center gap-1.5">
          
          {/* Theme toggle */}
          <button
            type="button"
            id="btn-theme-toggle"
            onClick={toggleTheme}
            className="p-2 md:p-2.5 rounded-xl text-zinc-650 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-app-border active:scale-95 transition-all cursor-pointer"
            title="Cambiar Modo Claro/Oscuro"
          >
            {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
          </button>

          {/* Settings button */}
          <button
            type="button"
            id="btn-settings-open"
            onClick={onOpenSettings}
            className="p-2 md:p-2.5 rounded-xl text-zinc-650 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-app-border active:scale-95 transition-all cursor-pointer"
            title="Ajustes Cattimer"
          >
            <Settings size={15} />
          </button>

        </div>

      </div>

    </header>
  );
}
