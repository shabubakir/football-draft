"use client";

// ============================================================
// NOTIFICATION TOASTS — в-приложение уведомления
// ============================================================
// Показывает toasts для:
// - Level up
// - Achievement unlocked
// - Streak milestone
// ============================================================

import { useEffect, useState, useCallback } from "react";

export type ToastType = "levelup" | "achievement" | "streak" | "info" | "error";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  icon?: string;
}

type ToastListener = (toast: Toast) => void;

// ---------- Simple event bus ----------

let listeners: ToastListener[] = [];

export function showToast(toast: Omit<Toast, "id">) {
  const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const fullToast: Toast = { ...toast, id };
  listeners.forEach((listener) => listener(fullToast));
}

function subscribe(listener: ToastListener) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

// ---------- Toast component ----------

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const unsubscribe = subscribe((toast) => {
      setToasts((prev) => [...prev, toast]);
      // Auto-remove after 4 seconds
      setTimeout(() => {
        removeToast(toast.id);
      }, 4000);
    });
    return unsubscribe;
  }, [removeToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const styles: Record<ToastType, string> = {
    levelup: "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white",
    achievement: "bg-gradient-to-r from-amber-400 to-orange-500 text-white",
    streak: "bg-gradient-to-r from-red-500 to-rose-600 text-white",
    info: "bg-stone-800 text-white",
    error: "bg-rose-600 text-white",
  };

  const icons: Record<ToastType, string> = {
    levelup: "⬆️",
    achievement: "🏆",
    streak: "🔥",
    info: "ℹ️",
    error: "⚠️",
  };

  return (
    <div
      className={`${styles[toast.type]} rounded-2xl px-4 py-3 shadow-lg animate-slide-in flex items-start gap-3`}
      role="alert"
    >
      <span className="text-2xl">{toast.icon ?? icons[toast.type]}</span>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm">{toast.title}</p>
        {toast.message && (
          <p className="text-xs opacity-90 mt-0.5">{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="opacity-70 hover:opacity-100 text-lg leading-none"
        aria-label="Закрыть"
      >
        ×
      </button>
    </div>
  );
}

// Add CSS animation
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
    @keyframes slide-in {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    .animate-slide-in {
      animation: slide-in 0.3s ease-out;
    }
  `;
  document.head.appendChild(style);
}
