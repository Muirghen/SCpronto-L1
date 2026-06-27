// Per-channel config for the Publisher: caption limits, the design format
// that fits each platform, and ready-made caption templates. Pure data + a
// validator so it can be unit-tested with `node --test` (no build step).
//
// Kept as .mjs (no TS types) so the gate test imports it directly. A thin
// channels.ts re-exports these with TypeScript types for the app.

/** @typedef {"instagram" | "facebook" | "x"} Channel */

export const CHANNELS = ["instagram", "facebook", "x"];

export const CHANNEL_CONFIG = {
  instagram: {
    key: "instagram",
    label: "Instagram",
    icon: "image",
    // Instagram captions cap at 2,200 characters.
    captionMax: 2200,
    // Best-fit Studio format key (square / portrait).
    recommendedFormats: ["ig-post", "ig-portrait", "ig-story"],
    aspect: "1:1 or 4:5 (square / portrait)",
    accent: "#D85A30",
  },
  facebook: {
    key: "facebook",
    label: "Facebook",
    icon: "send",
    // Facebook allows very long posts; keep a sane ceiling for the editor.
    captionMax: 63206,
    recommendedFormats: ["fb-post", "ig-post"],
    aspect: "1.91:1 (landscape) or 1:1",
    accent: "#3A1A0E",
  },
  x: {
    key: "x",
    label: "X",
    icon: "send",
    // X standard limit.
    captionMax: 280,
    recommendedFormats: ["x-post", "x-header"],
    aspect: "16:9 (landscape)",
    accent: "#A8451F",
  },
};

// Caption starters per channel. {brand} and {cta} are simple placeholders the
// composer can leave for the user to fill.
export const CAPTION_TEMPLATES = {
  instagram: [
    { label: "Product launch", text: "Introducing {brand} ✨\n\nNow available — link in bio.\n\n#newdrop #shopnow" },
    { label: "Sale", text: "🔥 SALE IS ON 🔥\nUp to 50% off this week only.\n{cta}\n\n#sale #deals" },
    { label: "Behind the scenes", text: "A little look behind the scenes at {brand} 👀\n\n#bts #process" },
  ],
  facebook: [
    { label: "Announcement", text: "Big news from {brand}! 🎉\n\n{cta}" },
    { label: "Event", text: "You're invited 🎟️\nJoin us this weekend at {brand}. Details below 👇" },
    { label: "Promo", text: "This week only: save big at {brand}. {cta}" },
  ],
  x: [
    { label: "Quick hit", text: "{brand} is here. {cta}" },
    { label: "Sale", text: "🔥 50% off this week only at {brand}. {cta}" },
    { label: "Thread starter", text: "A few things we learned building {brand} 🧵👇" },
  ],
};

/** Is this a known channel key? */
export function isChannel(value) {
  return CHANNELS.includes(value);
}

/** Caption character limit for a channel (0 if unknown). */
export function captionLimit(channel) {
  return CHANNEL_CONFIG[channel]?.captionMax ?? 0;
}

/**
 * Validate a draft post. Returns { ok, errors } where errors is a list of
 * human-readable strings. Deterministic — same input, same output.
 */
export function validatePost(post) {
  const errors = [];

  if (!isChannel(post.channel)) {
    errors.push("Pick a channel (Instagram, Facebook or X).");
  } else {
    const max = captionLimit(post.channel);
    const len = (post.caption ?? "").length;
    if (len > max) {
      errors.push(
        `Caption is ${len} characters — ${CHANNEL_CONFIG[post.channel].label} allows ${max}.`,
      );
    }
  }

  if (!post.scheduled_at || Number.isNaN(Date.parse(post.scheduled_at))) {
    errors.push("Choose a date and time to schedule the post.");
  }

  if (!post.design_id && !post.image_url) {
    errors.push("Attach an image — pick a Studio design or upload one.");
  }

  return { ok: errors.length === 0, errors };
}
