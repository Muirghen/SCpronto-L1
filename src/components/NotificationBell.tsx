"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  getMyNotifications,
  markAllNotificationsRead,
  type Notif,
} from "@/app/notifications/actions";

function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d}d ago` : new Date(iso).toLocaleDateString();
}

export function NotificationBell() {
  const [items, setItems] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const unread = items.filter((n) => !n.read_at).length;

  async function refresh() {
    try {
      setItems(await getMyNotifications());
    } catch {
      /* ignore transient errors */
    }
  }

  // Initial load + light polling so new approvals show up without a reload.
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 60_000);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      // Optimistically clear the badge, then persist.
      setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })));
      try { await markAllNotificationsRead(); } catch { /* ignore */ }
    }
  }

  return (
    <div ref={boxRef} className="relative shrink-0">
      <button
        onClick={toggle}
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-espresso/70 transition hover:bg-tan/15 hover:text-espresso active:scale-90"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
          <path d="M10 20a2 2 0 0 0 4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-logo px-1 text-[10px] font-bold text-cream">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="animate-fade-in absolute right-0 top-11 z-50 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-card border border-tan/40 bg-cream shadow-xl">
          <div className="border-b border-tan/20 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-tan">
            Notifications
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-espresso/50">
              You&apos;re all caught up.
            </p>
          ) : (
            <ul className="no-scrollbar max-h-96 divide-y divide-tan/20 overflow-y-auto">
              {items.map((n) => {
                const isOpen = expandedId === n.id;
                return (
                  <li key={n.id}>
                    <div
                      onClick={() => setExpandedId(isOpen ? null : n.id)}
                      className="flex cursor-pointer gap-3 px-4 py-3 transition hover:bg-tan/10"
                    >
                      <span
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                          n.read_at ? "bg-transparent" : "bg-logo"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-espresso">{n.title}</p>
                          {n.body && (
                            <svg
                              width="14" height="14" viewBox="0 0 24 24" fill="none"
                              stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                              strokeLinejoin="round" aria-hidden="true"
                              className={`mt-1 shrink-0 text-tan transition-transform ${isOpen ? "rotate-180" : ""}`}
                            >
                              <path d="m6 9 6 6 6-6" />
                            </svg>
                          )}
                        </div>
                        {n.body && (
                          <p className={`mt-0.5 text-sm text-espresso/60 ${isOpen ? "" : "line-clamp-1"}`}>
                            {n.body}
                          </p>
                        )}
                        <p className="mt-0.5 text-[11px] text-tan">{timeAgo(n.created_at)}</p>
                        {isOpen && n.link && (
                          <Link
                            href={n.link}
                            onClick={(e) => { e.stopPropagation(); setOpen(false); }}
                            className="mt-2 inline-flex rounded-lg bg-espresso px-2.5 py-1 text-xs font-semibold text-cream transition hover:bg-espresso/90 active:scale-95"
                          >
                            View →
                          </Link>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
