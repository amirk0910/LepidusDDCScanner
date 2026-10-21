import type { Detector, Risk } from "../types";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
type ScanRow = {
  id: string;
  owner_id: string;
  filename: string;
  size_bytes: number;
  duration_ms: number;
  risk: Risk;
  total_findings: number;
  created_at: string;
};
type FindingRow = {
  id: string;
  scan_id: string;
  owner_id: string;
  detector: Detector;
  risk: Risk;
  count: number;
  masked_example: string;
};

export type Database = {
  public: {
    Tables: {
      scans: {
        Row: ScanRow;
        Insert: Omit<ScanRow, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<ScanRow>;
        Relationships: [];
      };
      scan_findings: {
        Row: FindingRow;
        Insert: Omit<FindingRow, "id"> & { id?: string };
        Update: Partial<FindingRow>;
        Relationships: [{
          foreignKeyName: "scan_findings_scan_id_owner_id_fkey";
          columns: ["scan_id", "owner_id"];
          isOneToOne: false;
          referencedRelation: "scans";
          referencedColumns: ["id", "owner_id"];
        }];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      save_scan: {
        Args: { p_filename: string; p_size_bytes: number; p_duration_ms: number; p_findings: Json };
        Returns: string;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
