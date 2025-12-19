// Database types
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          company_name: string | null;
          plan_tier: string;
          monthly_run_limit: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          company_name?: string | null;
          plan_tier?: string;
          monthly_run_limit?: number;
        };
        Update: {
          company_name?: string | null;
          plan_tier?: string;
          monthly_run_limit?: number;
        };
      };
      test_suites: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          github_repo: string | null;
          playwright_config: any | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          github_repo?: string | null;
          playwright_config?: any | null;
          is_active?: boolean;
        };
        Update: {
          name?: string;
          description?: string | null;
          github_repo?: string | null;
          playwright_config?: any | null;
          is_active?: boolean;
        };
      };
      test_runs: {
        Row: {
          id: string;
          user_id: string;
          suite_id: string;
          status: "pending" | "running" | "completed" | "failed";
          duration_ms: number | null;
          tests_passed: number | null;
          tests_failed: number | null;
          video_url: string | null;
          screenshots: string[] | null;
          logs: string | null;
          results: any | null;
          triggered_by: string;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          suite_id: string;
          status?: "pending" | "running" | "completed" | "failed";
          duration_ms?: number | null;
          tests_passed?: number | null;
          tests_failed?: number | null;
          video_url?: string | null;
          screenshots?: string[] | null;
          logs?: string | null;
          results?: any | null;
          triggered_by?: string;
          started_at?: string | null;
          completed_at?: string | null;
        };
        Update: {
          status?: "pending" | "running" | "completed" | "failed";
          duration_ms?: number | null;
          tests_passed?: number | null;
          tests_failed?: number | null;
          video_url?: string | null;
          screenshots?: string[] | null;
          logs?: string | null;
          results?: any | null;
          started_at?: string | null;
          completed_at?: string | null;
        };
      };
      usage_tracking: {
        Row: {
          id: string;
          user_id: string;
          month: string;
          test_runs_count: number;
          compute_cost: number;
          storage_cost: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          month: string;
          test_runs_count?: number;
          compute_cost?: number;
          storage_cost?: number;
        };
        Update: {
          test_runs_count?: number;
          compute_cost?: number;
          storage_cost?: number;
        };
      };
    };
  };
}

// Component prop types
export type TestSuite = Database["public"]["Tables"]["test_suites"]["Row"];
export type TestRun = Database["public"]["Tables"]["test_runs"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

