// Gate test for the Publisher channel logic. Deterministic, free, no deps.
// Run: node --test src/lib/scheduler/channels.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CHANNELS,
  captionLimit,
  isChannel,
  validatePost,
} from "./channels.mjs";

const future = new Date(Date.now() + 86_400_000).toISOString();

test("channels are the three supported platforms", () => {
  assert.deepEqual([...CHANNELS].sort(), ["facebook", "instagram", "x"]);
});

test("isChannel only accepts known keys", () => {
  assert.equal(isChannel("instagram"), true);
  assert.equal(isChannel("tiktok"), false);
  assert.equal(isChannel(""), false);
});

test("caption limits match each platform", () => {
  assert.equal(captionLimit("x"), 280);
  assert.equal(captionLimit("instagram"), 2200);
  assert.equal(captionLimit("nope"), 0);
});

test("valid post passes", () => {
  const res = validatePost({
    channel: "instagram",
    caption: "Hello world",
    scheduled_at: future,
    design_id: "abc",
  });
  assert.equal(res.ok, true);
  assert.deepEqual(res.errors, []);
});

test("caption over the X limit fails", () => {
  const res = validatePost({
    channel: "x",
    caption: "a".repeat(281),
    scheduled_at: future,
    image_url: "http://img",
  });
  assert.equal(res.ok, false);
  assert.ok(res.errors.some((e) => e.includes("281")));
});

test("281 chars is fine on Instagram", () => {
  const res = validatePost({
    channel: "instagram",
    caption: "a".repeat(281),
    scheduled_at: future,
    image_url: "http://img",
  });
  assert.equal(res.ok, true);
});

test("missing image is rejected", () => {
  const res = validatePost({
    channel: "x",
    caption: "hi",
    scheduled_at: future,
  });
  assert.equal(res.ok, false);
  assert.ok(res.errors.some((e) => e.toLowerCase().includes("image")));
});

test("bad date is rejected", () => {
  const res = validatePost({
    channel: "x",
    caption: "hi",
    scheduled_at: "not-a-date",
    image_url: "http://img",
  });
  assert.equal(res.ok, false);
  assert.ok(res.errors.some((e) => e.toLowerCase().includes("date")));
});

test("unknown channel is rejected", () => {
  const res = validatePost({
    channel: "tiktok",
    caption: "hi",
    scheduled_at: future,
    image_url: "http://img",
  });
  assert.equal(res.ok, false);
});
