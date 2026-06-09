import { Task } from '../types';

/**
 * Formats a Date object to a local ISO-like string (YYYY-MM-DDTHH:mm:ss)
 */
function getLocalISOString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/**
 * Calculates the next day for all-day events
 */
function getNextDayDateString(dueDate: string): string {
  const date = new Date(dueDate + 'T12:00:00'); // set mid-day to avoid timezone shifting
  date.setDate(date.getDate() + 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Build the calendar event body from a task
 */
function buildEventResource(task: Task) {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  
  // Decide reminders
  const overrides: any[] = [];
  if (task.reminderMinutes !== undefined && task.reminderMinutes > 0) {
    overrides.push({ method: 'popup', minutes: task.reminderMinutes });
    // For high importance extra alert
    if (task.importance === 'Alto' && task.reminderMinutes !== 15) {
      overrides.push({ method: 'popup', minutes: 15 });
    }
  } else if (task.importance === 'Alto') {
    // recommended frequent reminders for high-importance tasks
    overrides.push({ method: 'popup', minutes: 15 });
    overrides.push({ method: 'popup', minutes: 120 }); // 2 hours
    overrides.push({ method: 'popup', minutes: 1440 }); // 1 day
  } else {
    // default
    overrides.push({ method: 'popup', minutes: 30 });
  }

  const description = `Tarea registrada en Cattimer 🐾 contra la procrastinación.

📋 Detalles del pendiente:
• Importancia: ${task.importance}
• Tiempo estimado de foco: ${task.estimatedTimeLabel}
• Estado: ${task.completed ? 'Completada ✅' : 'Activa 🐈'}

¡Hacé foco con la técnica Pomodoro en Cattimer y completá esta tarea miau! 🐾`;

  const resource: any = {
    summary: `🐾 ${task.name}`,
    description: description,
    reminders: {
      useDefault: false,
      overrides: overrides,
    }
  };

  // If estimatedTime represents 1 full day (1440 mins)
  if (task.estimatedTime >= 1440) {
    resource.start = { date: task.dueDate };
    resource.end = { date: getNextDayDateString(task.dueDate) };
  } else {
    // Default starting hour: 09:00 AM
    const start = new Date(task.dueDate + 'T09:00:00');
    const end = new Date(start.getTime() + task.estimatedTime * 60 * 1000);
    
    resource.start = {
      dateTime: getLocalISOString(start),
      timeZone: timeZone,
    };
    resource.end = {
      dateTime: getLocalISOString(end),
      timeZone: timeZone,
    };
  }

  return resource;
}

/**
 * Creates a new event in the Google Calendar primary calendar
 */
export async function createCalendarEvent(task: Task, accessToken: string): Promise<string> {
  const resource = buildEventResource(task);

  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(resource),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Failed to create calendar event:', errText);
    const err = new Error(`Google Calendar API Error: ${response.statusText}`);
    (err as any).status = response.status;
    throw err;
  }

  const data = await response.json();
  return data.id;
}

/**
 * Updates an existing calendar event (or creates one if not existing yet)
 */
export async function updateCalendarEvent(task: Task, eventId: string, accessToken: string): Promise<void> {
  const resource = buildEventResource(task);

  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(resource),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Failed to update calendar event:', errText);
    const err = new Error(`Google Calendar API Error: ${response.statusText}`);
    (err as any).status = response.status;
    throw err;
  }
}

/**
 * Deletes a calendar event
 */
export async function deleteCalendarEvent(eventId: string, accessToken: string): Promise<void> {
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    // If it was already deleted on Google Calendar web side, that is fine, let's treat it as successful
    if (response.status === 404 || response.status === 410) {
      console.warn(`Calendar event ${eventId} already deleted or not found.`);
      return;
    }
    const errText = await response.text();
    console.error('Failed to delete calendar event:', errText);
    const err = new Error(`Google Calendar API Error: ${response.statusText}`);
    (err as any).status = response.status;
    throw err;
  }
}
