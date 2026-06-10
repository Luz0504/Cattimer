/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sun,
  Moon,
  Plus,
  Settings,
  X,
  Sparkles,
  CheckCircle2,
  Trash2,
  RotateCcw,
  Heart,
  ChevronRight,
  Menu,
} from 'lucide-react';
import Onboarding from './components/Onboarding';
import TaskForm from './components/TaskForm';
import TaskList from './components/TaskList';
import PomodoroTimer from './components/PomodoroTimer';
import MinnityMascot, { MinnityExpression } from './components/MinnityMascot';
import AppHeader from './components/AppHeader';
import TaskProgressChart from './components/TaskProgressChart';
import { Task, OnboardingData, CurrentTab } from './types';
import { prioritizeTasks, ensurePlannedTodayProps } from './utils/prioritization';
import { initAuth, googleSignIn, logout, getAccessToken, getAccessTokenSync } from './utils/googleOAuth';
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from './utils/googleCalendar';
import { getMascotMessage } from './utils/mascotMessages';
import { emit, listen } from '@tauri-apps/api/event';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import type { TasksWidgetState } from './widgets/types';
import { createWidget, destroyWidget, isWidgetOpen } from './widgets/windowManager';

export default function App() {
  // Theme state saved to localStorage
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('cattimer-theme');
    return (saved as 'light' | 'dark') || 'light';
  });

  // Onboarding states
  const [isOnboarded, setIsOnboarded] = useState<boolean>(() => {
    return localStorage.getItem('cattimer-completed-onboarding') === 'true';
  });
  const [procrastinationReason, setProcrastinationReason] = useState<string>(() => {
    return localStorage.getItem('cattimer-onboarding-reason') || '';
  });
  const [dailyLimit, setDailyLimit] = useState<number>(() => {
    const saved = localStorage.getItem('cattimer-onboarding-limit');
    return saved ? parseInt(saved) : 4;
  });

  // Tasks state
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('cattimer-tasks');
    const savedLimit = localStorage.getItem('cattimer-onboarding-limit');
    const limit = savedLimit ? parseInt(savedLimit) : 4;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return ensurePlannedTodayProps(parsed, limit);
        }
        return [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  // Active View Tab
  const [activeTab, setActiveTab] = useState<CurrentTab>('dashboard');
  
  // Custom expandable forms & models
  const [showAddTask, setShowAddTask] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Dynamic comments from Minnity in Dashboard
  const [bubbleText, setBubbleText] = useState<string>('');
  const [mascotExpression, setMascotExpression] = useState<MinnityExpression>('friendly');

  // Google Auth & Calendar integration states
  const [googleConnected, setGoogleConnected] = useState<boolean>(() => {
    return localStorage.getItem('cattimer-google-connected') === 'true';
  });
  const [googleUser, setGoogleUser] = useState<{ email: string } | null>(null);

  // Widget toggle states
  const [widgetPomodoroOpen, setWidgetPomodoroOpen] = useState(false);
  const [widgetTasksOpen, setWidgetTasksOpen] = useState(false);

  // Initialize widget state from store on mount
  useEffect(() => {
    isWidgetOpen('pomodoro').then(setWidgetPomodoroOpen);
    isWidgetOpen('tasks').then(setWidgetTasksOpen);
  }, []);

  // Initialize auth state on load
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleConnected(true);
      },
      () => {
        setGoogleUser(null);
        setGoogleConnected(false);
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Trigger sign-in with popup
  const handleConnectGoogle = async (): Promise<string | null> => {
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setGoogleConnected(true);
        setMascotExpression('happy');
        setBubbleText(getMascotMessage(procrastinationReason, 'googleConnected'));
        return result.accessToken;
      }
      return null;
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        setMascotExpression('thinking');
        setBubbleText('Miau... Cerraste la ventana de conexión. Podés intentarlo de nuevo cuando quieras habilitar tu calendario. 🐈');
      } else {
        console.error('Error al autorizar Google:', err);
        setMascotExpression('thinking');
        setBubbleText('Miau, hubo un problema al conectar con Google. ¿Querés probar otra vez? 🐾');
      }
      return null;
    }
  };

  // Logout Google Auth
  const handleDisconnectGoogle = async () => {
    try {
      // Find all tasks that are currently synchronized to Google Calendar
      const syncTasks = tasks.filter((t) => t.calendarSync && t.googleEventId);
      
      if (syncTasks.length > 0) {
        let token = getAccessTokenSync() || (await getAccessToken());
        if (token) {
          // Attempt to delete each event from Google Calendar before logging out
          for (const task of syncTasks) {
            if (task.googleEventId) {
              try {
                await deleteCalendarEvent(task.googleEventId, token);
              } catch (deleteErr) {
                console.error(`Error deleting event for task ${task.id} during disconnect:`, deleteErr);
              }
            }
          }
        }
      }

      await logout();
      setGoogleUser(null);
      setGoogleConnected(false);

      // Reset calendar synchronization states across the entire task list
      setTasks((prev) =>
        prev.map((t) => ({
          ...t,
          calendarSync: false,
          googleEventId: undefined,
        }))
      );

      setMascotExpression('thinking');
      setBubbleText('🐾 ¡Miau! Desconecté tu cuenta, eliminé todas las tareas de tu calendario de Google y desactivé las sincronizaciones con éxito.');
    } catch (err) {
      console.error('Error al desconectar Google Auth:', err);
    }
  };

  // Toggle sync for specific task
  const handleToggleCalendarSync = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    if (task.calendarSync) {
      // Deactivating task sync
      let token = getAccessTokenSync() || await getAccessToken();
      if (token && task.googleEventId) {
        try {
          await deleteCalendarEvent(task.googleEventId, token);
          setTasks(prev => prev.map(t => t.id === taskId ? { ...t, calendarSync: false, googleEventId: undefined } : t));
          setMascotExpression('friendly');
          setBubbleText('🐾 ¡Miau! Eliminé el evento de tu calendario y desactivé la sincronización.');
        } catch (err: any) {
          console.warn('Failed to delete event on first attempt. Checking error type...', err);
          if (err?.status === 401) {
            await logout();
            setGoogleUser(null);
            setGoogleConnected(false);
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, calendarSync: false, googleEventId: undefined } : t));
            setMascotExpression('thinking');
            setBubbleText('Tu sesión de Google expiró, miau. Desactivé la sincronización localmente. Por favor, volvé a conectar tu cuenta.');
            return;
          }

          let success = false;
          try {
            // Attempt to get a fresh token if the old one was expired
            const freshToken = await handleConnectGoogle();
            if (freshToken) {
              await deleteCalendarEvent(task.googleEventId, freshToken);
              success = true;
            }
          } catch (retryErr) {
            console.error('Retry delete event failed:', retryErr);
          }
          
          setTasks(prev => prev.map(t => t.id === taskId ? { ...t, calendarSync: false, googleEventId: undefined } : t));
          setMascotExpression('thinking');
          if (success) {
            setBubbleText('🐾 ¡Miau! Eliminé el evento de tu calendario y desactivé la sincronización con éxito.');
          } else {
            setBubbleText('No se pudo borrar el evento de Google Calendar original, pero detuve la sincronización en Cattimer, miau. 🐾');
          }
        }
      } else {
        // No token or event ID, just disable local integration state
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, calendarSync: false, googleEventId: undefined } : t));
        setMascotExpression('friendly');
        setBubbleText('Desactivé la sincronización de esta tarea localmente, miau. 🐾');
      }
    } else {
      // Activating task sync
      // Use synchronous check first to avoid popup blocked context
      let token = getAccessTokenSync();
      if (!token) {
        // Connect first - directly inside user click handler stream
        const fetchedToken = await handleConnectGoogle();
        if (!fetchedToken) {
          alert('Se requiere iniciar sesión con Google para sincronizar tus tareas.');
          return;
        }
        token = fetchedToken;
      }

      try {
        const updatedTask = { ...task, calendarSync: true };
        let eventId;
        try {
          eventId = await createCalendarEvent(updatedTask, token);
        } catch (apiErr: any) {
          console.warn('First attempt to create calendar event failed. Checking status...', apiErr);
          if (apiErr?.status === 401) {
            // Token is invalid/expired. Let's try to get a fresh token under their current click!
            const freshToken = await handleConnectGoogle();
            if (!freshToken) {
              throw apiErr; // rethrow 401 if they canceled or failed
            }
            token = freshToken;
            eventId = await createCalendarEvent(updatedTask, token);
          } else {
            throw apiErr;
          }
        }

        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, calendarSync: true, googleEventId: eventId } : t));
        setMascotExpression('happy');
        setBubbleText('🐾 Sincronicé tu tarea para que no se te pase la fecha de entrega. ¡Evento creado con éxito!');
      } catch (err: any) {
        console.error('Failed to create event:', err);
        if (err?.status === 401) {
          await logout();
          setGoogleUser(null);
          setGoogleConnected(false);
          setMascotExpression('thinking');
          setBubbleText('🐾 Tu inicio de sesión de Google ya no es válido. Conectá Google de nuevo en la barra superior para sincronizar, miau.');
        } else {
          alert('Ocurrió un error al intentar crear el evento en tu Google Calendar.');
        }
      }
    }
  };

  // Sync theme with HTML class
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('cattimer-theme', theme);
  }, [theme]);

  // Sync tasks storage with engine
  useEffect(() => {
    localStorage.setItem('cattimer-tasks', JSON.stringify(tasks));
  }, [tasks]);

  // Generate appropriate greeting helper based on procrastination reason
  const getProcrastinationGreeting = (reason: string) => {
    return getMascotMessage(reason, 'dashboardGreeting');
  };

  // Set default greeting on startup
  useEffect(() => {
    if (isOnboarded) {
      const { todayTasks } = prioritizeTasks(tasks, dailyLimit);
      if (todayTasks.length === 0) {
        setMascotExpression('sleeping');
        setBubbleText('💤 ¡Miau... zzz! No tenés tareas planeadas para hoy. ¡Disfrutá de un merecido descanso! 🐾😴');
      } else {
        setBubbleText(getProcrastinationGreeting(procrastinationReason));
        setMascotExpression('friendly');
      }
    }
  }, [isOnboarded, procrastinationReason, tasks, dailyLimit]);

  // Synchronize mascot state with task availability (including 850ms delay to allow "happy" face on complete)
  useEffect(() => {
    if (!isOnboarded) return;
    
    const { todayTasks } = prioritizeTasks(tasks, dailyLimit);
    
    if (todayTasks.length === 0) {
      if (mascotExpression !== 'sleeping') {
        const timer = setTimeout(() => {
          setMascotExpression('sleeping');
          setBubbleText('💤 ¡Miau... zzz! No tenés tareas planeadas para hoy. ¡Disfrutá de un merecido descanso! 🐾😴');
        }, 850);
        return () => clearTimeout(timer);
      }
    } else {
      // If she was sleeping and now there are active chores, wake her up!
      if (mascotExpression === 'sleeping') {
        setMascotExpression('friendly');
        setBubbleText('🐾 ¡Miau! Desperté listo para ayudarte a encarar tus tareas de Hoy. ¡Vos podés con esto! 🐱✨');
      }
    }
  }, [tasks, dailyLimit, isOnboarded, mascotExpression]);

  // Toggle dark/light theme
  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Complete onboarding
  const handleOnboardingComplete = (data: OnboardingData) => {
    localStorage.setItem('cattimer-completed-onboarding', 'true');
    localStorage.setItem('cattimer-onboarding-reason', data.reason);
    localStorage.setItem('cattimer-onboarding-limit', String(data.dailyLimit));

    const initialTasks = data.initialTasks || [];
    const migratedInitial = ensurePlannedTodayProps(initialTasks, data.dailyLimit);
    localStorage.setItem('cattimer-tasks', JSON.stringify(migratedInitial));

    setProcrastinationReason(data.reason);
    setDailyLimit(data.dailyLimit);
    setTasks(migratedInitial);
    setIsOnboarded(true);
    setBubbleText(getProcrastinationGreeting(data.reason));
    setShowAddTask(false); // No need to open the add form immediately since they just filled it
  };

  // Prioritize active tasks using smart utility logic
  const { todayTasks, pendingTasks } = prioritizeTasks(tasks, dailyLimit);

  // Emit current tasks state to widgets
  useEffect(() => {
    const { todayTasks, pendingTasks } = prioritizeTasks(tasks, dailyLimit);
    const payload: TasksWidgetState = {
      theme,
      todayTasks,
      pendingTasks,
      mascotExpression,
      mascotText: bubbleText,
    };
    emit('TASKS_STATE_UPDATE', payload);
  }, [tasks, dailyLimit, theme, mascotExpression, bubbleText]);

  // Add Task handler
  const handleAddTask = async (taskData: Omit<Task, 'id' | 'completed' | 'createdAt'>) => {
    const activeTodayCount = tasks.filter((t) => !t.completed && t.plannedToday === true).length;
    const isUnderLimit = activeTodayCount < dailyLimit;

    const newTask: Task = {
      ...taskData,
      id: `task-${Date.now()}`,
      completed: false,
      createdAt: new Date().toISOString(),
      plannedToday: isUnderLimit,
    };

    // If calendar sync is enabled, create calendar event
    if (newTask.calendarSync) {
      try {
        const token = await getAccessToken();
        if (token) {
          const eventId = await createCalendarEvent(newTask, token);
          newTask.googleEventId = eventId;
        } else {
          newTask.calendarSync = false;
        }
      } catch (err: any) {
        console.error('Error creating calendar event:', err);
        newTask.calendarSync = false;
        if (err?.status === 401) {
          await logout();
          setGoogleUser(null);
          setGoogleConnected(false);
          setMascotExpression('thinking');
          setBubbleText('🐾 Tu sesión de Google expiró, miau. Guardé tu tarea de forma local, considerá iniciar sesión de nuevo en la barra superior.');
        }
      }
    }

    setTasks((prev) => [newTask, ...prev]);
    setShowAddTask(false);

    // Comment reactive
    if (newTask.calendarSync) {
      setMascotExpression('happy');
      setBubbleText('🐾 ¡Sincronicé tu tarea para que no se te pase la fecha de entrega! Evento creado con éxito.');
    } else if (newTask.importance === 'Alto') {
      setMascotExpression('focused');
      setBubbleText(getMascotMessage(procrastinationReason, 'taskPriorityHigh'));
    } else {
      setMascotExpression('happy');
      if (isUnderLimit) {
        setBubbleText(getMascotMessage(procrastinationReason, 'taskAddedToday'));
      } else {
        setBubbleText(getMascotMessage(procrastinationReason, 'taskAddedPending'));
      }
    }
  };

  // Toggle tasks planning status explicitly
  const handleTogglePlannedToday = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const nextPlanned = !t.plannedToday;
          const updatedTask = {
            ...t,
            plannedToday: nextPlanned,
          };
          
          if (nextPlanned) {
            setMascotExpression('happy');
            setBubbleText(getMascotMessage(procrastinationReason, 'taskAddedToday'));
          } else {
            setMascotExpression('thinking');
            setBubbleText(getMascotMessage(procrastinationReason, 'taskAddedPending'));
          }

          // Keep calendar modified updated
          if (updatedTask.calendarSync && updatedTask.googleEventId) {
            getAccessToken().then((token) => {
              if (token && updatedTask.googleEventId) {
                updateCalendarEvent(updatedTask, updatedTask.googleEventId, token).catch(e => console.error(e));
              }
            });
          }

          return updatedTask;
        }
        return t;
      })
    );
  };

  // Toggle complete checkbox
  const handleToggleComplete = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const wasCompleted = t.completed;
          const updatedTask = {
            ...t,
            completed: !wasCompleted,
            completedAt: !wasCompleted ? new Date().toISOString() : undefined,
          };

          if (!wasCompleted) {
            // Task newly completed
            setMascotExpression('happy');
            setBubbleText(getMascotMessage(procrastinationReason, 'taskCompleted'));
          } else {
            // Task returning to active
            setMascotExpression('thinking');
            setBubbleText(getMascotMessage(procrastinationReason, 'taskUncompleted'));
          }

          // Sync completion status to google calendar event
          if (updatedTask.calendarSync && updatedTask.googleEventId) {
            getAccessToken().then((token) => {
              if (token && updatedTask.googleEventId) {
                updateCalendarEvent(updatedTask, updatedTask.googleEventId, token).catch(e => console.error(e));
              }
            });
          }

          return updatedTask;
        }
        return t;
      })
    );
  };

  // Ref for handleToggleComplete (used by widget event listener)
  const handleToggleCompleteRef = useRef(handleToggleComplete);
  handleToggleCompleteRef.current = handleToggleComplete;

  // Listen for widget events (TASK_TOGGLE, OPEN_MAIN_WINDOW)
  useEffect(() => {
    const toggleUnlisten = listen<{ id: string }>('TASK_TOGGLE', (event) => {
      handleToggleCompleteRef.current(event.payload.id);
    });
    const openUnlisten = listen('OPEN_MAIN_WINDOW', async () => {
      const mainWindow = await WebviewWindow.getByLabel('main');
      if (mainWindow) {
        await mainWindow.setFocus();
      }
    });
    const widgetCloseUnlisten = listen<{ type: 'pomodoro' | 'tasks' }>('WIDGET_CLOSED', (event) => {
      if (event.payload.type === 'pomodoro') setWidgetPomodoroOpen(false);
      if (event.payload.type === 'tasks') setWidgetTasksOpen(false);
    });
    return () => {
      toggleUnlisten.then(fn => fn());
      openUnlisten.then(fn => fn());
      widgetCloseUnlisten.then(fn => fn());
    };
  }, []);

  // Delete task completely
  const handleDeleteTask = async (id: string) => {
    const taskToDelete = tasks.find((t) => t.id === id);
    if (!taskToDelete) return;

    let calDeleted = false;
    if (taskToDelete.calendarSync && taskToDelete.googleEventId) {
      try {
        const token = await getAccessToken();
        if (token && taskToDelete.googleEventId) {
          await deleteCalendarEvent(taskToDelete.googleEventId, token);
          calDeleted = true;
        }
      } catch (err) {
        console.error('Error deleting calendar event:', err);
      }
    }

    setTasks((prev) => prev.filter((t) => t.id !== id));
    setMascotExpression('thinking');
    if (calDeleted) {
      setBubbleText('🐾 ¡Miau! Eliminé la tarea y también borré el evento correspondiente de tu Google Calendar.');
    } else {
      setBubbleText('Miau, yo ya eliminé la tarea. ¡Un pendiente menos en tu cabeza!');
    }
  };

  // Clear completed history
  const handleClearHistory = () => {
    setTasks((prev) => prev.filter((t) => !t.completed));
    setMascotExpression('happy');
    setBubbleText('¡Yo limpié el historial, miau! Estamos listos para acumular nuevas victorias.');
  };

  // Reorganizar y restablecer prioridades de forma inteligente
  const handleReorganizeTasks = () => {
    setTasks((prev) => {
      // Set active tasks to plannedToday: undefined first to let prioritizeTasks do a clean recalculation
      const clearedTasks = prev.map((t) => {
        if (!t.completed) {
          return { ...t, plannedToday: undefined };
        }
        return t;
      });
      
      // Calculate prioritized lists which fit into the daily slots
      const { todayTasks: newToday } = prioritizeTasks(clearedTasks, dailyLimit);
      const todayIds = new Set(newToday.map((t) => t.id));
      
      // Update state, assigning explicit true/false so they stay placed even as other tasks get finished
      return prev.map((t) => {
        if (t.completed) return t;
        return {
          ...t,
          plannedToday: todayIds.has(t.id),
        };
      });
    });
    setMascotExpression('focused');
    setBubbleText('¡Miau! Acabo de restablecer y recalcular el orden y la distribución óptima de tus tareas basándome en su importancia y cercanía. 🐾⚙️');
  };

  // Widget toggle handlers
  const handleTogglePomodoroWidget = async () => {
    const open = await isWidgetOpen('pomodoro');
    if (open) {
      await destroyWidget('pomodoro');
      setWidgetPomodoroOpen(false);
    } else {
      const win = await createWidget('pomodoro');
      setWidgetPomodoroOpen(win !== null);
    }
  };

  const handleToggleTasksWidget = async () => {
    const open = await isWidgetOpen('tasks');
    if (open) {
      await destroyWidget('tasks');
      setWidgetTasksOpen(false);
    } else {
      const win = await createWidget('tasks');
      setWidgetTasksOpen(win !== null);
    }
  };

  // Reset all parameters to re-onboard
  const handleResetApp = () => {
    localStorage.clear();
    setTasks([]);
    setIsOnboarded(false);
    setActiveTab('dashboard');
    setShowSettings(false);
  };

  const tab: CurrentTab = activeTab;

  return (
    <div className="min-h-screen font-sans bg-app-bg text-app-text transition-colors duration-300">
      
      {!isOnboarded ? (
        /* Welcome and Setup flow screen */
        <Onboarding 
          onComplete={handleOnboardingComplete} 
          theme={theme}
          toggleTheme={toggleTheme}
        />
      ) : (
        /* App Dashboard Frame */
        <div className="max-w-4xl mx-auto px-4 py-6 md:py-8 space-y-6">
          
          {/* Main Integrated Top Header with Live Date & Clock */}
          <AppHeader 
            theme={theme}
            toggleTheme={toggleTheme}
            onOpenSettings={() => setShowSettings(true)}
          />

          {/* Active section body block */}
          <main className="space-y-6">
            
            <AnimatePresence mode="wait">
              {activeTab === 'dashboard' && (
                <motion.div
                  key="dashboard-tab-content"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* Unified Mascot & Tab Switcher Card */}
                  <div className="bg-app-card rounded-3xl p-4 md:p-5 border border-app-border shadow-sm space-y-4">
                    {/* Navigation Tab Menu - Merged visual block */}
                    <div className="flex justify-center p-1 bg-zinc-100 dark:bg-zinc-900/50 rounded-2xl gap-2 max-w-sm mx-auto">
                      <button
                        type="button"
                        id="tab-dashboard"
                        onClick={() => setActiveTab('dashboard')}
                        className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all active:scale-98 text-center cursor-pointer ${
                          tab === 'dashboard'
                            ? 'bg-violet-600 text-white dark:bg-violet-500 shadow-xs'
                            : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'
                        }`}
                      >
                        Mi Jornada
                      </button>
                      <button
                        type="button"
                        id="tab-timer"
                        onClick={() => setActiveTab('timer')}
                        className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all active:scale-98 text-center cursor-pointer ${
                          tab === 'timer'
                            ? 'bg-violet-600 text-white dark:bg-violet-500 shadow-xs'
                            : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'
                        }`}
                      >
                        Modo Pomodoro ⏱️
                      </button>
                    </div>

                    <div className="border-t border-app-border/40 my-1"></div>

                    <MinnityMascot expression={mascotExpression} bubbleText={bubbleText} />
                  </div>

                  {/* Interactive Progress Tracking Chart */}
                  <TaskProgressChart
                    tasks={tasks}
                    theme={theme}
                    onMascotReact={(expr, text) => {
                      setMascotExpression(expr);
                      setBubbleText(text);
                    }}
                  />

                  {/* Task Addition and interactive headers trigger */}
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-extrabold text-app-text tracking-tight font-display">
                        Mi Planificador Diario
                      </h2>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Cattimer reduce tu procrastinación equilibrando el esfuerzo hoy y mañana.
                      </p>
                    </div>

                    <button
                      type="button"
                      id="btn-add-task-expand"
                      onClick={() => setShowAddTask(!showAddTask)}
                      className={`py-2.5 px-4 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 border ${
                        showAddTask
                          ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 border-transparent'
                          : 'bg-violet-600 hover:bg-violet-700 text-white border-transparent shadow shadow-violet-500/20'
                      }`}
                    >
                      {showAddTask ? (
                        <>
                          <X size={14} />
                          Cerrar Formulario
                        </>
                      ) : (
                        <>
                          <Plus size={14} />
                          Nueva Tarea
                        </>
                      )}
                    </button>
                  </div>

                  {/* Expandable Task Form Drawer */}
                  <AnimatePresence>
                    {showAddTask && (
                      <motion.div
                        id="task-form-panel"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <TaskForm
                          onAddTask={handleAddTask}
                          dailyLimit={dailyLimit}
                          onClose={() => setShowAddTask(false)}
                          googleConnected={googleConnected}
                          onConnectGoogle={handleConnectGoogle}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Real prioritized tasks engine rendered view list */}
                  <TaskList
                    tasks={tasks}
                    todayTasks={todayTasks}
                    pendingTasks={pendingTasks}
                    onToggleComplete={handleToggleComplete}
                    onDeleteTask={handleDeleteTask}
                    onClearHistory={handleClearHistory}
                    dailyLimit={dailyLimit}
                    onTogglePlannedToday={handleTogglePlannedToday}
                    onReorganizeTasks={handleReorganizeTasks}
                    onToggleCalendarSync={handleToggleCalendarSync}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Timer panel - always mounted (visually hidden when not on timer tab) so widget events can reach it */}
            <div className={activeTab !== 'timer' ? 'hidden' : ''}>
              <PomodoroTimer activeTab={activeTab} setActiveTab={setActiveTab} theme={theme} />
            </div>
            
          </main>

          {/* Playful and supportive Footer brand credit */}
          <footer className="pt-8 pb-4 text-center border-t border-zinc-100 dark:border-zinc-900 space-y-2">
            <div className="flex items-center justify-center gap-1 text-xs text-zinc-400 font-medium">
              Hecho con <Heart size={10} className="text-violet-500 fill-violet-500" /> para ganarle a la procrastinación en Cattimer.
            </div>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-600 font-mono">
              © 2026 Cattimer — La gata Minnity es tu guardiana feliz.
            </p>
          </footer>

          {/* Floating Settings configuration dialog */}
          <AnimatePresence>
            {showSettings && (
              <div id="settings-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
                <motion.div
                  id="settings-content-card"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-app-card rounded-3xl max-w-md w-full border border-app-border p-6 shadow-2xl relative space-y-6 text-app-text"
                >
                  <button
                    type="button"
                    id="btn-settings-close"
                    onClick={() => setShowSettings(false)}
                    className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-zinc-650 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl"
                  >
                    <X size={18} />
                  </button>

                  <div className="border-b border-app-border pb-2">
                    <h3 className="text-lg font-extrabold text-app-text font-display">
                      Configuración de Cattimer
                    </h3>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                      Adaptá a Minnity y los límites a tu ritmo de trabajo actual.
                    </p>
                  </div>

                  {/* Form fields inside adjustments dialog */}
                  <div className="space-y-4 text-left">
                    
                    {/* Adjustable Obstacle Reason select */}
                    <div className="space-y-1.5">
                      <label htmlFor="settings-reason-select" className="block text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                        Obstáculo de Procrastinación
                      </label>
                      <select
                        id="settings-reason-select"
                        value={procrastinationReason}
                        onChange={(e) => {
                          const val = e.target.value;
                          setProcrastinationReason(val);
                          localStorage.setItem('cattimer-onboarding-reason', val);
                          setMascotExpression('happy');
                          setBubbleText(getMascotMessage(val, 'onboardingSelect'));
                        }}
                        className="w-full text-sm font-semibold text-app-text bg-app-bg p-3 rounded-xl border border-app-border focus:ring-2 focus:ring-violet-500 focus:outline-hidden cursor-pointer"
                      >
                        <option value="Distracciones" className="bg-app-card text-app-text">⚡ Distracciones</option>
                        <option value="Redes sociales" className="bg-app-card text-app-text">📱 Redes sociales</option>
                        <option value="Videojuegos" className="bg-app-card text-app-text">🎮 Videojuegos</option>
                        <option value="Falta de motivación" className="bg-app-card text-app-text">💭 Falta de motivación</option>
                        <option value="Ansiedad" className="bg-app-card text-app-text">😰 Ansiedad</option>
                        <option value="Demasiadas tareas" className="bg-app-card text-app-text">📚 Demasiadas tareas</option>
                        <option value="Cansancio" className="bg-app-card text-app-text">😴 Cansancio</option>
                        <option value="Dificultad para empezar" className="bg-app-card text-app-text">⏳ Dificultad para empezar</option>
                        <option value="Otra" className="bg-app-card text-app-text">❓ Otra razón</option>
                      </select>
                    </div>

                    {/* Adjustable Limit slider */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                        <span>Límite Diario Saludable</span>
                        <span
                          style={{ backgroundColor: '#8b4ae0', color: '#e4deff' }}
                          className="px-2 py-0.5 rounded-lg border border-violet-200 dark:border-violet-900/30 font-mono font-black"
                        >
                          {dailyLimit} tareas
                        </span>
                      </div>
                      <input
                        id="settings-limit-range"
                        type="range"
                        min="1"
                        max="10"
                        value={dailyLimit}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setDailyLimit(val);
                          localStorage.setItem('cattimer-onboarding-limit', String(val));
                          
                          // Re-evaluate task distribution with the new limit
                          setTasks((prev) => {
                            const clearedTasks = prev.map((t) => {
                              if (!t.completed) {
                                return { ...t, plannedToday: undefined };
                              }
                              return t;
                            });
                            
                            const { todayTasks: newToday } = prioritizeTasks(clearedTasks, val);
                            const todayIds = new Set(newToday.map((t) => t.id));
                            
                            return prev.map((t) => {
                              if (t.completed) return t;
                              return {
                                ...t,
                                plannedToday: todayIds.has(t.id),
                              };
                            });
                          });

                          setMascotExpression('focused');
                          setBubbleText(getMascotMessage(procrastinationReason, 'limitChanged', val));
                        }}
                        className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-violet-600"
                      />
                    </div>

                    {/* Google Calendar integration block */}
                    <div className="space-y-2 pt-2 border-t border-app-border">
                      <span className="block text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                        Integración Google Calendar
                      </span>
                      {googleConnected ? (
                        <div className="bg-emerald-500/5 dark:bg-emerald-950/10 p-3 rounded-2xl border border-emerald-500/10 dark:border-emerald-500/5 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                              🚀 Conectado con éxito
                            </span>
                            <button
                              type="button"
                              onClick={handleDisconnectGoogle}
                              className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                            >
                              Desconectar
                            </button>
                          </div>
                          {googleUser && (
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                              Email de sincronización: <strong className="font-semibold break-all text-app-text">{googleUser.email}</strong>
                            </p>
                          )}
                          <p className="text-[10px] text-zinc-450 dark:text-zinc-500 leading-relaxed italic">
                            🐾 ¡Miau! Las tareas que decidas sincronizar se guardarán automáticamente en tu calendario de Google.
                          </p>
                        </div>
                      ) : (
                        <div
                          style={{
                            backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff',
                            borderColor: theme === 'dark' ? '#3f3f46' : '#939393',
                            color: theme === 'dark' ? '#f4f4f5' : '#000000',
                          }}
                          className="p-3 rounded-2xl border space-y-2"
                        >
                          <p
                            style={{ color: theme === 'dark' ? '#d4d4d8' : '#171717' }}
                            className="text-[11px] leading-relaxed font-semibold text-zinc-500"
                          >
                            Vinculá tu cuenta para habilitar la opción de guardar tus pendientes y plazos en Google Calendar al instante.
                          </p>
                          <button
                            type="button"
                            onClick={handleConnectGoogle}
                            className="w-full py-2 px-3 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <span>📅 Conectar Google Calendar</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                    {/* Widgets Flotantes section */}
                    <div className="space-y-2 pt-2 border-t border-app-border">
                      <span className="block text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                        🪟 Widgets Flotantes
                      </span>
                      <p className="text-[10px] text-zinc-450 dark:text-zinc-500 leading-relaxed italic">
                        Abrí ventanas flotantes independientes para mantener el control sin cambiar de foco.
                      </p>
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/20 border border-app-border">
                        <span className="text-xs font-semibold flex items-center gap-1.5">
                          ⏱️ Pomodoro Widget
                        </span>
                        <button
                          type="button"
                          id="btn-toggle-pomodoro-widget"
                          onClick={handleTogglePomodoroWidget}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            widgetPomodoroOpen
                              ? 'bg-violet-600 text-white shadow-xs'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 border border-app-border'
                          }`}
                        >
                          {widgetPomodoroOpen ? 'Activo' : 'Inactivo'}
                        </button>
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/20 border border-app-border">
                        <span className="text-xs font-semibold flex items-center gap-1.5">
                          📋 Tareas Widget
                        </span>
                        <button
                          type="button"
                          id="btn-toggle-tasks-widget"
                          onClick={handleToggleTasksWidget}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            widgetTasksOpen
                              ? 'bg-violet-600 text-white shadow-xs'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 border border-app-border'
                          }`}
                        >
                          {widgetTasksOpen ? 'Activo' : 'Inactivo'}
                        </button>
                      </div>
                    </div>

                  {/* Danger zone / Reset parameters */}
                  <div className="bg-rose-500/5 dark:bg-rose-950/10 p-4 rounded-2xl border border-rose-500/10 space-y-3">
                    <h4 className="text-xs font-bold text-rose-700 dark:text-rose-450 uppercase tracking-widest flex items-center gap-1.5">
                      <RotateCcw size={12} /> Zona de Reinicio
                    </h4>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Si querés volver a tomar la pregunta inicial y resetear totalmente tus tareas cargadas, hacé clic debajo. Esta acción no se puede deshacer.
                    </p>
                    <button
                      type="button"
                      id="btn-settings-restart-profile"
                      onClick={handleResetApp}
                      className="w-full py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all active:scale-95"
                    >
                      Reiniciar de Cero (Onboarding) 🐾
                    </button>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      id="btn-settings-save"
                      onClick={() => {
                        setShowSettings(false);
                        setBubbleText(getProcrastinationGreeting(procrastinationReason));
                        setMascotExpression('happy');
                      }}
                      className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm rounded-2xl shadow transition-all active:scale-95"
                    >
                      Listo miau
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

        </div>
      )}
    </div>
  );
}
