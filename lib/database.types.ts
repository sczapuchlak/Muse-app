
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
                    "completed_at": string | null,"completion_origin": string,"created_at": string,"daily_record_id": string,"id": string,"legacy_backfilled_at": string | null,"legacy_complete": boolean | null,"linked_at": string | null,"materialized_at": string | null,"materialized_task_id": string | null,"position": number,"revision": number,"standalone_complete": boolean | null,"task_id": string | null,"text": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_at"?: string | null,"completion_origin"?: string,"created_at"?: string,"daily_record_id": string,"id"?: string,"legacy_backfilled_at"?: string | null,"legacy_complete"?: boolean | null,"linked_at"?: string | null,"materialized_at"?: string | null,"materialized_task_id"?: string | null,"position": number,"revision"?: number,"standalone_complete"?: boolean | null,"task_id"?: string | null,"text": string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "completed_at"?: string | null,"completion_origin"?: string,"created_at"?: string,"daily_record_id"?: string,"id"?: string,"legacy_backfilled_at"?: string | null,"legacy_complete"?: boolean | null,"linked_at"?: string | null,"materialized_at"?: string | null,"materialized_task_id"?: string | null,"position"?: number,"revision"?: number,"standalone_complete"?: boolean | null,"task_id"?: string | null,"text"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "daily_priorities_user_id_daily_record_id_fkey"
      columns: ["user_id","daily_record_id"]
