import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Add error boundary for better debugging
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
});

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('Root element not found! Check if the HTML has a div with id="root"');
} else {
  console.log('Root element found, rendering app...');
}

createRoot(rootElement!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
