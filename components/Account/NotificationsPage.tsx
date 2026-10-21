"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconBell } from "@tabler/icons-react";
import { useAuth } from "@/src/auth/useAuth";
import { readTicketNotifications, saveTicketNotifications, subscribeTicketNotifications, type TicketNotification } from "@/src/notifications/ticketNotifications";

export default function NotificationsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<TicketNotification[]>([]);
  const userId = user?.id ?? "";
  useEffect(() => {
    const update = () => setItems(userId ? readTicketNotifications(userId) : []);
    update();
    return subscribeTicketNotifications(update);
  }, [userId]);
  const unread = items.filter((item) => !item.read).length;
  const save = (next: TicketNotification[]) => { if (userId) saveTicketNotifications(userId, next); };
  return <article className="smartbet-panel">
    <div className="smartbet-panel__heading"><h2>{unread} unread</h2><div className="smartbet-actions"><button type="button" disabled={!unread} onClick={() => save(items.map((item) => ({ ...item, read: true })))}>Mark all read</button><button type="button" disabled={!items.length} onClick={() => save([])}>Clear all</button></div></div>
    <p>Ticket responses from this browser session appear here.</p>
    {items.length === 0 ? (
      <div className="smartbet-empty"><IconBell size={32} aria-hidden="true" /><h2>No notifications yet</h2><p>Booking and ticket placement responses will appear here.</p></div>
    ) : (
      <div className="smartbet-notification-list">
        {items.map((item) => {
          const markRead = () => save(items.map((entry) => entry.id === item.id ? { ...entry, read: true } : entry));
          return (
            <article key={item.id} className={item.read ? "is-read" : "is-unread"}>
              <div className="smartbet-panel__heading"><h3>{item.title}</h3><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString("en-UG")}</time></div>
              <p>{item.message}</p>
              <Link href={item.href} onClick={markRead}>View details</Link>
              {!item.read && <button type="button" onClick={markRead}>Mark read</button>}
            </article>
          );
        })}
      </div>
    )}
  </article>;
}
