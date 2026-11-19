import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { initDb } from './db';

initDb().then(() => createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>));
