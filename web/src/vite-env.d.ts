/// <reference types="vite/client" />

interface GtagFunction {
  (command: 'event', eventName: string, params?: Record<string, string | number | boolean>): void;
  (command: 'config' | 'js', ...args: unknown[]): void;
}

declare global {
  interface Window {
    gtag?: GtagFunction;
    dataLayer?: unknown[];
  }
}

export {};
