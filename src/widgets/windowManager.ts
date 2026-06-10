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
  console.log(`[createWidget] Starting creation of ${type} widget`, config);

  const store = await getStore();
  console.log(`[createWidget] Store loaded for ${type}`);

  const savedPos = await store.get<{ x: number; y: number }>(`pos-${type}`);
  const pos = savedPos ?? DEFAULT_POSITIONS[type];
  console.log(`[createWidget] Position for ${type}:`, pos);

  const existing = await WebviewWindow.getByLabel(config.label);
  console.log(`[createWidget] Existing window for label '${config.label}':`, existing);
  if (existing) {
    console.log(`[createWidget] Refocusing existing ${type} widget`);
    await existing.setFocus();
    return existing;
  }

  const options = {
    url: '/',
    title: config.title,
    width: config.width,
    height: config.height,
    x: pos.x,
    y: pos.y,
    decorations: true,
    resizable: true,
    center: false,
  };
  console.log(`[createWidget] Creating new WebviewWindow '${config.label}' with options:`, options);

  try {
    const win = new WebviewWindow(config.label, options);
    console.log(`[createWidget] WebviewWindow instance created, label: ${win.label}`);

    win.once('tauri://created', () => {
      console.log(`[createWidget] SUCCESS — window '${config.label}' created`);
      store.set(`enabled-${type}`, true);
    });

    win.once('tauri://error', (e) => {
      console.error(`[createWidget] ERROR — window '${config.label}' creation failed`);
      try {
        console.error(`[createWidget] Error details:`, JSON.stringify(e, Object.getOwnPropertyNames(e)));
      } catch {
        console.error(`[createWidget] Error details (non-serializable):`, e);
      }
    });

    return win;
  } catch (err) {
    console.error(`[createWidget] EXCEPTION creating ${type} widget:`, err);
    if (err instanceof Error) {
      console.error(`[createWidget] Exception name: ${err.name}`);
      console.error(`[createWidget] Exception message: ${err.message}`);
      console.error(`[createWidget] Exception stack: ${err.stack}`);
    }
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
