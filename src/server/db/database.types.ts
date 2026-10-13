
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "audit_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"details": NonNullable<Json>,"entity_id": string,"entity_type": string,"id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"entity_id": string,"entity_type": string,"id"?: never
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"entity_id"?: string,"entity_type"?: string,"id"?: never
                  }
                  Relationships: [
                    
                  ]
                },"categories": {
                  Row: {
                    "created_at": string,"description": string | null,"id": string,"name": string,"slug": string,"sort_order": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"name": string,"slug": string,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"name"?: string,"slug"?: string,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"contributor_private": {
                  Row: {
                    "contributor_id": string,"email": string | null,"notes": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "contributor_id": string,"email"?: string | null,"notes"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "contributor_id"?: string,"email"?: string | null,"notes"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "contributor_private_contributor_id_fkey"
      columns: ["contributor_id"]
isOneToOne: true
      referencedRelation: "contributors"
      referencedColumns: ["id"]
    }
                  ]
                },"contributors": {
                  Row: {
                    "avatar_asset_id": string | null,"bio": string | null,"cover_asset_id": string | null,"created_at": string,"descriptor": string | null,"expertise": (string)[],"id": string,"is_highlighted": boolean,"name": string,"profile_visible": boolean,"slug": string,"social_url": string | null,"updated_at": string,"website_url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_asset_id"?: string | null,"bio"?: string | null,"cover_asset_id"?: string | null,"created_at"?: string,"descriptor"?: string | null,"expertise"?: (string)[],"id"?: string,"is_highlighted"?: boolean,"name": string,"profile_visible"?: boolean,"slug": string,"social_url"?: string | null,"updated_at"?: string,"website_url"?: string | null
                  }
                  Update: {
                    "avatar_asset_id"?: string | null,"bio"?: string | null,"cover_asset_id"?: string | null,"created_at"?: string,"descriptor"?: string | null,"expertise"?: (string)[],"id"?: string,"is_highlighted"?: boolean,"name"?: string,"profile_visible"?: boolean,"slug"?: string,"social_url"?: string | null,"updated_at"?: string,"website_url"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "contributors_avatar_asset_id_fkey"
      columns: ["avatar_asset_id"]
isOneToOne: false
      referencedRelation: "media_assets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contributors_cover_asset_id_fkey"
      columns: ["cover_asset_id"]
isOneToOne: false
      referencedRelation: "media_assets"
      referencedColumns: ["id"]
    }
                  ]
                },"homepage_placements": {
                  Row: {
                    "created_at": string,"id": string,"position": number,"section": string,"story_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"position"?: number,"section": string,"story_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"position"?: number,"section"?: string,"story_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "homepage_placements_story_id_fkey"
      columns: ["story_id"]
isOneToOne: false
      referencedRelation: "stories"
      referencedColumns: ["id"]
    }
                  ]
                },"media_asset_private": {
                  Row: {
                    "asset_id": string,"license_note": string | null,"source_note": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "asset_id": string,"license_note"?: string | null,"source_note"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "asset_id"?: string,"license_note"?: string | null,"source_note"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "media_asset_private_asset_id_fkey"
      columns: ["asset_id"]
isOneToOne: true
      referencedRelation: "media_assets"
      referencedColumns: ["id"]
    }
                  ]
                },"media_assets": {
                  Row: {
                    "alt_text": string,"bucket": string,"byte_size": number,"caption": string | null,"created_at": string,"created_by": string | null,"credit": string | null,"height": number,"id": string,"mime_type": string,"storage_path": string,"updated_at": string,"width": number
                  }
                  ComputedFields: never
                  Insert: {
                    "alt_text"?: string,"bucket"?: string,"byte_size": number,"caption"?: string | null,"created_at"?: string,"created_by"?: string | null,"credit"?: string | null,"height": number,"id"?: string,"mime_type": string,"storage_path": string,"updated_at"?: string,"width": number
                  }
                  Update: {
                    "alt_text"?: string,"bucket"?: string,"byte_size"?: number,"caption"?: string | null,"created_at"?: string,"created_by"?: string | null,"credit"?: string | null,"height"?: number,"id"?: string,"mime_type"?: string,"storage_path"?: string,"updated_at"?: string,"width"?: number
                  }
                  Relationships: [
                    
                  ]
                },"pages": {
                  Row: {
                    "body": NonNullable<Json>,"created_at": string,"id": string,"is_published": boolean,"kind": string,"legal_reviewed": boolean,"seo_description": string | null,"seo_title": string | null,"slug": string,"summary": string | null,"title": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: NonNullable<Json>,"created_at"?: string,"id"?: string,"is_published"?: boolean,"kind"?: string,"legal_reviewed"?: boolean,"seo_description"?: string | null,"seo_title"?: string | null,"slug": string,"summary"?: string | null,"title": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "body"?: NonNullable<Json>,"created_at"?: string,"id"?: string,"is_published"?: boolean,"kind"?: string,"legal_reviewed"?: boolean,"seo_description"?: string | null,"seo_title"?: string | null,"slug"?: string,"summary"?: string | null,"title"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"display_name": string,"id": string,"role": Database["public"]['Enums']["editorial_role"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"display_name": string,"id": string,"role": Database["public"]['Enums']["editorial_role"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string,"id"?: string,"role"?: Database["public"]['Enums']["editorial_role"],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"rate_limits": {
                  Row: {
                    "hits": number,"key": string,"window_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "hits"?: number,"key": string,"window_start": string
                  }
                  Update: {
                    "hits"?: number,"key"?: string,"window_start"?: string
                  }
                  Relationships: [
                    
                  ]
                },"related_stories": {
                  Row: {
                    "position": number,"related_story_id": string,"story_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "position"?: number,"related_story_id": string,"story_id": string
                  }
                  Update: {
                    "position"?: number,"related_story_id"?: string,"story_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "related_stories_related_story_id_fkey"
      columns: ["related_story_id"]
isOneToOne: false
      referencedRelation: "stories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "related_stories_story_id_fkey"
      columns: ["story_id"]
isOneToOne: false
      referencedRelation: "stories"
      referencedColumns: ["id"]
    }
                  ]
                },"site_settings": {
                  Row: {
                    "key": string,"updated_at": string,"updated_by": string | null,"value": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "key": string,"updated_at"?: string,"updated_by"?: string | null,"value": NonNullable<Json>
                  }
                  Update: {
                    "key"?: string,"updated_at"?: string,"updated_by"?: string | null,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"stories": {
                  Row: {
                    "body": NonNullable<Json>,"body_text": string,"canonical_url_override": string | null,"category_id": string | null,"contributor_id": string | null,"created_at": string,"created_by": string | null,"format": string,"headline": string,"id": string,"lead_image_id": string | null,"og_image_id": string | null,"published_at": string | null,"reading_minutes": number,"search_tsv": unknown,"seo_description": string | null,"seo_title": string | null,"slug": string,"status": Database["public"]['Enums']["story_status"],"subtitle": string | null,"summary": string | null,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: NonNullable<Json>,"body_text"?: string,"canonical_url_override"?: string | null,"category_id"?: string | null,"contributor_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"format"?: string,"headline": string,"id"?: string,"lead_image_id"?: string | null,"og_image_id"?: string | null,"published_at"?: string | null,"reading_minutes"?: number,"search_tsv"?: never,"seo_description"?: string | null,"seo_title"?: string | null,"slug": string,"status"?: Database["public"]['Enums']["story_status"],"subtitle"?: string | null,"summary"?: string | null,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "body"?: NonNullable<Json>,"body_text"?: string,"canonical_url_override"?: string | null,"category_id"?: string | null,"contributor_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"format"?: string,"headline"?: string,"id"?: string,"lead_image_id"?: string | null,"og_image_id"?: string | null,"published_at"?: string | null,"reading_minutes"?: number,"search_tsv"?: never,"seo_description"?: string | null,"seo_title"?: string | null,"slug"?: string,"status"?: Database["public"]['Enums']["story_status"],"subtitle"?: string | null,"summary"?: string | null,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "stories_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stories_contributor_id_fkey"
      columns: ["contributor_id"]
isOneToOne: false
      referencedRelation: "contributors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stories_lead_image_id_fkey"
      columns: ["lead_image_id"]
isOneToOne: false
      referencedRelation: "media_assets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stories_og_image_id_fkey"
      columns: ["og_image_id"]
isOneToOne: false
      referencedRelation: "media_assets"
      referencedColumns: ["id"]
    }
                  ]
                },"story_slug_history": {
                  Row: {
                    "created_at": string,"slug": string,"story_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"slug": string,"story_id": string
                  }
                  Update: {
                    "created_at"?: string,"slug"?: string,"story_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "story_slug_history_story_id_fkey"
      columns: ["story_id"]
isOneToOne: false
      referencedRelation: "stories"
      referencedColumns: ["id"]
    }
                  ]
                },"story_tags": {
                  Row: {
                    "story_id": string,"tag_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "story_id": string,"tag_id": string
                  }
                  Update: {
                    "story_id"?: string,"tag_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "story_tags_story_id_fkey"
      columns: ["story_id"]
isOneToOne: false
      referencedRelation: "stories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "story_tags_tag_id_fkey"
      columns: ["tag_id"]
isOneToOne: false
      referencedRelation: "tags"
      referencedColumns: ["id"]
    }
                  ]
                },"submission_images": {
                  Row: {
                    "byte_size": number,"created_at": string,"height": number,"id": string,"mime_type": string,"position": number,"storage_path": string,"submission_id": string,"width": number
                  }
                  ComputedFields: never
                  Insert: {
                    "byte_size": number,"created_at"?: string,"height": number,"id"?: string,"mime_type": string,"position"?: number,"storage_path": string,"submission_id": string,"width": number
                  }
                  Update: {
                    "byte_size"?: number,"created_at"?: string,"height"?: number,"id"?: string,"mime_type"?: string,"position"?: number,"storage_path"?: string,"submission_id"?: string,"width"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "submission_images_submission_id_fkey"
      columns: ["submission_id"]
isOneToOne: false
      referencedRelation: "submissions"
      referencedColumns: ["id"]
    }
                  ]
                },"submissions": {
                  Row: {
                    "additional_info": string | null,"anonymized_at": string | null,"category_id": string | null,"consent_version": string,"consented_at": string,"created_at": string,"decided_at": string | null,"decided_by": string | null,"decision_note": string | null,"email": string,"id": string,"ip_hash": string | null,"name": string,"notification_error": string | null,"notification_status": Database["public"]['Enums']["delivery_status"],"pitch": string,"portfolio_url": string | null,"status": Database["public"]['Enums']["submission_status"],"story_id": string | null,"subject": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "additional_info"?: string | null,"anonymized_at"?: string | null,"category_id"?: string | null,"consent_version": string,"consented_at": string,"created_at"?: string,"decided_at"?: string | null,"decided_by"?: string | null,"decision_note"?: string | null,"email": string,"id"?: string,"ip_hash"?: string | null,"name": string,"notification_error"?: string | null,"notification_status"?: Database["public"]['Enums']["delivery_status"],"pitch": string,"portfolio_url"?: string | null,"status"?: Database["public"]['Enums']["submission_status"],"story_id"?: string | null,"subject": string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "additional_info"?: string | null,"anonymized_at"?: string | null,"category_id"?: string | null,"consent_version"?: string,"consented_at"?: string,"created_at"?: string,"decided_at"?: string | null,"decided_by"?: string | null,"decision_note"?: string | null,"email"?: string,"id"?: string,"ip_hash"?: string | null,"name"?: string,"notification_error"?: string | null,"notification_status"?: Database["public"]['Enums']["delivery_status"],"pitch"?: string,"portfolio_url"?: string | null,"status"?: Database["public"]['Enums']["submission_status"],"story_id"?: string | null,"subject"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "submissions_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "submissions_story_id_fkey"
      columns: ["story_id"]
isOneToOne: false
      referencedRelation: "stories"
      referencedColumns: ["id"]
    }
                  ]
                },"tags": {
                  Row: {
                    "created_at": string,"id": string,"name": string,"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string,"slug": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string,"slug"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "anonymize_closed_submissions":
{ Args: { "p_older_than": string }; Returns: number
                           },
"consume_rate_limit":
{ Args: { "p_key": string,"p_limit": number,"p_window_seconds": number }; Returns: boolean
                           },
"current_editorial_role":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["editorial_role"]
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_editor":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"search_stories":
{ Args: { "p_limit"?: number,"p_offset"?: number,"p_query": string }; Returns: {
              "id": string,"rank": number,"total_count": number
            }[]
                           }
          }
          Enums: {
            "delivery_status": "pending"|"sent"|"failed"|"skipped","editorial_role": "admin"|"editor","story_status": "draft"|"published"|"archived","submission_status": "submitted"|"in_review"|"accepted"|"declined"|"published"
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
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "delivery_status": ["pending", "sent", "failed", "skipped"],"editorial_role": ["admin", "editor"],"story_status": ["draft", "published", "archived"],"submission_status": ["submitted", "in_review", "accepted", "declined", "published"]
          }
        }
} as const
