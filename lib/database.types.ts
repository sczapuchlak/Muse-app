
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "checkin_emotions": {
                  Row: {
                    "checkin_id": string,"emotion_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "checkin_id": string,"emotion_id": string,"user_id"?: string
                  }
                  Update: {
                    "checkin_id"?: string,"emotion_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "checkin_emotions_emotion_id_fkey"
      columns: ["emotion_id"]
isOneToOne: false
      referencedRelation: "emotion_catalog"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "checkin_emotions_user_id_checkin_id_fkey"
      columns: ["user_id","checkin_id"]
isOneToOne: false
      referencedRelation: "mood_checkins"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"checkin_influences": {
                  Row: {
                    "checkin_id": string,"influence_id": string,"position": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "checkin_id": string,"influence_id": string,"position": number,"user_id"?: string
                  }
                  Update: {
                    "checkin_id"?: string,"influence_id"?: string,"position"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "checkin_influences_user_id_checkin_id_fkey"
      columns: ["user_id","checkin_id"]
isOneToOne: false
      referencedRelation: "mood_checkins"
      referencedColumns: ["user_id","id"]
    },{
      foreignKeyName: "checkin_influences_user_id_influence_id_fkey"
      columns: ["user_id","influence_id"]
isOneToOne: false
      referencedRelation: "influence_tags"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"daily_priorities": {
                  Row: {
                    "completed_at": string | null,"created_at": string,"daily_record_id": string,"id": string,"position": number,"revision": number,"standalone_complete": boolean,"text": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_at"?: string | null,"created_at"?: string,"daily_record_id": string,"id"?: string,"position": number,"revision"?: number,"standalone_complete"?: boolean,"text": string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "completed_at"?: string | null,"created_at"?: string,"daily_record_id"?: string,"id"?: string,"position"?: number,"revision"?: number,"standalone_complete"?: boolean,"text"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "daily_priorities_user_id_daily_record_id_fkey"
      columns: ["user_id","daily_record_id"]
isOneToOne: false
      referencedRelation: "daily_records"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"daily_records": {
                  Row: {
                    "created_at": string,"day_in_three": (string)[],"energy": number | null,"id": string,"intention_emoji": string | null,"intention_text": string | null,"local_date": string,"overall_day": number | null,"revision": number,"stress": number | null,"time_zone": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"day_in_three"?: (string)[],"energy"?: number | null,"id"?: string,"intention_emoji"?: string | null,"intention_text"?: string | null,"local_date": string,"overall_day"?: number | null,"revision"?: number,"stress"?: number | null,"time_zone": string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"day_in_three"?: (string)[],"energy"?: number | null,"id"?: string,"intention_emoji"?: string | null,"intention_text"?: string | null,"local_date"?: string,"overall_day"?: number | null,"revision"?: number,"stress"?: number | null,"time_zone"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"emotion_catalog": {
                  Row: {
                    "definition": string | null,"emoji": string,"energy": string | null,"id": string,"name": string,"pleasantness": string | null,"quadrant": string
                  }
                  ComputedFields: never
                  Insert: {
                    "definition"?: string | null,"emoji": string,"energy"?: never,"id": string,"name": string,"pleasantness"?: never,"quadrant": string
                  }
                  Update: {
                    "definition"?: string | null,"emoji"?: string,"energy"?: never,"id"?: string,"name"?: string,"pleasantness"?: never,"quadrant"?: string
                  }
                  Relationships: [
                    
                  ]
                },"emotion_favorites": {
                  Row: {
                    "emotion_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "emotion_id": string,"user_id"?: string
                  }
                  Update: {
                    "emotion_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "emotion_favorites_emotion_id_fkey"
      columns: ["emotion_id"]
isOneToOne: false
      referencedRelation: "emotion_catalog"
      referencedColumns: ["id"]
    }
                  ]
                },"influence_tags": {
                  Row: {
                    "archived_at": string | null,"created_at": string,"id": string,"label": string,"revision": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at"?: string | null,"created_at"?: string,"id"?: string,"label": string,"revision"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "archived_at"?: string | null,"created_at"?: string,"id"?: string,"label"?: string,"revision"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"mood_checkins": {
                  Row: {
                    "captured_time_zone": string,"created_at": string,"daily_record_id": string,"id": string,"period": string,"reflection": string | null,"revision": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "captured_time_zone": string,"created_at"?: string,"daily_record_id": string,"id"?: string,"period": string,"reflection"?: string | null,"revision"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "captured_time_zone"?: string,"created_at"?: string,"daily_record_id"?: string,"id"?: string,"period"?: string,"reflection"?: string | null,"revision"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "mood_checkins_user_id_daily_record_id_fkey"
      columns: ["user_id","daily_record_id"]
isOneToOne: false
      referencedRelation: "daily_records"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"first_name": string,"id": string,"revision": number,"time_zone": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"first_name"?: string,"id": string,"revision"?: number,"time_zone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"first_name"?: string,"id"?: string,"revision"?: number,"time_zone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "delete_mood_checkin":
{ Args: { "p_expected_revision": number,"p_id": string }; Returns: undefined
                           },
"ensure_daily_record":
{ Args: { "p_date": string }; Returns: {
              "created_at": string,
"day_in_three": (string)[],
"energy": number | null,
"id": string,
"intention_emoji": string | null,
"intention_text": string | null,
"local_date": string,
"overall_day": number | null,
"revision": number,
"stress": number | null,
"time_zone": string,
"updated_at": string,
"user_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "daily_records"
        isOneToOne: true
        isSetofReturn: false
      } },
"save_daily_priorities":
{ Args: { "p_date": string,"p_expected": Json,"p_items": Json }; Returns: {
              "completed_at": string | null,
"created_at": string,
"daily_record_id": string,
"id": string,
"position": number,
"revision": number,
"standalone_complete": boolean,
"text": string,
"updated_at": string,
"user_id": string
            }[]
                          SetofOptions: {
        from: "*"
        to: "daily_priorities"
        isOneToOne: false
        isSetofReturn: true
      } },
"save_daily_record":
{ Args: { "p_date": string,"p_expected_revision": number,"p_patch": Json }; Returns: {
              "created_at": string,
"day_in_three": (string)[],
"energy": number | null,
"id": string,
"intention_emoji": string | null,
"intention_text": string | null,
"local_date": string,
"overall_day": number | null,
"revision": number,
"stress": number | null,
"time_zone": string,
"updated_at": string,
"user_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "daily_records"
        isOneToOne: true
        isSetofReturn: false
      } },
"save_mood_checkin":
{ Args: { "p_date": string,"p_emotion_ids": (string)[],"p_expected_revision"?: number,"p_influence_ids": (string)[],"p_period": string,"p_reflection": string }; Returns: {
              "captured_time_zone": string,
"created_at": string,
"daily_record_id": string,
"id": string,
"period": string,
"reflection": string | null,
"revision": number,
"updated_at": string,
"user_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "mood_checkins"
        isOneToOne: true
        isSetofReturn: false
      } }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const
