export type BerichtStatus = "draft" | "formatted" | "pdf_generated";

export interface User {
  id: number;
  email: string;
  password_hash: string;
  name: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Baustelle {
  id: number;
  user_id: number;
  name: string;
  address: string | null;
  customer_name: string | null;
  notes: string | null;
  is_archived: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Bericht {
  id: number;
  baustelle_id: number;
  title: string;
  raw_note: string | null;
  formatted_text: string | null;
  status: BerichtStatus;
  report_date: string;
  pdf_path: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface BerichtFoto {
  id: number;
  bericht_id: number;
  file_path: string;
  file_name: string;
  sort_order: number;
  created_at: Date;
}
