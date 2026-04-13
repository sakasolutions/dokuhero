export type BerichtStatus = "draft" | "formatted" | "pdf_generated";

export interface User {
  id: number;
  email: string;
  name: string | null;
  password_hash: string;
  created_at: Date;
}

export interface Baustelle {
  id: number;
  user_id: number;
  name: string;
  address: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Bericht {
  id: number;
  baustelle_id: number;
  report_date: string;
  raw_note: string | null;
  formatted_text: string | null;
  pdf_path: string | null;
  status: BerichtStatus;
  created_at: Date;
  updated_at: Date;
}

export interface BerichtFoto {
  id: number;
  bericht_id: number;
  file_path: string;
  file_name: string;
  created_at: Date;
}
