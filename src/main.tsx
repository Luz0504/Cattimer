import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import App from './App.tsx';
import WidgetApp from './widgets/WidgetApp';
import './index.css';

const label = getCurrentWebviewWindow().label;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {label === 'main' ? <App /> : <WidgetApp />}
  </StrictMode>,
);
