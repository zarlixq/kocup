export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      coaches: {
        Row: {
          created_at: string | null
          full_name: string
          id: string
          phone: string | null
        }
        Insert: {
          created_at?: string | null
          full_name: string
          id: string
          phone?: string | null
        }
        Update: {
          created_at?: string | null
          full_name?: string
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      packages: {
        Row: {
          created_at: string | null
          end_date: string | null
          id: string
          monthly_price: number
          name: string
          notes: string | null
          payment_day: number | null
          start_date: string
          status: string | null
          student_id: string
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          monthly_price: number
          name: string
          notes?: string | null
          payment_day?: number | null
          start_date: string
          status?: string | null
          student_id: string
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          monthly_price?: number
          name?: string
          notes?: string | null
          payment_day?: number | null
          start_date?: string
          status?: string | null
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
          created_at: string | null
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
          created_at?: string | null
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
          created_at?: string | null
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
      students: {
        Row: {
          coach_id: string
          created_at: string | null
          full_name: string
          grade: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          parent_name: string | null
          parent_phone: string | null
          phone: string | null
          school: string | null
        }
        Insert: {
          coach_id: string
          created_at?: string | null
          full_name: string
          grade?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          parent_name?: string | null
          parent_phone?: string | null
          phone?: string | null
          school?: string | null
        }
        Update: {
          coach_id?: string
          created_at?: string | null
          full_name?: string
          grade?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          parent_name?: string | null
          parent_phone?: string | null
          phone?: string | null
          school?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
