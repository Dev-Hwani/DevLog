const listeners = new Set();

export const subscribeEvents = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const emitEvent = (event) => {
  listeners.forEach((listener) => {
    listener(event);
  });
};

export const notifyError = (message) => {
  emitEvent({ type: 'error', message });
};

export const notifyAuthExpired = () => {
  emitEvent({ type: 'auth-expired' });
};
