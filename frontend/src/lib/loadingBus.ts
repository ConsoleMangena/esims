let count = 0;
let listeners: Array<(n: number) => void> = [];

export function incrementLoading() {
  count += 1;
  listeners.forEach((fn) => fn(count));
}

export function decrementLoading() {
  count = Math.max(0, count - 1);
  listeners.forEach((fn) => fn(count));
}

export function subscribeLoading(listener: (n: number) => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function getLoadingCount() {
  return count;
}
