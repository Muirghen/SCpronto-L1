// Typed re-export of the pure channel config in channels.mjs. App code imports
// from here; the gate test imports the .mjs directly.

import {
  CHANNELS as RAW_CHANNELS,
  CHANNEL_CONFIG as RAW_CONFIG,
  CAPTION_TEMPLATES as RAW_TEMPLATES,
  isChannel as rawIsChannel,
  captionLimit as rawCaptionLimit,
  validatePost as rawValidatePost,
} from "./channels.mjs";
import type { IconName } from "@/components/studio/Icon";

export type Channel = "instagram" | "facebook" | "x";

export type ChannelConfig = {
  key: Channel;
  label: string;
  icon: IconName;
  captionMax: number;
  recommendedFormats: string[];
  aspect: string;
  accent: string;
};

export type CaptionTemplate = { label: string; text: string };

export type DraftPost = {
  channel: string;
  caption?: string;
  scheduled_at?: string;
  design_id?: string | null;
  image_url?: string | null;
};

export type ValidationResult = { ok: boolean; errors: string[] };

export const CHANNELS = RAW_CHANNELS as Channel[];
export const CHANNEL_CONFIG = RAW_CONFIG as Record<Channel, ChannelConfig>;
export const CAPTION_TEMPLATES = RAW_TEMPLATES as Record<Channel, CaptionTemplate[]>;
export const captionLimit = rawCaptionLimit as (c: string) => number;
export const isChannelKey = rawIsChannel as (v: string) => v is Channel;
export const validatePost = rawValidatePost as (p: DraftPost) => ValidationResult;
