export type TicketNotification = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  href: string;
};

const eventName = "smartbet-notifications-changed";
const storageKey = (userId: string) => `smartbet.notifications.${userId}`;

export const readTicketNotifications = (userId: string): TicketNotification[] => {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(storageKey(userId)) || "[]");
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is TicketNotification => Boolean(item && typeof item.id === "string" && typeof item.message === "string" && typeof item.title === "string" && typeof item.createdAt === "string" && typeof item.read === "boolean" && typeof item.href === "string" && item.href.startsWith("/") && !item.href.startsWith("//")));
  } catch { return []; }
};

export const saveTicketNotifications = (userId: string, items: TicketNotification[]) => {
  try { sessionStorage.setItem(storageKey(userId), JSON.stringify(items.slice(0, 50))); }
  catch { /* Ticket feedback still works when browser storage is unavailable. */ }
  window.dispatchEvent(new Event(eventName));
};

export const recordTicketNotification = (userId: string, item: Omit<TicketNotification, "id" | "createdAt" | "read">) => {
  saveTicketNotifications(userId, [{ ...item, id: crypto.randomUUID(), createdAt: new Date().toISOString(), read: false }, ...readTicketNotifications(userId)]);
};

export const subscribeTicketNotifications = (callback: () => void) => {
  window.addEventListener(eventName, callback);
  return () => window.removeEventListener(eventName, callback);
};
