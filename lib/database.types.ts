export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          approved_student_id: string | null
          created_at: string | null
          email: string
          full_name: string
          grade: string
          id: string
          parent_name: string
          parent_phone: string
          phone: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          target_department: string | null
          target_ranking: number | null
          target_university: string | null
        }
        Insert: {
          approved_student_id?: string | null
          created_at?: string | null
          email: string
          full_name: string
          grade: string
          id?: string
          parent_name: string
          parent_phone: string
          phone: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_department?: string | null
          target_ranking?: number | null
          target_university?: string | null
        }
        Update: {
          approved_student_id?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          grade?: string
          id?: string
          parent_name?: string
          parent_phone?: string
          phone?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_department?: string | null
          target_ranking?: number | null
          target_university?: string | null
        }
        Relationships: []
      }
      blog_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string
          category_id: string | null
          content: string
          cover_image_url: string | null
          created_at: string
          excerpt: string
          id: string
          meta_description: string | null
          meta_keywords: string[] | null
          meta_title: string | null
          published_at: string | null
          slug: string
          status: Database["public"]["Enums"]["blog_post_status"]
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          author_id: string
          category_id?: string | null
          content: string
          cover_image_url?: string | null
          created_at?: string
          excerpt: string
          id?: string
          meta_description?: string | null
          meta_keywords?: string[] | null
          meta_title?: string | null
          published_at?: string | null
          slug: string
          status?: Database["public"]["Enums"]["blog_post_status"]
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_id?: string
          category_id?: string | null
          content?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string
          id?: string
          meta_description?: string | null
          meta_keywords?: string[] | null
          meta_title?: string | null
          published_at?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["blog_post_status"]
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_results: {
        Row: {
          correct: number
          empty: number
          exam_id: string
          id: string
          net: number | null
          subject_id: string
          wrong: number
        }
        Insert: {
          correct: number
          empty: number
          exam_id: string
          id?: string
          net?: number | null
          subject_id: string
          wrong: number
        }
        Update: {
          correct?: number
          empty?: number
          exam_id?: string
          id?: string
          net?: number | null
          subject_id?: string
          wrong?: number
        }
        Relationships: [
          {
            foreignKeyName: "exam_results_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_results_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          created_at: string | null
          created_by: string
          date: string
          exam_type: string
          id: string
          name: string
          student_id: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          date: string
          exam_type: string
          id?: string
          name: string
          student_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          date?: string
          exam_type?: string
          id?: string
          name?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          monthly_price: number
          name: string
          notes: string | null
          payment_day: number
          start_date: string
          status: string
          student_id: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          monthly_price: number
          name: string
          notes?: string | null
          payment_day?: number
          start_date: string
          status?: string
          student_id: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          monthly_price?: number
          name?: string
          notes?: string | null
          payment_day?: number
          start_date?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "packages_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string | null
          notes: string | null
          package_id: string
          payment_date: string
          period_month: string
          student_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method?: string | null
          notes?: string | null
          package_id: string
          payment_date: string
          period_month: string
          student_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string | null
          notes?: string | null
          package_id?: string
          payment_date?: string
          period_month?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          certificate_info: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          phone: string | null
          role: string
          specialties: string[] | null
          years_experience: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          certificate_info?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id: string
          phone?: string | null
          role: string
          specialties?: string[] | null
          years_experience?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          certificate_info?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          role?: string
          specialties?: string[] | null
          years_experience?: number | null
        }
        Relationships: []
      }
      schedule: {
        Row: {
          created_at: string | null
          custom_title: string | null
          day_of_week: number
          end_time: string
          id: string
          notes: string | null
          start_time: string
          student_id: string
          subject_id: string | null
          term: number
        }
        Insert: {
          created_at?: string | null
          custom_title?: string | null
          day_of_week: number
          end_time: string
          id?: string
          notes?: string | null
          start_time: string
          student_id: string
          subject_id?: string | null
          term: number
        }
        Update: {
          created_at?: string | null
          custom_title?: string | null
          day_of_week?: number
          end_time?: string
          id?: string
          notes?: string | null
          start_time?: string
          student_id?: string
          subject_id?: string | null
          term?: number
        }
        Relationships: [
          {
            foreignKeyName: "schedule_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      student_topics: {
        Row: {
          created_at: string | null
          custom_name: string | null
          custom_subject_id: string | null
          id: string
          notes: string | null
          status: string
          student_id: string
          topic_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          custom_name?: string | null
          custom_subject_id?: string | null
          id?: string
          notes?: string | null
          status?: string
          student_id: string
          topic_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          custom_name?: string | null
          custom_subject_id?: string | null
          id?: string
          notes?: string | null
          status?: string
          student_id?: string
          topic_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_topics_custom_subject_id_fkey"
            columns: ["custom_subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_topics_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_topics_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          coach_id: string | null
          created_at: string | null
          grade: string | null
          id: string
          is_active: boolean
          kayit_kaynagi: string
          notes: string | null
          parent_name: string | null
          parent_phone: string | null
          school: string | null
          target_department: string | null
          target_ranking: number | null
          target_university: string | null
        }
        Insert: {
          coach_id?: string | null
          created_at?: string | null
          grade?: string | null
          id: string
          is_active?: boolean
          kayit_kaynagi?: string
          notes?: string | null
          parent_name?: string | null
          parent_phone?: string | null
          school?: string | null
          target_department?: string | null
          target_ranking?: number | null
          target_university?: string | null
        }
        Update: {
          coach_id?: string | null
          created_at?: string | null
          grade?: string | null
          id?: string
          is_active?: boolean
          kayit_kaynagi?: string
          notes?: string | null
          parent_name?: string | null
          parent_phone?: string | null
          school?: string | null
          target_department?: string | null
          target_ranking?: number | null
          target_university?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_coach_id_fkey1"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_sessions: {
        Row: {
          correct: number
          created_at: string | null
          created_by: string
          date: string
          duration_minutes: number | null
          empty: number
          id: string
          student_id: string
          subject_id: string
          total_questions: number
          wrong: number
        }
        Insert: {
          correct: number
          created_at?: string | null
          created_by: string
          date: string
          duration_minutes?: number | null
          empty: number
          id?: string
          student_id: string
          subject_id: string
          total_questions: number
          wrong: number
        }
        Update: {
          correct?: number
          created_at?: string | null
          created_by?: string
          date?: string
          duration_minutes?: number | null
          empty?: number
          id?: string
          student_id?: string
          subject_id?: string
          total_questions?: number
          wrong?: number
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          color: string
          created_at: string | null
          exam_type: string
          id: string
          name: string
          order: number
        }
        Insert: {
          color: string
          created_at?: string | null
          exam_type: string
          id?: string
          name: string
          order: number
        }
        Update: {
          color?: string
          created_at?: string | null
          exam_type?: string
          id?: string
          name?: string
          order?: number
        }
        Relationships: []
      }
      topics: {
        Row: {
          created_at: string | null
          id: string
          name: string
          order: number
          subject_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          order: number
          subject_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          order?: number
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_role: { Args: never; Returns: string }
      exam_belongs_to_visible_student: {
        Args: { p_exam_id: string }
        Returns: boolean
      }
      increment_blog_post_view: { Args: { p_slug: string }; Returns: undefined }
      is_coach_of: { Args: { student_id: string }; Returns: boolean }
    }
    Enums: {
      blog_post_status: "draft" | "published" | "archived"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      blog_post_status: ["draft", "published", "archived"],
    },
  },
} as const
