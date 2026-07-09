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
      about_founders: {
        Row: {
          bio: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          linkedin_url: string
          name: string
          photo: string
          title: string
          twitter_url: string
        }
        Insert: {
          bio?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          linkedin_url?: string
          name: string
          photo?: string
          title?: string
          twitter_url?: string
        }
        Update: {
          bio?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          linkedin_url?: string
          name?: string
          photo?: string
          title?: string
          twitter_url?: string
        }
        Relationships: []
      }
      about_milestones: {
        Row: {
          created_at: string
          description: string
          display_order: number
          id: string
          is_active: boolean
          title: string
          year: string
        }
        Insert: {
          created_at?: string
          description?: string
          display_order?: number
          id?: string
          is_active?: boolean
          title: string
          year: string
        }
        Update: {
          created_at?: string
          description?: string
          display_order?: number
          id?: string
          is_active?: boolean
          title?: string
          year?: string
        }
        Relationships: []
      }
      about_page: {
        Row: {
          cta_subtitle: string
          cta_title: string
          hero_eyebrow: string
          hero_image: string
          hero_subtitle: string
          hero_title: string
          id: string
          meta_description: string
          meta_title: string
          mission: string
          story: string
          story_image: string
          updated_at: string
          vision: string
        }
        Insert: {
          cta_subtitle?: string
          cta_title?: string
          hero_eyebrow?: string
          hero_image?: string
          hero_subtitle?: string
          hero_title?: string
          id?: string
          meta_description?: string
          meta_title?: string
          mission?: string
          story?: string
          story_image?: string
          updated_at?: string
          vision?: string
        }
        Update: {
          cta_subtitle?: string
          cta_title?: string
          hero_eyebrow?: string
          hero_image?: string
          hero_subtitle?: string
          hero_title?: string
          id?: string
          meta_description?: string
          meta_title?: string
          mission?: string
          story?: string
          story_image?: string
          updated_at?: string
          vision?: string
        }
        Relationships: []
      }
      about_press: {
        Row: {
          created_at: string
          display_order: number
          headline: string
          id: string
          is_active: boolean
          logo: string
          outlet: string
          published_on: string
          url: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          headline?: string
          id?: string
          is_active?: boolean
          logo?: string
          outlet: string
          published_on?: string
          url?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          headline?: string
          id?: string
          is_active?: boolean
          logo?: string
          outlet?: string
          published_on?: string
          url?: string
        }
        Relationships: []
      }
      about_stats: {
        Row: {
          created_at: string
          description: string
          display_order: number
          icon_emoji: string
          id: string
          is_active: boolean
          label: string
          value: string
        }
        Insert: {
          created_at?: string
          description?: string
          display_order?: number
          icon_emoji?: string
          id?: string
          is_active?: boolean
          label: string
          value: string
        }
        Update: {
          created_at?: string
          description?: string
          display_order?: number
          icon_emoji?: string
          id?: string
          is_active?: boolean
          label?: string
          value?: string
        }
        Relationships: []
      }
      about_team: {
        Row: {
          created_at: string
          department: string
          display_order: number
          id: string
          is_active: boolean
          linkedin_url: string
          name: string
          photo: string
          role: string
        }
        Insert: {
          created_at?: string
          department?: string
          display_order?: number
          id?: string
          is_active?: boolean
          linkedin_url?: string
          name: string
          photo?: string
          role?: string
        }
        Update: {
          created_at?: string
          department?: string
          display_order?: number
          id?: string
          is_active?: boolean
          linkedin_url?: string
          name?: string
          photo?: string
          role?: string
        }
        Relationships: []
      }
      about_values: {
        Row: {
          created_at: string
          description: string
          display_order: number
          icon_emoji: string
          id: string
          is_active: boolean
          title: string
        }
        Insert: {
          created_at?: string
          description?: string
          display_order?: number
          icon_emoji?: string
          id?: string
          is_active?: boolean
          title: string
        }
        Update: {
          created_at?: string
          description?: string
          display_order?: number
          icon_emoji?: string
          id?: string
          is_active?: boolean
          title?: string
        }
        Relationships: []
      }
      ad_analytics_events: {
        Row: {
          ad_unit_id: string | null
          country: string | null
          created_at: string
          device: string | null
          event_type: string
          id: string
          page_url: string | null
        }
        Insert: {
          ad_unit_id?: string | null
          country?: string | null
          created_at?: string
          device?: string | null
          event_type: string
          id?: string
          page_url?: string | null
        }
        Update: {
          ad_unit_id?: string | null
          country?: string | null
          created_at?: string
          device?: string | null
          event_type?: string
          id?: string
          page_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_analytics_events_ad_unit_id_fkey"
            columns: ["ad_unit_id"]
            isOneToOne: false
            referencedRelation: "ad_units"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_scripts: {
        Row: {
          code: string
          created_at: string
          end_date: string | null
          id: string
          is_active: boolean
          location: string
          name: string
          notes: string | null
          start_date: string | null
          updated_at: string
        }
        Insert: {
          code?: string
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          location?: string
          name: string
          notes?: string | null
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          location?: string
          name?: string
          notes?: string | null
          start_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ad_units: {
        Row: {
          ad_format: string | null
          ad_slot_id: string | null
          ad_type: string
          created_at: string
          custom_html: string | null
          end_date: string | null
          full_width_responsive: boolean
          id: string
          is_active: boolean
          min_height: number | null
          min_width: number | null
          name: string
          placement: string
          position: string
          priority: number
          start_date: string | null
          target_categories: string[]
          target_countries: string[]
          target_devices: string[]
          target_roles: string[]
          updated_at: string
          url_pattern: string | null
        }
        Insert: {
          ad_format?: string | null
          ad_slot_id?: string | null
          ad_type?: string
          created_at?: string
          custom_html?: string | null
          end_date?: string | null
          full_width_responsive?: boolean
          id?: string
          is_active?: boolean
          min_height?: number | null
          min_width?: number | null
          name: string
          placement?: string
          position?: string
          priority?: number
          start_date?: string | null
          target_categories?: string[]
          target_countries?: string[]
          target_devices?: string[]
          target_roles?: string[]
          updated_at?: string
          url_pattern?: string | null
        }
        Update: {
          ad_format?: string | null
          ad_slot_id?: string | null
          ad_type?: string
          created_at?: string
          custom_html?: string | null
          end_date?: string | null
          full_width_responsive?: boolean
          id?: string
          is_active?: boolean
          min_height?: number | null
          min_width?: number | null
          name?: string
          placement?: string
          position?: string
          priority?: number
          start_date?: string | null
          target_categories?: string[]
          target_countries?: string[]
          target_devices?: string[]
          target_roles?: string[]
          updated_at?: string
          url_pattern?: string | null
        }
        Relationships: []
      }
      ads: {
        Row: {
          bg_gradient: string
          created_at: string
          cta_text: string
          end_date: string | null
          id: string
          image_url: string | null
          is_active: boolean
          link_url: string
          position: string
          priority: number
          start_date: string | null
          subtitle: string | null
          target_city: string | null
          target_item_slug: string | null
          target_page: string | null
          target_type: string
          title: string
          updated_at: string
          variant: string
        }
        Insert: {
          bg_gradient?: string
          created_at?: string
          cta_text?: string
          end_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string
          position?: string
          priority?: number
          start_date?: string | null
          subtitle?: string | null
          target_city?: string | null
          target_item_slug?: string | null
          target_page?: string | null
          target_type?: string
          title: string
          updated_at?: string
          variant?: string
        }
        Update: {
          bg_gradient?: string
          created_at?: string
          cta_text?: string
          end_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string
          position?: string
          priority?: number
          start_date?: string | null
          subtitle?: string | null
          target_city?: string | null
          target_item_slug?: string | null
          target_page?: string | null
          target_type?: string
          title?: string
          updated_at?: string
          variant?: string
        }
        Relationships: []
      }
      adsense_settings: {
        Row: {
          account_id: string | null
          ads_globally_enabled: boolean
          ads_per_page_limit: number
          api_keys: Json
          auto_ads_enabled: boolean
          body_scripts: string | null
          client_id: string | null
          created_at: string
          custom_css: string | null
          custom_js: string | null
          disabled_pages: string[]
          disabled_roles: string[]
          enabled_for_guests: boolean
          enabled_for_logged_in: boolean
          enabled_on_desktop: boolean
          enabled_on_mobile: boolean
          footer_scripts: string | null
          head_scripts: string | null
          id: string
          lazy_load_enabled: boolean
          publisher_id: string | null
          refresh_interval_seconds: number
          updated_at: string
          verification_meta: string | null
        }
        Insert: {
          account_id?: string | null
          ads_globally_enabled?: boolean
          ads_per_page_limit?: number
          api_keys?: Json
          auto_ads_enabled?: boolean
          body_scripts?: string | null
          client_id?: string | null
          created_at?: string
          custom_css?: string | null
          custom_js?: string | null
          disabled_pages?: string[]
          disabled_roles?: string[]
          enabled_for_guests?: boolean
          enabled_for_logged_in?: boolean
          enabled_on_desktop?: boolean
          enabled_on_mobile?: boolean
          footer_scripts?: string | null
          head_scripts?: string | null
          id?: string
          lazy_load_enabled?: boolean
          publisher_id?: string | null
          refresh_interval_seconds?: number
          updated_at?: string
          verification_meta?: string | null
        }
        Update: {
          account_id?: string | null
          ads_globally_enabled?: boolean
          ads_per_page_limit?: number
          api_keys?: Json
          auto_ads_enabled?: boolean
          body_scripts?: string | null
          client_id?: string | null
          created_at?: string
          custom_css?: string | null
          custom_js?: string | null
          disabled_pages?: string[]
          disabled_roles?: string[]
          enabled_for_guests?: boolean
          enabled_for_logged_in?: boolean
          enabled_on_desktop?: boolean
          enabled_on_mobile?: boolean
          footer_scripts?: string | null
          head_scripts?: string | null
          id?: string
          lazy_load_enabled?: boolean
          publisher_id?: string | null
          refresh_interval_seconds?: number
          updated_at?: string
          verification_meta?: string | null
        }
        Relationships: []
      }
      ai_content_reports: {
        Row: {
          admin_notes: string | null
          context: Json | null
          created_at: string
          full_content: string | null
          id: string
          message_excerpt: string | null
          page_url: string | null
          reason: string | null
          reporter_email: string | null
          reporter_name: string | null
          reporter_phone: string | null
          source: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          context?: Json | null
          created_at?: string
          full_content?: string | null
          id?: string
          message_excerpt?: string | null
          page_url?: string | null
          reason?: string | null
          reporter_email?: string | null
          reporter_name?: string | null
          reporter_phone?: string | null
          source: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          context?: Json | null
          created_at?: string
          full_content?: string | null
          id?: string
          message_excerpt?: string | null
          page_url?: string | null
          reason?: string | null
          reporter_email?: string | null
          reporter_name?: string | null
          reporter_phone?: string | null
          source?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ai_providers: {
        Row: {
          api_key_encrypted: string
          base_url: string
          created_at: string
          default_model: string
          display_name: string
          icon_emoji: string
          id: string
          is_active: boolean
          provider_name: string
          updated_at: string
        }
        Insert: {
          api_key_encrypted?: string
          base_url?: string
          created_at?: string
          default_model?: string
          display_name: string
          icon_emoji?: string
          id?: string
          is_active?: boolean
          provider_name: string
          updated_at?: string
        }
        Update: {
          api_key_encrypted?: string
          base_url?: string
          created_at?: string
          default_model?: string
          display_name?: string
          icon_emoji?: string
          id?: string
          is_active?: boolean
          provider_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      also_check_modules: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean
          icon: string | null
          id: string
          key: string
          sort_order: number
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          icon?: string | null
          id?: string
          key: string
          sort_order?: number
          title: string
          updated_at?: string
          url?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          icon?: string | null
          id?: string
          key?: string
          sort_order?: number
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      api_logs: {
        Row: {
          application_no: string | null
          batch_id: string | null
          campaign: string | null
          created_at: string
          data_push_type: string | null
          email: string | null
          form: string | null
          id: string
          lead_data: Json | null
          lead_id: string | null
          medium: string | null
          mobile: string | null
          response: string | null
          source: string | null
          status: string
          trigger_point: string | null
          university_id: string
          user_id: string | null
          webhook_id: string | null
        }
        Insert: {
          application_no?: string | null
          batch_id?: string | null
          campaign?: string | null
          created_at?: string
          data_push_type?: string | null
          email?: string | null
          form?: string | null
          id?: string
          lead_data?: Json | null
          lead_id?: string | null
          medium?: string | null
          mobile?: string | null
          response?: string | null
          source?: string | null
          status: string
          trigger_point?: string | null
          university_id: string
          user_id?: string | null
          webhook_id?: string | null
        }
        Update: {
          application_no?: string | null
          batch_id?: string | null
          campaign?: string | null
          created_at?: string
          data_push_type?: string | null
          email?: string | null
          form?: string | null
          id?: string
          lead_data?: Json | null
          lead_id?: string | null
          medium?: string | null
          mobile?: string | null
          response?: string | null
          source?: string | null
          status?: string
          trigger_point?: string | null
          university_id?: string
          user_id?: string | null
          webhook_id?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      approval_bodies: {
        Row: {
          code: string
          created_at: string
          description: string
          display_order: number
          id: string
          is_active: boolean
          logo_url: string
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string
          display_order?: number
          id?: string
          is_active?: boolean
          logo_url?: string
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          display_order?: number
          id?: string
          is_active?: boolean
          logo_url?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      article_categories: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      article_links: {
        Row: {
          article_id: string
          created_at: string
          entity_slug: string
          entity_type: string
          id: string
        }
        Insert: {
          article_id: string
          created_at?: string
          entity_slug: string
          entity_type: string
          id?: string
        }
        Update: {
          article_id?: string
          created_at?: string
          entity_slug?: string
          entity_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_links_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          author: string
          author_id: string | null
          category: string
          content: string
          created_at: string
          created_by: string | null
          description: string
          featured_image: string
          featured_rank: number | null
          id: string
          is_active: boolean
          meta_description: string
          meta_keywords: string
          meta_title: string
          slug: string
          status: string
          tags: string[]
          title: string
          updated_at: string
          vertical: string
          views: number
        }
        Insert: {
          author?: string
          author_id?: string | null
          category?: string
          content?: string
          created_at?: string
          created_by?: string | null
          description?: string
          featured_image?: string
          featured_rank?: number | null
          id?: string
          is_active?: boolean
          meta_description?: string
          meta_keywords?: string
          meta_title?: string
          slug: string
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
          vertical?: string
          views?: number
        }
        Update: {
          author?: string
          author_id?: string | null
          category?: string
          content?: string
          created_at?: string
          created_by?: string | null
          description?: string
          featured_image?: string
          featured_rank?: number | null
          id?: string
          is_active?: boolean
          meta_description?: string
          meta_keywords?: string
          meta_title?: string
          slug?: string
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
          vertical?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "articles_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
        ]
      }
      authors: {
        Row: {
          bio: string
          created_at: string
          designation: string
          display_order: number
          email: string
          expertise: string[]
          id: string
          is_active: boolean
          linkedin_url: string
          name: string
          photo: string
          short_bio: string
          slug: string
          twitter_url: string
          updated_at: string
          user_id: string | null
          website_url: string
        }
        Insert: {
          bio?: string
          created_at?: string
          designation?: string
          display_order?: number
          email?: string
          expertise?: string[]
          id?: string
          is_active?: boolean
          linkedin_url?: string
          name: string
          photo?: string
          short_bio?: string
          slug: string
          twitter_url?: string
          updated_at?: string
          user_id?: string | null
          website_url?: string
        }
        Update: {
          bio?: string
          created_at?: string
          designation?: string
          display_order?: number
          email?: string
          expertise?: string[]
          id?: string
          is_active?: boolean
          linkedin_url?: string
          name?: string
          photo?: string
          short_bio?: string
          slug?: string
          twitter_url?: string
          updated_at?: string
          user_id?: string | null
          website_url?: string
        }
        Relationships: []
      }
      career_course_links: {
        Row: {
          career_slug: string
          course_slug: string
          created_at: string
          id: string
        }
        Insert: {
          career_slug: string
          course_slug: string
          created_at?: string
          id?: string
        }
        Update: {
          career_slug?: string
          course_slug?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      career_profiles: {
        Row: {
          author_id: string | null
          avg_salary: string
          created_at: string
          description: string
          display_order: number
          domain: string
          experience_required: string
          growth: string
          icon_emoji: string
          id: string
          image: string
          is_active: boolean
          is_featured: boolean
          job_roles: Json
          meta_description: string
          meta_keywords: string
          meta_title: string
          name: string
          page_summary: string | null
          related_courses: string[]
          related_exams: string[]
          short_description: string
          slug: string
          status: string
          top_companies: string[]
          top_skills: string[]
          updated_at: string
          youtube_video_url: string
        }
        Insert: {
          author_id?: string | null
          avg_salary?: string
          created_at?: string
          description?: string
          display_order?: number
          domain?: string
          experience_required?: string
          growth?: string
          icon_emoji?: string
          id?: string
          image?: string
          is_active?: boolean
          is_featured?: boolean
          job_roles?: Json
          meta_description?: string
          meta_keywords?: string
          meta_title?: string
          name: string
          page_summary?: string | null
          related_courses?: string[]
          related_exams?: string[]
          short_description?: string
          slug: string
          status?: string
          top_companies?: string[]
          top_skills?: string[]
          updated_at?: string
          youtube_video_url?: string
        }
        Update: {
          author_id?: string | null
          avg_salary?: string
          created_at?: string
          description?: string
          display_order?: number
          domain?: string
          experience_required?: string
          growth?: string
          icon_emoji?: string
          id?: string
          image?: string
          is_active?: boolean
          is_featured?: boolean
          job_roles?: Json
          meta_description?: string
          meta_keywords?: string
          meta_title?: string
          name?: string
          page_summary?: string | null
          related_courses?: string[]
          related_exams?: string[]
          short_description?: string
          slug?: string
          status?: string
          top_companies?: string[]
          top_skills?: string[]
          updated_at?: string
          youtube_video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "career_profiles_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
        ]
      }
      college_applications: {
        Row: {
          admin_notes: string | null
          city: string | null
          college_name: string | null
          college_slug: string
          course_interest: string | null
          course_slug: string | null
          created_at: string
          email: string | null
          id: string
          message: string | null
          name: string
          phone: string
          state: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          city?: string | null
          college_name?: string | null
          college_slug: string
          course_interest?: string | null
          course_slug?: string | null
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          name: string
          phone: string
          state?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          city?: string | null
          college_name?: string | null
          college_slug?: string
          course_interest?: string | null
          course_slug?: string | null
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          name?: string
          phone?: string
          state?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      college_contacts: {
        Row: {
          address: string | null
          college_slug: string
          created_at: string
          email: string | null
          id: string
          map_embed: string | null
          map_link: string | null
          phone: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          college_slug: string
          created_at?: string
          email?: string | null
          id?: string
          map_embed?: string | null
          map_link?: string | null
          phone?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          college_slug?: string
          created_at?: string
          email?: string | null
          id?: string
          map_embed?: string | null
          map_link?: string | null
          phone?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      college_facilities: {
        Row: {
          college_slug: string
          created_at: string
          custom_note: string | null
          facility_id: string | null
          id: string
        }
        Insert: {
          college_slug: string
          created_at?: string
          custom_note?: string | null
          facility_id?: string | null
          id?: string
        }
        Update: {
          college_slug?: string
          created_at?: string
          custom_note?: string | null
          facility_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "college_facilities_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities_library"
            referencedColumns: ["id"]
          },
        ]
      }
      college_few_links: {
        Row: {
          created_at: string
          display_order: number
          icon_emoji: string
          id: string
          is_active: boolean
          program_slug: string
          title: string
          university_slug: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          icon_emoji?: string
          id?: string
          is_active?: boolean
          program_slug: string
          title: string
          university_slug: string
          updated_at?: string
          url?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          icon_emoji?: string
          id?: string
          is_active?: boolean
          program_slug?: string
          title?: string
          university_slug?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      college_programs: {
        Row: {
          created_at: string
          display_order: number
          icon_emoji: string
          id: string
          image: string
          is_active: boolean
          meta_description: string
          meta_title: string
          name: string
          short_description: string
          slug: string
          total_semesters: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          icon_emoji?: string
          id?: string
          image?: string
          is_active?: boolean
          meta_description?: string
          meta_title?: string
          name: string
          short_description?: string
          slug: string
          total_semesters?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          icon_emoji?: string
          id?: string
          image?: string
          is_active?: boolean
          meta_description?: string
          meta_title?: string
          name?: string
          short_description?: string
          slug?: string
          total_semesters?: number
          updated_at?: string
        }
        Relationships: []
      }
      college_quick_links: {
        Row: {
          created_at: string
          description: string
          display_order: number
          icon_emoji: string
          id: string
          is_active: boolean
          link_type: string
          program_slug: string
          semester_num: number | null
          title: string
          university_slug: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          description?: string
          display_order?: number
          icon_emoji?: string
          id?: string
          is_active?: boolean
          link_type?: string
          program_slug: string
          semester_num?: number | null
          title: string
          university_slug: string
          updated_at?: string
          url?: string
        }
        Update: {
          created_at?: string
          description?: string
          display_order?: number
          icon_emoji?: string
          id?: string
          is_active?: boolean
          link_type?: string
          program_slug?: string
          semester_num?: number | null
          title?: string
          university_slug?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      college_resources: {
        Row: {
          created_at: string
          description: string
          display_order: number
          external_url: string
          file_url: string
          id: string
          is_active: boolean
          resource_type: string
          subject_id: string
          title: string
          updated_at: string
          year: number | null
        }
        Insert: {
          created_at?: string
          description?: string
          display_order?: number
          external_url?: string
          file_url?: string
          id?: string
          is_active?: boolean
          resource_type?: string
          subject_id: string
          title: string
          updated_at?: string
          year?: number | null
        }
        Update: {
          created_at?: string
          description?: string
          display_order?: number
          external_url?: string
          file_url?: string
          id?: string
          is_active?: boolean
          resource_type?: string
          subject_id?: string
          title?: string
          updated_at?: string
          year?: number | null
        }
        Relationships: []
      }
      college_reviews: {
        Row: {
          body: string
          college_slug: string
          course: string | null
          created_at: string
          id: string
          is_anonymous: boolean
          last_report_reason: string | null
          moderation_note: string | null
          rating: number
          report_count: number
          reviewer_name: string
          status: string
          title: string
          updated_at: string
          user_id: string | null
          year_of_study: string | null
        }
        Insert: {
          body?: string
          college_slug: string
          course?: string | null
          created_at?: string
          id?: string
          is_anonymous?: boolean
          last_report_reason?: string | null
          moderation_note?: string | null
          rating?: number
          report_count?: number
          reviewer_name?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string | null
          year_of_study?: string | null
        }
        Update: {
          body?: string
          college_slug?: string
          course?: string | null
          created_at?: string
          id?: string
          is_anonymous?: boolean
          last_report_reason?: string | null
          moderation_note?: string | null
          rating?: number
          report_count?: number
          reviewer_name?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string | null
          year_of_study?: string | null
        }
        Relationships: []
      }
      college_semesters: {
        Row: {
          created_at: string
          description: string
          display_order: number
          id: string
          is_active: boolean
          program_slug: string
          semester_num: number
          title: string
          university_slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          display_order?: number
          id?: string
          is_active?: boolean
          program_slug: string
          semester_num: number
          title?: string
          university_slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          display_order?: number
          id?: string
          is_active?: boolean
          program_slug?: string
          semester_num?: number
          title?: string
          university_slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      college_subjects: {
        Row: {
          branch: string
          code: string
          created_at: string
          credits: number
          description: string
          display_order: number
          id: string
          is_active: boolean
          name: string
          program_slug: string
          semester_num: number
          slug: string
          university_slug: string
          updated_at: string
        }
        Insert: {
          branch?: string
          code?: string
          created_at?: string
          credits?: number
          description?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          program_slug: string
          semester_num: number
          slug: string
          university_slug: string
          updated_at?: string
        }
        Update: {
          branch?: string
          code?: string
          created_at?: string
          credits?: number
          description?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          program_slug?: string
          semester_num?: number
          slug?: string
          university_slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      college_toppers: {
        Row: {
          branch: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          marks: string
          name: string
          percentage: string
          photo: string
          program_slug: string
          quote: string
          rank: number
          university_slug: string
          updated_at: string
          year: number
        }
        Insert: {
          branch?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          marks?: string
          name: string
          percentage?: string
          photo?: string
          program_slug: string
          quote?: string
          rank?: number
          university_slug: string
          updated_at?: string
          year: number
        }
        Update: {
          branch?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          marks?: string
          name?: string
          percentage?: string
          photo?: string
          program_slug?: string
          quote?: string
          rank?: number
          university_slug?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      college_universities: {
        Row: {
          city: string
          created_at: string
          description: string
          display_order: number
          id: string
          is_active: boolean
          logo: string
          meta_description: string
          meta_title: string
          name: string
          program_slug: string
          short_name: string
          slug: string
          state: string
          total_semesters: number
          updated_at: string
        }
        Insert: {
          city?: string
          created_at?: string
          description?: string
          display_order?: number
          id?: string
          is_active?: boolean
          logo?: string
          meta_description?: string
          meta_title?: string
          name: string
          program_slug: string
          short_name?: string
          slug: string
          state?: string
          total_semesters?: number
          updated_at?: string
        }
        Update: {
          city?: string
          created_at?: string
          description?: string
          display_order?: number
          id?: string
          is_active?: boolean
          logo?: string
          meta_description?: string
          meta_title?: string
          name?: string
          program_slug?: string
          short_name?: string
          slug?: string
          state?: string
          total_semesters?: number
          updated_at?: string
        }
        Relationships: []
      }
      colleges: {
        Row: {
          admission_criteria_points: Json
          admission_deadline: string | null
          admission_process: string
          affiliation_kind: string
          apply_cta_mode: string
          apply_url: string | null
          approval_logo_names: string[]
          approval_logos: string[]
          approvals: string[]
          author_id: string | null
          banner_ad_image: string
          brochure_url: string
          carousel_images: string[]
          categories: string[]
          category: string
          city: string
          course_fee_content: string
          courses_count: number
          created_at: string
          cutoff: string
          description: string
          eligibility_criteria: string
          established: number
          facilities: string[]
          facilities_content: string
          featured_rank: number | null
          fees: string
          gallery_images: string[]
          highlights: string[]
          hostel_life: string
          id: string
          image: string
          is_active: boolean
          is_partner: boolean
          location: string
          logo: string
          meta_description: string
          meta_keywords: string
          meta_title: string
          naac_grade: string
          name: string
          page_summary: string | null
          parent_university_slug: string | null
          placement: string
          placement_content: string
          priority: number
          priority_updated_at: string
          ranking: string
          rankings_content: string
          rating: number
          related_courses: string[]
          related_exams: string[]
          reviews: number
          scholarship_available: string | null
          scholarship_details: string
          secondary_city: string | null
          secondary_state: string | null
          short_id: number
          short_name: string
          slug: string
          square_ad_image: string
          state: string
          status: string
          tags: string[]
          top_recruiters: string[]
          type: string
          updated_at: string
          youtube_video_url: string
        }
        Insert: {
          admission_criteria_points?: Json
          admission_deadline?: string | null
          admission_process?: string
          affiliation_kind?: string
          apply_cta_mode?: string
          apply_url?: string | null
          approval_logo_names?: string[]
          approval_logos?: string[]
          approvals?: string[]
          author_id?: string | null
          banner_ad_image?: string
          brochure_url?: string
          carousel_images?: string[]
          categories?: string[]
          category?: string
          city?: string
          course_fee_content?: string
          courses_count?: number
          created_at?: string
          cutoff?: string
          description?: string
          eligibility_criteria?: string
          established?: number
          facilities?: string[]
          facilities_content?: string
          featured_rank?: number | null
          fees?: string
          gallery_images?: string[]
          highlights?: string[]
          hostel_life?: string
          id?: string
          image?: string
          is_active?: boolean
          is_partner?: boolean
          location?: string
          logo?: string
          meta_description?: string
          meta_keywords?: string
          meta_title?: string
          naac_grade?: string
          name: string
          page_summary?: string | null
          parent_university_slug?: string | null
          placement?: string
          placement_content?: string
          priority?: number
          priority_updated_at?: string
          ranking?: string
          rankings_content?: string
          rating?: number
          related_courses?: string[]
          related_exams?: string[]
          reviews?: number
          scholarship_available?: string | null
          scholarship_details?: string
          secondary_city?: string | null
          secondary_state?: string | null
          short_id?: number
          short_name?: string
          slug: string
          square_ad_image?: string
          state?: string
          status?: string
          tags?: string[]
          top_recruiters?: string[]
          type?: string
          updated_at?: string
          youtube_video_url?: string
        }
        Update: {
          admission_criteria_points?: Json
          admission_deadline?: string | null
          admission_process?: string
          affiliation_kind?: string
          apply_cta_mode?: string
          apply_url?: string | null
          approval_logo_names?: string[]
          approval_logos?: string[]
          approvals?: string[]
          author_id?: string | null
          banner_ad_image?: string
          brochure_url?: string
          carousel_images?: string[]
          categories?: string[]
          category?: string
          city?: string
          course_fee_content?: string
          courses_count?: number
          created_at?: string
          cutoff?: string
          description?: string
          eligibility_criteria?: string
          established?: number
          facilities?: string[]
          facilities_content?: string
          featured_rank?: number | null
          fees?: string
          gallery_images?: string[]
          highlights?: string[]
          hostel_life?: string
          id?: string
          image?: string
          is_active?: boolean
          is_partner?: boolean
          location?: string
          logo?: string
          meta_description?: string
          meta_keywords?: string
          meta_title?: string
          naac_grade?: string
          name?: string
          page_summary?: string | null
          parent_university_slug?: string | null
          placement?: string
          placement_content?: string
          priority?: number
          priority_updated_at?: string
          ranking?: string
          rankings_content?: string
          rating?: number
          related_courses?: string[]
          related_exams?: string[]
          reviews?: number
          scholarship_available?: string | null
          scholarship_details?: string
          secondary_city?: string | null
          secondary_state?: string | null
          short_id?: number
          short_name?: string
          slug?: string
          square_ad_image?: string
          state?: string
          status?: string
          tags?: string[]
          top_recruiters?: string[]
          type?: string
          updated_at?: string
          youtube_video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "colleges_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          id: string
          logo: string | null
          name: string
          sector: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          logo?: string | null
          name: string
          sector?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          logo?: string | null
          name?: string
          sector?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      course_fees: {
        Row: {
          college_slug: string
          course_name: string | null
          course_slug: string
          created_at: string
          fee_amount: number | null
          fee_type: string | null
          id: string
          year: string | null
        }
        Insert: {
          college_slug: string
          course_name?: string | null
          course_slug: string
          created_at?: string
          fee_amount?: number | null
          fee_type?: string | null
          id?: string
          year?: string | null
        }
        Update: {
          college_slug?: string
          course_name?: string | null
          course_slug?: string
          created_at?: string
          fee_amount?: number | null
          fee_type?: string | null
          id?: string
          year?: string | null
        }
        Relationships: []
      }
      course_specializations: {
        Row: {
          course: string
          created_at: string
          id: string
          specialization: string | null
          university_id: string
        }
        Insert: {
          course: string
          created_at?: string
          id?: string
          specialization?: string | null
          university_id: string
        }
        Update: {
          course?: string
          created_at?: string
          id?: string
          specialization?: string | null
          university_id?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          about_content: string
          admission_process: string
          author_id: string | null
          avg_fees: string
          avg_salary: string
          careers: string[]
          categories: string[]
          category: string
          colleges_count: number
          created_at: string
          cutoff_content: string
          description: string
          domain: string
          duration: string
          duration_type: string
          eligibility: string
          fee: number
          fee_type: string
          fees_content: string
          full_name: string
          growth: string
          high_fee: number
          id: string
          image: string
          is_active: boolean
          level: string
          linked_college_subjects: string[]
          linked_school_classes: number[]
          low_fee: number
          meta_description: string
          meta_keywords: string
          meta_title: string
          mode: string
          name: string
          page_summary: string | null
          placements_content: string
          priority: number
          rating: number
          recruiters_content: string
          scope_content: string
          short_description: string
          short_id: number
          slug: string
          specialization_content: string
          specializations: string[]
          status: string
          study_type: string
          subjects: string[]
          subjects_content: string
          syllabus_content: string
          syllabus_pdf_url: string
          top_exams: string[]
          updated_at: string
          youtube_video_url: string
        }
        Insert: {
          about_content?: string
          admission_process?: string
          author_id?: string | null
          avg_fees?: string
          avg_salary?: string
          careers?: string[]
          categories?: string[]
          category?: string
          colleges_count?: number
          created_at?: string
          cutoff_content?: string
          description?: string
          domain?: string
          duration?: string
          duration_type?: string
          eligibility?: string
          fee?: number
          fee_type?: string
          fees_content?: string
          full_name?: string
          growth?: string
          high_fee?: number
          id?: string
          image?: string
          is_active?: boolean
          level?: string
          linked_college_subjects?: string[]
          linked_school_classes?: number[]
          low_fee?: number
          meta_description?: string
          meta_keywords?: string
          meta_title?: string
          mode?: string
          name: string
          page_summary?: string | null
          placements_content?: string
          priority?: number
          rating?: number
          recruiters_content?: string
          scope_content?: string
          short_description?: string
          short_id?: number
          slug: string
          specialization_content?: string
          specializations?: string[]
          status?: string
          study_type?: string
          subjects?: string[]
          subjects_content?: string
          syllabus_content?: string
          syllabus_pdf_url?: string
          top_exams?: string[]
          updated_at?: string
          youtube_video_url?: string
        }
        Update: {
          about_content?: string
          admission_process?: string
          author_id?: string | null
          avg_fees?: string
          avg_salary?: string
          careers?: string[]
          categories?: string[]
          category?: string
          colleges_count?: number
          created_at?: string
          cutoff_content?: string
          description?: string
          domain?: string
          duration?: string
          duration_type?: string
          eligibility?: string
          fee?: number
          fee_type?: string
          fees_content?: string
          full_name?: string
          growth?: string
          high_fee?: number
          id?: string
          image?: string
          is_active?: boolean
          level?: string
          linked_college_subjects?: string[]
          linked_school_classes?: number[]
          low_fee?: number
          meta_description?: string
          meta_keywords?: string
          meta_title?: string
          mode?: string
          name?: string
          page_summary?: string | null
          placements_content?: string
          priority?: number
          rating?: number
          recruiters_content?: string
          scope_content?: string
          short_description?: string
          short_id?: number
          slug?: string
          specialization_content?: string
          specializations?: string[]
          status?: string
          study_type?: string
          subjects?: string[]
          subjects_content?: string
          syllabus_content?: string
          syllabus_pdf_url?: string
          top_exams?: string[]
          updated_at?: string
          youtube_video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
        ]
      }
      cta_events: {
        Row: {
          created_at: string
          cta: string
          entity_name: string | null
          entity_slug: string | null
          id: string
          meta: Json | null
          page: string
          path: string | null
          referrer: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          created_at?: string
          cta: string
          entity_name?: string | null
          entity_slug?: string | null
          id?: string
          meta?: Json | null
          page: string
          path?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          created_at?: string
          cta?: string
          entity_name?: string | null
          entity_slug?: string | null
          id?: string
          meta?: Json | null
          page?: string
          path?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      custom_column_values: {
        Row: {
          column_id: string
          created_at: string
          id: string
          parent_column_id: string | null
          parent_value_id: string | null
          university_id: string
          value: string
        }
        Insert: {
          column_id: string
          created_at?: string
          id?: string
          parent_column_id?: string | null
          parent_value_id?: string | null
          university_id: string
          value: string
        }
        Update: {
          column_id?: string
          created_at?: string
          id?: string
          parent_column_id?: string | null
          parent_value_id?: string | null
          university_id?: string
          value?: string
        }
        Relationships: []
      }
      custom_columns: {
        Row: {
          column_key: string
          column_name: string
          created_at: string
          id: string
          is_required: boolean | null
          sort_order: number | null
          university_id: string
        }
        Insert: {
          column_key: string
          column_name: string
          created_at?: string
          id?: string
          is_required?: boolean | null
          sort_order?: number | null
          university_id: string
        }
        Update: {
          column_key?: string
          column_name?: string
          created_at?: string
          id?: string
          is_required?: boolean | null
          sort_order?: number | null
          university_id?: string
        }
        Relationships: []
      }
      email_log: {
        Row: {
          created_at: string
          error: string | null
          id: string
          message_id: string | null
          meta: Json
          provider_name: string
          status: string
          subject: string
          to_email: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          message_id?: string | null
          meta?: Json
          provider_name: string
          status: string
          subject: string
          to_email: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          message_id?: string | null
          meta?: Json
          provider_name?: string
          status?: string
          subject?: string
          to_email?: string
        }
        Relationships: []
      }
      email_providers: {
        Row: {
          api_key: string | null
          api_secret: string | null
          config_json: Json
          created_at: string
          display_name: string
          from_email: string | null
          from_name: string | null
          icon_emoji: string | null
          id: string
          is_active: boolean
          provider_name: string
          region: string | null
          reply_to: string | null
          updated_at: string
        }
        Insert: {
          api_key?: string | null
          api_secret?: string | null
          config_json?: Json
          created_at?: string
          display_name: string
          from_email?: string | null
          from_name?: string | null
          icon_emoji?: string | null
          id?: string
          is_active?: boolean
          provider_name: string
          region?: string | null
          reply_to?: string | null
          updated_at?: string
        }
        Update: {
          api_key?: string | null
          api_secret?: string | null
          config_json?: Json
          created_at?: string
          display_name?: string
          from_email?: string | null
          from_name?: string | null
          icon_emoji?: string | null
          id?: string
          is_active?: boolean
          provider_name?: string
          region?: string | null
          reply_to?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      exams: {
        Row: {
          age_limit: string
          applicants: string
          application_end_date: string
          application_mode: string
          application_process: string
          application_start_date: string
          author_id: string | null
          brochure_url: string
          cast_wise_fee: string
          categories: string[]
          category: string
          center_content: string
          counselling_content: string
          created_at: string
          cutoff_content: string
          dates_content: string
          description: string
          duration: string
          eligibility: string
          exam_date: string
          exam_pattern: string
          exam_type: string
          frequency: string
          full_name: string
          gender_wise: string
          how_to_apply_video_url: string | null
          id: string
          image: string
          important_dates: Json
          is_active: boolean
          is_top_exam: boolean
          language: string
          level: string
          linked_college_subjects: string[]
          linked_school_classes: number[]
          logo: string
          meta_description: string
          meta_keywords: string
          meta_title: string
          mode: string
          name: string
          negative_marking: boolean
          page_summary: string | null
          preparation_tips: string
          priority: number
          question_paper: string
          question_papers: Json
          registration_url: string
          result_content: string
          result_date: string
          sample_paper_url: string
          seats: string
          short_id: number
          short_name: string
          slug: string
          status: string
          summary_content: string
          syllabus: string[]
          top_colleges: string[]
          updated_at: string
          website: string
          youtube_video_url: string
        }
        Insert: {
          age_limit?: string
          applicants?: string
          application_end_date?: string
          application_mode?: string
          application_process?: string
          application_start_date?: string
          author_id?: string | null
          brochure_url?: string
          cast_wise_fee?: string
          categories?: string[]
          category?: string
          center_content?: string
          counselling_content?: string
          created_at?: string
          cutoff_content?: string
          dates_content?: string
          description?: string
          duration?: string
          eligibility?: string
          exam_date?: string
          exam_pattern?: string
          exam_type?: string
          frequency?: string
          full_name?: string
          gender_wise?: string
          how_to_apply_video_url?: string | null
          id?: string
          image?: string
          important_dates?: Json
          is_active?: boolean
          is_top_exam?: boolean
          language?: string
          level?: string
          linked_college_subjects?: string[]
          linked_school_classes?: number[]
          logo?: string
          meta_description?: string
          meta_keywords?: string
          meta_title?: string
          mode?: string
          name: string
          negative_marking?: boolean
          page_summary?: string | null
          preparation_tips?: string
          priority?: number
          question_paper?: string
          question_papers?: Json
          registration_url?: string
          result_content?: string
          result_date?: string
          sample_paper_url?: string
          seats?: string
          short_id?: number
          short_name?: string
          slug: string
          status?: string
          summary_content?: string
          syllabus?: string[]
          top_colleges?: string[]
          updated_at?: string
          website?: string
          youtube_video_url?: string
        }
        Update: {
          age_limit?: string
          applicants?: string
          application_end_date?: string
          application_mode?: string
          application_process?: string
          application_start_date?: string
          author_id?: string | null
          brochure_url?: string
          cast_wise_fee?: string
          categories?: string[]
          category?: string
          center_content?: string
          counselling_content?: string
          created_at?: string
          cutoff_content?: string
          dates_content?: string
          description?: string
          duration?: string
          eligibility?: string
          exam_date?: string
          exam_pattern?: string
          exam_type?: string
          frequency?: string
          full_name?: string
          gender_wise?: string
          how_to_apply_video_url?: string | null
          id?: string
          image?: string
          important_dates?: Json
          is_active?: boolean
          is_top_exam?: boolean
          language?: string
          level?: string
          linked_college_subjects?: string[]
          linked_school_classes?: number[]
          logo?: string
          meta_description?: string
          meta_keywords?: string
          meta_title?: string
          mode?: string
          name?: string
          negative_marking?: boolean
          page_summary?: string | null
          preparation_tips?: string
          priority?: number
          question_paper?: string
          question_papers?: Json
          registration_url?: string
          result_content?: string
          result_date?: string
          sample_paper_url?: string
          seats?: string
          short_id?: number
          short_name?: string
          slug?: string
          status?: string
          summary_content?: string
          syllabus?: string[]
          top_colleges?: string[]
          updated_at?: string
          website?: string
          youtube_video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
        ]
      }
      facilities_library: {
        Row: {
          created_at: string
          description: string | null
          icon_emoji: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon_emoji?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon_emoji?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      faculty: {
        Row: {
          bio: string | null
          college_slug: string
          created_at: string
          department: string | null
          designation: string | null
          display_order: number
          gender: string | null
          id: string
          is_active: boolean
          linkedin_url: string
          name: string
          photo: string | null
          qualification: string | null
          updated_at: string
        }
        Insert: {
          bio?: string | null
          college_slug: string
          created_at?: string
          department?: string | null
          designation?: string | null
          display_order?: number
          gender?: string | null
          id?: string
          is_active?: boolean
          linkedin_url?: string
          name: string
          photo?: string | null
          qualification?: string | null
          updated_at?: string
        }
        Update: {
          bio?: string | null
          college_slug?: string
          created_at?: string
          department?: string | null
          designation?: string | null
          display_order?: number
          gender?: string | null
          id?: string
          is_active?: boolean
          linkedin_url?: string
          name?: string
          photo?: string | null
          qualification?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      faqs: {
        Row: {
          answer: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          item_slug: string | null
          page: string
          question: string
          updated_at: string
        }
        Insert: {
          answer: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          item_slug?: string | null
          page?: string
          question: string
          updated_at?: string
        }
        Update: {
          answer?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          item_slug?: string | null
          page?: string
          question?: string
          updated_at?: string
        }
        Relationships: []
      }
      feature_toggles: {
        Row: {
          feature_key: string
          is_enabled: boolean
          label: string
          parent_key: string | null
          updated_at: string
        }
        Insert: {
          feature_key: string
          is_enabled?: boolean
          label?: string
          parent_key?: string | null
          updated_at?: string
        }
        Update: {
          feature_key?: string
          is_enabled?: boolean
          label?: string
          parent_key?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      featured_colleges: {
        Row: {
          category: string | null
          college_slug: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          state: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          college_slug: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          state?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          college_slug?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      hero_banners: {
        Row: {
          created_at: string
          cta_text: string
          display_order: number
          id: string
          image_url: string
          is_active: boolean
          link_url: string
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cta_text?: string
          display_order?: number
          id?: string
          image_url: string
          is_active?: boolean
          link_url?: string
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cta_text?: string
          display_order?: number
          id?: string
          image_url?: string
          is_active?: boolean
          link_url?: string
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      hero_categories: {
        Row: {
          created_at: string
          display_order: number
          href: string
          id: string
          image_url: string
          is_active: boolean
          key: string
          label: string
          tint: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          href?: string
          id?: string
          image_url?: string
          is_active?: boolean
          key: string
          label: string
          tint?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          href?: string
          id?: string
          image_url?: string
          is_active?: boolean
          key?: string
          label?: string
          tint?: string
          updated_at?: string
        }
        Relationships: []
      }
      hero_settings: {
        Row: {
          blur_px: number
          brightness: number
          created_at: string
          grayscale: number
          id: string
          image_urls: string[]
          is_active: boolean
          overlay_mode: string
          overlay_opacity: number
          rotation_seconds: number
          saturation: number
          tint_color: string
          updated_at: string
        }
        Insert: {
          blur_px?: number
          brightness?: number
          created_at?: string
          grayscale?: number
          id?: string
          image_urls?: string[]
          is_active?: boolean
          overlay_mode?: string
          overlay_opacity?: number
          rotation_seconds?: number
          saturation?: number
          tint_color?: string
          updated_at?: string
        }
        Update: {
          blur_px?: number
          brightness?: number
          created_at?: string
          grayscale?: number
          id?: string
          image_urls?: string[]
          is_active?: boolean
          overlay_mode?: string
          overlay_opacity?: number
          rotation_seconds?: number
          saturation?: number
          tint_color?: string
          updated_at?: string
        }
        Relationships: []
      }
      intent_alerts: {
        Row: {
          alert_type: string
          college_slug: string | null
          course_slug: string | null
          created_at: string
          delivered: boolean
          delivered_at: string | null
          delivery_attempts: number
          id: string
          last_attempt_at: string | null
          last_error: string | null
          payload: Json
          score: number | null
          subject_id: string
          subject_type: string
        }
        Insert: {
          alert_type: string
          college_slug?: string | null
          course_slug?: string | null
          created_at?: string
          delivered?: boolean
          delivered_at?: string | null
          delivery_attempts?: number
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          payload?: Json
          score?: number | null
          subject_id: string
          subject_type: string
        }
        Update: {
          alert_type?: string
          college_slug?: string | null
          course_slug?: string | null
          created_at?: string
          delivered?: boolean
          delivered_at?: string | null
          delivery_attempts?: number
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          payload?: Json
          score?: number | null
          subject_id?: string
          subject_type?: string
        }
        Relationships: []
      }
      intent_crm_exports: {
        Row: {
          created_at: string
          filters: Json
          format: string
          id: string
          requested_by: string | null
          row_count: number
        }
        Insert: {
          created_at?: string
          filters?: Json
          format?: string
          id?: string
          requested_by?: string | null
          row_count?: number
        }
        Update: {
          created_at?: string
          filters?: Json
          format?: string
          id?: string
          requested_by?: string | null
          row_count?: number
        }
        Relationships: []
      }
      intent_event_weights: {
        Row: {
          category: string | null
          event_type: string
          is_active: boolean
          label: string
          updated_at: string
          weight: number
        }
        Insert: {
          category?: string | null
          event_type: string
          is_active?: boolean
          label: string
          updated_at?: string
          weight?: number
        }
        Update: {
          category?: string | null
          event_type?: string
          is_active?: boolean
          label?: string
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      intent_events: {
        Row: {
          city: string | null
          college_slug: string | null
          country: string | null
          course_slug: string | null
          device_type: string | null
          event_type: string
          exam_slug: string | null
          id: number
          metadata: Json
          occurred_at: string
          page_url: string | null
          referrer: string | null
          score_delta: number
          session_id: string | null
          state: string | null
          traffic_source: string | null
          university_slug: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          visitor_id: string | null
        }
        Insert: {
          city?: string | null
          college_slug?: string | null
          country?: string | null
          course_slug?: string | null
          device_type?: string | null
          event_type: string
          exam_slug?: string | null
          id?: number
          metadata?: Json
          occurred_at?: string
          page_url?: string | null
          referrer?: string | null
          score_delta?: number
          session_id?: string | null
          state?: string | null
          traffic_source?: string | null
          university_slug?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_id?: string | null
        }
        Update: {
          city?: string | null
          college_slug?: string | null
          country?: string | null
          course_slug?: string | null
          device_type?: string | null
          event_type?: string
          exam_slug?: string | null
          id?: number
          metadata?: Json
          occurred_at?: string
          page_url?: string | null
          referrer?: string | null
          score_delta?: number
          session_id?: string | null
          state?: string | null
          traffic_source?: string | null
          university_slug?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_id?: string | null
        }
        Relationships: []
      }
      intent_lead_scores: {
        Row: {
          category: string
          created_at: string
          event_count: number
          first_event_at: string | null
          id: string
          last_event_at: string | null
          last_event_type: string | null
          lead_id: string | null
          score: number
          signals: Json
          subject_id: string
          subject_type: string
          top_college_slug: string | null
          top_course_slug: string | null
          top_exam_slug: string | null
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          event_count?: number
          first_event_at?: string | null
          id?: string
          last_event_at?: string | null
          last_event_type?: string | null
          lead_id?: string | null
          score?: number
          signals?: Json
          subject_id: string
          subject_type: string
          top_college_slug?: string | null
          top_course_slug?: string | null
          top_exam_slug?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          event_count?: number
          first_event_at?: string | null
          id?: string
          last_event_at?: string | null
          last_event_type?: string | null
          lead_id?: string | null
          score?: number
          signals?: Json
          subject_id?: string
          subject_type?: string
          top_college_slug?: string | null
          top_course_slug?: string | null
          top_exam_slug?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intent_lead_scores_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      intent_university_webhooks: {
        Row: {
          alert_types: string[]
          college_slug: string | null
          created_at: string
          failures: number
          id: string
          is_active: boolean
          last_delivery_at: string | null
          name: string
          secret: string | null
          threshold_score: number
          university_slug: string | null
          updated_at: string
          webhook_url: string
        }
        Insert: {
          alert_types?: string[]
          college_slug?: string | null
          created_at?: string
          failures?: number
          id?: string
          is_active?: boolean
          last_delivery_at?: string | null
          name: string
          secret?: string | null
          threshold_score?: number
          university_slug?: string | null
          updated_at?: string
          webhook_url: string
        }
        Update: {
          alert_types?: string[]
          college_slug?: string | null
          created_at?: string
          failures?: number
          id?: string
          is_active?: boolean
          last_delivery_at?: string | null
          name?: string
          secret?: string | null
          threshold_score?: number
          university_slug?: string | null
          updated_at?: string
          webhook_url?: string
        }
        Relationships: []
      }
      intent_visitors: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          device_type: string | null
          first_seen_at: string
          landing_url: string | null
          last_seen_at: string
          merged_user_id: string | null
          referrer: string | null
          state: string | null
          updated_at: string
          user_agent: string | null
          utm: Json
          visitor_id: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          first_seen_at?: string
          landing_url?: string | null
          last_seen_at?: string
          merged_user_id?: string | null
          referrer?: string | null
          state?: string | null
          updated_at?: string
          user_agent?: string | null
          utm?: Json
          visitor_id?: string
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          first_seen_at?: string
          landing_url?: string | null
          last_seen_at?: string
          merged_user_id?: string | null
          referrer?: string | null
          state?: string | null
          updated_at?: string
          user_agent?: string | null
          utm?: Json
          visitor_id?: string
        }
        Relationships: []
      }
      job_applications: {
        Row: {
          admin_notes: string | null
          company: string | null
          cover_letter: string | null
          created_at: string
          current_company: string | null
          current_designation: string | null
          current_location: string | null
          email: string
          expected_salary: string | null
          experience: string | null
          full_name: string
          id: string
          job_id: string | null
          job_slug: string
          job_title: string | null
          linkedin_url: string | null
          notice_period: string | null
          phone: string
          portfolio_url: string | null
          resume_url: string | null
          source: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          company?: string | null
          cover_letter?: string | null
          created_at?: string
          current_company?: string | null
          current_designation?: string | null
          current_location?: string | null
          email: string
          expected_salary?: string | null
          experience?: string | null
          full_name: string
          id?: string
          job_id?: string | null
          job_slug: string
          job_title?: string | null
          linkedin_url?: string | null
          notice_period?: string | null
          phone: string
          portfolio_url?: string | null
          resume_url?: string | null
          source?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          company?: string | null
          cover_letter?: string | null
          created_at?: string
          current_company?: string | null
          current_designation?: string | null
          current_location?: string | null
          email?: string
          expected_salary?: string | null
          experience?: string | null
          full_name?: string
          id?: string
          job_id?: string | null
          job_slug?: string
          job_title?: string | null
          linkedin_url?: string | null
          notice_period?: string | null
          phone?: string
          portfolio_url?: string | null
          resume_url?: string | null
          source?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          apply_email: string | null
          apply_url: string | null
          category: string | null
          company: string
          company_logo: string | null
          created_at: string
          description: string | null
          display_order: number
          experience: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          is_featured: boolean
          is_remote: boolean
          job_type: string | null
          location: string | null
          meta_description: string | null
          meta_keywords: string | null
          meta_title: string | null
          posted_at: string
          requirements: string | null
          responsibilities: string | null
          salary: string | null
          short_description: string | null
          skills: string[] | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          apply_email?: string | null
          apply_url?: string | null
          category?: string | null
          company: string
          company_logo?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          experience?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          is_remote?: boolean
          job_type?: string | null
          location?: string | null
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          posted_at?: string
          requirements?: string | null
          responsibilities?: string | null
          salary?: string | null
          short_description?: string | null
          skills?: string[] | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          apply_email?: string | null
          apply_url?: string | null
          category?: string | null
          company?: string
          company_logo?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          experience?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          is_remote?: boolean
          job_type?: string | null
          location?: string | null
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          posted_at?: string
          requirements?: string | null
          responsibilities?: string | null
          salary?: string | null
          short_description?: string | null
          skills?: string[] | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      landing_page_leads: {
        Row: {
          city: string | null
          consent: boolean
          course: string | null
          created_at: string
          email: string | null
          fbclid: string | null
          gclid: string | null
          id: string
          landing_slug: string
          name: string
          page_url: string | null
          phone: string
          referrer: string | null
          state: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          city?: string | null
          consent?: boolean
          course?: string | null
          created_at?: string
          email?: string | null
          fbclid?: string | null
          gclid?: string | null
          id?: string
          landing_slug: string
          name: string
          page_url?: string | null
          phone: string
          referrer?: string | null
          state?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          city?: string | null
          consent?: boolean
          course?: string | null
          created_at?: string
          email?: string | null
          fbclid?: string | null
          gclid?: string | null
          id?: string
          landing_slug?: string
          name?: string
          page_url?: string | null
          phone?: string
          referrer?: string | null
          state?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      landing_pages: {
        Row: {
          advertiser_address: string
          advertiser_contact: string
          advertiser_name: string
          brand_name: string
          courses: Json
          courses_subtitle: string
          courses_title: string
          created_at: string
          cta_href: string
          cta_label: string
          disclosure_text: string
          exam_ad: Json
          eyebrow: string
          faqs: Json
          footer_text: string
          form_consent_text: string
          form_courses: Json
          form_submit_label: string
          form_subtitle: string
          form_title: string
          ga_id: string
          gtm_id: string
          hero_subtitle: string
          hero_title: string
          id: string
          is_active: boolean
          logo_url: string
          lp_type: string
          meta_description: string
          meta_keywords: string
          meta_pixel_id: string
          meta_title: string
          multiple_colleges: Json
          multiple_layout: string
          nav_links: Json
          og_image: string
          primary_cta_href: string
          primary_cta_label: string
          privacy_url: string
          secondary_cta_href: string
          secondary_cta_label: string
          slug: string
          stats: Json
          terms_url: string
          testimonials: Json
          testimonials_title: string
          theme: Json
          updated_at: string
          why_items: Json
          why_subtitle: string
          why_title: string
        }
        Insert: {
          advertiser_address?: string
          advertiser_contact?: string
          advertiser_name?: string
          brand_name?: string
          courses?: Json
          courses_subtitle?: string
          courses_title?: string
          created_at?: string
          cta_href?: string
          cta_label?: string
          disclosure_text?: string
          exam_ad?: Json
          eyebrow?: string
          faqs?: Json
          footer_text?: string
          form_consent_text?: string
          form_courses?: Json
          form_submit_label?: string
          form_subtitle?: string
          form_title?: string
          ga_id?: string
          gtm_id?: string
          hero_subtitle?: string
          hero_title?: string
          id?: string
          is_active?: boolean
          logo_url?: string
          lp_type?: string
          meta_description?: string
          meta_keywords?: string
          meta_pixel_id?: string
          meta_title?: string
          multiple_colleges?: Json
          multiple_layout?: string
          nav_links?: Json
          og_image?: string
          primary_cta_href?: string
          primary_cta_label?: string
          privacy_url?: string
          secondary_cta_href?: string
          secondary_cta_label?: string
          slug: string
          stats?: Json
          terms_url?: string
          testimonials?: Json
          testimonials_title?: string
          theme?: Json
          updated_at?: string
          why_items?: Json
          why_subtitle?: string
          why_title?: string
        }
        Update: {
          advertiser_address?: string
          advertiser_contact?: string
          advertiser_name?: string
          brand_name?: string
          courses?: Json
          courses_subtitle?: string
          courses_title?: string
          created_at?: string
          cta_href?: string
          cta_label?: string
          disclosure_text?: string
          exam_ad?: Json
          eyebrow?: string
          faqs?: Json
          footer_text?: string
          form_consent_text?: string
          form_courses?: Json
          form_submit_label?: string
          form_subtitle?: string
          form_title?: string
          ga_id?: string
          gtm_id?: string
          hero_subtitle?: string
          hero_title?: string
          id?: string
          is_active?: boolean
          logo_url?: string
          lp_type?: string
          meta_description?: string
          meta_keywords?: string
          meta_pixel_id?: string
          meta_title?: string
          multiple_colleges?: Json
          multiple_layout?: string
          nav_links?: Json
          og_image?: string
          primary_cta_href?: string
          primary_cta_label?: string
          privacy_url?: string
          secondary_cta_href?: string
          secondary_cta_label?: string
          slug?: string
          stats?: Json
          terms_url?: string
          testimonials?: Json
          testimonials_title?: string
          theme?: Json
          updated_at?: string
          why_items?: Json
          why_subtitle?: string
          why_title?: string
        }
        Relationships: []
      }
      lead_form_settings: {
        Row: {
          channel_preference: string
          form_overrides: Json
          id: string
          otp_mode: string
          singleton: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          channel_preference?: string
          form_overrides?: Json
          id?: string
          otp_mode?: string
          singleton?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          channel_preference?: string
          form_overrides?: Json
          id?: string
          otp_mode?: string
          singleton?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      lead_notes: {
        Row: {
          author_id: string | null
          body: string | null
          created_at: string
          id: string
          kind: string
          lead_id: string
          meta: Json
        }
        Insert: {
          author_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          lead_id: string
          meta?: Json
        }
        Update: {
          author_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          lead_id?: string
          meta?: Json
        }
        Relationships: [
          {
            foreignKeyName: "lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          city: string | null
          created_at: string
          cta: string | null
          current_situation: string | null
          device_type: string | null
          email: string | null
          id: string
          initial_query: string | null
          interested_college_slug: string | null
          interested_course_slug: string | null
          interested_exam_slug: string | null
          name: string | null
          otp_verified: boolean
          page_url: string | null
          phone: string | null
          program_mode: string
          source: string | null
          source_category: string | null
          state: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          city?: string | null
          created_at?: string
          cta?: string | null
          current_situation?: string | null
          device_type?: string | null
          email?: string | null
          id?: string
          initial_query?: string | null
          interested_college_slug?: string | null
          interested_course_slug?: string | null
          interested_exam_slug?: string | null
          name?: string | null
          otp_verified?: boolean
          page_url?: string | null
          phone?: string | null
          program_mode?: string
          source?: string | null
          source_category?: string | null
          state?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          city?: string | null
          created_at?: string
          cta?: string | null
          current_situation?: string | null
          device_type?: string | null
          email?: string | null
          id?: string
          initial_query?: string | null
          interested_college_slug?: string | null
          interested_course_slug?: string | null
          interested_exam_slug?: string | null
          name?: string | null
          otp_verified?: boolean
          page_url?: string | null
          phone?: string | null
          program_mode?: string
          source?: string | null
          source_category?: string | null
          state?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      legal_pages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_active: boolean
          meta_description: string
          meta_title: string
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          meta_description?: string
          meta_title?: string
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          meta_description?: string
          meta_title?: string
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      lp_api_keys: {
        Row: {
          allowed_ips: string[]
          api_key: string
          call_count: number
          created_at: string
          default_campaign: string | null
          default_medium: string | null
          default_source: string | null
          id: string
          is_active: boolean
          last_used_at: string | null
          name: string
          notes: string | null
          rate_limit_per_minute: number
          updated_at: string
        }
        Insert: {
          allowed_ips?: string[]
          api_key: string
          call_count?: number
          created_at?: string
          default_campaign?: string | null
          default_medium?: string | null
          default_source?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name: string
          notes?: string | null
          rate_limit_per_minute?: number
          updated_at?: string
        }
        Update: {
          allowed_ips?: string[]
          api_key?: string
          call_count?: number
          created_at?: string
          default_campaign?: string | null
          default_medium?: string | null
          default_source?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name?: string
          notes?: string | null
          rate_limit_per_minute?: number
          updated_at?: string
        }
        Relationships: []
      }
      lp_automation_rules: {
        Row: {
          auto_dispatch: boolean
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          match_all: boolean
          match_cities: string[]
          match_courses: string[]
          match_ctas: string[]
          match_sources: string[]
          match_states: string[]
          name: string
          prefills: Json
          priority: number
          university_ids: string[]
          updated_at: string
        }
        Insert: {
          auto_dispatch?: boolean
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          match_all?: boolean
          match_cities?: string[]
          match_courses?: string[]
          match_ctas?: string[]
          match_sources?: string[]
          match_states?: string[]
          name: string
          prefills?: Json
          priority?: number
          university_ids?: string[]
          updated_at?: string
        }
        Update: {
          auto_dispatch?: boolean
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          match_all?: boolean
          match_cities?: string[]
          match_courses?: string[]
          match_ctas?: string[]
          match_sources?: string[]
          match_states?: string[]
          name?: string
          prefills?: Json
          priority?: number
          university_ids?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      lp_batches: {
        Row: {
          created_at: string
          created_by: string | null
          duplicate: number
          fail: number
          id: string
          name: string
          payload: Json | null
          source: string
          status: string
          success: number
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          duplicate?: number
          fail?: number
          id?: string
          name?: string
          payload?: Json | null
          source?: string
          status?: string
          success?: number
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          duplicate?: number
          fail?: number
          id?: string
          name?: string
          payload?: Json | null
          source?: string
          status?: string
          success?: number
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      lp_marketing_flows: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          rule_ids: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          rule_ids?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          rule_ids?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      lp_multi_flows: {
        Row: {
          created_at: string
          description: string | null
          flow_ids: string[]
          id: string
          is_active: boolean
          name: string
          trigger_event: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          flow_ids?: string[]
          id?: string
          is_active?: boolean
          name: string
          trigger_event?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          flow_ids?: string[]
          id?: string
          is_active?: boolean
          name?: string
          trigger_event?: string
          updated_at?: string
        }
        Relationships: []
      }
      lp_push_logs: {
        Row: {
          created_at: string
          error: string | null
          flow_id: string | null
          http_status: number | null
          id: string
          lead_id: string | null
          multi_flow_id: string | null
          request_payload: Json | null
          response_body: string | null
          rule_id: string | null
          status: string
          university_id: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          flow_id?: string | null
          http_status?: number | null
          id?: string
          lead_id?: string | null
          multi_flow_id?: string | null
          request_payload?: Json | null
          response_body?: string | null
          rule_id?: string | null
          status?: string
          university_id?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          flow_id?: string | null
          http_status?: number | null
          id?: string
          lead_id?: string | null
          multi_flow_id?: string | null
          request_payload?: Json | null
          response_body?: string | null
          rule_id?: string | null
          status?: string
          university_id?: string | null
        }
        Relationships: []
      }
      lp_universities: {
        Row: {
          api_type: string
          api_url: string
          auth_header_key: string | null
          auth_header_value: string | null
          auth_type: string
          campaign: string | null
          college_id: string | null
          column_mapping: Json
          course_specializations: Json
          created_at: string
          custom_headers: Json
          default_values: Json
          id: string
          is_active: boolean
          leads_per_minute: number
          medium: string | null
          name: string
          notes: string | null
          payload_wrapper: string
          programs: Json
          publisher_id: string | null
          publisher_panel_url: string | null
          secret_key: string | null
          source: string | null
          state_cities: Json
          static_fields: Json
          university_defaults: Json
          updated_at: string
          utm_link: string | null
        }
        Insert: {
          api_type?: string
          api_url: string
          auth_header_key?: string | null
          auth_header_value?: string | null
          auth_type?: string
          campaign?: string | null
          college_id?: string | null
          column_mapping?: Json
          course_specializations?: Json
          created_at?: string
          custom_headers?: Json
          default_values?: Json
          id?: string
          is_active?: boolean
          leads_per_minute?: number
          medium?: string | null
          name: string
          notes?: string | null
          payload_wrapper?: string
          programs?: Json
          publisher_id?: string | null
          publisher_panel_url?: string | null
          secret_key?: string | null
          source?: string | null
          state_cities?: Json
          static_fields?: Json
          university_defaults?: Json
          updated_at?: string
          utm_link?: string | null
        }
        Update: {
          api_type?: string
          api_url?: string
          auth_header_key?: string | null
          auth_header_value?: string | null
          auth_type?: string
          campaign?: string | null
          college_id?: string | null
          column_mapping?: Json
          course_specializations?: Json
          created_at?: string
          custom_headers?: Json
          default_values?: Json
          id?: string
          is_active?: boolean
          leads_per_minute?: number
          medium?: string | null
          name?: string
          notes?: string | null
          payload_wrapper?: string
          programs?: Json
          publisher_id?: string | null
          publisher_panel_url?: string | null
          secret_key?: string | null
          source?: string | null
          state_cities?: Json
          static_fields?: Json
          university_defaults?: Json
          updated_at?: string
          utm_link?: string | null
        }
        Relationships: []
      }
      lp_utm_links: {
        Row: {
          click_count: number
          created_at: string
          destination_url: string
          id: string
          is_active: boolean
          slug: string
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          click_count?: number
          created_at?: string
          destination_url: string
          id?: string
          is_active?: boolean
          slug: string
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          click_count?: number
          created_at?: string
          destination_url?: string
          id?: string
          is_active?: boolean
          slug?: string
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      marketing_automations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          last_run_at: string | null
          list_name: string
          module: string
          name: string
          nodes: Json
          status: string
          total_runs: number
          trigger_config: Json
          trigger_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          last_run_at?: string | null
          list_name?: string
          module?: string
          name: string
          nodes?: Json
          status?: string
          total_runs?: number
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          last_run_at?: string | null
          list_name?: string
          module?: string
          name?: string
          nodes?: Json
          status?: string
          total_runs?: number
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      multi_push_presets: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean
          name: string
          university_ids: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          university_ids?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          university_ids?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      multi_push_university_defaults: {
        Row: {
          created_at: string
          defaults: Json
          id: string
          university_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          defaults?: Json
          id?: string
          university_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          defaults?: Json
          id?: string
          university_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      otp_providers: {
        Row: {
          api_key: string
          api_secret: string
          base_url: string
          channel: string
          config_json: Json
          created_at: string
          display_name: string
          icon_emoji: string
          id: string
          is_active: boolean
          provider_name: string
          sender_id: string
          template_id: string
          updated_at: string
        }
        Insert: {
          api_key?: string
          api_secret?: string
          base_url?: string
          channel?: string
          config_json?: Json
          created_at?: string
          display_name: string
          icon_emoji?: string
          id?: string
          is_active?: boolean
          provider_name: string
          sender_id?: string
          template_id?: string
          updated_at?: string
        }
        Update: {
          api_key?: string
          api_secret?: string
          base_url?: string
          channel?: string
          config_json?: Json
          created_at?: string
          display_name?: string
          icon_emoji?: string
          id?: string
          is_active?: boolean
          provider_name?: string
          sender_id?: string
          template_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      otp_sessions: {
        Row: {
          attempts: number
          channel: string
          consumed_at: string | null
          created_at: string
          delivery_status: string
          expires_at: string
          id: string
          max_attempts: number
          otp_hash: string
          phone: string
          provider_name: string | null
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          attempts?: number
          channel?: string
          consumed_at?: string | null
          created_at?: string
          delivery_status?: string
          expires_at: string
          id?: string
          max_attempts?: number
          otp_hash: string
          phone: string
          provider_name?: string | null
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          attempts?: number
          channel?: string
          consumed_at?: string | null
          created_at?: string
          delivery_status?: string
          expires_at?: string
          id?: string
          max_attempts?: number
          otp_hash?: string
          phone?: string
          provider_name?: string | null
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      placement_records: {
        Row: {
          college_slug: string
          company_id: string | null
          company_name: string | null
          course_slug: string | null
          created_at: string
          hires_count: number | null
          id: string
          package_lpa: number | null
          role: string | null
          year: string | null
        }
        Insert: {
          college_slug: string
          company_id?: string | null
          company_name?: string | null
          course_slug?: string | null
          created_at?: string
          hires_count?: number | null
          id?: string
          package_lpa?: number | null
          role?: string | null
          year?: string | null
        }
        Update: {
          college_slug?: string
          company_id?: string | null
          company_name?: string | null
          course_slug?: string | null
          created_at?: string
          hires_count?: number | null
          id?: string
          package_lpa?: number | null
          role?: string | null
          year?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "placement_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      popular_places: {
        Row: {
          college_count: number
          created_at: string
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          state: string
          updated_at: string
        }
        Insert: {
          college_count?: number
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          state: string
          updated_at?: string
        }
        Update: {
          college_count?: number
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          class_10_board: string | null
          class_10_marks_type: string | null
          class_10_percentage: string | null
          class_10_school: string | null
          class_10_year: string | null
          class_12_board: string | null
          class_12_marks_type: string | null
          class_12_percentage: string | null
          class_12_school: string | null
          class_12_year: string | null
          created_at: string
          current_semester: string | null
          current_status: string | null
          display_name: string | null
          dob: string | null
          education_level: string | null
          education_status: string | null
          email: string | null
          gender: string | null
          id: string
          kyc_completed: boolean | null
          kyc_completed_at: string | null
          marital_status: string | null
          mask_leads: boolean
          onboarding_completed: boolean
          phone: string | null
          physically_challenged: boolean | null
          preferred_level: string | null
          preferred_stream: string | null
          profile_image_url: string | null
          social_category: string | null
          state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          class_10_board?: string | null
          class_10_marks_type?: string | null
          class_10_percentage?: string | null
          class_10_school?: string | null
          class_10_year?: string | null
          class_12_board?: string | null
          class_12_marks_type?: string | null
          class_12_percentage?: string | null
          class_12_school?: string | null
          class_12_year?: string | null
          created_at?: string
          current_semester?: string | null
          current_status?: string | null
          display_name?: string | null
          dob?: string | null
          education_level?: string | null
          education_status?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          kyc_completed?: boolean | null
          kyc_completed_at?: string | null
          marital_status?: string | null
          mask_leads?: boolean
          onboarding_completed?: boolean
          phone?: string | null
          physically_challenged?: boolean | null
          preferred_level?: string | null
          preferred_stream?: string | null
          profile_image_url?: string | null
          social_category?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          class_10_board?: string | null
          class_10_marks_type?: string | null
          class_10_percentage?: string | null
          class_10_school?: string | null
          class_10_year?: string | null
          class_12_board?: string | null
          class_12_marks_type?: string | null
          class_12_percentage?: string | null
          class_12_school?: string | null
          class_12_year?: string | null
          created_at?: string
          current_semester?: string | null
          current_status?: string | null
          display_name?: string | null
          dob?: string | null
          education_level?: string | null
          education_status?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          kyc_completed?: boolean | null
          kyc_completed_at?: string | null
          marital_status?: string | null
          mask_leads?: boolean
          onboarding_completed?: boolean
          phone?: string | null
          physically_challenged?: boolean | null
          preferred_level?: string | null
          preferred_stream?: string | null
          profile_image_url?: string | null
          social_category?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      program_categories: {
        Row: {
          created_at: string
          display_order: number
          icon_emoji: string
          icon_url: string
          id: string
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          icon_emoji?: string
          icon_url?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          icon_emoji?: string
          icon_url?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      programs: {
        Row: {
          created_at: string
          id: string
          name: string
          university_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          university_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          university_id?: string
        }
        Relationships: []
      }
      promoted_programs: {
        Row: {
          about_program: string
          application_steps: Json
          apply_url: string
          badge: string
          badge_variant: string
          batch_start_date: string
          brochure_url: string
          category_slug: string
          certificate_image: string
          college_name: string
          college_slug: string
          contact_phone: string
          country: string
          course_slug: string
          created_at: string
          curriculum: Json
          degree_image: string
          delivery_mode: string
          discount_percent: number
          display_order: number
          duration: string
          eligibility: string
          emi_starts_at: number
          faculty: Json
          faqs: Json
          fee_breakdown: Json
          hero_image: string
          hero_video_url: string
          highlights: Json
          id: string
          image_url: string
          institute_legacy_points: Json
          institute_legacy_title: string
          institute_logo: string
          is_active: boolean
          learners_count: string
          learning_outcomes: Json
          mentors: Json
          meta_description: string
          meta_title: string
          original_price: number
          partner_logos: Json
          placement_stats: Json
          program_stats: Json
          program_type: string
          ranking_text: string
          rating: number
          schedule: string
          slug: string
          summary: string
          tag: string
          testimonials: Json
          title: string
          tools_taught: Json
          top_companies: Json
          updated_at: string
          who_should_apply: Json
          why_this_program: string
          youtube_url: string
        }
        Insert: {
          about_program?: string
          application_steps?: Json
          apply_url?: string
          badge?: string
          badge_variant?: string
          batch_start_date?: string
          brochure_url?: string
          category_slug?: string
          certificate_image?: string
          college_name: string
          college_slug?: string
          contact_phone?: string
          country?: string
          course_slug?: string
          created_at?: string
          curriculum?: Json
          degree_image?: string
          delivery_mode?: string
          discount_percent?: number
          display_order?: number
          duration?: string
          eligibility?: string
          emi_starts_at?: number
          faculty?: Json
          faqs?: Json
          fee_breakdown?: Json
          hero_image?: string
          hero_video_url?: string
          highlights?: Json
          id?: string
          image_url?: string
          institute_legacy_points?: Json
          institute_legacy_title?: string
          institute_logo?: string
          is_active?: boolean
          learners_count?: string
          learning_outcomes?: Json
          mentors?: Json
          meta_description?: string
          meta_title?: string
          original_price?: number
          partner_logos?: Json
          placement_stats?: Json
          program_stats?: Json
          program_type?: string
          ranking_text?: string
          rating?: number
          schedule?: string
          slug?: string
          summary?: string
          tag?: string
          testimonials?: Json
          title: string
          tools_taught?: Json
          top_companies?: Json
          updated_at?: string
          who_should_apply?: Json
          why_this_program?: string
          youtube_url?: string
        }
        Update: {
          about_program?: string
          application_steps?: Json
          apply_url?: string
          badge?: string
          badge_variant?: string
          batch_start_date?: string
          brochure_url?: string
          category_slug?: string
          certificate_image?: string
          college_name?: string
          college_slug?: string
          contact_phone?: string
          country?: string
          course_slug?: string
          created_at?: string
          curriculum?: Json
          degree_image?: string
          delivery_mode?: string
          discount_percent?: number
          display_order?: number
          duration?: string
          eligibility?: string
          emi_starts_at?: number
          faculty?: Json
          faqs?: Json
          fee_breakdown?: Json
          hero_image?: string
          hero_video_url?: string
          highlights?: Json
          id?: string
          image_url?: string
          institute_legacy_points?: Json
          institute_legacy_title?: string
          institute_logo?: string
          is_active?: boolean
          learners_count?: string
          learning_outcomes?: Json
          mentors?: Json
          meta_description?: string
          meta_title?: string
          original_price?: number
          partner_logos?: Json
          placement_stats?: Json
          program_stats?: Json
          program_type?: string
          ranking_text?: string
          rating?: number
          schedule?: string
          slug?: string
          summary?: string
          tag?: string
          testimonials?: Json
          title?: string
          tools_taught?: Json
          top_companies?: Json
          updated_at?: string
          who_should_apply?: Json
          why_this_program?: string
          youtube_url?: string
        }
        Relationships: []
      }
      push_landing_pages: {
        Row: {
          api_key: string
          created_at: string
          created_by: string | null
          default_values: Json
          description: string | null
          id: string
          is_active: boolean
          last_submission_at: string | null
          name: string
          preset_id: string | null
          routing_mode: string
          submissions_count: number
          university_ids: string[]
          updated_at: string
        }
        Insert: {
          api_key?: string
          created_at?: string
          created_by?: string | null
          default_values?: Json
          description?: string | null
          id?: string
          is_active?: boolean
          last_submission_at?: string | null
          name: string
          preset_id?: string | null
          routing_mode?: string
          submissions_count?: number
          university_ids?: string[]
          updated_at?: string
        }
        Update: {
          api_key?: string
          created_at?: string
          created_by?: string | null
          default_values?: Json
          description?: string | null
          id?: string
          is_active?: boolean
          last_submission_at?: string | null
          name?: string
          preset_id?: string | null
          routing_mode?: string
          submissions_count?: number
          university_ids?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_landing_pages_preset_id_fkey"
            columns: ["preset_id"]
            isOneToOne: false
            referencedRelation: "multi_push_presets"
            referencedColumns: ["id"]
          },
        ]
      }
      push_leads: {
        Row: {
          address: string | null
          api_response: string | null
          batch_id: string
          city: string | null
          course: string | null
          created_at: string
          email: string
          extra_data: Json | null
          id: string
          lead_campaign: string | null
          lead_medium: string | null
          lead_source: string | null
          mobile: string
          name: string
          processed_at: string | null
          retry_count: number | null
          specialization: string | null
          state: string | null
          status: string | null
          university_id: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          api_response?: string | null
          batch_id: string
          city?: string | null
          course?: string | null
          created_at?: string
          email?: string
          extra_data?: Json | null
          id?: string
          lead_campaign?: string | null
          lead_medium?: string | null
          lead_source?: string | null
          mobile?: string
          name?: string
          processed_at?: string | null
          retry_count?: number | null
          specialization?: string | null
          state?: string | null
          status?: string | null
          university_id: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          api_response?: string | null
          batch_id?: string
          city?: string | null
          course?: string | null
          created_at?: string
          email?: string
          extra_data?: Json | null
          id?: string
          lead_campaign?: string | null
          lead_medium?: string | null
          lead_source?: string | null
          mobile?: string
          name?: string
          processed_at?: string | null
          retry_count?: number | null
          specialization?: string | null
          state?: string | null
          status?: string | null
          university_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          admin_notes: string | null
          alternate_email: string | null
          alternate_mobile: string | null
          created_at: string
          desired_city: string | null
          desired_colleges: Json | null
          friend_city: string
          friend_email: string
          friend_mobile: string
          friend_name: string
          friend_state: string
          id: string
          referrer_id: string
          reward_amount: number | null
          reward_paid: boolean | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          alternate_email?: string | null
          alternate_mobile?: string | null
          created_at?: string
          desired_city?: string | null
          desired_colleges?: Json | null
          friend_city: string
          friend_email: string
          friend_mobile: string
          friend_name: string
          friend_state: string
          id?: string
          referrer_id: string
          reward_amount?: number | null
          reward_paid?: boolean | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          alternate_email?: string | null
          alternate_mobile?: string | null
          created_at?: string
          desired_city?: string | null
          desired_colleges?: Json | null
          friend_city?: string
          friend_email?: string
          friend_mobile?: string
          friend_name?: string
          friend_state?: string
          id?: string
          referrer_id?: string
          reward_amount?: number | null
          reward_paid?: boolean | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      review_reports: {
        Row: {
          created_at: string
          id: string
          reason: string
          reporter_name: string | null
          reporter_user_id: string | null
          review_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string
          reporter_name?: string | null
          reporter_user_id?: string | null
          review_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          reporter_name?: string | null
          reporter_user_id?: string | null
          review_id?: string
          status?: string
        }
        Relationships: []
      }
      scholarships: {
        Row: {
          amount: string
          apply_url: string
          author_id: string | null
          category: string
          created_at: string
          deadline: string
          description: string
          display_order: number
          eligibility: string
          id: string
          image: string
          is_active: boolean
          is_live: boolean
          level: string
          meta_description: string
          meta_title: string
          page_summary: string | null
          provider: string
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          amount?: string
          apply_url?: string
          author_id?: string | null
          category?: string
          created_at?: string
          deadline?: string
          description?: string
          display_order?: number
          eligibility?: string
          id?: string
          image?: string
          is_active?: boolean
          is_live?: boolean
          level?: string
          meta_description?: string
          meta_title?: string
          page_summary?: string | null
          provider?: string
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          amount?: string
          apply_url?: string
          author_id?: string | null
          category?: string
          created_at?: string
          deadline?: string
          description?: string
          display_order?: number
          eligibility?: string
          id?: string
          image?: string
          is_active?: boolean
          is_live?: boolean
          level?: string
          meta_description?: string
          meta_title?: string
          page_summary?: string | null
          provider?: string
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scholarships_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
        ]
      }
      site_integrations: {
        Row: {
          category: string
          created_at: string
          enabled: boolean
          id: string
          key: string
          label: string
          notes: string
          updated_at: string
          value: string
        }
        Insert: {
          category?: string
          created_at?: string
          enabled?: boolean
          id?: string
          key: string
          label: string
          notes?: string
          updated_at?: string
          value?: string
        }
        Update: {
          category?: string
          created_at?: string
          enabled?: boolean
          id?: string
          key?: string
          label?: string
          notes?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      state_cities: {
        Row: {
          city: string
          created_at: string
          id: string
          state: string
          university_id: string
        }
        Insert: {
          city: string
          created_at?: string
          id?: string
          state: string
          university_id: string
        }
        Update: {
          city?: string
          created_at?: string
          id?: string
          state?: string
          university_id?: string
        }
        Relationships: []
      }
      states_cities: {
        Row: {
          city: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          state: string
        }
        Insert: {
          city: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          state: string
        }
        Update: {
          city?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          state?: string
        }
        Relationships: []
      }
      stream_categories: {
        Row: {
          created_at: string
          display_order: number
          emoji: string
          id: string
          is_active: boolean
          label: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          emoji?: string
          id?: string
          is_active?: boolean
          label: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          emoji?: string
          id?: string
          is_active?: boolean
          label?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      study_board_links: {
        Row: {
          board_slug: string
          category: string
          class_num: number
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          board_slug: string
          category?: string
          class_num: number
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          board_slug?: string
          category?: string
          class_num?: number
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      study_boards: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          icon_emoji: string | null
          id: string
          image_url: string
          is_active: boolean
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          icon_emoji?: string | null
          id?: string
          image_url?: string
          is_active?: boolean
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          icon_emoji?: string | null
          id?: string
          image_url?: string
          is_active?: boolean
          name?: string
          slug?: string
        }
        Relationships: []
      }
      study_chapters: {
        Row: {
          chapter_number: number | null
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
          slug: string
          subject_id: string
          updated_at: string
        }
        Insert: {
          chapter_number?: number | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          slug: string
          subject_id: string
          updated_at?: string
        }
        Update: {
          chapter_number?: number | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          subject_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_chapters_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "study_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      study_resources: {
        Row: {
          chapter_id: string | null
          content_html: string
          content_images: string[]
          created_at: string
          description: string | null
          display_order: number
          download_count: number
          file_size_kb: number | null
          file_url: string | null
          id: string
          is_active: boolean
          resource_type: string
          subject_id: string | null
          title: string
          updated_at: string
          year: string | null
        }
        Insert: {
          chapter_id?: string | null
          content_html?: string
          content_images?: string[]
          created_at?: string
          description?: string | null
          display_order?: number
          download_count?: number
          file_size_kb?: number | null
          file_url?: string | null
          id?: string
          is_active?: boolean
          resource_type?: string
          subject_id?: string | null
          title: string
          updated_at?: string
          year?: string | null
        }
        Update: {
          chapter_id?: string | null
          content_html?: string
          content_images?: string[]
          created_at?: string
          description?: string | null
          display_order?: number
          download_count?: number
          file_size_kb?: number | null
          file_url?: string | null
          id?: string
          is_active?: boolean
          resource_type?: string
          subject_id?: string | null
          title?: string
          updated_at?: string
          year?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_resources_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "study_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_resources_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "study_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      study_subjects: {
        Row: {
          author_id: string | null
          board_slug: string
          class_num: number
          cover_image: string | null
          created_at: string
          description: string | null
          display_order: number
          icon_emoji: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          board_slug: string
          class_num: number
          cover_image?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          icon_emoji?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          board_slug?: string
          class_num?: number
          cover_image?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          icon_emoji?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_subjects_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
        ]
      }
      study_toppers: {
        Row: {
          board_slug: string
          city: string
          class_num: number
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          marks: string
          name: string
          percentage: number
          photo: string
          rank: number
          school: string
          stream: string
          updated_at: string
          year: number
        }
        Insert: {
          board_slug: string
          city?: string
          class_num: number
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          marks?: string
          name: string
          percentage?: number
          photo?: string
          rank?: number
          school?: string
          stream?: string
          updated_at?: string
          year?: number
        }
        Update: {
          board_slug?: string
          city?: string
          class_num?: number
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          marks?: string
          name?: string
          percentage?: number
          photo?: string
          rank?: number
          school?: string
          stream?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      sub_users: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          parent_user_id: string
          permissions: Json
          phone: string | null
          role: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          parent_user_id: string
          permissions?: Json
          phone?: string | null
          role?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          parent_user_id?: string
          permissions?: Json
          phone?: string | null
          role?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          context: Json | null
          created_at: string
          flow: string | null
          function_name: string
          id: string
          level: string
          message: string
          method: string | null
          request_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string
          flow?: string | null
          function_name: string
          id?: string
          level?: string
          message: string
          method?: string | null
          request_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string
          flow?: string | null
          function_name?: string
          id?: string
          level?: string
          message?: string
          method?: string | null
          request_id?: string | null
        }
        Relationships: []
      }
      target_roadmaps: {
        Row: {
          board: string | null
          class_level: string | null
          created_at: string
          current_percent: string | null
          hours_per_day: number | null
          id: string
          is_primary: boolean
          roadmap: Json
          share_token: string
          slug: string | null
          state: string | null
          stream: string | null
          target_college: string
          target_course: string | null
          updated_at: string
          user_id: string
          weaknesses: string | null
        }
        Insert: {
          board?: string | null
          class_level?: string | null
          created_at?: string
          current_percent?: string | null
          hours_per_day?: number | null
          id?: string
          is_primary?: boolean
          roadmap?: Json
          share_token?: string
          slug?: string | null
          state?: string | null
          stream?: string | null
          target_college: string
          target_course?: string | null
          updated_at?: string
          user_id: string
          weaknesses?: string | null
        }
        Update: {
          board?: string | null
          class_level?: string | null
          created_at?: string
          current_percent?: string | null
          hours_per_day?: number | null
          id?: string
          is_primary?: boolean
          roadmap?: Json
          share_token?: string
          slug?: string | null
          state?: string | null
          stream?: string | null
          target_college?: string
          target_course?: string | null
          updated_at?: string
          user_id?: string
          weaknesses?: string | null
        }
        Relationships: []
      }
      team_invites: {
        Row: {
          accepted_user_id: string | null
          created_at: string
          created_by: string | null
          display_name: string | null
          email: string | null
          id: string
          mask_leads: boolean
          permissions: Json
          phone: string | null
          role: string
          status: string
          updated_at: string
        }
        Insert: {
          accepted_user_id?: string | null
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          mask_leads?: boolean
          permissions?: Json
          phone?: string | null
          role?: string
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_user_id?: string | null
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          mask_leads?: boolean
          permissions?: Json
          phone?: string | null
          role?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      trusted_partners: {
        Row: {
          college_slug: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          logo_url: string
          name: string
          updated_at: string
        }
        Insert: {
          college_slug?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          logo_url?: string
          name: string
          updated_at?: string
        }
        Update: {
          college_slug?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          logo_url?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      universities: {
        Row: {
          admission_commitment: number | null
          api_type: string | null
          api_url: string
          campaign: string | null
          city: string | null
          college_id: string
          column_mapping: Json | null
          contact_person_email: string | null
          contact_person_mobile: string | null
          contact_person_name: string | null
          created_at: string
          daily_limit: number | null
          deal_price: number | null
          default_values: Json | null
          gst_inclusive: boolean | null
          id: string
          leads_per_minute: number | null
          medium: string | null
          name: string
          secret_key: string
          source: string | null
          state: string | null
          updated_at: string
          utm_link: string | null
          whatsapp_group_link: string | null
        }
        Insert: {
          admission_commitment?: number | null
          api_type?: string | null
          api_url?: string
          campaign?: string | null
          city?: string | null
          college_id?: string
          column_mapping?: Json | null
          contact_person_email?: string | null
          contact_person_mobile?: string | null
          contact_person_name?: string | null
          created_at?: string
          daily_limit?: number | null
          deal_price?: number | null
          default_values?: Json | null
          gst_inclusive?: boolean | null
          id?: string
          leads_per_minute?: number | null
          medium?: string | null
          name: string
          secret_key?: string
          source?: string | null
          state?: string | null
          updated_at?: string
          utm_link?: string | null
          whatsapp_group_link?: string | null
        }
        Update: {
          admission_commitment?: number | null
          api_type?: string | null
          api_url?: string
          campaign?: string | null
          city?: string | null
          college_id?: string
          column_mapping?: Json | null
          contact_person_email?: string | null
          contact_person_mobile?: string | null
          contact_person_name?: string | null
          created_at?: string
          daily_limit?: number | null
          deal_price?: number | null
          default_values?: Json | null
          gst_inclusive?: boolean | null
          id?: string
          leads_per_minute?: number | null
          medium?: string | null
          name?: string
          secret_key?: string
          source?: string | null
          state?: string | null
          updated_at?: string
          utm_link?: string | null
          whatsapp_group_link?: string | null
        }
        Relationships: []
      }
      university_api_keys: {
        Row: {
          api_key: string
          created_at: string
          id: string
          is_active: boolean | null
          last_used_at: string | null
          name: string
          request_count: number | null
          university_id: string
        }
        Insert: {
          api_key?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          name?: string
          request_count?: number | null
          university_id: string
        }
        Update: {
          api_key?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          name?: string
          request_count?: number | null
          university_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "university_api_keys_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      upload_batches: {
        Row: {
          api_config: Json | null
          completed_at: string | null
          created_at: string
          csv_data: string | null
          current_lead_index: number | null
          duplicate_count: number
          error_message: string | null
          fail_count: number
          file_name: string
          id: string
          is_cancelled: boolean | null
          is_paused: boolean | null
          leads_per_minute: number | null
          processed_count: number | null
          scheduled_at: string | null
          status: string | null
          success_count: number
          total_leads: number
          university_id: string
          user_id: string | null
        }
        Insert: {
          api_config?: Json | null
          completed_at?: string | null
          created_at?: string
          csv_data?: string | null
          current_lead_index?: number | null
          duplicate_count?: number
          error_message?: string | null
          fail_count?: number
          file_name: string
          id?: string
          is_cancelled?: boolean | null
          is_paused?: boolean | null
          leads_per_minute?: number | null
          processed_count?: number | null
          scheduled_at?: string | null
          status?: string | null
          success_count?: number
          total_leads?: number
          university_id: string
          user_id?: string | null
        }
        Update: {
          api_config?: Json | null
          completed_at?: string | null
          created_at?: string
          csv_data?: string | null
          current_lead_index?: number | null
          duplicate_count?: number
          error_message?: string | null
          fail_count?: number
          file_name?: string
          id?: string
          is_cancelled?: boolean | null
          is_paused?: boolean | null
          leads_per_minute?: number | null
          processed_count?: number | null
          scheduled_at?: string | null
          status?: string | null
          success_count?: number
          total_leads?: number
          university_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_consent: {
        Row: {
          analytics: boolean
          created_at: string
          essential: boolean
          id: string
          marketing: boolean
          prefill: boolean
          session_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          analytics?: boolean
          created_at?: string
          essential?: boolean
          id?: string
          marketing?: boolean
          prefill?: boolean
          session_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          analytics?: boolean
          created_at?: string
          essential?: boolean
          id?: string
          marketing?: boolean
          prefill?: boolean
          session_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_documents: {
        Row: {
          created_at: string
          doc_type: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          doc_type: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          doc_type?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_education_entries: {
        Row: {
          board_university: string | null
          created_at: string
          degree: string | null
          end_year: string | null
          id: string
          institution: string | null
          level: string
          marks_type: string | null
          notes: string | null
          percentage_cgpa: string | null
          sort_order: number
          specialization: string | null
          start_year: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          board_university?: string | null
          created_at?: string
          degree?: string | null
          end_year?: string | null
          id?: string
          institution?: string | null
          level: string
          marks_type?: string | null
          notes?: string | null
          percentage_cgpa?: string | null
          sort_order?: number
          specialization?: string | null
          start_year?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          board_university?: string | null
          created_at?: string
          degree?: string | null
          end_year?: string | null
          id?: string
          institution?: string | null
          level?: string
          marks_type?: string | null
          notes?: string | null
          percentage_cgpa?: string | null
          sort_order?: number
          specialization?: string | null
          start_year?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_events: {
        Row: {
          created_at: string
          element: string | null
          event_type: string
          id: string
          metadata: Json | null
          path: string | null
          referrer: string | null
          session_id: string
          user_agent: string | null
          user_id: string | null
          vh: number | null
          vw: number | null
          x: number | null
          y: number | null
        }
        Insert: {
          created_at?: string
          element?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          path?: string | null
          referrer?: string | null
          session_id: string
          user_agent?: string | null
          user_id?: string | null
          vh?: number | null
          vw?: number | null
          x?: number | null
          y?: number | null
        }
        Update: {
          created_at?: string
          element?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          path?: string | null
          referrer?: string | null
          session_id?: string
          user_agent?: string | null
          user_id?: string | null
          vh?: number | null
          vw?: number | null
          x?: number | null
          y?: number | null
        }
        Relationships: []
      }
      user_favorites: {
        Row: {
          college_slug: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          college_slug: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          college_slug?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          action: string | null
          allow: boolean | null
          can_create: boolean
          can_delete: boolean
          can_edit: boolean
          can_publish: boolean
          can_view: boolean
          created_at: string
          id: string
          module: string | null
          resource: string
          scope: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action?: string | null
          allow?: boolean | null
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_publish?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          module?: string | null
          resource: string
          scope?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action?: string | null
          allow?: boolean | null
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_publish?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          module?: string | null
          resource?: string
          scope?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          ai_summary: string | null
          ai_summary_at: string | null
          city: string | null
          conversion: boolean | null
          country: string | null
          device: string | null
          entry_path: string | null
          exit_path: string | null
          id: string
          language: string | null
          last_path: string | null
          last_seen_at: string
          lead_email: string | null
          lead_id: string | null
          lead_name: string | null
          lead_phone: string | null
          max_scroll_pct: number | null
          opt_in: Json | null
          pages_visited: number
          referrer: string | null
          screen: string | null
          session_id: string
          started_at: string
          timezone: string | null
          total_events: number
          total_time_ms: number | null
          user_id: string | null
          utm: Json | null
          viewport: string | null
        }
        Insert: {
          ai_summary?: string | null
          ai_summary_at?: string | null
          city?: string | null
          conversion?: boolean | null
          country?: string | null
          device?: string | null
          entry_path?: string | null
          exit_path?: string | null
          id?: string
          language?: string | null
          last_path?: string | null
          last_seen_at?: string
          lead_email?: string | null
          lead_id?: string | null
          lead_name?: string | null
          lead_phone?: string | null
          max_scroll_pct?: number | null
          opt_in?: Json | null
          pages_visited?: number
          referrer?: string | null
          screen?: string | null
          session_id: string
          started_at?: string
          timezone?: string | null
          total_events?: number
          total_time_ms?: number | null
          user_id?: string | null
          utm?: Json | null
          viewport?: string | null
        }
        Update: {
          ai_summary?: string | null
          ai_summary_at?: string | null
          city?: string | null
          conversion?: boolean | null
          country?: string | null
          device?: string | null
          entry_path?: string | null
          exit_path?: string | null
          id?: string
          language?: string | null
          last_path?: string | null
          last_seen_at?: string
          lead_email?: string | null
          lead_id?: string | null
          lead_name?: string | null
          lead_phone?: string | null
          max_scroll_pct?: number | null
          opt_in?: Json | null
          pages_visited?: number
          referrer?: string | null
          screen?: string | null
          session_id?: string
          started_at?: string
          timezone?: string | null
          total_events?: number
          total_time_ms?: number | null
          user_id?: string | null
          utm?: Json | null
          viewport?: string | null
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          referral_id: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          referral_id?: string | null
          status?: string
          type?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          referral_id?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      clear_featured_rank: {
        Args: { _id: string; _table: string }
        Returns: undefined
      }
      has_permission: {
        Args: { _action: string; _resource: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_batch_duplicate: {
        Args: { batch_uuid: string }
        Returns: undefined
      }
      increment_batch_fail: { Args: { batch_uuid: string }; Returns: undefined }
      increment_batch_success: {
        Args: { batch_uuid: string }
        Returns: undefined
      }
      increment_push_landing_submission: {
        Args: { lp_id: string }
        Returns: undefined
      }
      intent_category_for: { Args: { _score: number }; Returns: string }
      intent_merge_visitor: {
        Args: { _user_id: string; _visitor_id: string }
        Returns: undefined
      }
      list_public_tables: {
        Args: never
        Returns: {
          table_name: string
        }[]
      }
      lp_increment_batch_duplicate: {
        Args: { batch_uuid: string }
        Returns: undefined
      }
      lp_increment_batch_fail: {
        Args: { batch_uuid: string }
        Returns: undefined
      }
      lp_increment_batch_success: {
        Args: { batch_uuid: string }
        Returns: undefined
      }
      set_featured_rank: {
        Args: { _id: string; _rank: number; _table: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "moderator"
        | "user"
        | "manager"
        | "editor"
        | "contributor"
        | "author"
        | "lead_push"
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
      app_role: [
        "admin",
        "moderator",
        "user",
        "manager",
        "editor",
        "contributor",
        "author",
        "lead_push",
      ],
    },
  },
} as const
