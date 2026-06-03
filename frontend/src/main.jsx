import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { store } from './app/store';
import './styles/index.css';
import { bootstrapAuth } from './features/auth/authSlice';
import ThemeSync from './components/layout/ThemeSync';

// Refresh the auth session on app start so persisted logins are restored from the httpOnly cookie.
store.dispatch(bootstrapAuth());

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <ThemeSync />
        <App />
        <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);