isOneToOne: false
      referencedRelation: "daily_records"
      referencedColumns: ["user_id","id"]
    },{
      foreignKeyName: "daily_priorities_user_id_materialized_task_id_fkey"
      columns: ["user_id","materialized_task_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["user_id","id"]
    },{
      foreignKeyName: "daily_priorities_user_id_task_id_fkey"
      columns: ["user_id","task_id"]
isOneToOne: false
      referencedRelation: "tasks"
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
                },"grocery_items": {
                  Row: {
                    "complete": boolean,"created_at": string,"id": string,"name": string,"note": string | null,"position": number,"quantity": string | null,"section_id": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "complete": boolean,"created_at"?: string,"id": string,"name": string,"note"?: string | null,"position": number,"quantity"?: string | null,"section_id": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "complete"?: boolean,"created_at"?: string,"id"?: string,"name"?: string,"note"?: string | null,"position"?: number,"quantity"?: string | null,"section_id"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "grocery_items_user_id_section_id_fkey"
      columns: ["user_id","section_id"]
isOneToOne: false
      referencedRelation: "grocery_sections"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"grocery_sections": {
                  Row: {
                    "id": string,"name": string,"position": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id": string,"name": string,"position": number,"user_id": string
                  }
                  Update: {
                    "id"?: string,"name"?: string,"position"?: number,"user_id"?: string
                  }
                  Relationships: [

                  ]
                },"hydration_days": {
                  Row: {
                    "captured_time_zone": string,"created_at": string,"goal": number,"local_date": string,"quantity": number,"unit": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "captured_time_zone": string,"created_at"?: string,"goal": number,"local_date": string,"quantity": number,"unit": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "captured_time_zone"?: string,"created_at"?: string,"goal"?: number,"local_date"?: string,"quantity"?: number,"unit"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [

                  ]
                },"hydration_settings": {
                  Row: {
                    "goal": number,"quick_adds": (number)[],"unit": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "goal": number,"quick_adds": (number)[],"unit": string,"user_id": string
                  }
                  Update: {
                    "goal"?: number,"quick_adds"?: (number)[],"unit"?: string,"user_id"?: string
                  }
                  Relationships: [

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
                },"meal_assignments": {
                  Row: {
                    "captured_time_zone": string,"created_at": string,"id": string,"local_date": string,"note": string | null,"nutrition": Json | null,"position": number,"saved_meal_id": string | null,"slot": string,"title": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "captured_time_zone": string,"created_at"?: string,"id": string,"local_date": string,"note"?: string | null,"nutrition"?: Json | null,"position": number,"saved_meal_id"?: string | null,"slot": string,"title": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "captured_time_zone"?: string,"created_at"?: string,"id"?: string,"local_date"?: string,"note"?: string | null,"nutrition"?: Json | null,"position"?: number,"saved_meal_id"?: string | null,"slot"?: string,"title"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "meal_assignments_user_id_saved_meal_id_fkey"
      columns: ["user_id","saved_meal_id"]
isOneToOne: false
      referencedRelation: "saved_meals"
      referencedColumns: ["user_id","id"]
    }
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
                },"movement_day_types": {
                  Row: {
                    "local_date": string,"type_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "local_date": string,"type_id": string,"user_id": string
                  }
                  Update: {
                    "local_date"?: string,"type_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "movement_day_types_user_id_local_date_fkey"
      columns: ["user_id","local_date"]
isOneToOne: false
      referencedRelation: "movement_days"
      referencedColumns: ["user_id","local_date"]
    },{
      foreignKeyName: "movement_day_types_user_id_type_id_fkey"
      columns: ["user_id","type_id"]
isOneToOne: false
      referencedRelation: "movement_types"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"movement_days": {
                  Row: {
                    "captured_time_zone": string,"local_date": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "captured_time_zone": string,"local_date": string,"user_id": string
                  }
                  Update: {
                    "captured_time_zone"?: string,"local_date"?: string,"user_id"?: string
                  }
                  Relationships: [

                  ]
                },"movement_preferences": {
                  Row: {
                    "quick_ids": (string)[],"recent_ids": (string)[],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "quick_ids": (string)[],"recent_ids": (string)[],"user_id": string
                  }
                  Update: {
                    "quick_ids"?: (string)[],"recent_ids"?: (string)[],"user_id"?: string
                  }
                  Relationships: [

                  ]
                },"movement_records": {
                  Row: {
                    "captured_time_zone": string,"created_at": string,"id": string,"local_date": string,"type_id": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "captured_time_zone": string,"created_at"?: string,"id": string,"local_date": string,"type_id": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "captured_time_zone"?: string,"created_at"?: string,"id"?: string,"local_date"?: string,"type_id"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "movement_records_user_id_type_id_fkey"
      columns: ["user_id","type_id"]
isOneToOne: false
      referencedRelation: "movement_types"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"movement_types": {
                  Row: {
                    "archived": boolean,"id": string,"label": string,"origin": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "archived"?: boolean,"id": string,"label": string,"origin": string,"user_id": string
                  }
                  Update: {
                    "archived"?: boolean,"id"?: string,"label"?: string,"origin"?: string,"user_id"?: string
                  }
                  Relationships: [

                  ]
                },"note_tag_links": {
                  Row: {
                    "note_id": string,"tag_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "note_id": string,"tag_id": string,"user_id"?: string
                  }
                  Update: {
                    "note_id"?: string,"tag_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "note_tag_links_user_id_note_id_fkey"
      columns: ["user_id","note_id"]
isOneToOne: false
      referencedRelation: "notes"
      referencedColumns: ["user_id","id"]
    },{
      foreignKeyName: "note_tag_links_user_id_tag_id_fkey"
      columns: ["user_id","tag_id"]
isOneToOne: false
      referencedRelation: "note_tags"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"note_tags": {
                  Row: {
                    "icon": string,"id": string,"parent_id": string | null,"path": string,"pinned": boolean,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "icon": string,"id": string,"parent_id"?: string | null,"path": string,"pinned": boolean,"user_id"?: string
                  }
                  Update: {
                    "icon"?: string,"id"?: string,"parent_id"?: string | null,"path"?: string,"pinned"?: boolean,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "note_tags_user_id_parent_id_fkey"
      columns: ["user_id","parent_id"]
isOneToOne: false
      referencedRelation: "note_tags"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"notes": {
                  Row: {
                    "created_at": string,"document": NonNullable<Json>,"id": string,"pinned": boolean,"plain_text": string,"revision": number,"search_vector": unknown,"status": string,"title": string,"trashed_at": string | null,"trashed_from": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"document": NonNullable<Json>,"id": string,"pinned": boolean,"plain_text": string,"revision"?: number,"search_vector"?: never,"status": string,"title": string,"trashed_at"?: string | null,"trashed_from"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"document"?: NonNullable<Json>,"id"?: string,"pinned"?: boolean,"plain_text"?: string,"revision"?: number,"search_vector"?: never,"status"?: string,"title"?: string,"trashed_at"?: string | null,"trashed_from"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [

                  ]
                },"notes_commands": {
                  Row: {
                    "id": string,"request_hash": string,"revision": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id": string,"request_hash": string,"revision": number,"user_id": string
                  }
                  Update: {
                    "id"?: string,"request_hash"?: string,"revision"?: number,"user_id"?: string
                  }
                  Relationships: [

                  ]
                },"notes_versions": {
                  Row: {
                    "revision": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "revision"?: number,"user_id": string
                  }
                  Update: {
                    "revision"?: number,"user_id"?: string
                  }
                  Relationships: [

                  ]
                },"planner_commands": {
                  Row: {
                    "id": string,"request_hash": string,"revision": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id": string,"request_hash": string,"revision": number,"user_id": string
                  }
                  Update: {
                    "id"?: string,"request_hash"?: string,"revision"?: number,"user_id"?: string
                  }
                  Relationships: [

                  ]
                },"planner_events": {
                  Row: {
                    "created_at": string,"detail": string | null,"id": string,"local_date": string,"local_time": string,"revision": number,"time_zone": string,"title": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"detail"?: string | null,"id": string,"local_date": string,"local_time": string,"revision"?: number,"time_zone": string,"title": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"detail"?: string | null,"id"?: string,"local_date"?: string,"local_time"?: string,"revision"?: number,"time_zone"?: string,"title"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [

                  ]
                },"planner_versions": {
                  Row: {
                    "revision": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "revision"?: number,"user_id": string
                  }
                  Update: {
                    "revision"?: number,"user_id"?: string
                  }
                  Relationships: [

                  ]
                },"preference_commands": {
                  Row: {
                    "id": string,"request_hash": string,"revision": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id": string,"request_hash": string,"revision": number,"user_id": string
                  }
                  Update: {
                    "id"?: string,"request_hash"?: string,"revision"?: number,"user_id"?: string
                  }
                  Relationships: [

                  ]
                },"priority_commands": {
                  Row: {
                    "id": string,"operation": string,"planner_revision": number | null,"priority_versions": Json | null,"request_hash": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id": string,"operation": string,"planner_revision"?: number | null,"priority_versions"?: Json | null,"request_hash": string,"user_id": string
                  }
                  Update: {
                    "id"?: string,"operation"?: string,"planner_revision"?: number | null,"priority_versions"?: Json | null,"request_hash"?: string,"user_id"?: string
                  }
                  Relationships: [

                  ]
                },"profiles": {
                  Row: {
                    "cosmic_enabled": boolean,"created_at": string,"first_name": string,"id": string,"revision": number,"time_zone": string,"time_zone_confirmed_at": string | null,"updated_at": string,"zodiac_sign": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "cosmic_enabled"?: boolean,"created_at"?: string,"first_name"?: string,"id": string,"revision"?: number,"time_zone"?: string,"time_zone_confirmed_at"?: string | null,"updated_at"?: string,"zodiac_sign"?: string | null
                  }
                  Update: {
                    "cosmic_enabled"?: boolean,"created_at"?: string,"first_name"?: string,"id"?: string,"revision"?: number,"time_zone"?: string,"time_zone_confirmed_at"?: string | null,"updated_at"?: string,"zodiac_sign"?: string | null
                  }
                  Relationships: [

                  ]
                },"saved_meals": {
                  Row: {
                    "created_at": string,"id": string,"link": string | null,"meal_types": (string)[],"name": string,"note": string | null,"nutrition": Json | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id": string,"link"?: string | null,"meal_types": (string)[],"name": string,"note"?: string | null,"nutrition"?: Json | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"link"?: string | null,"meal_types"?: (string)[],"name"?: string,"note"?: string | null,"nutrition"?: Json | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [

                  ]
                },"task_completion_events": {
                  Row: {
                    "complete": boolean,"id": string,"local_date": string,"occurred_at": string,"planned_date": string | null,"task_id": string,"time_zone": string,"title": string,"user_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "complete": boolean,"id"?: string,"local_date": string,"occurred_at": string,"planned_date"?: string | null,"task_id": string,"time_zone": string,"title": string,"user_id": string,"workspace_id": string
                  }
                  Update: {
                    "complete"?: boolean,"id"?: string,"local_date"?: string,"occurred_at"?: string,"planned_date"?: string | null,"task_id"?: string,"time_zone"?: string,"title"?: string,"user_id"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "task_completion_events_user_id_task_id_fkey"
      columns: ["user_id","task_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"task_groups": {
                  Row: {
                    "accent": string | null,"archived_at": string | null,"created_at": string,"icon_id": string | null,"id": string,"name": string,"revision": number,"updated_at": string,"user_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accent"?: string | null,"archived_at"?: string | null,"created_at"?: string,"icon_id"?: string | null,"id": string,"name": string,"revision"?: number,"updated_at"?: string,"user_id": string,"workspace_id": string
                  }
                  Update: {
                    "accent"?: string | null,"archived_at"?: string | null,"created_at"?: string,"icon_id"?: string | null,"id"?: string,"name"?: string,"revision"?: number,"updated_at"?: string,"user_id"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "task_groups_user_id_workspace_id_fkey"
      columns: ["user_id","workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"task_subtasks": {
                  Row: {
                    "complete": boolean,"id": string,"position": number,"task_id": string,"title": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "complete"?: boolean,"id": string,"position": number,"task_id": string,"title": string,"user_id": string
                  }
                  Update: {
                    "complete"?: boolean,"id"?: string,"position"?: number,"task_id"?: string,"title"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "task_subtasks_user_id_task_id_fkey"
      columns: ["user_id","task_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"task_tag_links": {
                  Row: {
                    "tag_id": string,"task_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "tag_id": string,"task_id": string,"user_id": string
                  }
                  Update: {
                    "tag_id"?: string,"task_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "task_tag_links_user_id_tag_id_fkey"
      columns: ["user_id","tag_id"]
isOneToOne: false
      referencedRelation: "task_tags"
      referencedColumns: ["user_id","id"]
    },{
      foreignKeyName: "task_tag_links_user_id_task_id_fkey"
      columns: ["user_id","task_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"task_tags": {
                  Row: {
                    "accent": string,"archived_at": string | null,"created_at": string,"icon_id": string | null,"id": string,"name": string,"revision": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accent": string,"archived_at"?: string | null,"created_at"?: string,"icon_id"?: string | null,"id": string,"name": string,"revision"?: number,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "accent"?: string,"archived_at"?: string | null,"created_at"?: string,"icon_id"?: string | null,"id"?: string,"name"?: string,"revision"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [

                  ]
                },"task_time_sessions": {
                  Row: {
                    "ended_at": string | null,"id": string,"started_at": string,"task_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ended_at"?: string | null,"id"?: string,"started_at": string,"task_id": string,"user_id": string
                  }
                  Update: {
                    "ended_at"?: string | null,"id"?: string,"started_at"?: string,"task_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "task_time_sessions_user_id_task_id_fkey"
      columns: ["user_id","task_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"tasks": {
                  Row: {
                    "actual_minutes_baseline": number,"captured_time_zone": string,"complete": boolean,"completed_at": string | null,"created_at": string,"deleted_at": string | null,"detail": string | null,"due_date": string | null,"estimated_minutes": number | null,"group_id": string | null,"id": string,"initial_complete": boolean,"initial_completed_at": string | null,"local_time_slot": string | null,"notes": string | null,"origin_priority_id": string | null,"planned_date": string | null,"position": number,"recurrence_frequency": string | null,"recurrence_interval": number | null,"recurrence_until": string | null,"revision": number,"title": string,"updated_at": string,"user_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actual_minutes_baseline"?: number,"captured_time_zone": string,"complete"?: boolean,"completed_at"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"detail"?: string | null,"due_date"?: string | null,"estimated_minutes"?: number | null,"group_id"?: string | null,"id": string,"initial_complete"?: boolean,"initial_completed_at"?: string | null,"local_time_slot"?: string | null,"notes"?: string | null,"origin_priority_id"?: string | null,"planned_date"?: string | null,"position"?: number,"recurrence_frequency"?: string | null,"recurrence_interval"?: number | null,"recurrence_until"?: string | null,"revision"?: number,"title": string,"updated_at"?: string,"user_id": string,"workspace_id": string
                  }
                  Update: {
                    "actual_minutes_baseline"?: number,"captured_time_zone"?: string,"complete"?: boolean,"completed_at"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"detail"?: string | null,"due_date"?: string | null,"estimated_minutes"?: number | null,"group_id"?: string | null,"id"?: string,"initial_complete"?: boolean,"initial_completed_at"?: string | null,"local_time_slot"?: string | null,"notes"?: string | null,"origin_priority_id"?: string | null,"planned_date"?: string | null,"position"?: number,"recurrence_frequency"?: string | null,"recurrence_interval"?: number | null,"recurrence_until"?: string | null,"revision"?: number,"title"?: string,"updated_at"?: string,"user_id"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tasks_user_id_workspace_id_fkey"
      columns: ["user_id","workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["user_id","id"]
    },{
      foreignKeyName: "tasks_user_id_workspace_id_group_id_fkey"
      columns: ["user_id","workspace_id","group_id"]
isOneToOne: false
      referencedRelation: "task_groups"
      referencedColumns: ["user_id","workspace_id","id"]
    }
                  ]
                },"wellness_commands": {
                  Row: {
                    "id": string,"request_hash": string,"revision": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id": string,"request_hash": string,"revision": number,"user_id": string
                  }
                  Update: {
                    "id"?: string,"request_hash"?: string,"revision"?: number,"user_id"?: string
                  }
                  Relationships: [

                  ]
                },"wellness_versions": {
                  Row: {
                    "revision": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "revision"?: number,"user_id": string
                  }
                  Update: {
                    "revision"?: number,"user_id"?: string
                  }
                  Relationships: [

                  ]
                },"workspaces": {
                  Row: {
                    "accent": string,"archived_at": string | null,"created_at": string,"icon_id": string | null,"id": string,"name": string,"revision": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accent": string,"archived_at"?: string | null,"created_at"?: string,"icon_id"?: string | null,"id": string,"name": string,"revision"?: number,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "accent"?: string,"archived_at"?: string | null,"created_at"?: string,"icon_id"?: string | null,"id"?: string,"name"?: string,"revision"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [

                  ]
                }
          }
          Views: {
            "daily_priority_projection": {
                  Row: {
                    "completed_at": string | null,"completion_origin": string,"created_at": string,"current_complete": boolean | null,"current_completed_at": string | null,"daily_record_id": string,"display_complete": boolean | null,"historical_complete": boolean | null,"historical_day": boolean | null,"id": string,"legacy_backfilled_at": string | null,"legacy_complete": boolean | null,"linked_at": string | null,"materialized_at": string | null,"materialized_task_id": string | null,"position": number,"revision": number,"standalone_complete": boolean | null,"task_id": string | null,"task_title": string | null,"task_unavailable": boolean | null,"text": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "daily_priorities_user_id_daily_record_id_fkey"
      columns: ["user_id","daily_record_id"]
isOneToOne: false
      referencedRelation: "daily_records"
      referencedColumns: ["user_id","id"]
    },{
      foreignKeyName: "daily_priorities_user_id_materialized_task_id_fkey"
      columns: ["user_id","materialized_task_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["user_id","id"]
    },{
      foreignKeyName: "daily_priorities_user_id_task_id_fkey"
      columns: ["user_id","task_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["user_id","id"]
    }
                  ]
                }
          }
          Functions: {
            "backfill_priority_tasks":
{ Args: { "p_command_id": string,"p_expected_planner_revision": number }; Returns: number
                           },
"complete_linked_priority":
{ Args: { "p_command_id": string,"p_complete": boolean,"p_expected_planner_revision": number,"p_id": string,"p_priority_revision": number }; Returns: number
                           },
"create_priority_task":
{ Args: { "p_command_id": string,"p_date": string,"p_expected_planner_revision": number,"p_id": string,"p_text": string }; Returns: number
                           },
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
"export_personal_data":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"planner_command":
{ Args: { "p_action": Json,"p_command_id": string,"p_expected_revision": number }; Returns: number
                           },
"priority_day_end":
{ Args: { "p_date": string,"p_zone": string }; Returns: string
                           },
"read_daily_days":
{ Args: { "p_after"?: string,"p_end": string,"p_limit"?: number,"p_start": string }; Returns: Json
                           },
"read_notes":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"read_planner":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"read_wellness":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"rename_priority_task":
{ Args: { "p_command_id": string,"p_expected_planner_revision": number,"p_id": string,"p_priority_revision": number,"p_title": string }; Returns: number
                           },
"save_account_preferences":
{ Args: { "p_command_id": string,"p_expected_revision": number,"p_patch": Json }; Returns: number
                           },
"save_daily_priorities":
{ Args: { "p_command_id"?: string,"p_date": string,"p_expected": Json,"p_expected_planner_revision"?: number,"p_items": Json }; Returns: {
              "completed_at": string | null,
"completion_origin": string,
"created_at": string,
"daily_record_id": string,
"id": string,
"legacy_backfilled_at": string | null,
"legacy_complete": boolean | null,
"linked_at": string | null,
"materialized_at": string | null,
"materialized_task_id": string | null,
"position": number,
"revision": number,
"standalone_complete": boolean | null,
"task_id": string | null,
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
      } },
"save_notes":
{ Args: { "p_command_id": string,"p_expected_revision": number,"p_state": Json }; Returns: number
                           },
"save_wellness":
{ Args: { "p_command_id": string,"p_expected_revision": number,"p_state": Json }; Returns: number
                           },
"task_completion_before":
{ Args: { "p_before": string,"p_task_id": string }; Returns: {
              "complete": boolean,"completed_at": string
            }[]
                           }
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
