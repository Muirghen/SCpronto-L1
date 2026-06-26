export type Role = "employee" | "admin";
export type Status = "active" | "disabled";
export type AppKind = "link" | "embedded";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  status: Status;
  created_at: string;
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
