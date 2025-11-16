import './src/index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import PublicApp from './PublicApp';
import { AuthProvider } from './contexts/AuthContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Simple routing: check if URL is a public route
const isPublicRoute = window.location.pathname.startsWith('/despacho/publico');

const root = ReactDOM.createRoot(rootElement);

if (isPublicRoute) {
  // Render public app without authentication
  root.render(
    <React.StrictMode>
      <PublicApp />
    </React.StrictMode>
  );
} else {
  // Render main app with authentication
  root.render(
    <React.StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </React.StrictMode>
  );
}
