// Generated from PostgreSQL 17 after all versioned migrations. Do not edit.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];
export type Database = {
  public: {
    Tables: {
      exercise_favorites: {
        Row: {
          owner_id: string;
          exercise_id: string;
          created_at: string;
        };
        Insert: {
          owner_id: string;
          exercise_id: string;
          created_at?: string;
        };
        Update: {
          owner_id?: string;
          exercise_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "exercise_favorites_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
        ];
      };
      exercises: {
        Row: {
          id: string;
          owner_id: string | null;
          name: string;
          muscle_group: string;
          equipment: string | null;
          tracking_type: string;
          archived_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string | null;
          name: string;
          muscle_group: string;
          equipment?: string | null;
          tracking_type?: string;
          archived_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string | null;
          name?: string;
          muscle_group?: string;
          equipment?: string | null;
          tracking_type?: string;
          archived_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      food_favorites: {
        Row: {
          owner_id: string;
          food_id: string;
          created_at: string;
        };
        Insert: {
          owner_id: string;
          food_id: string;
          created_at?: string;
        };
        Update: {
          owner_id?: string;
          food_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "food_favorites_food_id_fkey";
            columns: ["food_id"];
            isOneToOne: false;
            referencedRelation: "foods";
            referencedColumns: ["id"];
          },
        ];
      };
      foods: {
        Row: {
          id: string;
          owner_id: string | null;
          name: string;
          brand: string | null;
          kcal_per_100g: number | null;
          protein_per_100g: number | null;
          carbs_per_100g: number | null;
          fat_per_100g: number | null;
          source: string;
          external_id: string | null;
          archived_at: string | null;
          created_at: string;
          description: string;
          portions: Json;
          nutrients: Json;
          search_keywords: string;
          source_url: string | null;
          imported_at: string | null;
          revision: number;
        };
        Insert: {
          id?: string;
          owner_id?: string | null;
          name: string;
          brand?: string | null;
          kcal_per_100g?: number | null;
          protein_per_100g?: number | null;
          carbs_per_100g?: number | null;
          fat_per_100g?: number | null;
          source?: string;
          external_id?: string | null;
          archived_at?: string | null;
          created_at?: string;
          description?: string;
          portions?: Json;
          nutrients?: Json;
          search_keywords?: string;
          source_url?: string | null;
          imported_at?: string | null;
          revision?: number;
        };
        Update: {
          id?: string;
          owner_id?: string | null;
          name?: string;
          brand?: string | null;
          kcal_per_100g?: number | null;
          protein_per_100g?: number | null;
          carbs_per_100g?: number | null;
          fat_per_100g?: number | null;
          source?: string;
          external_id?: string | null;
          archived_at?: string | null;
          created_at?: string;
          description?: string;
          portions?: Json;
          nutrients?: Json;
          search_keywords?: string;
          source_url?: string | null;
          imported_at?: string | null;
          revision?: number;
        };
        Relationships: [];
      };
      health_goals: {
        Row: {
          id: string;
          owner_id: string;
          metric_code: string;
          target: number;
          starts_on: string;
          ends_on: string | null;
        };
        Insert: {
          id?: string;
          owner_id: string;
          metric_code: string;
          target: number;
          starts_on: string;
          ends_on?: string | null;
        };
        Update: {
          id?: string;
          owner_id?: string;
          metric_code?: string;
          target?: number;
          starts_on?: string;
          ends_on?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "health_goals_metric_code_fkey";
            columns: ["metric_code"];
            isOneToOne: false;
            referencedRelation: "health_metrics";
            referencedColumns: ["code"];
          },
        ];
      };
      health_metrics: {
        Row: {
          code: string;
          unit: string;
          aggregation: string;
          minimum: number;
          maximum: number;
        };
        Insert: {
          code: string;
          unit: string;
          aggregation: string;
          minimum?: number;
          maximum: number;
        };
        Update: {
          code?: string;
          unit?: string;
          aggregation?: string;
          minimum?: number;
          maximum?: number;
        };
        Relationships: [];
      };
      health_observations: {
        Row: {
          id: string;
          owner_id: string;
          metric_code: string;
          value: number;
          observed_at: string;
          local_date: string;
          timezone: string;
          source: string;
          external_id: string | null;
          notes: string | null;
          created_at: string;
          revision: number;
          started_at: string | null;
          ended_at: string | null;
          quality: number | null;
          measurement_label: string | null;
        };
        Insert: {
          id?: string;
          owner_id: string;
          metric_code: string;
          value: number;
          observed_at: string;
          local_date: string;
          timezone: string;
          source?: string;
          external_id?: string | null;
          notes?: string | null;
          created_at?: string;
          revision?: number;
          started_at?: string | null;
          ended_at?: string | null;
          quality?: number | null;
          measurement_label?: string | null;
        };
        Update: {
          id?: string;
          owner_id?: string;
          metric_code?: string;
          value?: number;
          observed_at?: string;
          local_date?: string;
          timezone?: string;
          source?: string;
          external_id?: string | null;
          notes?: string | null;
          created_at?: string;
          revision?: number;
          started_at?: string | null;
          ended_at?: string | null;
          quality?: number | null;
          measurement_label?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "health_observations_metric_code_fkey";
            columns: ["metric_code"];
            isOneToOne: false;
            referencedRelation: "health_metrics";
            referencedColumns: ["code"];
          },
        ];
      };
      import_jobs: {
        Row: {
          id: string;
          owner_id: string;
          connection_id: string;
          status: string;
          idempotency_key: string;
          started_at: string | null;
          finished_at: string | null;
          error_code: string | null;
        };
        Insert: {
          id?: string;
          owner_id: string;
          connection_id: string;
          status?: string;
          idempotency_key: string;
          started_at?: string | null;
          finished_at?: string | null;
          error_code?: string | null;
        };
        Update: {
          id?: string;
          owner_id?: string;
          connection_id?: string;
          status?: string;
          idempotency_key?: string;
          started_at?: string | null;
          finished_at?: string | null;
          error_code?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "import_jobs_connection_id_owner_id_fkey";
            columns: ["connection_id", "owner_id"];
            isOneToOne: false;
            referencedRelation: "integration_connections";
            referencedColumns: ["id", "owner_id"];
          },
        ];
      };
      integration_connections: {
        Row: {
          id: string;
          owner_id: string;
          provider: string;
          external_account_id: string;
          status: string;
          last_synced_at: string | null;
        };
        Insert: {
          id?: string;
          owner_id: string;
          provider: string;
          external_account_id: string;
          status: string;
          last_synced_at?: string | null;
        };
        Update: {
          id?: string;
          owner_id?: string;
          provider?: string;
          external_account_id?: string;
          status?: string;
          last_synced_at?: string | null;
        };
        Relationships: [];
      };
      nutrition_entries: {
        Row: {
          id: string;
          owner_id: string;
          food_id: string | null;
          recipe_id: string | null;
          scheduled_activity_id: string | null;
          kind: string;
          logged_at: string;
          local_date: string;
          timezone: string;
          meal_slot: string;
          name_snapshot: string;
          quantity: number;
          unit_snapshot: string;
          grams_snapshot: number | null;
          kcal_snapshot: number | null;
          protein_snapshot: number | null;
          carbs_snapshot: number | null;
          fat_snapshot: number | null;
          source: string;
          external_id: string | null;
          verified_at: string | null;
          basis_snapshot: Json | null;
          nutrients_snapshot: Json;
          revision: number;
        };
        Insert: {
          id?: string;
          owner_id: string;
          food_id?: string | null;
          recipe_id?: string | null;
          scheduled_activity_id?: string | null;
          kind?: string;
          logged_at: string;
          local_date: string;
          timezone?: string;
          meal_slot: string;
          name_snapshot: string;
          quantity: number;
          unit_snapshot: string;
          grams_snapshot?: number | null;
          kcal_snapshot?: number | null;
          protein_snapshot?: number | null;
          carbs_snapshot?: number | null;
          fat_snapshot?: number | null;
          source?: string;
          external_id?: string | null;
          verified_at?: string | null;
          basis_snapshot?: Json | null;
          nutrients_snapshot?: Json;
          revision?: number;
        };
        Update: {
          id?: string;
          owner_id?: string;
          food_id?: string | null;
          recipe_id?: string | null;
          scheduled_activity_id?: string | null;
          kind?: string;
          logged_at?: string;
          local_date?: string;
          timezone?: string;
          meal_slot?: string;
          name_snapshot?: string;
          quantity?: number;
          unit_snapshot?: string;
          grams_snapshot?: number | null;
          kcal_snapshot?: number | null;
          protein_snapshot?: number | null;
          carbs_snapshot?: number | null;
          fat_snapshot?: number | null;
          source?: string;
          external_id?: string | null;
          verified_at?: string | null;
          basis_snapshot?: Json | null;
          nutrients_snapshot?: Json;
          revision?: number;
        };
        Relationships: [
          {
            foreignKeyName: "nutrition_entries_food_id_fkey";
            columns: ["food_id"];
            isOneToOne: false;
            referencedRelation: "foods";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "nutrition_entries_recipe_id_owner_id_fkey";
            columns: ["recipe_id", "owner_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id", "owner_id"];
          },
          {
            foreignKeyName: "nutrition_entries_scheduled_activity_id_owner_id_kind_fkey";
            columns: ["scheduled_activity_id", "owner_id", "kind"];
            isOneToOne: false;
            referencedRelation: "scheduled_activities";
            referencedColumns: ["id", "owner_id", "kind"];
          },
        ];
      };
      nutrition_goals: {
        Row: {
          id: string;
          owner_id: string;
          starts_on: string;
          ends_on: string | null;
          kcal: number;
          protein_g: number;
          carbs_g: number;
          fat_g: number;
        };
        Insert: {
          id?: string;
          owner_id: string;
          starts_on: string;
          ends_on?: string | null;
          kcal: number;
          protein_g: number;
          carbs_g: number;
          fat_g: number;
        };
        Update: {
          id?: string;
          owner_id?: string;
          starts_on?: string;
          ends_on?: string | null;
          kcal?: number;
          protein_g?: number;
          carbs_g?: number;
          fat_g?: number;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          display_name: string;
          timezone: string;
          unit_system: string;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          timezone?: string;
          unit_system?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          timezone?: string;
          unit_system?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      program_favorites: {
        Row: {
          owner_id: string;
          program_version_id: string;
          created_at: string;
        };
        Insert: {
          owner_id: string;
          program_version_id: string;
          created_at?: string;
        };
        Update: {
          owner_id?: string;
          program_version_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "program_favorites_program_version_id_fkey";
            columns: ["program_version_id"];
            isOneToOne: false;
            referencedRelation: "program_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      program_items: {
        Row: {
          id: string;
          owner_id: string;
          program_version_id: string;
          day_offset: number;
          position: number;
          kind: string;
          title: string;
          template_snapshot: Json;
          snapshot_format: number;
        };
        Insert: {
          id?: string;
          owner_id: string;
          program_version_id: string;
          day_offset: number;
          position: number;
          kind: string;
          title: string;
          template_snapshot: Json;
          snapshot_format?: number;
        };
        Update: {
          id?: string;
          owner_id?: string;
          program_version_id?: string;
          day_offset?: number;
          position?: number;
          kind?: string;
          title?: string;
          template_snapshot?: Json;
          snapshot_format?: number;
        };
        Relationships: [
          {
            foreignKeyName: "program_items_program_version_id_owner_id_fkey";
            columns: ["program_version_id", "owner_id"];
            isOneToOne: false;
            referencedRelation: "program_versions";
            referencedColumns: ["id", "owner_id"];
          },
        ];
      };
      program_versions: {
        Row: {
          id: string;
          owner_id: string;
          program_id: string;
          version: number;
          title_snapshot: string;
          description: string;
          visibility: string;
          published_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          program_id: string;
          version: number;
          title_snapshot: string;
          description?: string;
          visibility?: string;
          published_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          program_id?: string;
          version?: number;
          title_snapshot?: string;
          description?: string;
          visibility?: string;
          published_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "program_versions_program_id_owner_id_fkey";
            columns: ["program_id", "owner_id"];
            isOneToOne: false;
            referencedRelation: "programs";
            referencedColumns: ["id", "owner_id"];
          },
        ];
      };
      programs: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          kind: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title: string;
          kind: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          title?: string;
          kind?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      recipe_favorites: {
        Row: {
          owner_id: string;
          recipe_id: string;
          created_at: string;
        };
        Insert: {
          owner_id: string;
          recipe_id: string;
          created_at?: string;
        };
        Update: {
          owner_id?: string;
          recipe_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recipe_favorites_recipe_id_owner_id_fkey";
            columns: ["recipe_id", "owner_id"];
            isOneToOne: true;
            referencedRelation: "recipes";
            referencedColumns: ["id", "owner_id"];
          },
        ];
      };
      recipe_ingredients: {
        Row: {
          id: string;
          owner_id: string;
          recipe_id: string;
          food_id: string;
          grams: number;
          position: number;
        };
        Insert: {
          id?: string;
          owner_id: string;
          recipe_id: string;
          food_id: string;
          grams: number;
          position: number;
        };
        Update: {
          id?: string;
          owner_id?: string;
          recipe_id?: string;
          food_id?: string;
          grams?: number;
          position?: number;
        };
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_food_id_fkey";
            columns: ["food_id"];
            isOneToOne: false;
            referencedRelation: "foods";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_owner_id_fkey";
            columns: ["recipe_id", "owner_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id", "owner_id"];
          },
        ];
      };
      recipes: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          servings: number;
          instructions: string | null;
          source_version_id: string | null;
          archived_at: string | null;
          created_at: string;
          revision: number;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          servings: number;
          instructions?: string | null;
          source_version_id?: string | null;
          archived_at?: string | null;
          created_at?: string;
          revision?: number;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          servings?: number;
          instructions?: string | null;
          source_version_id?: string | null;
          archived_at?: string | null;
          created_at?: string;
          revision?: number;
        };
        Relationships: [
          {
            foreignKeyName: "recipes_source_version_id_fkey";
            columns: ["source_version_id"];
            isOneToOne: false;
            referencedRelation: "program_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      routine_exercises: {
        Row: {
          id: string;
          owner_id: string;
          routine_id: string;
          exercise_id: string;
          position: number;
          notes: string | null;
        };
        Insert: {
          id?: string;
          owner_id: string;
          routine_id: string;
          exercise_id: string;
          position: number;
          notes?: string | null;
        };
        Update: {
          id?: string;
          owner_id?: string;
          routine_id?: string;
          exercise_id?: string;
          position?: number;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "routine_exercises_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "routine_exercises_routine_id_owner_id_fkey";
            columns: ["routine_id", "owner_id"];
            isOneToOne: false;
            referencedRelation: "routines";
            referencedColumns: ["id", "owner_id"];
          },
        ];
      };
      routine_sets: {
        Row: {
          id: string;
          owner_id: string;
          routine_exercise_id: string;
          position: number;
          target_reps: number | null;
          target_weight_kg: number | null;
          target_rpe: number | null;
          target_rir: number | null;
          rest_seconds: number | null;
          set_type: string;
          notes: string | null;
        };
        Insert: {
          id?: string;
          owner_id: string;
          routine_exercise_id: string;
          position: number;
          target_reps?: number | null;
          target_weight_kg?: number | null;
          target_rpe?: number | null;
          target_rir?: number | null;
          rest_seconds?: number | null;
          set_type?: string;
          notes?: string | null;
        };
        Update: {
          id?: string;
          owner_id?: string;
          routine_exercise_id?: string;
          position?: number;
          target_reps?: number | null;
          target_weight_kg?: number | null;
          target_rpe?: number | null;
          target_rir?: number | null;
          rest_seconds?: number | null;
          set_type?: string;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "routine_sets_routine_exercise_id_owner_id_fkey";
            columns: ["routine_exercise_id", "owner_id"];
            isOneToOne: false;
            referencedRelation: "routine_exercises";
            referencedColumns: ["id", "owner_id"];
          },
        ];
      };
      routines: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          notes: string | null;
          source_version_id: string | null;
          archived_at: string | null;
          created_at: string;
          revision: number;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          notes?: string | null;
          source_version_id?: string | null;
          archived_at?: string | null;
          created_at?: string;
          revision?: number;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          notes?: string | null;
          source_version_id?: string | null;
          archived_at?: string | null;
          created_at?: string;
          revision?: number;
        };
        Relationships: [
          {
            foreignKeyName: "routines_source_version_id_fkey";
            columns: ["source_version_id"];
            isOneToOne: false;
            referencedRelation: "program_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      schedule_rules: {
        Row: {
          id: string;
          owner_id: string;
          kind: string;
          routine_id: string | null;
          recipe_id: string | null;
          timezone: string;
          starts_on: string;
          ends_on: string | null;
          recurrence_rule: string;
          weekdays: number[];
          local_time: string;
          occurrence_limit: number;
          retired_at: string | null;
        };
        Insert: {
          id?: string;
          owner_id: string;
          kind: string;
          routine_id?: string | null;
          recipe_id?: string | null;
          timezone: string;
          starts_on: string;
          ends_on?: string | null;
          recurrence_rule: string;
          weekdays?: number[];
          local_time?: string;
          occurrence_limit?: number;
          retired_at?: string | null;
        };
        Update: {
          id?: string;
          owner_id?: string;
          kind?: string;
          routine_id?: string | null;
          recipe_id?: string | null;
          timezone?: string;
          starts_on?: string;
          ends_on?: string | null;
          recurrence_rule?: string;
          weekdays?: number[];
          local_time?: string;
          occurrence_limit?: number;
          retired_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "schedule_rules_routine_id_owner_id_fkey";
            columns: ["routine_id", "owner_id"];
            isOneToOne: false;
            referencedRelation: "routines";
            referencedColumns: ["id", "owner_id"];
          },
          {
            foreignKeyName: "schedule_rules_recipe_id_owner_id_fkey";
            columns: ["recipe_id", "owner_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id", "owner_id"];
          },
        ];
      };
      scheduled_activities: {
        Row: {
          id: string;
          owner_id: string;
          kind: string;
          title: string;
          scheduled_at: string;
          timezone: string;
          status: string;
          routine_id: string | null;
          recipe_id: string | null;
          rule_id: string | null;
          occurrence_date: string | null;
          template_snapshot: Json;
          source_version_id: string | null;
          revision: number;
          is_exception: boolean;
          notes: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          kind: string;
          title: string;
          scheduled_at: string;
          timezone: string;
          status?: string;
          routine_id?: string | null;
          recipe_id?: string | null;
          rule_id?: string | null;
          occurrence_date?: string | null;
          template_snapshot: Json;
          source_version_id?: string | null;
          revision?: number;
          is_exception?: boolean;
          notes?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          kind?: string;
          title?: string;
          scheduled_at?: string;
          timezone?: string;
          status?: string;
          routine_id?: string | null;
          recipe_id?: string | null;
          rule_id?: string | null;
          occurrence_date?: string | null;
          template_snapshot?: Json;
          source_version_id?: string | null;
          revision?: number;
          is_exception?: boolean;
          notes?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scheduled_activities_source_version_id_fkey";
            columns: ["source_version_id"];
            isOneToOne: false;
            referencedRelation: "program_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scheduled_activities_routine_id_owner_id_fkey";
            columns: ["routine_id", "owner_id"];
            isOneToOne: false;
            referencedRelation: "routines";
            referencedColumns: ["id", "owner_id"];
          },
          {
            foreignKeyName: "scheduled_activities_recipe_id_owner_id_fkey";
            columns: ["recipe_id", "owner_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id", "owner_id"];
          },
          {
            foreignKeyName: "scheduled_activities_rule_id_owner_id_fkey";
            columns: ["rule_id", "owner_id"];
            isOneToOne: false;
            referencedRelation: "schedule_rules";
            referencedColumns: ["id", "owner_id"];
          },
        ];
      };
      session_exercises: {
        Row: {
          id: string;
          owner_id: string;
          session_id: string;
          exercise_id: string;
          name_snapshot: string;
          tracking_type_snapshot: string;
          position: number;
          notes: string | null;
        };
        Insert: {
          id?: string;
          owner_id: string;
          session_id: string;
          exercise_id: string;
          name_snapshot: string;
          tracking_type_snapshot: string;
          position: number;
          notes?: string | null;
        };
        Update: {
          id?: string;
          owner_id?: string;
          session_id?: string;
          exercise_id?: string;
          name_snapshot?: string;
          tracking_type_snapshot?: string;
          position?: number;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "session_exercises_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "session_exercises_session_id_owner_id_fkey";
            columns: ["session_id", "owner_id"];
            isOneToOne: false;
            referencedRelation: "workout_sessions";
            referencedColumns: ["id", "owner_id"];
          },
        ];
      };
      workout_sessions: {
        Row: {
          id: string;
          owner_id: string;
          routine_id: string | null;
          scheduled_activity_id: string | null;
          kind: string;
          title_snapshot: string;
          started_at: string;
          timezone: string;
          completed_at: string | null;
          notes: string | null;
          source: string;
          external_id: string | null;
          revision: number;
        };
        Insert: {
          id?: string;
          owner_id: string;
          routine_id?: string | null;
          scheduled_activity_id?: string | null;
          kind?: string;
          title_snapshot: string;
          started_at: string;
          timezone?: string;
          completed_at?: string | null;
          notes?: string | null;
          source?: string;
          external_id?: string | null;
          revision?: number;
        };
        Update: {
          id?: string;
          owner_id?: string;
          routine_id?: string | null;
          scheduled_activity_id?: string | null;
          kind?: string;
          title_snapshot?: string;
          started_at?: string;
          timezone?: string;
          completed_at?: string | null;
          notes?: string | null;
          source?: string;
          external_id?: string | null;
          revision?: number;
        };
        Relationships: [
          {
            foreignKeyName: "workout_sessions_routine_id_owner_id_fkey";
            columns: ["routine_id", "owner_id"];
            isOneToOne: false;
            referencedRelation: "routines";
            referencedColumns: ["id", "owner_id"];
          },
          {
            foreignKeyName: "workout_sessions_scheduled_activity_id_owner_id_kind_fkey";
            columns: ["scheduled_activity_id", "owner_id", "kind"];
            isOneToOne: true;
            referencedRelation: "scheduled_activities";
            referencedColumns: ["id", "owner_id", "kind"];
          },
        ];
      };
      workout_sets: {
        Row: {
          id: string;
          owner_id: string;
          session_exercise_id: string;
          position: number;
          set_type: string;
          reps: number | null;
          weight_kg: number | null;
          duration_seconds: number | null;
          distance_m: number | null;
          rpe: number | null;
          rir: number | null;
          completed_at: string | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          owner_id: string;
          session_exercise_id: string;
          position: number;
          set_type?: string;
          reps?: number | null;
          weight_kg?: number | null;
          duration_seconds?: number | null;
          distance_m?: number | null;
          rpe?: number | null;
          rir?: number | null;
          completed_at?: string | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          owner_id?: string;
          session_exercise_id?: string;
          position?: number;
          set_type?: string;
          reps?: number | null;
          weight_kg?: number | null;
          duration_seconds?: number | null;
          distance_m?: number | null;
          rpe?: number | null;
          rir?: number | null;
          completed_at?: string | null;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "workout_sets_session_exercise_id_owner_id_fkey";
            columns: ["session_exercise_id", "owner_id"];
            isOneToOne: false;
            referencedRelation: "session_exercises";
            referencedColumns: ["id", "owner_id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      save_strength_routine: { Args: { p_document: Json }; Returns: Json };
      save_strength_workout: { Args: { p_document: Json }; Returns: Json };
      delete_strength_workout: {
        Args: { p_id: string; p_revision: number };
        Returns: undefined;
      };
      recipe_nutrition_basis: { Args: { p_id: string }; Returns: Json };
      save_nutrition_recipe: { Args: { p_document: Json }; Returns: Json };
      save_nutrition_entry: { Args: { p_document: Json }; Returns: Json };
      set_nutrition_goal: {
        Args: {
          p_date: string;
          p_kcal: number;
          p_protein: number;
          p_carbs: number;
          p_fat: number;
        };
        Returns: undefined;
      };
      retire_schedule: { Args: { p_rule: string }; Returns: undefined };
      set_health_goal: {
        Args: { p_metric: string; p_date: string; p_target: number };
        Returns: undefined;
      };
      schedule_template: {
        Args: { p_kind: string; p_id: string };
        Returns: Json;
      };
      create_schedule: { Args: { p_document: Json }; Returns: string };
      edit_schedule: {
        Args: {
          p_id: string;
          p_revision: number;
          p_date: string;
          p_time: string;
          p_status: string;
          p_title: string;
          p_notes: string;
          p_future: boolean;
        };
        Returns: undefined;
      };
      start_scheduled_workout: { Args: { p_id: string }; Returns: Json };
      consume_scheduled_meal: {
        Args: {
          p_id: string;
          p_entry: string;
          p_quantity: number;
          p_date: string;
        };
        Returns: string;
      };
      start_scheduled_workout_at: {
        Args: { p_id: string; p_started_at: string };
        Returns: Json;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
