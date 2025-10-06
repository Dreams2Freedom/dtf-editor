// Simple toast notification system
type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

class ToastManager {
  private listeners: ((toasts: ToastMessage[]) => void)[] = [];
  private toasts: ToastMessage[] = [];

  subscribe(listener: (toasts: ToastMessage[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(listener => listener(this.toasts));
  }

  show(type: ToastType, message: string, duration = 3000) {
    const id = Math.random().toString(36).substr(2, 9);
    const toast: ToastMessage = { id, type, message, duration };

    this.toasts = [...this.toasts, toast];
    this.notify();

    if (duration > 0) {
      setTimeout(() => {
        this.toasts = this.toasts.filter(t => t.id !== id);
        this.notify();
      }, duration);
    }
  }

  success(message: string, duration?: number) {
    this.show('success', message, duration);
  }

  error(message: string, duration?: number) {
    this.show('error', message, duration);
  }

  info(message: string, duration?: number) {
    this.show('info', message, duration);
  }

  warning(message: string, duration?: number) {
    this.show('warning', message, duration);
  }
}

// Create a singleton instance
export const toast = new ToastManager();
