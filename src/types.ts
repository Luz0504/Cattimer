/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ImportanceLevel = 'Alto' | 'Medio' | 'Bajo';

export interface EstimatedTimeOption {
  value: number; // in minutes
  label: string;
}

export interface Task {
  id: string;
  name: string;
  estimatedTime: number; // in minutes
  estimatedTimeLabel: string; // e.g. "30 minutos"
  dueDate: string; // YYYY-MM-DD
  importance: ImportanceLevel;
  completed: boolean;
  completedAt?: string; // ISO date string
  createdAt: string;
  plannedToday?: boolean;
  googleEventId?: string;
  calendarSync?: boolean;
  reminderMinutes?: number; // Minutes before event for a reminder, e.g. 15, 30, 60, 1440
}

export interface OnboardingData {
  reason: string;
  dailyLimit: number;
  initialTasks: Task[];
}

export type PomodoroModeType = 'Clásico' | 'Concentración' | 'Energía Baja';

export interface PomodoroModeConfig {
  name: PomodoroModeType;
  workDuration: number; // in minutes
  breakDuration: number; // in minutes
  description: string;
}

export type CurrentTab = 'dashboard' | 'timer' | 'history';
