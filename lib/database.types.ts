
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "allocation_groups": {
                  Row: {
                    "accent": string,"captured_time_zone": string,"created_at": string,"currency": string,"id": string,"name": string,"position": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accent": string,"captured_time_zone": string,"created_at"?: string,"currency"?: string,"id": string,"name": string,"position"?: number,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "accent"?: string,"captured_time_zone"?: string,"created_at"?: string,"currency"?: string,"id"?: string,"name"?: string,"position"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"allocations": {
                  Row: {
                    "actual_cents": number | null,"allocation_group_id": string,"bill_id": string | null,"captured_time_zone": string,"card_id": string | null,"category_id": string | null,"created_at": string,"currency": string,"due_date": string | null,"id": string,"name": string,"note": string | null,"paycheck_id": string,"planned_cents": number,"position": number,"subcategory_id": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actual_cents"?: number | null,"allocation_group_id": string,"bill_id"?: string | null,"captured_time_zone": string,"card_id"?: string | null,"category_id"?: string | null,"created_at"?: string,"currency"?: string,"due_date"?: string | null,"id": string,"name": string,"note"?: string | null,"paycheck_id": string,"planned_cents": number,"position"?: number,"subcategory_id"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "actual_cents"?: number | null,"allocation_group_id"?: string,"bill_id"?: string | null,"captured_time_zone"?: string,"card_id"?: string | null,"category_id"?: string | null,"created_at"?: string,"currency"?: string,"due_date"?: string | null,"id"?: string,"name"?: string,"note"?: string | null,"paycheck_id"?: string,"planned_cents"?: number,"position"?: number,"subcategory_id"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "allocations_user_id_allocation_group_id_fkey"
      columns: ["user_id","allocation_group_id"]
isOneToOne: false
      referencedRelation: "allocation_groups"
      referencedColumns: ["user_id","id"]
    },{
      foreignKeyName: "allocations_user_id_bill_id_fkey"
      columns: ["user_id","bill_id"]
isOneToOne: false
      referencedRelation: "bills"
      referencedColumns: ["user_id","id"]
    },{
      foreignKeyName: "allocations_user_id_card_id_fkey"
      columns: ["user_id","card_id"]
isOneToOne: false
      referencedRelation: "cards"
      referencedColumns: ["user_id","id"]
    },{
      foreignKeyName: "allocations_user_id_category_id_fkey"
      columns: ["user_id","category_id"]
isOneToOne: false
      referencedRelation: "money_categories"
      referencedColumns: ["user_id","id"]
    },{
      foreignKeyName: "allocations_user_id_category_id_subcategory_id_fkey"
      columns: ["user_id","category_id","subcategory_id"]
isOneToOne: false
      referencedRelation: "money_subcategories"
      referencedColumns: ["user_id","category_id","id"]
    },{
      foreignKeyName: "allocations_user_id_paycheck_id_fkey"
      columns: ["user_id","paycheck_id"]
isOneToOne: false
      referencedRelation: "paychecks"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"almanac_impressions": {
                  Row: {
                    "created_at": string,"dismissed_at": string | null,"entry_id": string,"shown_on": string,"signal_key": string,"surface": string,"user_id": string,"variant_id": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"dismissed_at"?: string | null,"entry_id": string,"shown_on": string,"signal_key": string,"surface": string,"user_id"?: string,"variant_id": string,"version": number
                  }
                  Update: {
                    "created_at"?: string,"dismissed_at"?: string | null,"entry_id"?: string,"shown_on"?: string,"signal_key"?: string,"surface"?: string,"user_id"?: string,"variant_id"?: string,"version"?: number
                  }
                  Relationships: [
                    
                  ]
                },"appearance_preferences": {
                  Row: {
                    "atelier_theme": Json | null,"atelier_theme_id": string | null,"material": string,"theme": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "atelier_theme"?: Json | null,"atelier_theme_id"?: string | null,"material": string,"theme": string,"updated_at": string,"user_id": string
                  }
                  Update: {
                    "atelier_theme"?: Json | null,"atelier_theme_id"?: string | null,"material"?: string,"theme"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"aspiration_updates": {
                  Row: {
                    "aspiration_id": string,"created_at": string,"id": string,"milestone_id": string | null,"note": string | null,"recorded_on": string,"user_id": string,"value": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "aspiration_id": string,"created_at"?: string,"id": string,"milestone_id"?: string | null,"note"?: string | null,"recorded_on": string,"user_id"?: string,"value"?: number | null
                  }
                  Update: {
                    "aspiration_id"?: string,"created_at"?: string,"id"?: string,"milestone_id"?: string | null,"note"?: string | null,"recorded_on"?: string,"user_id"?: string,"value"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "aspiration_updates_aspiration_id_fkey"
      columns: ["aspiration_id"]
isOneToOne: false
      referencedRelation: "aspirations"
      referencedColumns: ["id"]
    }
                  ]
                },"aspirations": {
                  Row: {
                    "accent": string | null,"category": string,"celebrated": (string)[],"completed_on": string | null,"connection": Json | null,"created_at": string,"description": string | null,"icon": string | null,"id": string,"milestones": NonNullable<Json>,"motivation": string | null,"position": number,"progress_kind": string,"reflection": string | null,"renewed_from": string | null,"revision": number,"ritual_ids": (string)[],"start_date": string,"status": string,"target": number | null,"target_date": string | null,"task_ids": (string)[],"timeframe": string,"title": string,"unit": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accent"?: string | null,"category"?: string,"celebrated"?: (string)[],"completed_on"?: string | null,"connection"?: Json | null,"created_at"?: string,"description"?: string | null,"icon"?: string | null,"id": string,"milestones"?: NonNullable<Json>,"motivation"?: string | null,"position"?: number,"progress_kind": string,"reflection"?: string | null,"renewed_from"?: string | null,"revision"?: number,"ritual_ids"?: (string)[],"start_date": string,"status"?: string,"target"?: number | null,"target_date"?: string | null,"task_ids"?: (string)[],"timeframe"?: string,"title": string,"unit"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "accent"?: string | null,"category"?: string,"celebrated"?: (string)[],"completed_on"?: string | null,"connection"?: Json | null,"created_at"?: string,"description"?: string | null,"icon"?: string | null,"id"?: string,"milestones"?: NonNullable<Json>,"motivation"?: string | null,"position"?: number,"progress_kind"?: string,"reflection"?: string | null,"renewed_from"?: string | null,"revision"?: number,"ritual_ids"?: (string)[],"start_date"?: string,"status"?: string,"target"?: number | null,"target_date"?: string | null,"task_ids"?: (string)[],"timeframe"?: string,"title"?: string,"unit"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "aspirations_renewed_from_fkey"
      columns: ["renewed_from"]
isOneToOne: false
      referencedRelation: "aspirations"
      referencedColumns: ["id"]
    }
                  ]
                },"astrology_activity": {
                  Row: {
                    "created_at": string,"date": string,"kind": string,"reference_id": string,"time_zone": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"date": string,"kind": string,"reference_id": string,"time_zone": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"date"?: string,"kind"?: string,"reference_id"?: string,"time_zone"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"astrology_birth_profiles": {
                  Row: {
                    "created_at": string,"id": string,"payload": NonNullable<Json>,"revision": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id": string,"payload": NonNullable<Json>,"revision"?: number,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"payload"?: NonNullable<Json>,"revision"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"astrology_comparison_profiles": {
                  Row: {
                    "created_at": string,"id": string,"name": string,"payload": NonNullable<Json>,"revision": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id": string,"name": string,"payload": NonNullable<Json>,"revision"?: number,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string,"payload"?: NonNullable<Json>,"revision"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                  ]
                },"astrology_journal_entries": {
                  Row: {
                    "created_at": string,"date": string,"id": string,"reference": Json | null,"revision": number,"text": string,"time_zone": string,"title": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"date": string,"id": string,"reference"?: Json | null,"revision"?: number,"text"?: string,"time_zone": string,"title"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"date"?: string,"id"?: string,"reference"?: Json | null,"revision"?: number,"text"?: string,"time_zone"?: string,"title"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"astrology_natal_charts": {
                  Row: {
                    "id": string,"payload": NonNullable<Json>,"profile_id": string,"profile_revision": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id": string,"payload": NonNullable<Json>,"profile_id": string,"profile_revision": number,"user_id": string
                  }
                  Update: {
                    "id"?: string,"payload"?: NonNullable<Json>,"profile_id"?: string,"profile_revision"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "astrology_natal_charts_user_id_profile_id_fkey"
      columns: ["user_id","profile_id"]
isOneToOne: false
      referencedRelation: "astrology_birth_profiles"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"atelier_themes": {
                  Row: {
                    "base_theme": string,"created_at": string,"definition": NonNullable<Json>,"id": string,"name": string,"schema_version": number,"status": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "base_theme": string,"created_at"?: string,"definition": NonNullable<Json>,"id": string,"name": string,"schema_version": number,"status": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "base_theme"?: string,"created_at"?: string,"definition"?: NonNullable<Json>,"id"?: string,"name"?: string,"schema_version"?: number,"status"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"bills": {
                  Row: {
                    "amount_cents": number,"captured_time_zone": string,"card_id": string | null,"category_id": string | null,"created_at": string,"currency": string,"due_date": string,"id": string,"name": string,"note": string | null,"paid": boolean,"position": number,"recurrence": string,"recurring_id": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_cents": number,"captured_time_zone": string,"card_id"?: string | null,"category_id"?: string | null,"created_at"?: string,"currency"?: string,"due_date": string,"id": string,"name": string,"note"?: string | null,"paid": boolean,"position"?: number,"recurrence": string,"recurring_id"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "amount_cents"?: number,"captured_time_zone"?: string,"card_id"?: string | null,"category_id"?: string | null,"created_at"?: string,"currency"?: string,"due_date"?: string,"id"?: string,"name"?: string,"note"?: string | null,"paid"?: boolean,"position"?: number,"recurrence"?: string,"recurring_id"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "bills_user_id_card_id_fkey"
      columns: ["user_id","card_id"]
isOneToOne: false
      referencedRelation: "cards"
      referencedColumns: ["user_id","id"]
    },{
      foreignKeyName: "bills_user_id_category_id_fkey"
      columns: ["user_id","category_id"]
isOneToOne: false
      referencedRelation: "money_categories"
      referencedColumns: ["user_id","id"]
    },{
      foreignKeyName: "bills_user_id_recurring_id_fkey"
      columns: ["user_id","recurring_id"]
isOneToOne: false
      referencedRelation: "recurring_commitments"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"bucket_entries": {
                  Row: {
                    "archived_at": string | null,"aspiration_id": string | null,"category": string | null,"completed_on": string | null,"completion": NonNullable<Json>,"cover": Json | null,"created_at": string,"history": NonNullable<Json>,"icon": string | null,"id": string,"links": NonNullable<Json>,"notes": string | null,"number": number | null,"position": number,"revision": number,"status": string,"tags": (string)[],"target_year": number | null,"title": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at"?: string | null,"aspiration_id"?: string | null,"category"?: string | null,"completed_on"?: string | null,"completion"?: NonNullable<Json>,"cover"?: Json | null,"created_at"?: string,"history"?: NonNullable<Json>,"icon"?: string | null,"id": string,"links"?: NonNullable<Json>,"notes"?: string | null,"number"?: number | null,"position"?: number,"revision"?: number,"status"?: string,"tags"?: (string)[],"target_year"?: number | null,"title": string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "archived_at"?: string | null,"aspiration_id"?: string | null,"category"?: string | null,"completed_on"?: string | null,"completion"?: NonNullable<Json>,"cover"?: Json | null,"created_at"?: string,"history"?: NonNullable<Json>,"icon"?: string | null,"id"?: string,"links"?: NonNullable<Json>,"notes"?: string | null,"number"?: number | null,"position"?: number,"revision"?: number,"status"?: string,"tags"?: (string)[],"target_year"?: number | null,"title"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "bucket_entries_aspiration_id_fkey"
      columns: ["aspiration_id"]
isOneToOne: false
      referencedRelation: "aspirations"
      referencedColumns: ["id"]
    }
                  ]
                },"bucket_lists": {
                  Row: {
                    "completion_style": string,"created_at": string,"horizon_end": number,"horizon_start": number,"revision": number,"show_numbers": boolean,"title": string,"updated_at": string,"user_id": string,"year_colors": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "completion_style"?: string,"created_at"?: string,"horizon_end": number,"horizon_start": number,"revision"?: number,"show_numbers"?: boolean,"title"?: string,"updated_at"?: string,"user_id"?: string,"year_colors"?: NonNullable<Json>
                  }
                  Update: {
                    "completion_style"?: string,"created_at"?: string,"horizon_end"?: number,"horizon_start"?: number,"revision"?: number,"show_numbers"?: boolean,"title"?: string,"updated_at"?: string,"user_id"?: string,"year_colors"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"card_payments": {
                  Row: {
                    "allocation_id": string | null,"amount_cents": number,"captured_time_zone": string,"card_id": string,"created_at": string,"currency": string,"id": string,"local_date": string,"note": string | null,"paycheck_id": string | null,"position": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "allocation_id"?: string | null,"amount_cents": number,"captured_time_zone": string,"card_id": string,"created_at"?: string,"currency"?: string,"id": string,"local_date": string,"note"?: string | null,"paycheck_id"?: string | null,"position"?: number,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "allocation_id"?: string | null,"amount_cents"?: number,"captured_time_zone"?: string,"card_id"?: string,"created_at"?: string,"currency"?: string,"id"?: string,"local_date"?: string,"note"?: string | null,"paycheck_id"?: string | null,"position"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "card_payments_user_id_allocation_id_fkey"
      columns: ["user_id","allocation_id"]
isOneToOne: false
      referencedRelation: "allocations"
      referencedColumns: ["user_id","id"]
    },{
      foreignKeyName: "card_payments_user_id_card_id_fkey"
      columns: ["user_id","card_id"]
isOneToOne: false
      referencedRelation: "cards"
      referencedColumns: ["user_id","id"]
    },{
      foreignKeyName: "card_payments_user_id_paycheck_id_fkey"
      columns: ["user_id","paycheck_id"]
isOneToOne: false
      referencedRelation: "paychecks"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"cards": {
                  Row: {
                    "accent": string | null,"apr": number | null,"captured_time_zone": string,"created_at": string,"currency": string,"due_date": string | null,"id": string,"limit_cents": number | null,"minimum_cents": number | null,"name": string,"note": string | null,"opening_as_of": string,"opening_balance_cents": number,"planned_payment_cents": number | null,"position": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accent"?: string | null,"apr"?: number | null,"captured_time_zone": string,"created_at"?: string,"currency"?: string,"due_date"?: string | null,"id": string,"limit_cents"?: number | null,"minimum_cents"?: number | null,"name": string,"note"?: string | null,"opening_as_of": string,"opening_balance_cents": number,"planned_payment_cents"?: number | null,"position"?: number,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "accent"?: string | null,"apr"?: number | null,"captured_time_zone"?: string,"created_at"?: string,"currency"?: string,"due_date"?: string | null,"id"?: string,"limit_cents"?: number | null,"minimum_cents"?: number | null,"name"?: string,"note"?: string | null,"opening_as_of"?: string,"opening_balance_cents"?: number,"planned_payment_cents"?: number | null,"position"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"checkin_emotions": {
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
                },"collection_activity": {
                  Row: {
                    "activity_date": string,"created_at": string,"duration_minutes": number | null,"episode_id": string | null,"id": string,"kind": string,"media_id": string,"notes": string,"platform": string,"revision": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activity_date": string,"created_at"?: string,"duration_minutes"?: number | null,"episode_id"?: string | null,"id": string,"kind": string,"media_id": string,"notes"?: string,"platform"?: string,"revision"?: number,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "activity_date"?: string,"created_at"?: string,"duration_minutes"?: number | null,"episode_id"?: string | null,"id"?: string,"kind"?: string,"media_id"?: string,"notes"?: string,"platform"?: string,"revision"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "collection_activity_user_id_episode_id_fkey"
      columns: ["user_id","episode_id"]
isOneToOne: false
      referencedRelation: "collection_tv_episodes"
      referencedColumns: ["user_id","id"]
    },{
      foreignKeyName: "collection_activity_user_id_media_id_fkey"
      columns: ["user_id","media_id"]
isOneToOne: false
      referencedRelation: "collection_media_items"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"collection_curated": {
                  Row: {
                    "accent": string,"created_at": string,"description": string,"icon": string,"id": string,"layout": string,"revision": number,"title": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accent"?: string,"created_at"?: string,"description"?: string,"icon"?: string,"id": string,"layout"?: string,"revision"?: number,"title": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "accent"?: string,"created_at"?: string,"description"?: string,"icon"?: string,"id"?: string,"layout"?: string,"revision"?: number,"title"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"collection_curated_members": {
                  Row: {
                    "book_id": string | null,"collection_id": string,"created_at": string,"id": string,"media_id": string | null,"position": number,"revision": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "book_id"?: string | null,"collection_id": string,"created_at"?: string,"id": string,"media_id"?: string | null,"position": number,"revision"?: number,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "book_id"?: string | null,"collection_id"?: string,"created_at"?: string,"id"?: string,"media_id"?: string | null,"position"?: number,"revision"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "collection_curated_members_user_id_book_id_fkey"
      columns: ["user_id","book_id"]
isOneToOne: false
      referencedRelation: "whimsy_books"
      referencedColumns: ["user_id","id"]
    },{
      foreignKeyName: "collection_curated_members_user_id_collection_id_fkey"
      columns: ["user_id","collection_id"]
isOneToOne: false
      referencedRelation: "collection_curated"
      referencedColumns: ["user_id","id"]
    },{
      foreignKeyName: "collection_curated_members_user_id_media_id_fkey"
      columns: ["user_id","media_id"]
isOneToOne: false
      referencedRelation: "collection_media_items"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"collection_media_items": {
                  Row: {
                    "cast_names": (string)[],"completed_on": string | null,"conclusion_state": string,"cover_url": string | null,"created_at": string,"creator": string,"description": string,"developer": string,"favorite": boolean,"favorite_tracks": (string)[],"genres": (string)[],"id": string,"kind": string,"notes": string,"platform_played": string,"platforms": (string)[],"playtime_minutes": number | null,"progress_percent": number | null,"provider": string | null,"provider_id": string | null,"publisher": string,"rating": number | null,"release_date": string | null,"review": string,"revision": number,"runtime_minutes": number | null,"started_on": string | null,"status": string,"tags": (string)[],"title": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cast_names"?: (string)[],"completed_on"?: string | null,"conclusion_state"?: string,"cover_url"?: string | null,"created_at"?: string,"creator"?: string,"description"?: string,"developer"?: string,"favorite"?: boolean,"favorite_tracks"?: (string)[],"genres"?: (string)[],"id": string,"kind": string,"notes"?: string,"platform_played"?: string,"platforms"?: (string)[],"playtime_minutes"?: number | null,"progress_percent"?: number | null,"provider"?: string | null,"provider_id"?: string | null,"publisher"?: string,"rating"?: number | null,"release_date"?: string | null,"review"?: string,"revision"?: number,"runtime_minutes"?: number | null,"started_on"?: string | null,"status": string,"tags"?: (string)[],"title": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "cast_names"?: (string)[],"completed_on"?: string | null,"conclusion_state"?: string,"cover_url"?: string | null,"created_at"?: string,"creator"?: string,"description"?: string,"developer"?: string,"favorite"?: boolean,"favorite_tracks"?: (string)[],"genres"?: (string)[],"id"?: string,"kind"?: string,"notes"?: string,"platform_played"?: string,"platforms"?: (string)[],"playtime_minutes"?: number | null,"progress_percent"?: number | null,"provider"?: string | null,"provider_id"?: string | null,"publisher"?: string,"rating"?: number | null,"release_date"?: string | null,"review"?: string,"revision"?: number,"runtime_minutes"?: number | null,"started_on"?: string | null,"status"?: string,"tags"?: (string)[],"title"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"collection_series": {
                  Row: {
                    "conclusion_state": string,"cover_url": string | null,"created_at": string,"description": string,"id": string,"kind": string,"revision": number,"scope": string,"title": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "conclusion_state"?: string,"cover_url"?: string | null,"created_at"?: string,"description"?: string,"id": string,"kind": string,"revision"?: number,"scope"?: string,"title": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "conclusion_state"?: string,"cover_url"?: string | null,"created_at"?: string,"description"?: string,"id"?: string,"kind"?: string,"revision"?: number,"scope"?: string,"title"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"collection_series_members": {
                  Row: {
                    "book_id": string | null,"created_at": string,"id": string,"media_id": string | null,"release_state": string,"revision": number,"role": string,"sequence": number,"series_id": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "book_id"?: string | null,"created_at"?: string,"id": string,"media_id"?: string | null,"release_state"?: string,"revision"?: number,"role"?: string,"sequence": number,"series_id": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "book_id"?: string | null,"created_at"?: string,"id"?: string,"media_id"?: string | null,"release_state"?: string,"revision"?: number,"role"?: string,"sequence"?: number,"series_id"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "collection_series_members_user_id_book_id_fkey"
      columns: ["user_id","book_id"]
isOneToOne: false
      referencedRelation: "whimsy_books"
      referencedColumns: ["user_id","id"]
    },{
      foreignKeyName: "collection_series_members_user_id_media_id_fkey"
      columns: ["user_id","media_id"]
isOneToOne: false
      referencedRelation: "collection_media_items"
      referencedColumns: ["user_id","id"]
    },{
      foreignKeyName: "collection_series_members_user_id_series_id_fkey"
      columns: ["user_id","series_id"]
isOneToOne: false
      referencedRelation: "collection_series"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"collection_tv_episodes": {
                  Row: {
                    "air_date": string | null,"created_at": string,"episode_number": number,"id": string,"release_state": string,"revision": number,"runtime_minutes": number | null,"season_number": number,"show_id": string,"special": boolean,"synopsis": string,"title": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "air_date"?: string | null,"created_at"?: string,"episode_number": number,"id": string,"release_state"?: string,"revision"?: number,"runtime_minutes"?: number | null,"season_number": number,"show_id": string,"special"?: boolean,"synopsis"?: string,"title"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "air_date"?: string | null,"created_at"?: string,"episode_number"?: number,"id"?: string,"release_state"?: string,"revision"?: number,"runtime_minutes"?: number | null,"season_number"?: number,"show_id"?: string,"special"?: boolean,"synopsis"?: string,"title"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "collection_tv_episodes_user_id_show_id_fkey"
      columns: ["user_id","show_id"]
isOneToOne: false
      referencedRelation: "collection_media_items"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"collection_tv_seasons": {
                  Row: {
                    "created_at": string,"id": string,"release_state": string,"revision": number,"season_number": number,"show_id": string,"total_episodes": number | null,"updated_at": string,"user_id": string,"watched": boolean,"watched_episodes": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id": string,"release_state"?: string,"revision"?: number,"season_number": number,"show_id": string,"total_episodes"?: number | null,"updated_at"?: string,"user_id": string,"watched"?: boolean,"watched_episodes"?: number
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"release_state"?: string,"revision"?: number,"season_number"?: number,"show_id"?: string,"total_episodes"?: number | null,"updated_at"?: string,"user_id"?: string,"watched"?: boolean,"watched_episodes"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "collection_tv_seasons_user_id_show_id_fkey"
      columns: ["user_id","show_id"]
isOneToOne: false
      referencedRelation: "collection_media_items"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"constellation_cards": {
                  Row: {
                    "created_at": string,"id": string,"payload": NonNullable<Json>,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id": string,"payload": NonNullable<Json>,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"payload"?: NonNullable<Json>,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"constellation_commands": {
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
                },"constellation_tags": {
                  Row: {
                    "color": string | null,"id": string,"name": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "color"?: string | null,"id": string,"name": string,"user_id": string
                  }
                  Update: {
                    "color"?: string | null,"id"?: string,"name"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"constellation_versions": {
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
                },"daily_memories": {
                  Row: {
                    "body": string,"created_at": string,"emoji": string | null,"id": string,"local_date": string,"revision": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"emoji"?: string | null,"id"?: string,"local_date": string,"revision"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"emoji"?: string | null,"id"?: string,"local_date"?: string,"revision"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
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
                },"friend_requests": {
                  Row: {
                    "addressee": string,"created_at": string,"id": string,"requester": string,"responded_at": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "addressee": string,"created_at"?: string,"id"?: string,"requester": string,"responded_at"?: string | null,"status"?: string
                  }
                  Update: {
                    "addressee"?: string,"created_at"?: string,"id"?: string,"requester"?: string,"responded_at"?: string | null,"status"?: string
                  }
                  Relationships: [
                    
                  ]
                },"friendships": {
                  Row: {
                    "created_at": string,"user_high": string,"user_low": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"user_high": string,"user_low": string
                  }
                  Update: {
                    "created_at"?: string,"user_high"?: string,"user_low"?: string
                  }
                  Relationships: [
                    
                  ]
                },"future_log_entries": {
                  Row: {
                    "color": string | null,"created_at": string,"done": boolean,"end_date": string | null,"gradient": Json | null,"icon": string | null,"id": string,"local_date": string | null,"month": string,"note": string | null,"position": number,"revision": number,"source_id": string | null,"source_kind": string | null,"title": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "color"?: string | null,"created_at"?: string,"done"?: boolean,"end_date"?: string | null,"gradient"?: Json | null,"icon"?: string | null,"id"?: string,"local_date"?: string | null,"month": string,"note"?: string | null,"position"?: number,"revision"?: number,"source_id"?: string | null,"source_kind"?: string | null,"title": string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "color"?: string | null,"created_at"?: string,"done"?: boolean,"end_date"?: string | null,"gradient"?: Json | null,"icon"?: string | null,"id"?: string,"local_date"?: string | null,"month"?: string,"note"?: string | null,"position"?: number,"revision"?: number,"source_id"?: string | null,"source_kind"?: string | null,"title"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"google_calendars": {
                  Row: {
                    "access_role": string,"calendar_id": string,"color": string | null,"connection_id": string,"id": string,"is_primary": boolean,"name": string,"sync_token": string | null,"updated_at": string,"user_id": string,"visible": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "access_role"?: string,"calendar_id": string,"color"?: string | null,"connection_id": string,"id"?: string,"is_primary"?: boolean,"name"?: string,"sync_token"?: string | null,"updated_at"?: string,"user_id": string,"visible"?: boolean
                  }
                  Update: {
                    "access_role"?: string,"calendar_id"?: string,"color"?: string | null,"connection_id"?: string,"id"?: string,"is_primary"?: boolean,"name"?: string,"sync_token"?: string | null,"updated_at"?: string,"user_id"?: string,"visible"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "google_calendars_connection_id_fkey"
      columns: ["connection_id"]
isOneToOne: false
      referencedRelation: "google_connections"
      referencedColumns: ["id"]
    }
                  ]
                },"google_connections": {
                  Row: {
                    "created_at": string,"email": string,"google_sub": string,"id": string,"last_background_sync_at": string | null,"last_error": string | null,"last_synced_at": string | null,"scopes": (string)[],"status": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email"?: string,"google_sub": string,"id"?: string,"last_background_sync_at"?: string | null,"last_error"?: string | null,"last_synced_at"?: string | null,"scopes"?: (string)[],"status"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string,"google_sub"?: string,"id"?: string,"last_background_sync_at"?: string | null,"last_error"?: string | null,"last_synced_at"?: string | null,"scopes"?: (string)[],"status"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"google_event_links": {
                  Row: {
                    "calendar_id": string,"connection_id": string,"created_at": string,"etag": string | null,"google_event_id": string,"id": string,"last_error": string | null,"muse_event_id": string,"pushed_at": string | null,"state": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "calendar_id": string,"connection_id": string,"created_at"?: string,"etag"?: string | null,"google_event_id": string,"id"?: string,"last_error"?: string | null,"muse_event_id": string,"pushed_at"?: string | null,"state"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "calendar_id"?: string,"connection_id"?: string,"created_at"?: string,"etag"?: string | null,"google_event_id"?: string,"id"?: string,"last_error"?: string | null,"muse_event_id"?: string,"pushed_at"?: string | null,"state"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "google_event_links_connection_id_fkey"
      columns: ["connection_id"]
isOneToOne: false
      referencedRelation: "google_connections"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "google_event_links_muse_event_id_fkey"
      columns: ["muse_event_id"]
isOneToOne: true
      referencedRelation: "planner_events"
      referencedColumns: ["id"]
    }
                  ]
                },"google_events": {
                  Row: {
                    "all_day": boolean,"calendar_id": string,"connection_id": string,"description": string | null,"end_date": string | null,"end_time": string | null,"etag": string | null,"event_id": string,"html_link": string | null,"id": string,"location": string | null,"recurring_event_id": string | null,"start_date": string,"start_time": string | null,"status": string,"time_zone": string | null,"title": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "all_day"?: boolean,"calendar_id": string,"connection_id": string,"description"?: string | null,"end_date"?: string | null,"end_time"?: string | null,"etag"?: string | null,"event_id": string,"html_link"?: string | null,"id"?: string,"location"?: string | null,"recurring_event_id"?: string | null,"start_date": string,"start_time"?: string | null,"status"?: string,"time_zone"?: string | null,"title"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "all_day"?: boolean,"calendar_id"?: string,"connection_id"?: string,"description"?: string | null,"end_date"?: string | null,"end_time"?: string | null,"etag"?: string | null,"event_id"?: string,"html_link"?: string | null,"id"?: string,"location"?: string | null,"recurring_event_id"?: string | null,"start_date"?: string,"start_time"?: string | null,"status"?: string,"time_zone"?: string | null,"title"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "google_events_connection_id_fkey"
      columns: ["connection_id"]
isOneToOne: false
      referencedRelation: "google_connections"
      referencedColumns: ["id"]
    }
                  ]
                },"google_tokens": {
                  Row: {
                    "access_ciphertext": string | null,"access_expires_at": string | null,"connection_id": string,"refresh_ciphertext": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "access_ciphertext"?: string | null,"access_expires_at"?: string | null,"connection_id": string,"refresh_ciphertext": string,"updated_at"?: string
                  }
                  Update: {
                    "access_ciphertext"?: string | null,"access_expires_at"?: string | null,"connection_id"?: string,"refresh_ciphertext"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "google_tokens_connection_id_fkey"
      columns: ["connection_id"]
isOneToOne: true
      referencedRelation: "google_connections"
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
                },"intention_pages": {
                  Row: {
                    "created_at": string,"id": string,"period": string,"period_end": string,"period_start": string,"revision": number,"sections": NonNullable<Json>,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"period": string,"period_end": string,"period_start": string,"revision"?: number,"sections"?: NonNullable<Json>,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"period"?: string,"period_end"?: string,"period_start"?: string,"revision"?: number,"sections"?: NonNullable<Json>,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"life_areas": {
                  Row: {
                    "archived_at": string | null,"color": string,"created_at": string,"id": string,"label": string,"position": number,"revision": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at"?: string | null,"color"?: string,"created_at"?: string,"id"?: string,"label": string,"position"?: number,"revision"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "archived_at"?: string | null,"color"?: string,"created_at"?: string,"id"?: string,"label"?: string,"position"?: number,"revision"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"life_ratings": {
                  Row: {
                    "area_id": string,"created_at": string,"id": string,"note": string,"period": string,"period_end": string,"period_start": string,"rating": number,"revision": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "area_id": string,"created_at"?: string,"id"?: string,"note"?: string,"period": string,"period_end": string,"period_start": string,"rating": number,"revision"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "area_id"?: string,"created_at"?: string,"id"?: string,"note"?: string,"period"?: string,"period_end"?: string,"period_start"?: string,"rating"?: number,"revision"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "life_ratings_user_id_area_id_fkey"
      columns: ["user_id","area_id"]
isOneToOne: false
      referencedRelation: "life_areas"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"list_item_events": {
                  Row: {
                    "id": string,"item_id": string,"kind": string,"list_id": string,"moved_to": string | null,"occurred_on": string | null,"period_end": string,"period_start": string,"recorded_at": string,"source": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"item_id": string,"kind": string,"list_id": string,"moved_to"?: string | null,"occurred_on"?: string | null,"period_end": string,"period_start": string,"recorded_at"?: string,"source"?: string,"user_id"?: string
                  }
                  Update: {
                    "id"?: string,"item_id"?: string,"kind"?: string,"list_id"?: string,"moved_to"?: string | null,"occurred_on"?: string | null,"period_end"?: string,"period_start"?: string,"recorded_at"?: string,"source"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "list_item_events_user_id_item_id_fkey"
      columns: ["user_id","item_id"]
isOneToOne: false
      referencedRelation: "list_items"
      referencedColumns: ["user_id","id"]
    },{
      foreignKeyName: "list_item_events_user_id_list_id_fkey"
      columns: ["user_id","list_id"]
isOneToOne: false
      referencedRelation: "lists"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"list_items": {
                  Row: {
                    "completed_at": string | null,"completed_on": string | null,"created_at": string,"due_date": string | null,"field_values": NonNullable<Json>,"id": string,"link_id": string | null,"link_kind": string | null,"list_id": string,"notes": string | null,"position": number,"priority": string | null,"schedule": Json | null,"section_id": string | null,"title": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_at"?: string | null,"completed_on"?: string | null,"created_at"?: string,"due_date"?: string | null,"field_values"?: NonNullable<Json>,"id": string,"link_id"?: string | null,"link_kind"?: string | null,"list_id": string,"notes"?: string | null,"position"?: number,"priority"?: string | null,"schedule"?: Json | null,"section_id"?: string | null,"title": string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "completed_at"?: string | null,"completed_on"?: string | null,"created_at"?: string,"due_date"?: string | null,"field_values"?: NonNullable<Json>,"id"?: string,"link_id"?: string | null,"link_kind"?: string | null,"list_id"?: string,"notes"?: string | null,"position"?: number,"priority"?: string | null,"schedule"?: Json | null,"section_id"?: string | null,"title"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "list_items_user_id_list_id_fkey"
      columns: ["user_id","list_id"]
isOneToOne: false
      referencedRelation: "lists"
      referencedColumns: ["user_id","id"]
    },{
      foreignKeyName: "list_items_user_id_section_id_fkey"
      columns: ["user_id","section_id"]
isOneToOne: false
      referencedRelation: "list_sections"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"list_sections": {
                  Row: {
                    "accent": string | null,"collapsed": boolean,"icon": string | null,"id": string,"list_id": string,"position": number,"title": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accent"?: string | null,"collapsed"?: boolean,"icon"?: string | null,"id": string,"list_id": string,"position"?: number,"title": string,"user_id"?: string
                  }
                  Update: {
                    "accent"?: string | null,"collapsed"?: boolean,"icon"?: string | null,"id"?: string,"list_id"?: string,"position"?: number,"title"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "list_sections_user_id_list_id_fkey"
      columns: ["user_id","list_id"]
isOneToOne: false
      referencedRelation: "lists"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"lists": {
                  Row: {
                    "accent": string,"archived_at": string | null,"aspiration_id": string | null,"created_at": string,"description": string | null,"end_date": string | null,"fields": NonNullable<Json>,"icon": string | null,"id": string,"is_template": boolean,"item_group": string,"item_sort": string,"pinned": boolean,"position": number,"preset": string,"section_columns": number,"show_in_agenda": boolean,"show_in_daily": boolean,"start_date": string | null,"table_view": boolean,"title": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accent"?: string,"archived_at"?: string | null,"aspiration_id"?: string | null,"created_at"?: string,"description"?: string | null,"end_date"?: string | null,"fields"?: NonNullable<Json>,"icon"?: string | null,"id": string,"is_template"?: boolean,"item_group"?: string,"item_sort"?: string,"pinned"?: boolean,"position"?: number,"preset"?: string,"section_columns"?: number,"show_in_agenda"?: boolean,"show_in_daily"?: boolean,"start_date"?: string | null,"table_view"?: boolean,"title": string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "accent"?: string,"archived_at"?: string | null,"aspiration_id"?: string | null,"created_at"?: string,"description"?: string | null,"end_date"?: string | null,"fields"?: NonNullable<Json>,"icon"?: string | null,"id"?: string,"is_template"?: boolean,"item_group"?: string,"item_sort"?: string,"pinned"?: boolean,"position"?: number,"preset"?: string,"section_columns"?: number,"show_in_agenda"?: boolean,"show_in_daily"?: boolean,"start_date"?: string | null,"table_view"?: boolean,"title"?: string,"updated_at"?: string,"user_id"?: string
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
                },"money_categories": {
                  Row: {
                    "accent": string,"archived": boolean,"captured_time_zone": string,"created_at": string,"currency": string,"icon_id": string | null,"id": string,"name": string,"position": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accent": string,"archived": boolean,"captured_time_zone": string,"created_at"?: string,"currency"?: string,"icon_id"?: string | null,"id": string,"name": string,"position"?: number,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "accent"?: string,"archived"?: boolean,"captured_time_zone"?: string,"created_at"?: string,"currency"?: string,"icon_id"?: string | null,"id"?: string,"name"?: string,"position"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"money_commands": {
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
                },"money_deleted_ids": {
                  Row: {
                    "collection": string,"deleted_at": string,"id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "collection": string,"deleted_at"?: string,"id": string,"user_id": string
                  }
                  Update: {
                    "collection"?: string,"deleted_at"?: string,"id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"money_subcategories": {
                  Row: {
                    "category_id": string,"id": string,"name": string,"position": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category_id": string,"id": string,"name": string,"position": number,"user_id": string
                  }
                  Update: {
                    "category_id"?: string,"id"?: string,"name"?: string,"position"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "money_subcategories_user_id_category_id_fkey"
      columns: ["user_id","category_id"]
isOneToOne: false
      referencedRelation: "money_categories"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"money_tags": {
                  Row: {
                    "archived": boolean,"captured_time_zone": string,"created_at": string,"currency": string,"id": string,"name": string,"position": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "archived": boolean,"captured_time_zone": string,"created_at"?: string,"currency"?: string,"id": string,"name": string,"position"?: number,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "archived"?: boolean,"captured_time_zone"?: string,"created_at"?: string,"currency"?: string,"id"?: string,"name"?: string,"position"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"money_versions": {
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
                },"movement_day_outcomes": {
                  Row: {
                    "local_date": string,"outcome": string,"type_id": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "local_date": string,"outcome": string,"type_id": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "local_date"?: string,"outcome"?: string,"type_id"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "movement_day_outcomes_user_id_local_date_fkey"
      columns: ["user_id","local_date"]
isOneToOne: false
      referencedRelation: "movement_days"
      referencedColumns: ["user_id","local_date"]
    },{
      foreignKeyName: "movement_day_outcomes_user_id_type_id_fkey"
      columns: ["user_id","type_id"]
isOneToOne: false
      referencedRelation: "movement_types"
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
                    "captured_time_zone": string,"created_at": string,"duration_minutes": number | null,"id": string,"local_date": string,"type_id": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "captured_time_zone": string,"created_at"?: string,"duration_minutes"?: number | null,"id": string,"local_date": string,"type_id": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "captured_time_zone"?: string,"created_at"?: string,"duration_minutes"?: number | null,"id"?: string,"local_date"?: string,"type_id"?: string,"updated_at"?: string,"user_id"?: string
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
                    "archived": boolean,"category": string | null,"id": string,"label": string,"origin": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "archived"?: boolean,"category"?: string | null,"id": string,"label": string,"origin": string,"user_id": string
                  }
                  Update: {
                    "archived"?: boolean,"category"?: string | null,"id"?: string,"label"?: string,"origin"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"muse_profiles": {
                  Row: {
                    "badges": (string)[],"banner_gradient": string,"bio": string,"created_at": string,"profile_theme": string,"sections": NonNullable<Json>,"tagline": string,"updated_at": string,"user_id": string,"visibility": string
                  }
                  ComputedFields: never
                  Insert: {
                    "badges"?: (string)[],"banner_gradient"?: string,"bio"?: string,"created_at"?: string,"profile_theme": string,"sections"?: NonNullable<Json>,"tagline"?: string,"updated_at"?: string,"user_id": string,"visibility"?: string
                  }
                  Update: {
                    "badges"?: (string)[],"banner_gradient"?: string,"bio"?: string,"created_at"?: string,"profile_theme"?: string,"sections"?: NonNullable<Json>,"tagline"?: string,"updated_at"?: string,"user_id"?: string,"visibility"?: string
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
                    "accent": string | null,"created_at": string,"document": NonNullable<Json>,"id": string,"pinned": boolean,"plain_text": string,"revision": number,"search_vector": unknown,"status": string,"title": string,"trashed_at": string | null,"trashed_from": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accent"?: string | null,"created_at"?: string,"document": NonNullable<Json>,"id": string,"pinned": boolean,"plain_text": string,"revision"?: number,"search_vector"?: never,"status": string,"title": string,"trashed_at"?: string | null,"trashed_from"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "accent"?: string | null,"created_at"?: string,"document"?: NonNullable<Json>,"id"?: string,"pinned"?: boolean,"plain_text"?: string,"revision"?: number,"search_vector"?: never,"status"?: string,"title"?: string,"trashed_at"?: string | null,"trashed_from"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"notes_board": {
                  Row: {
                    "created_at": string,"layout": NonNullable<Json>,"revision": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"layout"?: NonNullable<Json>,"revision"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"layout"?: NonNullable<Json>,"revision"?: number,"updated_at"?: string,"user_id"?: string
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
                },"paycheck_template_allocations": {
                  Row: {
                    "allocation_group_id": string,"bill_id": string | null,"card_id": string | null,"category_id": string | null,"name": string,"note": string | null,"planned_cents": number,"position": number,"subcategory_id": string | null,"template_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "allocation_group_id": string,"bill_id"?: string | null,"card_id"?: string | null,"category_id"?: string | null,"name": string,"note"?: string | null,"planned_cents": number,"position": number,"subcategory_id"?: string | null,"template_id": string,"user_id": string
                  }
                  Update: {
                    "allocation_group_id"?: string,"bill_id"?: string | null,"card_id"?: string | null,"category_id"?: string | null,"name"?: string,"note"?: string | null,"planned_cents"?: number,"position"?: number,"subcategory_id"?: string | null,"template_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "paycheck_template_allocations_user_id_allocation_group_id_fkey"
      columns: ["user_id","allocation_group_id"]
isOneToOne: false
      referencedRelation: "allocation_groups"
      referencedColumns: ["user_id","id"]
    },{
      foreignKeyName: "paycheck_template_allocations_user_id_bill_id_fkey"
      columns: ["user_id","bill_id"]
isOneToOne: false
      referencedRelation: "bills"
      referencedColumns: ["user_id","id"]
    },{
      foreignKeyName: "paycheck_template_allocations_user_id_card_id_fkey"
      columns: ["user_id","card_id"]
isOneToOne: false
      referencedRelation: "cards"
      referencedColumns: ["user_id","id"]
    },{
      foreignKeyName: "paycheck_template_allocations_user_id_category_id_fkey"
      columns: ["user_id","category_id"]
isOneToOne: false
      referencedRelation: "money_categories"
      referencedColumns: ["user_id","id"]
    },{
      foreignKeyName: "paycheck_template_allocations_user_id_category_id_subcateg_fkey"
      columns: ["user_id","category_id","subcategory_id"]
isOneToOne: false
      referencedRelation: "money_subcategories"
      referencedColumns: ["user_id","category_id","id"]
    },{
      foreignKeyName: "paycheck_template_allocations_user_id_template_id_fkey"
      columns: ["user_id","template_id"]
isOneToOne: false
      referencedRelation: "paycheck_templates"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"paycheck_templates": {
                  Row: {
                    "captured_time_zone": string,"created_at": string,"currency": string,"expected_cents": number | null,"id": string,"name": string,"position": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "captured_time_zone": string,"created_at"?: string,"currency"?: string,"expected_cents"?: number | null,"id": string,"name": string,"position"?: number,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "captured_time_zone"?: string,"created_at"?: string,"currency"?: string,"expected_cents"?: number | null,"id"?: string,"name"?: string,"position"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"paychecks": {
                  Row: {
                    "actual_cents": number | null,"captured_time_zone": string,"created_at": string,"currency": string,"expected_cents": number | null,"id": string,"name": string,"note": string | null,"period_end": string,"period_start": string,"position": number,"received_date": string,"template_id": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actual_cents"?: number | null,"captured_time_zone": string,"created_at"?: string,"currency"?: string,"expected_cents"?: number | null,"id": string,"name": string,"note"?: string | null,"period_end": string,"period_start": string,"position"?: number,"received_date": string,"template_id"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "actual_cents"?: number | null,"captured_time_zone"?: string,"created_at"?: string,"currency"?: string,"expected_cents"?: number | null,"id"?: string,"name"?: string,"note"?: string | null,"period_end"?: string,"period_start"?: string,"position"?: number,"received_date"?: string,"template_id"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "paychecks_user_id_template_id_fkey"
      columns: ["user_id","template_id"]
isOneToOne: false
      referencedRelation: "paycheck_templates"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"payment_methods": {
                  Row: {
                    "captured_time_zone": string,"created_at": string,"currency": string,"id": string,"name": string,"position": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "captured_time_zone": string,"created_at"?: string,"currency"?: string,"id": string,"name": string,"position"?: number,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "captured_time_zone"?: string,"created_at"?: string,"currency"?: string,"id"?: string,"name"?: string,"position"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"planner_agenda_layouts": {
                  Row: {
                    "created_at": string,"revision": number,"schema_version": number,"sections": NonNullable<Json>,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"revision"?: number,"schema_version"?: number,"sections": NonNullable<Json>,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"revision"?: number,"schema_version"?: number,"sections"?: NonNullable<Json>,"updated_at"?: string,"user_id"?: string
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
                },"planner_customizations": {
                  Row: {
                    "created_at": string,"library": NonNullable<Json>,"revision": number,"schema_version": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"library"?: NonNullable<Json>,"revision"?: number,"schema_version"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"library"?: NonNullable<Json>,"revision"?: number,"schema_version"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"planner_day_notes": {
                  Row: {
                    "body": string,"created_at": string,"items": NonNullable<Json>,"local_date": string,"revision": number,"section_id": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string,"created_at"?: string,"items"?: NonNullable<Json>,"local_date": string,"revision"?: number,"section_id": string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"items"?: NonNullable<Json>,"local_date"?: string,"revision"?: number,"section_id"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"planner_event_exceptions": {
                  Row: {
                    "canceled": boolean,"created_at": string,"event_id": string,"moved_to": string | null,"occurrence_date": string,"overrides": NonNullable<Json>,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "canceled"?: boolean,"created_at"?: string,"event_id": string,"moved_to"?: string | null,"occurrence_date": string,"overrides"?: NonNullable<Json>,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "canceled"?: boolean,"created_at"?: string,"event_id"?: string,"moved_to"?: string | null,"occurrence_date"?: string,"overrides"?: NonNullable<Json>,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "planner_event_exceptions_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "planner_events"
      referencedColumns: ["id"]
    }
                  ]
                },"planner_events": {
                  Row: {
                    "all_day": boolean,"created_at": string,"detail": string | null,"end_date": string | null,"end_time": string | null,"id": string,"local_date": string,"local_time": string | null,"location": string | null,"recurrence_rule": Json | null,"revision": number,"status": string,"time_zone": string,"title": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "all_day"?: boolean,"created_at"?: string,"detail"?: string | null,"end_date"?: string | null,"end_time"?: string | null,"id": string,"local_date": string,"local_time"?: string | null,"location"?: string | null,"recurrence_rule"?: Json | null,"revision"?: number,"status"?: string,"time_zone": string,"title": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "all_day"?: boolean,"created_at"?: string,"detail"?: string | null,"end_date"?: string | null,"end_time"?: string | null,"id"?: string,"local_date"?: string,"local_time"?: string | null,"location"?: string | null,"recurrence_rule"?: Json | null,"revision"?: number,"status"?: string,"time_zone"?: string,"title"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"planner_marks": {
                  Row: {
                    "color": string,"created_at": string,"end_date": string | null,"gradient": Json | null,"icon": string,"id": string,"label": string,"link_id": string | null,"link_kind": string | null,"local_date": string,"meaning": string | null,"revision": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "color"?: string,"created_at"?: string,"end_date"?: string | null,"gradient"?: Json | null,"icon": string,"id"?: string,"label"?: string,"link_id"?: string | null,"link_kind"?: string | null,"local_date": string,"meaning"?: string | null,"revision"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "color"?: string,"created_at"?: string,"end_date"?: string | null,"gradient"?: Json | null,"icon"?: string,"id"?: string,"label"?: string,"link_id"?: string | null,"link_kind"?: string | null,"local_date"?: string,"meaning"?: string | null,"revision"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"planner_running_orders": {
                  Row: {
                    "created_at": string,"revision": number,"task_ids": NonNullable<Json>,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"revision"?: number,"task_ids"?: NonNullable<Json>,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"revision"?: number,"task_ids"?: NonNullable<Json>,"updated_at"?: string,"user_id"?: string
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
                },"planner_week_sections": {
                  Row: {
                    "created_at": string,"items": NonNullable<Json>,"notes": string,"revision": number,"updated_at": string,"user_id": string,"week_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"items"?: NonNullable<Json>,"notes"?: string,"revision"?: number,"updated_at"?: string,"user_id"?: string,"week_start": string
                  }
                  Update: {
                    "created_at"?: string,"items"?: NonNullable<Json>,"notes"?: string,"revision"?: number,"updated_at"?: string,"user_id"?: string,"week_start"?: string
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
                    "cosmic_enabled": boolean,"created_at": string,"daily_forecast_category": string,"default_forecast_category": string,"default_forecast_period": string,"first_name": string,"id": string,"onboarded_at": string | null,"revision": number,"time_zone": string,"time_zone_confirmed_at": string | null,"updated_at": string,"zodiac_sign": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "cosmic_enabled"?: boolean,"created_at"?: string,"daily_forecast_category"?: string,"default_forecast_category"?: string,"default_forecast_period"?: string,"first_name"?: string,"id": string,"onboarded_at"?: string | null,"revision"?: number,"time_zone"?: string,"time_zone_confirmed_at"?: string | null,"updated_at"?: string,"zodiac_sign"?: string | null
                  }
                  Update: {
                    "cosmic_enabled"?: boolean,"created_at"?: string,"daily_forecast_category"?: string,"default_forecast_category"?: string,"default_forecast_period"?: string,"first_name"?: string,"id"?: string,"onboarded_at"?: string | null,"revision"?: number,"time_zone"?: string,"time_zone_confirmed_at"?: string | null,"updated_at"?: string,"zodiac_sign"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"recurring_commitments": {
                  Row: {
                    "amount_behavior": string,"amount_cents": number | null,"anchor_date": string,"billing_source": string,"cancelled_date": string | null,"captured_time_zone": string,"card_id": string | null,"category_id": string | null,"created_at": string,"currency": string,"end_date": string | null,"id": string,"interval_count": number,"interval_unit": string,"manage_at": string | null,"name": string,"note": string | null,"payment_method_id": string | null,"position": number,"status": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_behavior": string,"amount_cents"?: number | null,"anchor_date": string,"billing_source": string,"cancelled_date"?: string | null,"captured_time_zone": string,"card_id"?: string | null,"category_id"?: string | null,"created_at"?: string,"currency"?: string,"end_date"?: string | null,"id": string,"interval_count": number,"interval_unit": string,"manage_at"?: string | null,"name": string,"note"?: string | null,"payment_method_id"?: string | null,"position"?: number,"status": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "amount_behavior"?: string,"amount_cents"?: number | null,"anchor_date"?: string,"billing_source"?: string,"cancelled_date"?: string | null,"captured_time_zone"?: string,"card_id"?: string | null,"category_id"?: string | null,"created_at"?: string,"currency"?: string,"end_date"?: string | null,"id"?: string,"interval_count"?: number,"interval_unit"?: string,"manage_at"?: string | null,"name"?: string,"note"?: string | null,"payment_method_id"?: string | null,"position"?: number,"status"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "recurring_commitments_user_id_card_id_fkey"
      columns: ["user_id","card_id"]
isOneToOne: false
      referencedRelation: "cards"
      referencedColumns: ["user_id","id"]
    },{
      foreignKeyName: "recurring_commitments_user_id_category_id_fkey"
      columns: ["user_id","category_id"]
isOneToOne: false
      referencedRelation: "money_categories"
      referencedColumns: ["user_id","id"]
    },{
      foreignKeyName: "recurring_commitments_user_id_payment_method_id_fkey"
      columns: ["user_id","payment_method_id"]
isOneToOne: false
      referencedRelation: "payment_methods"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"recurring_versions": {
                  Row: {
                    "commitment_id": string,"definition": NonNullable<Json>,"recorded_at": string,"revision": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "commitment_id": string,"definition": NonNullable<Json>,"recorded_at"?: string,"revision": number,"user_id": string
                  }
                  Update: {
                    "commitment_id"?: string,"definition"?: NonNullable<Json>,"recorded_at"?: string,"revision"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "recurring_versions_user_id_commitment_id_fkey"
      columns: ["user_id","commitment_id"]
isOneToOne: false
      referencedRelation: "recurring_commitments"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"reflection_reviews": {
                  Row: {
                    "created_at": string,"id": string,"layout": string,"modules": NonNullable<Json>,"period": string,"period_end": string,"period_start": string,"revision": number,"status": string,"title": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"layout": string,"modules"?: NonNullable<Json>,"period": string,"period_end": string,"period_start": string,"revision"?: number,"status"?: string,"title"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"layout"?: string,"modules"?: NonNullable<Json>,"period"?: string,"period_end"?: string,"period_start"?: string,"revision"?: number,"status"?: string,"title"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"ritual_commands": {
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
                },"ritual_entries": {
                  Row: {
                    "captured_time_zone": string,"category": string | null,"created_at": string,"local_date": string,"outcome": string,"ritual_id": string,"updated_at": string,"user_id": string,"value": number
                  }
                  ComputedFields: never
                  Insert: {
                    "captured_time_zone": string,"category"?: string | null,"created_at"?: string,"local_date": string,"outcome": string,"ritual_id": string,"updated_at"?: string,"user_id": string,"value": number
                  }
                  Update: {
                    "captured_time_zone"?: string,"category"?: string | null,"created_at"?: string,"local_date"?: string,"outcome"?: string,"ritual_id"?: string,"updated_at"?: string,"user_id"?: string,"value"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "ritual_entries_user_id_ritual_id_fkey"
      columns: ["user_id","ritual_id"]
isOneToOne: false
      referencedRelation: "rituals"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"ritual_groups": {
                  Row: {
                    "accent": string,"collapsed": boolean,"gradient": Json | null,"icon_id": string,"id": string,"name": string,"position": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accent": string,"collapsed": boolean,"gradient"?: Json | null,"icon_id": string,"id": string,"name": string,"position": number,"user_id": string
                  }
                  Update: {
                    "accent"?: string,"collapsed"?: boolean,"gradient"?: Json | null,"icon_id"?: string,"id"?: string,"name"?: string,"position"?: number,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"ritual_inactive_periods": {
                  Row: {
                    "ends_before": string | null,"kind": string,"ritual_id": string,"starts_on": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ends_before"?: string | null,"kind": string,"ritual_id": string,"starts_on": string,"user_id": string
                  }
                  Update: {
                    "ends_before"?: string | null,"kind"?: string,"ritual_id"?: string,"starts_on"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ritual_inactive_periods_user_id_ritual_id_fkey"
      columns: ["user_id","ritual_id"]
isOneToOne: false
      referencedRelation: "rituals"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"ritual_tombstones": {
                  Row: {
                    "deleted_at": string,"id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "deleted_at"?: string,"id": string,"user_id": string
                  }
                  Update: {
                    "deleted_at"?: string,"id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"ritual_versions_owner": {
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
                },"rituals": {
                  Row: {
                    "captured_time_zone": string,"categories": Json | null,"connection": Json | null,"created_at": string,"emoji": string | null,"goal": number,"group_id": string,"id": string,"lifecycle_status": string,"name": string,"position": number,"recurrence": string,"start_date": string,"times_per_week": number | null,"tracking_type": string,"unit": string,"updated_at": string,"user_id": string,"weekdays": (number)[]
                  }
                  ComputedFields: never
                  Insert: {
                    "captured_time_zone": string,"categories"?: Json | null,"connection"?: Json | null,"created_at"?: string,"emoji"?: string | null,"goal": number,"group_id": string,"id": string,"lifecycle_status"?: string,"name": string,"position": number,"recurrence": string,"start_date": string,"times_per_week"?: number | null,"tracking_type": string,"unit": string,"updated_at"?: string,"user_id": string,"weekdays": (number)[]
                  }
                  Update: {
                    "captured_time_zone"?: string,"categories"?: Json | null,"connection"?: Json | null,"created_at"?: string,"emoji"?: string | null,"goal"?: number,"group_id"?: string,"id"?: string,"lifecycle_status"?: string,"name"?: string,"position"?: number,"recurrence"?: string,"start_date"?: string,"times_per_week"?: number | null,"tracking_type"?: string,"unit"?: string,"updated_at"?: string,"user_id"?: string,"weekdays"?: (number)[]
                  }
                  Relationships: [
                    {
      foreignKeyName: "rituals_user_id_group_id_fkey"
      columns: ["user_id","group_id"]
isOneToOne: false
      referencedRelation: "ritual_groups"
      referencedColumns: ["user_id","id"]
    }
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
                },"showcase_items": {
                  Row: {
                    "approved": (string)[],"created_at": string,"display": NonNullable<Json>,"id": string,"note": string,"position": number,"showcase_id": string,"snapshot_at": string,"source_id": string | null,"source_kind": string,"source_state": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "approved"?: (string)[],"created_at"?: string,"display": NonNullable<Json>,"id": string,"note"?: string,"position"?: number,"showcase_id": string,"snapshot_at"?: string,"source_id"?: string | null,"source_kind": string,"source_state"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "approved"?: (string)[],"created_at"?: string,"display"?: NonNullable<Json>,"id"?: string,"note"?: string,"position"?: number,"showcase_id"?: string,"snapshot_at"?: string,"source_id"?: string | null,"source_kind"?: string,"source_state"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "showcase_items_user_id_showcase_id_fkey"
      columns: ["user_id","showcase_id"]
isOneToOne: false
      referencedRelation: "showcases"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"showcases": {
                  Row: {
                    "created_at": string,"description": string,"gradient": string,"icon": string,"id": string,"layout": string,"position": number,"published_at": string | null,"title": string,"updated_at": string,"user_id": string,"visibility": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string,"gradient"?: string,"icon"?: string,"id": string,"layout"?: string,"position"?: number,"published_at"?: string | null,"title": string,"updated_at"?: string,"user_id": string,"visibility"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string,"gradient"?: string,"icon"?: string,"id"?: string,"layout"?: string,"position"?: number,"published_at"?: string | null,"title"?: string,"updated_at"?: string,"user_id"?: string,"visibility"?: string
                  }
                  Relationships: [
                    
                  ]
                },"social_blocks": {
                  Row: {
                    "blocked": string,"blocker": string,"created_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "blocked": string,"blocker": string,"created_at"?: string
                  }
                  Update: {
                    "blocked"?: string,"blocker"?: string,"created_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"social_identities": {
                  Row: {
                    "avatar_id": string,"created_at": string,"creator": boolean,"discoverable": boolean,"display_name": string,"participation": string,"public_id": string,"updated_at": string,"user_id": string,"username": string,"username_changed_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_id"?: string,"created_at"?: string,"creator"?: boolean,"discoverable"?: boolean,"display_name": string,"participation"?: string,"public_id"?: string,"updated_at"?: string,"user_id": string,"username": string,"username_changed_at"?: string
                  }
                  Update: {
                    "avatar_id"?: string,"created_at"?: string,"creator"?: boolean,"discoverable"?: boolean,"display_name"?: string,"participation"?: string,"public_id"?: string,"updated_at"?: string,"user_id"?: string,"username"?: string,"username_changed_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"stream_comments": {
                  Row: {
                    "author": string,"body": string,"created_at": string,"edited_at": string | null,"id": string,"post_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author": string,"body": string,"created_at"?: string,"edited_at"?: string | null,"id": string,"post_id": string
                  }
                  Update: {
                    "author"?: string,"body"?: string,"created_at"?: string,"edited_at"?: string | null,"id"?: string,"post_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "stream_comments_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "stream_posts"
      referencedColumns: ["id"]
    }
                  ]
                },"stream_notifications": {
                  Row: {
                    "actor": string,"comment_id": string | null,"created_at": string,"id": string,"kind": string,"post_id": string | null,"reaction": string | null,"read_at": string | null,"recipient": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor": string,"comment_id"?: string | null,"created_at"?: string,"id"?: string,"kind": string,"post_id"?: string | null,"reaction"?: string | null,"read_at"?: string | null,"recipient": string
                  }
                  Update: {
                    "actor"?: string,"comment_id"?: string | null,"created_at"?: string,"id"?: string,"kind"?: string,"post_id"?: string | null,"reaction"?: string | null,"read_at"?: string | null,"recipient"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "stream_notifications_comment_id_fkey"
      columns: ["comment_id"]
isOneToOne: false
      referencedRelation: "stream_comments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stream_notifications_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "stream_posts"
      referencedColumns: ["id"]
    }
                  ]
                },"stream_post_members": {
                  Row: {
                    "member": string,"post_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "member": string,"post_id": string
                  }
                  Update: {
                    "member"?: string,"post_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "stream_post_members_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "stream_posts"
      referencedColumns: ["id"]
    }
                  ]
                },"stream_posts": {
                  Row: {
                    "audience": string,"author": string,"body": string,"category": string | null,"comments_enabled": boolean,"created_at": string,"decoration": string | null,"display": Json | null,"edited_at": string | null,"id": string,"kind": string,"primary_reaction": string,"source_id": string | null,"source_kind": string | null,"source_state": string,"spoiler": boolean,"tag": Json | null
                  }
                  ComputedFields: never
                  Insert: {
                    "audience"?: string,"author": string,"body"?: string,"category"?: string | null,"comments_enabled"?: boolean,"created_at"?: string,"decoration"?: string | null,"display"?: Json | null,"edited_at"?: string | null,"id": string,"kind": string,"primary_reaction"?: string,"source_id"?: string | null,"source_kind"?: string | null,"source_state"?: string,"spoiler"?: boolean,"tag"?: Json | null
                  }
                  Update: {
                    "audience"?: string,"author"?: string,"body"?: string,"category"?: string | null,"comments_enabled"?: boolean,"created_at"?: string,"decoration"?: string | null,"display"?: Json | null,"edited_at"?: string | null,"id"?: string,"kind"?: string,"primary_reaction"?: string,"source_id"?: string | null,"source_kind"?: string | null,"source_state"?: string,"spoiler"?: boolean,"tag"?: Json | null
                  }
                  Relationships: [
                    
                  ]
                },"stream_preferences": {
                  Row: {
                    "notify_comments": boolean,"notify_friend_accepted": boolean,"notify_friend_requests": boolean,"notify_reactions": boolean,"show_in_navigation": boolean,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "notify_comments"?: boolean,"notify_friend_accepted"?: boolean,"notify_friend_requests"?: boolean,"notify_reactions"?: boolean,"show_in_navigation"?: boolean,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "notify_comments"?: boolean,"notify_friend_accepted"?: boolean,"notify_friend_requests"?: boolean,"notify_reactions"?: boolean,"show_in_navigation"?: boolean,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"stream_reactions": {
                  Row: {
                    "created_at": string,"post_id": string,"reaction": string,"reactor": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"post_id": string,"reaction": string,"reactor": string
                  }
                  Update: {
                    "created_at"?: string,"post_id"?: string,"reaction"?: string,"reactor"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "stream_reactions_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "stream_posts"
      referencedColumns: ["id"]
    }
                  ]
                },"stream_reports": {
                  Row: {
                    "comment_id": string | null,"created_at": string,"id": string,"note": string,"post_id": string,"reason": string,"reporter": string,"resolution": string | null,"resolution_note": string,"resolved_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "comment_id"?: string | null,"created_at"?: string,"id"?: string,"note"?: string,"post_id": string,"reason": string,"reporter": string,"resolution"?: string | null,"resolution_note"?: string,"resolved_at"?: string | null
                  }
                  Update: {
                    "comment_id"?: string | null,"created_at"?: string,"id"?: string,"note"?: string,"post_id"?: string,"reason"?: string,"reporter"?: string,"resolution"?: string | null,"resolution_note"?: string,"resolved_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "stream_reports_comment_id_fkey"
      columns: ["comment_id"]
isOneToOne: false
      referencedRelation: "stream_comments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stream_reports_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "stream_posts"
      referencedColumns: ["id"]
    }
                  ]
                },"stream_tags": {
                  Row: {
                    "created_at": string,"icon": string | null,"id": string,"name": string,"paint": Json | null,"position": number,"revision": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"icon"?: string | null,"id"?: string,"name": string,"paint"?: Json | null,"position"?: number,"revision"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"icon"?: string | null,"id"?: string,"name"?: string,"paint"?: Json | null,"position"?: number,"revision"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"task_completion_events": {
                  Row: {
                    "complete": boolean,"id": string,"local_date": string,"occurred_at": string,"occurrence_date": string | null,"planned_date": string | null,"task_id": string,"time_zone": string,"title": string,"user_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "complete": boolean,"id"?: string,"local_date": string,"occurred_at": string,"occurrence_date"?: string | null,"planned_date"?: string | null,"task_id": string,"time_zone": string,"title": string,"user_id": string,"workspace_id": string
                  }
                  Update: {
                    "complete"?: boolean,"id"?: string,"local_date"?: string,"occurred_at"?: string,"occurrence_date"?: string | null,"planned_date"?: string | null,"task_id"?: string,"time_zone"?: string,"title"?: string,"user_id"?: string,"workspace_id"?: string
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
                },"task_occurrences": {
                  Row: {
                    "completed_at": string | null,"completed_on": string | null,"created_at": string,"moved_to": string | null,"occurrence_date": string,"status": string,"task_id": string,"time_zone": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_at"?: string | null,"completed_on"?: string | null,"created_at"?: string,"moved_to"?: string | null,"occurrence_date": string,"status": string,"task_id": string,"time_zone": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "completed_at"?: string | null,"completed_on"?: string | null,"created_at"?: string,"moved_to"?: string | null,"occurrence_date"?: string,"status"?: string,"task_id"?: string,"time_zone"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "task_occurrences_user_id_task_id_fkey"
      columns: ["user_id","task_id"]
isOneToOne: false
      referencedRelation: "tasks"
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
                    "actual_minutes_baseline": number,"captured_time_zone": string,"complete": boolean,"completed_at": string | null,"created_at": string,"deleted_at": string | null,"detail": string | null,"due_date": string | null,"estimated_minutes": number | null,"group_id": string | null,"id": string,"initial_complete": boolean,"initial_completed_at": string | null,"local_time_slot": string | null,"notes": string | null,"origin_priority_id": string | null,"planned_date": string | null,"position": number,"recurrence_frequency": string | null,"recurrence_interval": number | null,"recurrence_rule": Json | null,"recurrence_until": string | null,"revision": number,"title": string,"updated_at": string,"user_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actual_minutes_baseline"?: number,"captured_time_zone": string,"complete"?: boolean,"completed_at"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"detail"?: string | null,"due_date"?: string | null,"estimated_minutes"?: number | null,"group_id"?: string | null,"id": string,"initial_complete"?: boolean,"initial_completed_at"?: string | null,"local_time_slot"?: string | null,"notes"?: string | null,"origin_priority_id"?: string | null,"planned_date"?: string | null,"position"?: number,"recurrence_frequency"?: string | null,"recurrence_interval"?: number | null,"recurrence_rule"?: Json | null,"recurrence_until"?: string | null,"revision"?: number,"title": string,"updated_at"?: string,"user_id": string,"workspace_id": string
                  }
                  Update: {
                    "actual_minutes_baseline"?: number,"captured_time_zone"?: string,"complete"?: boolean,"completed_at"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"detail"?: string | null,"due_date"?: string | null,"estimated_minutes"?: number | null,"group_id"?: string | null,"id"?: string,"initial_complete"?: boolean,"initial_completed_at"?: string | null,"local_time_slot"?: string | null,"notes"?: string | null,"origin_priority_id"?: string | null,"planned_date"?: string | null,"position"?: number,"recurrence_frequency"?: string | null,"recurrence_interval"?: number | null,"recurrence_rule"?: Json | null,"recurrence_until"?: string | null,"revision"?: number,"title"?: string,"updated_at"?: string,"user_id"?: string,"workspace_id"?: string
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
                },"transaction_splits": {
                  Row: {
                    "amount_cents": number,"category_id": string | null,"id": string,"position": number,"subcategory_id": string | null,"transaction_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_cents": number,"category_id"?: string | null,"id": string,"position": number,"subcategory_id"?: string | null,"transaction_id": string,"user_id": string
                  }
                  Update: {
                    "amount_cents"?: number,"category_id"?: string | null,"id"?: string,"position"?: number,"subcategory_id"?: string | null,"transaction_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "transaction_splits_user_id_category_id_fkey"
      columns: ["user_id","category_id"]
isOneToOne: false
      referencedRelation: "money_categories"
      referencedColumns: ["user_id","id"]
    },{
      foreignKeyName: "transaction_splits_user_id_category_id_subcategory_id_fkey"
      columns: ["user_id","category_id","subcategory_id"]
isOneToOne: false
      referencedRelation: "money_subcategories"
      referencedColumns: ["user_id","category_id","id"]
    },{
      foreignKeyName: "transaction_splits_user_id_transaction_id_fkey"
      columns: ["user_id","transaction_id"]
isOneToOne: false
      referencedRelation: "transactions"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"transaction_tag_links": {
                  Row: {
                    "tag_id": string,"transaction_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "tag_id": string,"transaction_id": string,"user_id": string
                  }
                  Update: {
                    "tag_id"?: string,"transaction_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "transaction_tag_links_user_id_tag_id_fkey"
      columns: ["user_id","tag_id"]
isOneToOne: false
      referencedRelation: "money_tags"
      referencedColumns: ["user_id","id"]
    },{
      foreignKeyName: "transaction_tag_links_user_id_transaction_id_fkey"
      columns: ["user_id","transaction_id"]
isOneToOne: false
      referencedRelation: "transactions"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"transactions": {
                  Row: {
                    "allocation_id": string | null,"amount_cents": number,"captured_time_zone": string,"card_id": string | null,"category_id": string | null,"created_at": string,"currency": string,"id": string,"local_date": string,"merchant": string,"note": string | null,"payment_label": string,"payment_method_id": string | null,"position": number,"subcategory_id": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "allocation_id"?: string | null,"amount_cents": number,"captured_time_zone": string,"card_id"?: string | null,"category_id"?: string | null,"created_at"?: string,"currency"?: string,"id": string,"local_date": string,"merchant": string,"note"?: string | null,"payment_label": string,"payment_method_id"?: string | null,"position"?: number,"subcategory_id"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "allocation_id"?: string | null,"amount_cents"?: number,"captured_time_zone"?: string,"card_id"?: string | null,"category_id"?: string | null,"created_at"?: string,"currency"?: string,"id"?: string,"local_date"?: string,"merchant"?: string,"note"?: string | null,"payment_label"?: string,"payment_method_id"?: string | null,"position"?: number,"subcategory_id"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "transactions_user_id_allocation_id_fkey"
      columns: ["user_id","allocation_id"]
isOneToOne: false
      referencedRelation: "allocations"
      referencedColumns: ["user_id","id"]
    },{
      foreignKeyName: "transactions_user_id_card_id_fkey"
      columns: ["user_id","card_id"]
isOneToOne: false
      referencedRelation: "cards"
      referencedColumns: ["user_id","id"]
    },{
      foreignKeyName: "transactions_user_id_category_id_fkey"
      columns: ["user_id","category_id"]
isOneToOne: false
      referencedRelation: "money_categories"
      referencedColumns: ["user_id","id"]
    },{
      foreignKeyName: "transactions_user_id_category_id_subcategory_id_fkey"
      columns: ["user_id","category_id","subcategory_id"]
isOneToOne: false
      referencedRelation: "money_subcategories"
      referencedColumns: ["user_id","category_id","id"]
    },{
      foreignKeyName: "transactions_user_id_payment_method_id_fkey"
      columns: ["user_id","payment_method_id"]
isOneToOne: false
      referencedRelation: "payment_methods"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"vision_boards": {
                  Row: {
                    "asset_paths": (string)[],"background": NonNullable<Json>,"created_at": string,"description": string | null,"elements": NonNullable<Json>,"id": string,"period": string | null,"period_start": string | null,"revision": number,"size": string,"theme": string | null,"title": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "asset_paths"?: (string)[],"background"?: NonNullable<Json>,"created_at"?: string,"description"?: string | null,"elements"?: NonNullable<Json>,"id"?: string,"period"?: string | null,"period_start"?: string | null,"revision"?: number,"size"?: string,"theme"?: string | null,"title": string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "asset_paths"?: (string)[],"background"?: NonNullable<Json>,"created_at"?: string,"description"?: string | null,"elements"?: NonNullable<Json>,"id"?: string,"period"?: string | null,"period_start"?: string | null,"revision"?: number,"size"?: string,"theme"?: string | null,"title"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
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
                },"wellness_goal_versions": {
                  Row: {
                    "direction": string,"effective_from": string,"goal_id": string,"recorded_at": string,"status": string,"target": number,"unit": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "direction": string,"effective_from": string,"goal_id": string,"recorded_at"?: string,"status": string,"target": number,"unit": string,"user_id": string
                  }
                  Update: {
                    "direction"?: string,"effective_from"?: string,"goal_id"?: string,"recorded_at"?: string,"status"?: string,"target"?: number,"unit"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "wellness_goal_versions_user_id_goal_id_fkey"
      columns: ["user_id","goal_id"]
isOneToOne: false
      referencedRelation: "wellness_goals"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"wellness_goals": {
                  Row: {
                    "created_at": string,"id": string,"metric": string,"period": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id": string,"metric": string,"period": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"metric"?: string,"period"?: string,"user_id"?: string
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
                },"whimsy_books": {
                  Row: {
                    "activity_date": string | null,"created_at": string,"id": string,"payload": NonNullable<Json>,"revision": number,"time_zone": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activity_date"?: string | null,"created_at"?: string,"id": string,"payload": NonNullable<Json>,"revision"?: number,"time_zone"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "activity_date"?: string | null,"created_at"?: string,"id"?: string,"payload"?: NonNullable<Json>,"revision"?: number,"time_zone"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"whimsy_card_meanings": {
                  Row: {
                    "activity_date": string | null,"created_at": string,"id": string,"payload": NonNullable<Json>,"revision": number,"time_zone": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activity_date"?: string | null,"created_at"?: string,"id": string,"payload": NonNullable<Json>,"revision"?: number,"time_zone"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "activity_date"?: string | null,"created_at"?: string,"id"?: string,"payload"?: NonNullable<Json>,"revision"?: number,"time_zone"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"whimsy_commands": {
                  Row: {
                    "id": string,"request_hash": string,"result": NonNullable<Json>,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id": string,"request_hash": string,"result": NonNullable<Json>,"user_id": string
                  }
                  Update: {
                    "id"?: string,"request_hash"?: string,"result"?: NonNullable<Json>,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"whimsy_content_links": {
                  Row: {
                    "content_id": string,"content_version": number,"kind": string,"record_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "content_id": string,"content_version": number,"kind": string,"record_id": string,"user_id": string
                  }
                  Update: {
                    "content_id"?: string,"content_version"?: number,"kind"?: string,"record_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "whimsy_content_links_content_id_content_version_fkey"
      columns: ["content_id","content_version"]
isOneToOne: false
      referencedRelation: "whimsy_content_versions"
      referencedColumns: ["content_id","version"]
    }
                  ]
                },"whimsy_content_versions": {
                  Row: {
                    "category": string,"content_id": string,"document": NonNullable<Json>,"experience": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "category": string,"content_id": string,"document": NonNullable<Json>,"experience": string,"version": number
                  }
                  Update: {
                    "category"?: string,"content_id"?: string,"document"?: NonNullable<Json>,"experience"?: string,"version"?: number
                  }
                  Relationships: [
                    
                  ]
                },"whimsy_dream_custom_symbols": {
                  Row: {
                    "created_at": string,"id": string,"name": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id": string,"name": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"whimsy_dream_entries": {
                  Row: {
                    "activity_date": string,"created_at": string,"id": string,"payload": NonNullable<Json>,"revision": number,"time_zone": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activity_date": string,"created_at"?: string,"id": string,"payload": NonNullable<Json>,"revision"?: number,"time_zone": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "activity_date"?: string,"created_at"?: string,"id"?: string,"payload"?: NonNullable<Json>,"revision"?: number,"time_zone"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"whimsy_dream_series": {
                  Row: {
                    "created_at": string,"id": string,"name": string,"revision": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id": string,"name": string,"revision"?: number,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string,"revision"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"whimsy_dream_series_entries": {
                  Row: {
                    "dream_id": string,"linked_at": string,"series_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "dream_id": string,"linked_at"?: string,"series_id": string,"user_id": string
                  }
                  Update: {
                    "dream_id"?: string,"linked_at"?: string,"series_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "whimsy_dream_series_entries_user_id_dream_id_fkey"
      columns: ["user_id","dream_id"]
isOneToOne: true
      referencedRelation: "whimsy_dream_entries"
      referencedColumns: ["user_id","id"]
    },{
      foreignKeyName: "whimsy_dream_series_entries_user_id_series_id_fkey"
      columns: ["user_id","series_id"]
isOneToOne: false
      referencedRelation: "whimsy_dream_series"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"whimsy_dream_symbol_meanings": {
                  Row: {
                    "meaning": string,"revision": number,"symbol_id": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "meaning": string,"revision"?: number,"symbol_id": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "meaning"?: string,"revision"?: number,"symbol_id"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"whimsy_fortune_assignments": {
                  Row: {
                    "activity_date": string,"created_at": string,"id": string,"payload": NonNullable<Json>,"revision": number,"time_zone": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activity_date": string,"created_at"?: string,"id": string,"payload": NonNullable<Json>,"revision"?: number,"time_zone": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "activity_date"?: string,"created_at"?: string,"id"?: string,"payload"?: NonNullable<Json>,"revision"?: number,"time_zone"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"whimsy_quest_completions": {
                  Row: {
                    "activity_date": string,"created_at": string,"id": string,"payload": NonNullable<Json>,"revision": number,"time_zone": string,"updated_at": string,"user_id": string,"week_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activity_date": string,"created_at"?: string,"id": string,"payload": NonNullable<Json>,"revision"?: number,"time_zone": string,"updated_at"?: string,"user_id": string,"week_id": string
                  }
                  Update: {
                    "activity_date"?: string,"created_at"?: string,"id"?: string,"payload"?: NonNullable<Json>,"revision"?: number,"time_zone"?: string,"updated_at"?: string,"user_id"?: string,"week_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "quest_week_owner"
      columns: ["user_id","week_id"]
isOneToOne: false
      referencedRelation: "whimsy_quest_weeks"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"whimsy_quest_preferences": {
                  Row: {
                    "experience": string,"revision": number,"updated_at": string,"user_id": string,"vibe": string
                  }
                  ComputedFields: never
                  Insert: {
                    "experience": string,"revision"?: number,"updated_at"?: string,"user_id": string,"vibe": string
                  }
                  Update: {
                    "experience"?: string,"revision"?: number,"updated_at"?: string,"user_id"?: string,"vibe"?: string
                  }
                  Relationships: [
                    
                  ]
                },"whimsy_quest_weeks": {
                  Row: {
                    "activity_date": string,"created_at": string,"id": string,"payload": NonNullable<Json>,"revision": number,"time_zone": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activity_date": string,"created_at"?: string,"id": string,"payload": NonNullable<Json>,"revision"?: number,"time_zone": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "activity_date"?: string,"created_at"?: string,"id"?: string,"payload"?: NonNullable<Json>,"revision"?: number,"time_zone"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"whimsy_reading_goals": {
                  Row: {
                    "activity_date": string | null,"created_at": string,"id": string,"payload": NonNullable<Json>,"revision": number,"time_zone": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activity_date"?: string | null,"created_at"?: string,"id": string,"payload": NonNullable<Json>,"revision"?: number,"time_zone"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "activity_date"?: string | null,"created_at"?: string,"id"?: string,"payload"?: NonNullable<Json>,"revision"?: number,"time_zone"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"whimsy_reading_sessions": {
                  Row: {
                    "activity_date": string,"book_id": string,"created_at": string,"id": string,"payload": NonNullable<Json>,"revision": number,"time_zone": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activity_date": string,"book_id": string,"created_at"?: string,"id": string,"payload": NonNullable<Json>,"revision"?: number,"time_zone": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "activity_date"?: string,"book_id"?: string,"created_at"?: string,"id"?: string,"payload"?: NonNullable<Json>,"revision"?: number,"time_zone"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reading_book_owner"
      columns: ["user_id","book_id"]
isOneToOne: false
      referencedRelation: "whimsy_books"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"whimsy_reading_timers": {
                  Row: {
                    "book_id": string,"payload": NonNullable<Json>,"revision": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "book_id": string,"payload": NonNullable<Json>,"revision"?: number,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "book_id"?: string,"payload"?: NonNullable<Json>,"revision"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "whimsy_reading_timers_user_id_book_id_fkey"
      columns: ["user_id","book_id"]
isOneToOne: false
      referencedRelation: "whimsy_books"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"whimsy_saved_discoveries": {
                  Row: {
                    "activity_date": string,"assignment_id": string,"created_at": string,"id": string,"payload": NonNullable<Json>,"revision": number,"time_zone": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activity_date": string,"assignment_id": string,"created_at"?: string,"id": string,"payload": NonNullable<Json>,"revision"?: number,"time_zone": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "activity_date"?: string,"assignment_id"?: string,"created_at"?: string,"id"?: string,"payload"?: NonNullable<Json>,"revision"?: number,"time_zone"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "fortune_owner"
      columns: ["user_id","assignment_id"]
isOneToOne: false
      referencedRelation: "whimsy_fortune_assignments"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"whimsy_tarot_daily_draws": {
                  Row: {
                    "activity_date": string,"card_id": string,"card_version": number,"deck_id": string,"drawn_at": string,"orientation": string,"time_zone": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activity_date": string,"card_id": string,"card_version": number,"deck_id": string,"drawn_at"?: string,"orientation": string,"time_zone": string,"user_id": string
                  }
                  Update: {
                    "activity_date"?: string,"card_id"?: string,"card_version"?: number,"deck_id"?: string,"drawn_at"?: string,"orientation"?: string,"time_zone"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "whimsy_tarot_daily_draws_card_id_card_version_fkey"
      columns: ["card_id","card_version"]
isOneToOne: false
      referencedRelation: "whimsy_content_versions"
      referencedColumns: ["content_id","version"]
    }
                  ]
                },"whimsy_tarot_followups": {
                  Row: {
                    "created_at": string,"id": string,"reading_id": string,"text": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id": string,"reading_id": string,"text": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"reading_id"?: string,"text"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "whimsy_tarot_followups_user_id_reading_id_fkey"
      columns: ["user_id","reading_id"]
isOneToOne: false
      referencedRelation: "whimsy_tarot_readings"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"whimsy_tarot_preferences": {
                  Row: {
                    "include_reversed": boolean,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "include_reversed"?: boolean,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "include_reversed"?: boolean,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"whimsy_tarot_readings": {
                  Row: {
                    "activity_date": string,"created_at": string,"id": string,"payload": NonNullable<Json>,"revision": number,"time_zone": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activity_date": string,"created_at"?: string,"id": string,"payload": NonNullable<Json>,"revision"?: number,"time_zone": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "activity_date"?: string,"created_at"?: string,"id"?: string,"payload"?: NonNullable<Json>,"revision"?: number,"time_zone"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"whimsy_widget_preferences": {
                  Row: {
                    "activity_date": string | null,"created_at": string,"id": string,"payload": NonNullable<Json>,"revision": number,"time_zone": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activity_date"?: string | null,"created_at"?: string,"id": string,"payload": NonNullable<Json>,"revision"?: number,"time_zone"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "activity_date"?: string | null,"created_at"?: string,"id"?: string,"payload"?: NonNullable<Json>,"revision"?: number,"time_zone"?: string | null,"updated_at"?: string,"user_id"?: string
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
"can_view_as_friend":
{ Args: { "owner": string }; Returns: boolean
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
"delete_whimsy_book":
{ Args: { "p_book_id": string,"p_command_id": string,"p_expected_revision": number }; Returns: Json
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
"import_whimsy_content":
{ Args: { "p_batch": Json }; Returns: number
                           },
"planner_command":
{ Args: { "p_action": Json,"p_command_id": string,"p_expected_revision": number }; Returns: number
                           },
"planner_complete_on":
{ Args: { "p_command_id": string,"p_expected_revision": number,"p_local_date": string,"p_task_id": string }; Returns: number
                           },
"planner_event_command":
{ Args: { "p_action": Json,"p_command_id": string,"p_expected_revision": number }; Returns: number
                           },
"planner_recurrence_command":
{ Args: { "p_action": Json,"p_command_id": string,"p_expected_revision": number }; Returns: number
                           },
"priority_day_end":
{ Args: { "p_date": string,"p_zone": string }; Returns: string
                           },
"profile_lookup":
{ Args: { "p_username": string }; Returns: string
                           },
"profile_view":
{ Args: { "p_profile": string }; Returns: Json
                           },
"read_astrology":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"read_constellations":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"read_daily_days":
{ Args: { "p_after"?: string,"p_end": string,"p_limit"?: number,"p_start": string }; Returns: Json
                           },
"read_money":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"read_notes":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"read_planner":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"read_planner_recurrence":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"read_quest_preference":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"read_reading_timer":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"read_rituals":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"read_wellness":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"read_whimsy":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"read_whimsy_page":
{ Args: { "p_after_created_at"?: string,"p_after_id"?: string,"p_kind": string,"p_limit"?: number }; Returns: Json
                           },
"read_whimsy_record":
{ Args: { "p_id": string,"p_kind": string }; Returns: Json
                           },
"rename_priority_task":
{ Args: { "p_command_id": string,"p_expected_planner_revision": number,"p_id": string,"p_priority_revision": number,"p_title": string }; Returns: number
                           },
"ritual_lifecycle":
{ Args: { "p_command_id": string,"p_confirm_delete"?: boolean,"p_expected_revision": number,"p_operation": string,"p_ritual_id": string }; Returns: number
                           },
"save_account_preferences":
{ Args: { "p_command_id": string,"p_expected_revision": number,"p_patch": Json }; Returns: number
                           },
"save_constellations":
{ Args: { "p_command_id": string,"p_expected_revision": number,"p_state": Json }; Returns: number
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
"save_money":
{ Args: { "p_command_id": string,"p_expected_revision": number,"p_state": Json }; Returns: number
                           },
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
"save_quest_preference":
{ Args: { "p_command_id": string,"p_expected_revision": number,"p_experience": string,"p_vibe": string }; Returns: Json
                           },
"save_reading_timer":
{ Args: { "p_command_id": string,"p_expected_revision": number,"p_payload": Json }; Returns: Json
                           },
"save_rituals":
{ Args: { "p_command_id": string,"p_expected_revision": number,"p_state": Json }; Returns: number
                           },
"save_wellness":
{ Args: { "p_command_id": string,"p_expected_revision": number,"p_state": Json }; Returns: number
                           },
"save_whimsy_record":
{ Args: { "p_command_id": string,"p_delete"?: boolean,"p_expected_revision": number,"p_kind": string,"p_record": Json }; Returns: Json
                           },
"set_card_accents":
{ Args: { "p_accents": Json }; Returns: undefined
                           },
"set_stream_preferences":
{ Args: { "p_comments": boolean,"p_friend_accepted": boolean,"p_friend_requests": boolean,"p_reactions": boolean,"p_show_in_navigation": boolean }; Returns: Json
                           },
"social_accept":
{ Args: { "p_target": string }; Returns: string
                           },
"social_block":
{ Args: { "p_target": string }; Returns: undefined
                           },
"social_cancel_request":
{ Args: { "p_target": string }; Returns: undefined
                           },
"social_create_identity":
{ Args: { "p_display_name": string,"p_username": string }; Returns: string
                           },
"social_decline":
{ Args: { "p_target": string }; Returns: undefined
                           },
"social_overview":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"social_remove_friend":
{ Args: { "p_target": string }; Returns: undefined
                           },
"social_respond":
{ Args: { "p_accept": boolean,"p_request": string }; Returns: string
                           },
"social_search":
{ Args: { "p_query": string }; Returns: Json
                           },
"social_send_request":
{ Args: { "p_target": string }; Returns: string
                           },
"social_set_username":
{ Args: { "p_username": string }; Returns: string
                           },
"social_unblock":
{ Args: { "p_target": string }; Returns: undefined
                           },
"social_username_status":
{ Args: { "p_username": string }; Returns: string
                           },
"stream_comment":
{ Args: { "p_body": string,"p_id": string,"p_post": string }; Returns: Json
                           },
"stream_comments":
{ Args: { "p_post": string }; Returns: Json
                           },
"stream_delete":
{ Args: { "p_id": string }; Returns: undefined
                           },
"stream_delete_comment":
{ Args: { "p_id": string }; Returns: undefined
                           },
"stream_edit":
{ Args: { "p_audience"?: string,"p_body": string,"p_comments_enabled"?: boolean,"p_decoration"?: string,"p_id": string,"p_members"?: (string)[],"p_spoiler"?: boolean }; Returns: Json
                           },
"stream_edit_comment":
{ Args: { "p_body": string,"p_id": string }; Returns: Json
                           },
"stream_feed":
{ Args: { "p_author"?: string,"p_before"?: string,"p_before_id"?: string,"p_category"?: string,"p_limit"?: number }; Returns: Json
                           },
"stream_mark_notifications_read":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"stream_notifications":
{ Args: { "p_limit"?: number }; Returns: Json
                           },
"stream_post":
{ Args: { "p_id": string }; Returns: Json
                           },
"stream_preferences":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"stream_publish":
{ Args: { "p_audience"?: string,"p_body": string,"p_category"?: string,"p_comments_enabled"?: boolean,"p_decoration"?: string,"p_display"?: Json,"p_id": string,"p_members"?: (string)[],"p_primary_reaction"?: string,"p_source_id"?: string,"p_source_kind"?: string,"p_spoiler"?: boolean }; Returns: Json
                           },
"stream_react":
{ Args: { "p_on": boolean,"p_post": string }; Returns: Json
                           },
"stream_report":
{ Args: { "p_comment"?: string,"p_note"?: string,"p_post": string,"p_reason"?: string }; Returns: undefined
                           },
"stream_report_resolve":
{ Args: { "p_note"?: string,"p_report": string,"p_resolution": string }; Returns: Json
                           },
"stream_reports_review":
{ Args: { "p_include_resolved"?: boolean }; Returns: Json
                           },
"stream_set_tag":
{ Args: { "p_id": string,"p_tag": Json }; Returns: undefined
                           },
"swap_collection_members":
{ Args: { "p_first": string,"p_first_revision": number,"p_second": string,"p_second_revision": number }; Returns: undefined
                           },
"task_completion_before":
{ Args: { "p_before": string,"p_task_id": string }; Returns: {
              "complete": boolean,"completed_at": string
            }[]
                           },
"write_astrology":
{ Args: { "p_command_id": string,"p_expected_revision": number,"p_operation": string,"p_record": Json,"p_user_id": string }; Returns: Json
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
