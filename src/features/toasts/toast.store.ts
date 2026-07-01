import { create } from 'zustand';

export type AppToastType = 'error' | 'success';

export type AppToast = {
  id: number;
  message?: string;
  title: string;
  type: AppToastType;
};

type ToastInput = {
  message?: string;
  title: string;
  type?: AppToastType;
};

type ToastStore = {
  dismissToast: (id?: number) => void;
  restoreToast: () => void;
  showError: (title: string, message?: string) => void;
  showSuccess: (title: string, message?: string) => void;
  showToast: (toast: ToastInput) => void;
  toast: AppToast | null;
};

let nextToastId = 1;
const storedToastKey = 'climb-book-active-toast';
const storedToastWindowMs = 8000;

type StoredToast = AppToast & {
  expiresAt: number;
};

function getToastStorage() {
  try {
    return typeof globalThis.sessionStorage === 'undefined' ? null : globalThis.sessionStorage;
  } catch {
    return null;
  }
}

function clearStoredToast() {
  getToastStorage()?.removeItem(storedToastKey);
}

function persistToast(toast: AppToast) {
  const storage = getToastStorage();

  if (!storage) {
    return;
  }

  const storedToast: StoredToast = {
    ...toast,
    expiresAt: Date.now() + storedToastWindowMs,
  };

  storage.setItem(storedToastKey, JSON.stringify(storedToast));
}

function readStoredToast() {
  const rawToast = getToastStorage()?.getItem(storedToastKey);

  if (!rawToast) {
    return null;
  }

  try {
    const storedToast = JSON.parse(rawToast) as StoredToast;

    if (!storedToast.id || !storedToast.title || storedToast.expiresAt < Date.now()) {
      clearStoredToast();
      return null;
    }

    nextToastId = Math.max(nextToastId, storedToast.id + 1);

    return {
      id: storedToast.id,
      message: storedToast.message,
      title: storedToast.title,
      type: storedToast.type === 'error' ? 'error' : 'success',
    } satisfies AppToast;
  } catch {
    clearStoredToast();
    return null;
  }
}

function createToast(input: ToastInput): AppToast {
  return {
    id: nextToastId++,
    message: input.message,
    title: input.title,
    type: input.type ?? 'success',
  };
}

export const useToastStore = create<ToastStore>((set) => ({
  dismissToast(id) {
    set((state) => {
      if (!id || state.toast?.id === id) {
        clearStoredToast();
        return { toast: null };
      }

      return state;
    });
  },
  restoreToast() {
    set((state) => {
      if (state.toast) {
        return state;
      }

      const storedToast = readStoredToast();
      return storedToast ? { toast: storedToast } : state;
    });
  },
  showError(title, message) {
    const toast = createToast({ message, title, type: 'error' });
    persistToast(toast);
    set({ toast });
  },
  showSuccess(title, message) {
    const toast = createToast({ message, title, type: 'success' });
    persistToast(toast);
    set({ toast });
  },
  showToast(input) {
    const toast = createToast(input);
    persistToast(toast);
    set({ toast });
  },
  toast: null,
}));
