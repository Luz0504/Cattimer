/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Task } from '../types';

/**
 * Smart automatic priority engine for Cattimer
 * 
 * Reglas:
 * - Las tareas con importancia alta tienen prioridad.
 * - Las tareas con fecha más cercana tienen prioridad.
 * - Las tareas largas no deben agruparse todas juntas.
 * - Debe existir variedad entre tareas simples (cortas) y complejas (largas).
 * - Debe evitarse la sobrecarga del usuario (máximo de tareas diarias).
 */
export function prioritizeTasks(
  allTasks: Task[],
  dailyLimit: number
): { todayTasks: Task[]; pendingTasks: Task[] } {
  // Filter out completed tasks
  const activeTasks = allTasks.filter((t) => !t.completed);

  if (activeTasks.length === 0) {
    return { todayTasks: [], pendingTasks: [] };
  }

  // Calculate high-fidelity score for each active task
  const scoredTasks = activeTasks.map((task) => {
    let score = 0;

    // 1. Importance points
    if (task.importance === 'Alto') {
      score += 150;
    } else if (task.importance === 'Medio') {
      score += 70;
    } else {
      score += 20;
    }

    // 2. Due Date urgency
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(task.dueDate + 'T12:00:00'); // Use noon to avoid timezone shift
    due.setHours(0, 0, 0, 0);

    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      // Overdue
      score += 200 + Math.abs(diffDays) * 10;
    } else if (diffDays === 0) {
      // Due today
      score += 180;
    } else if (diffDays === 1) {
      // Due tomorrow
      score += 120;
    } else if (diffDays <= 3) {
      score += 80;
    } else if (diffDays <= 7) {
      score += 40;
    } else {
      score += 5;
    }

    // Task length metric: is it long? (> 60 mins is complex, <= 30 mins is simple)
    const isLongTask = task.estimatedTime >= 60;

    return {
      task,
      score,
      isLongTask,
    };
  });

  // Sort by score descending (highest priority first)
  scoredTasks.sort((a, b) => b.score - a.score);

  // Group active tasks into those with explicit plannedToday defined, and those unassigned
  const explicitToday = scoredTasks.filter((item) => item.task.plannedToday === true);
  const explicitPending = scoredTasks.filter((item) => item.task.plannedToday === false);
  const unassigned = scoredTasks.filter((item) => item.task.plannedToday === undefined);

  // If there are no unassigned tasks, we just return the sorted lists!
  if (unassigned.length === 0) {
    const finalTodayTasks = explicitToday.map((item) => item.task);
    const finalPendingTasks = explicitPending.map((item) => item.task);
    return {
      todayTasks: finalTodayTasks,
      pendingTasks: finalPendingTasks,
    };
  }

  // Otherwise, auto-assign unassigned tasks to fill open slots today.
  let remainingSlots = Math.max(0, dailyLimit - explicitToday.length);
  let longTaskCountInToday = explicitToday.filter((item) => item.isLongTask).length;
  const maxPossibleLongTasks = Math.max(1, Math.floor(dailyLimit * 0.5));

  const autoAssignedToday: Task[] = [];
  const autoAssignedPending: Task[] = [];

  for (const item of unassigned) {
    const isFull = (explicitToday.length + autoAssignedToday.length) >= dailyLimit;

    if (isFull) {
      autoAssignedPending.push(item.task);
      continue;
    }

    if (item.isLongTask) {
      // Defer long task if we already have too many
      if (longTaskCountInToday >= maxPossibleLongTasks && (explicitToday.length + autoAssignedToday.length) > 0) {
        autoAssignedPending.push(item.task);
      } else {
        autoAssignedToday.push(item.task);
        longTaskCountInToday++;
      }
    } else {
      autoAssignedToday.push(item.task);
    }
  }

  // Fill up any leftover slots with pending unassigned tasks
  let leftoverSlots = dailyLimit - (explicitToday.length + autoAssignedToday.length);
  if (leftoverSlots > 0 && autoAssignedPending.length > 0) {
    // Pass 1: short tasks
    for (let i = 0; i < autoAssignedPending.length; i++) {
      const task = autoAssignedPending[i];
      const isShort = task.estimatedTime < 60;
      if (isShort && (explicitToday.length + autoAssignedToday.length) < dailyLimit) {
        autoAssignedToday.push(task);
        autoAssignedPending.splice(i, 1);
        i--;
      }
    }
    // Pass 2: any tasks
    for (let i = 0; i < autoAssignedPending.length; i++) {
      if ((explicitToday.length + autoAssignedToday.length) < dailyLimit) {
        autoAssignedToday.push(autoAssignedPending[i]);
        autoAssignedPending.splice(i, 1);
        i--;
      }
    }
  }

  // Merge everything, sorting by final priority score
  const finalTodayTasks = [
    ...explicitToday.map((item) => item.task),
    ...autoAssignedToday,
  ].sort((a, b) => {
    const aScore = scoredTasks.find((st) => st.task.id === a.id)?.score || 0;
    const bScore = scoredTasks.find((st) => st.task.id === b.id)?.score || 0;
    return bScore - aScore;
  });

  const finalPendingTasks = [
    ...explicitPending.map((item) => item.task),
    ...autoAssignedPending,
  ].sort((a, b) => {
    const aScore = scoredTasks.find((st) => st.task.id === a.id)?.score || 0;
    const bScore = scoredTasks.find((st) => st.task.id === b.id)?.score || 0;
    return bScore - aScore;
  });

  return {
    todayTasks: finalTodayTasks,
    pendingTasks: finalPendingTasks,
  };
}

/**
 * Backwards compatibility helper to migrate tasks on startup
 */
export function ensurePlannedTodayProps(allTasks: Task[], dailyLimit: number): Task[] {
  let hasUnassigned = false;
  for (const t of allTasks) {
    if (!t.completed && t.plannedToday === undefined) {
      hasUnassigned = true;
      break;
    }
  }
  if (!hasUnassigned) return allTasks;

  const activeTasks = allTasks.filter(t => !t.completed);
  const completedTasks = allTasks.filter(t => t.completed);

  const explicitlyToday = activeTasks.filter(t => t.plannedToday === true);
  const unassigned = activeTasks.filter(t => t.plannedToday === undefined);

  if (unassigned.length === 0) return allTasks;

  // Run scoring-based prioritization on unassigned tasks
  const remainingSlots = Math.max(0, dailyLimit - explicitlyToday.length);
  const { todayTasks: suggestedToday } = prioritizeTasks(unassigned, remainingSlots);

  const todayIds = new Set(suggestedToday.map(t => t.id));

  const migratedActive = activeTasks.map(t => {
    if (t.plannedToday !== undefined) return t;
    return {
      ...t,
      plannedToday: todayIds.has(t.id) ? true : false,
    };
  });

  return [...migratedActive, ...completedTasks];
}

