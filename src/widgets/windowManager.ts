import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { load } from '@tauri-apps/plugin-store';

const STORE_FILE = 'widget.json';

async function getStore() {
  return await load(STORE_FILE, { autoSave: true, defaults: {} });
}

export type WidgetType = 'pomodoro' | 'tasks';

const WIDGET_CONFIG: Record<WidgetType, { label: string; title: string; width: number; height: number }> = {
  pomodoro: { label: 'pomodoro-widget', title: 'Pomodoro', width: 320, height: 520 },
  tasks: { label: 'tasks-widget', title: 'Tareas', width: 380, height: 520 },
};

const DEFAULT_POSITIONS: Record<WidgetType, { x: number; y: number }> = {
  pomodoro: { x: 100, y: 100 },
  tasks: { x: 440, y: 100 },
};

export async function createWidget(type: WidgetType): Promise<WebviewWindow | null> {
  const config = WIDGET_CONFIG[type];
  const store = await getStore();
  const savedPos = await store.get<{ x: number; y: number }>(`pos-${type}`);
  const pos = savedPos ?? DEFAULT_POSITIONS[type];

  const existing = await WebviewWindow.getByLabel(config.label);
  if (existing) {
    await existing.setFocus();
    return existing;
  }

  try {
    const win = new WebviewWindow(config.label, {
      url: '/',
      title: config.title,
      width: config.width,
      height: config.height,
      x: pos.x,
      y: pos.y,
      decorations: true,
      resizable: true,
      center: false,
    });

    win.once('tauri://created', () => {
      store.set(`enabled-${type}`, true);
    });

    win.once('tauri://error', (e) => {
      console.error(`Failed to create ${type} widget window:`, e);
    });

    return win;
  } catch (err) {
    console.error(`Error creating ${type} widget:`, err);
    return null;
  }
}

export async function destroyWidget(type: WidgetType): Promise<void> {
  const config = WIDGET_CONFIG[type];
  const store = await getStore();

  try {
    const win = await WebviewWindow.getByLabel(config.label);
    if (win) {
      const pos = await win.outerPosition();
      await store.set(`pos-${type}`, { x: pos.x, y: pos.y });
      await win.close();
    }
    await store.set(`enabled-${type}`, false);
  } catch (err) {
    console.error(`Error destroying ${type} widget:`, err);
  }
}

export async function isWidgetOpen(type: WidgetType): Promise<boolean> {
  const config = WIDGET_CONFIG[type];
  const win = await WebviewWindow.getByLabel(config.label);
  return win !== null;
}

export async function isWidgetEnabled(type: WidgetType): Promise<boolean> {
  const store = await getStore();
  return (await store.get<boolean>(`enabled-${type}`)) ?? false;
}

export async function saveWidgetPosition(type: WidgetType, x: number, y: number): Promise<void> {
  const store = await getStore();
  await store.set(`pos-${type}`, { x, y });
}
