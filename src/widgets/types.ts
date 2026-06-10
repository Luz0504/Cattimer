import type { MinnityExpression } from '../components/MinnityMascot';
import type { Task } from '../types';

export interface PomodoroWidgetState {
  theme: 'light' | 'dark';
  secondsLeft: number;
  totalSeconds: number;
  isBreak: boolean;
  isActive: boolean;
  activeModeIdx: number;
  currentModeName: string;
  progressPercent: number;
  formattedTime: string;
}

export interface TasksWidgetState {
  theme: 'light' | 'dark';
  todayTasks: Task[];
  pendingTasks: Task[];
  mascotExpression: MinnityExpression;
  mascotText: string;
}
