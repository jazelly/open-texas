import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { AuthProvider } from './hooks/useAuth';
import './index.css';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <App />
          {/* Global Toaster for notifications that persist during navigation */}
          <Toaster 
            position="bottom-left"
            reverseOrder={false}
            gutter={8}
            containerClassName="toast-container"
            containerStyle={{
              bottom: 20,
              left: 20,
            }}
            toastOptions={{
              duration: 5000,
              style: {
                background: '#333',
                color: '#fff',
                padding: '12px 16px',
                borderRadius: '4px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                fontSize: '14px',
                maxWidth: '350px',
                transform: 'translateX(0)',
                animation: 'toast-enter 0.5s ease-out'
              },
              // Custom animation for toasts
              className: 'toast-slide-in',
              success: {
                duration: 3000,
                style: {
                  background: 'rgba(40, 167, 69, 0.9)', 
                  color: 'white',
                },
              },
              error: {
                duration: 5000,
                style: {
                  background: 'rgba(220, 53, 69, 0.9)', 
                  color: 'white',
                },
              },
            }}
          />
        </BrowserRouter>
      </AuthProvider>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  </React.StrictMode>,
);

// Add global CSS for toast animations
const style = document.createElement('style');
style.textContent = `
  @keyframes toast-enter {
    0% {
      transform: translateX(-100%);
      opacity: 0;
    }
    100% {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .toast-slide-in {
    animation: toast-enter 0.5s ease-out forwards;
  }

  .toast-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
`;
document.head.appendChild(style); 