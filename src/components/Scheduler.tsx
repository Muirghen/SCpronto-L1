"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "@/lib/clsx";
import { Icon } from "@/components/studio/Icon";
import { DesignThumb } from "@/components/studio/DesignThumb";
import {
  CHANNELS,
  CHANNEL_CONFIG,
  CAPTION_TEMPLATES,
  captionLimit,
  validatePost,
  type Channel,
} from "@/lib/scheduler/channels";
import { savePost, deletePost, setPostStatus } from "@/app/scheduler/actions";
import { uploadDesignImage } from "@/app/studio/actions";
import type { Design, ScheduledPost } from "@/lib/types";

type Draft = {
  id?: string;
  channel: Channel;
  caption: string;
  designId: string | null;
  imageUrl: string | null;
  date: string; // yyyy-mm-dd
  time: string; // HH:MM
  status: ScheduledPost["status"];
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function emptyDraft(date: string): Draft {
  return {
    channel: "instagram",
    caption: "",
    designId: null,
    imageUrl: null,
    date,
    time: "09:00",
    status: "scheduled",
  };
}

function draftFromPost(p: ScheduledPost): Draft {
  const d = new Date(p.scheduled_at);
  return {
    id: p.id,
    channel: p.channel,
    caption: p.caption,
    designId: p.design_id,
    imageUrl: p.image_url,
    date: ymd(d),
    time: `${String(d.getHours()).padStart(2, "0")}:${String(
      d.getMinutes(),
    ).padStart(2, "0")}`,
    status: p.status,
  };
}

export function Scheduler({
  initialPosts,
  designs,
}: {
  initialPosts: ScheduledPost[];
  designs: Design[];
}) {
  const router = useRouter();
  const [posts, setPosts] = useState(initialPosts);
  const [month, setMonth] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [draft, setDraft] = useState<Draft | null>(null);

  const postsByDay = useMemo(() => {
    const map = new Map<string, ScheduledPost[]>();
    for (const p of posts) {
      const key = ymd(new Date(p.scheduled_at));
      (map.get(key) ?? map.set(key, []).get(key)!).push(p);
    }
    return map;
  }, [posts]);

  // Build the month grid (Mon-first), padded to full weeks.
  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const startOffset = (first.getDay() + 6) % 7; // Mon=0
    const start = new Date(first);
    start.setDate(first.getDate() - startOffset);
    const out: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      out.push(d);
    }
    return out;
  }, [month]);

  function refresh(next: ScheduledPost[]) {
    setPosts(next);
    router.refresh();
  }

  function onSaved(saved: ScheduledPost) {
    refresh([...posts.filter((p) => p.id !== saved.id), saved]);
    setDraft(null);
  }

  const upcoming = useMemo(
    () =>
      [...posts]
        .filter((p) => p.status !== "posted")
        .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)),
    [posts],
  );

  const monthLabel = month.toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });
  const thisMonth = month.getMonth();
  const todayKey = ymd(new Date());

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-bold text-espresso">Scheduler</h1>
          <p className="mt-1 text-espresso/60">
            Plan a content calendar and queue your Studio designs for Instagram,
            Facebook and X.
          </p>
        </div>
        <button
          onClick={() => setDraft(emptyDraft(todayKey))}
          className="inline-flex items-center gap-1.5 rounded-lg bg-logo px-3 py-2 text-sm font-semibold text-cream transition hover:bg-orange-light"
        >
          <Icon name="plus" size={16} /> New post
        </button>
      </div>

      {/* calendar */}
      <section className="mb-10 rounded-card border border-tan/40 bg-white/70 p-4">
        <div className="mb-3 flex items-center justify-between">
          <button
            aria-label="Previous month"
            onClick={() =>
              setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
            }
            className="rounded-lg p-1.5 text-espresso/70 transition hover:bg-tan/15"
          >
            <Icon name="alignLeft" size={18} />
          </button>
          <h2 className="font-semibold text-espresso">{monthLabel}</h2>
          <button
            aria-label="Next month"
            onClick={() =>
              setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
            }
            className="rounded-lg p-1.5 text-espresso/70 transition hover:bg-tan/15"
          >
            <Icon name="alignRight" size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-px text-center text-[11px] font-semibold uppercase tracking-wide text-tan">
          {WEEKDAYS.map((d) => (
            <div key={d} className="pb-1">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg bg-tan/20">
          {cells.map((d) => {
            const key = ymd(d);
            const dayPosts = postsByDay.get(key) ?? [];
            const muted = d.getMonth() !== thisMonth;
            return (
              <button
                key={key}
                onClick={() => setDraft(emptyDraft(key))}
                className={clsx(
                  "min-h-[84px] bg-white p-1.5 text-left align-top transition hover:bg-cream",
                  muted && "bg-white/50 text-espresso/40",
                )}
              >
                <span
                  className={clsx(
                    "inline-flex h-5 w-5 items-center justify-center rounded-full text-xs",
                    key === todayKey && "bg-logo font-bold text-cream",
                  )}
                >
                  {d.getDate()}
                </span>
                <div className="mt-1 space-y-1">
                  {dayPosts.slice(0, 3).map((p) => (
                    <span
                      key={p.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDraft(draftFromPost(p));
                      }}
                      className="block truncate rounded px-1 py-0.5 text-[10px] font-medium text-white"
                      style={{ background: CHANNEL_CONFIG[p.channel].accent }}
                      title={p.caption || CHANNEL_CONFIG[p.channel].label}
                    >
                      {p.status === "posted" ? "✓ " : ""}
                      {CHANNEL_CONFIG[p.channel].label}
                    </span>
                  ))}
                  {dayPosts.length > 3 && (
                    <span className="block text-[10px] text-tan">
                      +{dayPosts.length - 3} more
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* upcoming list */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-tan">
          Upcoming
        </h2>
        {upcoming.length === 0 ? (
          <p className="rounded-card border border-dashed border-tan/60 bg-white/50 p-8 text-center text-espresso/60">
            Nothing scheduled yet. Pick a day or hit “New post”.
          </p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((p) => (
              <PostRow
                key={p.id}
                post={p}
                design={designs.find((d) => d.id === p.design_id)}
                onEdit={() => setDraft(draftFromPost(p))}
                onChange={(next) => refresh(next(posts))}
              />
            ))}
          </ul>
        )}
      </section>

      {draft && (
        <Composer
          draft={draft}
          designs={designs}
          onClose={() => setDraft(null)}
          onSaved={onSaved}
          onDeleted={(id) => {
            refresh(posts.filter((p) => p.id !== id));
            setDraft(null);
          }}
        />
      )}
    </main>
  );
}

function PostRow({
  post,
  design,
  onEdit,
  onChange,
}: {
  post: ScheduledPost;
  design?: Design;
  onEdit: () => void;
  onChange: (next: (prev: ScheduledPost[]) => ScheduledPost[]) => void;
}) {
  const [pending, start] = useTransition();
  const cfg = CHANNEL_CONFIG[post.channel];
  const when = new Date(post.scheduled_at).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <li className="flex items-center gap-3 rounded-card border border-tan/40 bg-white/70 p-2.5">
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[#E2D8C6]">
        {design ? (
          <DesignThumb design={design} />
        ) : post.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.image_url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-tan">
            <Icon name="image" size={20} />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
            style={{ background: cfg.accent }}
          >
            {cfg.label}
          </span>
          <span className="text-xs text-tan">{when}</span>
          {post.status === "posted" && (
            <span className="text-[10px] font-semibold uppercase text-green-700">
              Posted
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-sm text-espresso/80">
          {post.caption || <span className="text-tan">No caption</span>}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {post.status !== "posted" && (
          <button
            disabled={pending}
            onClick={() =>
              start(async () => {
                await setPostStatus(post.id, "posted");
                onChange((prev) =>
                  prev.map((p) =>
                    p.id === post.id ? { ...p, status: "posted" } : p,
                  ),
                );
              })
            }
            title="Mark as posted"
            className="rounded-lg p-1.5 text-tan transition hover:bg-green-700/10 hover:text-green-700"
          >
            <Icon name="check" size={16} />
          </button>
        )}
        <button
          onClick={onEdit}
          title="Edit"
          className="rounded-lg p-1.5 text-tan transition hover:bg-logo/10 hover:text-orange-light"
        >
          <Icon name="sliders" size={16} />
        </button>
        <button
          disabled={pending}
          onClick={() => {
            if (!window.confirm("Delete this scheduled post?")) return;
            start(async () => {
              await deletePost(post.id);
              onChange((prev) => prev.filter((p) => p.id !== post.id));
            });
          }}
          title="Delete"
          className="rounded-lg p-1.5 text-tan transition hover:bg-logo/10 hover:text-orange-light"
        >
          <Icon name="trash" size={16} />
        </button>
      </div>
    </li>
  );
}

function Composer({
  draft: initial,
  designs,
  onClose,
  onSaved,
  onDeleted,
}: {
  draft: Draft;
  designs: Design[];
  onClose: () => void;
  onSaved: (p: ScheduledPost) => void;
  onDeleted: (id: string) => void;
}) {
  const [draft, setDraft] = useState<Draft>(initial);
  const [picker, setPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const cfg = CHANNEL_CONFIG[draft.channel];
  const limit = captionLimit(draft.channel);
  const over = draft.caption.length > limit;
  const chosenDesign = designs.find((d) => d.id === draft.designId);

  const scheduledAt = `${draft.date}T${draft.time || "09:00"}`;

  function set<K extends keyof Draft>(k: K, v: Draft[K]) {
    setDraft((d) => ({ ...d, [k]: v }));
  }

  function doSave(status: Draft["status"]) {
    const check = validatePost({
      channel: draft.channel,
      caption: draft.caption,
      scheduled_at: new Date(scheduledAt).toISOString(),
      design_id: draft.designId,
      image_url: draft.imageUrl,
    });
    if (!check.ok) {
      setError(check.errors.join(" "));
      return;
    }
    setError(null);
    start(async () => {
      try {
        const saved = await savePost({
          id: draft.id,
          channel: draft.channel,
          caption: draft.caption,
          scheduledAt: new Date(scheduledAt).toISOString(),
          designId: draft.designId,
          imageUrl: draft.imageUrl,
          status,
        });
        onSaved(saved);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save.");
      }
    });
  }

  async function onUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      const { url } = await uploadDesignImage(form);
      setDraft((d) => ({ ...d, imageUrl: url, designId: null }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-espresso/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-cream sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-tan/30 px-4 py-3">
          <h3 className="font-semibold text-espresso">
            {draft.id ? "Edit post" : "New post"}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-tan hover:bg-tan/15"
          >
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {/* channel tabs */}
          <div className="flex gap-2">
            {CHANNELS.map((ch) => {
              const c = CHANNEL_CONFIG[ch];
              const on = draft.channel === ch;
              return (
                <button
                  key={ch}
                  onClick={() => set("channel", ch)}
                  className={clsx(
                    "flex-1 rounded-lg border px-2 py-2 text-sm font-medium transition",
                    on
                      ? "border-transparent text-white"
                      : "border-tan/40 bg-white/60 text-espresso/70 hover:border-logo",
                  )}
                  style={on ? { background: c.accent } : undefined}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-tan">Recommended size: {cfg.aspect}</p>

          {/* image */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-tan">
              Image
            </label>
            <div className="flex items-center gap-3">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-tan/40 bg-[#E2D8C6]">
                {chosenDesign ? (
                  <DesignThumb design={chosenDesign} />
                ) : draft.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={draft.imageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-tan">
                    <Icon name="image" size={22} />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setPicker((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-tan/40 bg-white/70 px-3 py-1.5 text-sm font-medium text-espresso/80 transition hover:border-logo"
                >
                  <Icon name="folder" size={15} /> From Studio
                </button>
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-tan/40 bg-white/70 px-3 py-1.5 text-sm font-medium text-espresso/80 transition hover:border-logo disabled:opacity-50"
                >
                  <Icon name="image" size={15} />{" "}
                  {uploading ? "Uploading…" : "Upload"}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onUpload(f);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>

            {picker && (
              <div className="mt-2 max-h-44 overflow-y-auto rounded-lg border border-tan/40 bg-white/60 p-2">
                {designs.length === 0 ? (
                  <p className="p-2 text-center text-sm text-tan">
                    No saved designs yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {designs.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => {
                          setDraft((s) => ({
                            ...s,
                            designId: d.id,
                            imageUrl: null,
                          }));
                          setPicker(false);
                        }}
                        className={clsx(
                          "overflow-hidden rounded-md border-2 transition",
                          draft.designId === d.id
                            ? "border-logo"
                            : "border-transparent hover:border-tan",
                        )}
                        title={d.name}
                      >
                        <DesignThumb design={d} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* templates */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-tan">
              Caption templates
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CAPTION_TEMPLATES[draft.channel].map((t) => (
                <button
                  key={t.label}
                  onClick={() => set("caption", t.text)}
                  className="rounded-full border border-tan/40 bg-white/70 px-2.5 py-1 text-xs font-medium text-espresso/70 transition hover:border-logo"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* caption */}
          <div>
            <textarea
              value={draft.caption}
              onChange={(e) => set("caption", e.target.value)}
              rows={5}
              placeholder={`Write your ${cfg.label} caption…`}
              className="w-full resize-y rounded-lg border border-tan/40 bg-white/80 p-2.5 text-sm text-espresso outline-none focus:border-logo"
            />
            <div
              className={clsx(
                "mt-1 text-right text-xs",
                over ? "font-semibold text-red-600" : "text-tan",
              )}
            >
              {draft.caption.length} / {limit}
            </div>
          </div>

          {/* schedule */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-tan">
                Date
              </label>
              <input
                type="date"
                value={draft.date}
                onChange={(e) => set("date", e.target.value)}
                className="w-full rounded-lg border border-tan/40 bg-white/80 p-2 text-sm text-espresso outline-none focus:border-logo"
              />
            </div>
            <div className="w-28">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-tan">
                Time
              </label>
              <input
                type="time"
                value={draft.time}
                onChange={(e) => set("time", e.target.value)}
                className="w-full rounded-lg border border-tan/40 bg-white/80 p-2 text-sm text-espresso outline-none focus:border-logo"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-tan/30 px-4 py-3">
          {draft.id ? (
            <button
              disabled={pending}
              onClick={() => {
                if (!window.confirm("Delete this scheduled post?")) return;
                start(async () => {
                  await deletePost(draft.id!);
                  onDeleted(draft.id!);
                });
              }}
              className="rounded-lg p-2 text-tan transition hover:bg-logo/10 hover:text-orange-light"
              title="Delete"
            >
              <Icon name="trash" size={18} />
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              disabled={pending}
              onClick={() => doSave("draft")}
              className="rounded-lg border border-tan/50 px-3 py-2 text-sm font-medium text-espresso/80 transition hover:bg-tan/10 disabled:opacity-50"
            >
              Save draft
            </button>
            <button
              disabled={pending || over}
              onClick={() => doSave("scheduled")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-logo px-4 py-2 text-sm font-semibold text-cream transition hover:bg-orange-light disabled:opacity-50"
            >
              <Icon name="calendar" size={15} />
              {pending ? "Saving…" : "Schedule"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
