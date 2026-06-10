import { useEffect, useState } from 'react';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import PomodoroWidget from './PomodoroWidget';
import TasksWidget from './TasksWidget';

type WidgetType = 'pomodoro' | 'tasks' | null;

function getWidgetTypeFromLabel(label: string): WidgetType {
  if (label === 'pomodoro-widget') return 'pomodoro';
  if (label === 'tasks-widget') return 'tasks';
  return null;
}

export default function WidgetApp() {
  const [widgetType, setWidgetType] = useState<WidgetType>(null);

  useEffect(() => {
    const appWindow = getCurrentWebviewWindow();
    const label = appWindow.label;
    setWidgetType(getWidgetTypeFromLabel(label));
  }, []);

  if (widgetType === 'pomodoro') {
    return <PomodoroWidget />;
  }

  if (widgetType === 'tasks') {
    return <TasksWidget />;
  }

  return (
    <div className="min-h-screen bg-app-bg text-app-text font-sans flex items-center justify-center p-4">
      <p className="text-sm text-zinc-500">Ventana de widget desconocida.</p>
    </div>
  );
}
