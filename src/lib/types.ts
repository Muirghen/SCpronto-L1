export type Role = "employee" | "admin";
export type Status = "active" | "disabled" | "pending";
export type AppKind = "link" | "embedded";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  status: Status;
  avatar_url: string | null;
  created_at: string;
};

export type Design = {
  id: string;
  user_id: string;
  name: string;
  format_key: string;
  data: unknown;
  updated_at: string;
  created_at: string;
};

export type Channel = "instagram" | "facebook" | "x";
export type PostStatus = "draft" | "scheduled" | "posted";

export type ScheduledPost = {
  id: string;
  user_id: string;
  channel: Channel;
  caption: string;
  design_id: string | null;
  image_url: string | null;
  scheduled_at: string;
  status: PostStatus;
  created_at: string;
  updated_at: string;
};

export type AppTile = {
  id: string;
  name: string;
  description: string | null;
  url: string | null;
  icon_emoji: string | null;
  icon_url: string | null;
  kind: AppKind;
  sort_order: number;
  created_at: string;
};
