export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      companies: {
        Row: {
          company_id: number;
          name: string | null;
          short_name: string | null;
          category: string | null;
          employee_size: string | null;
        };
        Insert: {
          company_id: number;
          name?: string | null;
          short_name?: string | null;
          category?: string | null;
          employee_size?: string | null;
        };
        Update: {
          company_id?: number;
          name?: string | null;
          short_name?: string | null;
          category?: string | null;
          employee_size?: string | null;
        };
        Relationships: [];
      };
      company: {
        Row: {
          ai_ml_adoption_level: string | null;
          airport_commute_time: string | null;
          annual_profit: string | null;
          annual_revenue: string | null;
          area_safety: string | null;
          automation_level: string | null;
          avg_retention_tenure: string | null;
          awards_recognitions: string[] | null;
          board_members: Json | null;
          bonus_predictability: string | null;
          brand_sentiment_score: number | null;
          brand_value: string | null;
          burn_multiplier: number | null;
          burn_rate: string | null;
          burnout_risk: string | null;
          cab_policy: string | null;
          category: string | null;
          ceo_linkedin_url: string | null;
          ceo_name: string | null;
          competitive_advantages: string | null;
          contact_person_email: string | null;
          contact_person_name: string | null;
          contact_person_phone: string | null;
          contact_person_title: string | null;
          core_value_proposition: string | null;
          created_at: string;
          cross_functional_exposure: string | null;
          customer_testimonials: Json | null;
          cybersecurity_posture: string | null;
          decision_maker_access: string | null;
          diversity_inclusion_score: number | null;
          diversity_metrics: Json | null;
          early_ownership: string | null;
          emergency_preparedness: string | null;
          employee_size: string | null;
          employee_turnover: string | null;
          esg_ratings: string | null;
          esops_incentives: string | null;
          ethical_standards: string | null;
          event_participation: string | null;
          execution_thinking_balance: string | null;
          exit_opportunities: string | null;
          exposure_quality: string | null;
          external_recognition: string | null;
          facebook_url: string | null;
          family_health_insurance: string | null;
          feedback_culture: string | null;
          fixed_vs_variable_pay: string | null;
          flexibility_level: string | null;
          focus_sectors: string[] | null;
          future_projections: string | null;
          geopolitical_risks: string | null;
          glassdoor_rating: number | null;
          global_exposure: string | null;
          go_to_market_strategy: string | null;
          google_rating: number | null;
          headquarters_address: string | null;
          health_support: string | null;
          hiring_velocity: string | null;
          history_timeline: Json | null;
          id: string;
          incorporation_year: number | null;
          indeed_rating: number | null;
          infrastructure_safety: string | null;
          innovation_roadmap: string | null;
          instagram_url: string | null;
          intellectual_property: string | null;
          internal_mobility: string | null;
          key_challenges_needs: string | null;
          key_competitors: string[] | null;
          key_investors: string[] | null;
          key_leaders: Json | null;
          layoff_history: string | null;
          learning_culture: string | null;
          leave_policy: string | null;
          legal_issues: string | null;
          lifestyle_benefits: string | null;
          linkedin_url: string | null;
          location_centrality: string | null;
          logo_url: string | null;
          macro_risks: string | null;
          manager_quality: string | null;
          market_share_percentage: number | null;
          marketing_video_url: string | null;
          mentorship_availability: string | null;
          mission_clarity: string | null;
          name: string;
          nature_of_company: string | null;
          network_strength: string | null;
          offerings_description: string | null;
          office_count: number | null;
          office_locations: string[] | null;
          office_zone_type: string | null;
          onboarding_quality: string | null;
          operating_countries: string[] | null;
          overtime_expectations: string | null;
          overview_text: string | null;
          pain_points_addressed: string | null;
          partnership_ecosystem: string | null;
          primary_contact_email: string | null;
          primary_phone_number: string | null;
          product_pipeline: string | null;
          profitability_status: string | null;
          promotion_clarity: string | null;
          psychological_safety: string | null;
          public_transport_access: string | null;
          r_and_d_investment: string | null;
          recent_funding_rounds: Json | null;
          recent_news: Json | null;
          regulatory_status: string | null;
          relocation_support: string | null;
          remote_policy_details: string | null;
          revenue_mix: Json | null;
          role_clarity: string | null;
          runway_months: number | null;
          safety_policies: string | null;
          sam: string | null;
          short_name: string | null;
          skill_relevance: string | null;
          social_media_followers: Json | null;
          som: string | null;
          strategic_priorities: string | null;
          supply_chain_dependencies: string | null;
          tam: string | null;
          tech_adoption_rating: number | null;
          tech_stack: string[] | null;
          technology_partners: string[] | null;
          tools_access: string | null;
          top_customers: string[] | null;
          total_capital_raised: string | null;
          training_spend: string | null;
          twitter_handle: string | null;
          typical_hours: string | null;
          unique_differentiators: string | null;
          updated_at: string;
          valuation: string | null;
          warm_intro_pathways: string | null;
          weaknesses_gaps: string | null;
          website_quality: string | null;
          website_rating: number | null;
          website_traffic_rank: string | null;
          website_url: string | null;
          weekend_work: string | null;
          work_culture_summary: string | null;
          work_impact: string | null;
          yoy_growth_rate: number | null;
        };
        Insert: {
          ai_ml_adoption_level?: string | null;
          airport_commute_time?: string | null;
          annual_profit?: string | null;
          annual_revenue?: string | null;
          area_safety?: string | null;
          automation_level?: string | null;
          avg_retention_tenure?: string | null;
          awards_recognitions?: string[] | null;
          board_members?: Json | null;
          bonus_predictability?: string | null;
          brand_sentiment_score?: number | null;
          brand_value?: string | null;
          burn_multiplier?: number | null;
          burn_rate?: string | null;
          burnout_risk?: string | null;
          cab_policy?: string | null;
          category?: string | null;
          ceo_linkedin_url?: string | null;
          ceo_name?: string | null;
          competitive_advantages?: string | null;
          contact_person_email?: string | null;
          contact_person_name?: string | null;
          contact_person_phone?: string | null;
          contact_person_title?: string | null;
          core_value_proposition?: string | null;
          created_at?: string;
          cross_functional_exposure?: string | null;
          customer_testimonials?: Json | null;
          cybersecurity_posture?: string | null;
          decision_maker_access?: string | null;
          diversity_inclusion_score?: number | null;
          diversity_metrics?: Json | null;
          early_ownership?: string | null;
          emergency_preparedness?: string | null;
          employee_size?: string | null;
          employee_turnover?: string | null;
          esg_ratings?: string | null;
          esops_incentives?: string | null;
          ethical_standards?: string | null;
          event_participation?: string | null;
          execution_thinking_balance?: string | null;
          exit_opportunities?: string | null;
          exposure_quality?: string | null;
          external_recognition?: string | null;
          facebook_url?: string | null;
          family_health_insurance?: string | null;
          feedback_culture?: string | null;
          fixed_vs_variable_pay?: string | null;
          flexibility_level?: string | null;
          focus_sectors?: string[] | null;
          future_projections?: string | null;
          geopolitical_risks?: string | null;
          glassdoor_rating?: number | null;
          global_exposure?: string | null;
          go_to_market_strategy?: string | null;
          google_rating?: number | null;
          headquarters_address?: string | null;
          health_support?: string | null;
          hiring_velocity?: string | null;
          history_timeline?: Json | null;
          id?: string;
          incorporation_year?: number | null;
          indeed_rating?: number | null;
          infrastructure_safety?: string | null;
          innovation_roadmap?: string | null;
          instagram_url?: string | null;
          intellectual_property?: string | null;
          internal_mobility?: string | null;
          key_challenges_needs?: string | null;
          key_competitors?: string[] | null;
          key_investors?: string[] | null;
          key_leaders?: Json | null;
          layoff_history?: string | null;
          learning_culture?: string | null;
          leave_policy?: string | null;
          legal_issues?: string | null;
          lifestyle_benefits?: string | null;
          linkedin_url?: string | null;
          location_centrality?: string | null;
          logo_url?: string | null;
          macro_risks?: string | null;
          manager_quality?: string | null;
          market_share_percentage?: number | null;
          marketing_video_url?: string | null;
          mentorship_availability?: string | null;
          mission_clarity?: string | null;
          name: string;
          nature_of_company?: string | null;
          network_strength?: string | null;
          offerings_description?: string | null;
          office_count?: number | null;
          office_locations?: string[] | null;
          office_zone_type?: string | null;
          onboarding_quality?: string | null;
          operating_countries?: string[] | null;
          overtime_expectations?: string | null;
          overview_text?: string | null;
          pain_points_addressed?: string | null;
          partnership_ecosystem?: string | null;
          primary_contact_email?: string | null;
          primary_phone_number?: string | null;
          product_pipeline?: string | null;
          profitability_status?: string | null;
          promotion_clarity?: string | null;
          psychological_safety?: string | null;
          public_transport_access?: string | null;
          r_and_d_investment?: string | null;
          recent_funding_rounds?: Json | null;
          recent_news?: Json | null;
          regulatory_status?: string | null;
          relocation_support?: string | null;
          remote_policy_details?: string | null;
          revenue_mix?: Json | null;
          role_clarity?: string | null;
          runway_months?: number | null;
          safety_policies?: string | null;
          sam?: string | null;
          short_name?: string | null;
          skill_relevance?: string | null;
          social_media_followers?: Json | null;
          som?: string | null;
          strategic_priorities?: string | null;
          supply_chain_dependencies?: string | null;
          tam?: string | null;
          tech_adoption_rating?: number | null;
          tech_stack?: string[] | null;
          technology_partners?: string[] | null;
          tools_access?: string | null;
          top_customers?: string[] | null;
          total_capital_raised?: string | null;
          training_spend?: string | null;
          twitter_handle?: string | null;
          typical_hours?: string | null;
          unique_differentiators?: string | null;
          updated_at?: string;
          valuation?: string | null;
          warm_intro_pathways?: string | null;
          weaknesses_gaps?: string | null;
          website_quality?: string | null;
          website_rating?: number | null;
          website_traffic_rank?: string | null;
          website_url?: string | null;
          weekend_work?: string | null;
          work_culture_summary?: string | null;
          work_impact?: string | null;
          yoy_growth_rate?: number | null;
        };
        Update: {
          ai_ml_adoption_level?: string | null;
          airport_commute_time?: string | null;
          annual_profit?: string | null;
          annual_revenue?: string | null;
          area_safety?: string | null;
          automation_level?: string | null;
          avg_retention_tenure?: string | null;
          awards_recognitions?: string[] | null;
          board_members?: Json | null;
          bonus_predictability?: string | null;
          brand_sentiment_score?: number | null;
          brand_value?: string | null;
          burn_multiplier?: number | null;
          burn_rate?: string | null;
          burnout_risk?: string | null;
          cab_policy?: string | null;
          category?: string | null;
          ceo_linkedin_url?: string | null;
          ceo_name?: string | null;
          competitive_advantages?: string | null;
          contact_person_email?: string | null;
          contact_person_name?: string | null;
          contact_person_phone?: string | null;
          contact_person_title?: string | null;
          core_value_proposition?: string | null;
          created_at?: string;
          cross_functional_exposure?: string | null;
          customer_testimonials?: Json | null;
          cybersecurity_posture?: string | null;
          decision_maker_access?: string | null;
          diversity_inclusion_score?: number | null;
          diversity_metrics?: Json | null;
          early_ownership?: string | null;
          emergency_preparedness?: string | null;
          employee_size?: string | null;
          employee_turnover?: string | null;
          esg_ratings?: string | null;
          esops_incentives?: string | null;
          ethical_standards?: string | null;
          event_participation?: string | null;
          execution_thinking_balance?: string | null;
          exit_opportunities?: string | null;
          exposure_quality?: string | null;
          external_recognition?: string | null;
          facebook_url?: string | null;
          family_health_insurance?: string | null;
          feedback_culture?: string | null;
          fixed_vs_variable_pay?: string | null;
          flexibility_level?: string | null;
          focus_sectors?: string[] | null;
          future_projections?: string | null;
          geopolitical_risks?: string | null;
          glassdoor_rating?: number | null;
          global_exposure?: string | null;
          go_to_market_strategy?: string | null;
          google_rating?: number | null;
          headquarters_address?: string | null;
          health_support?: string | null;
          hiring_velocity?: string | null;
          history_timeline?: Json | null;
          id?: string;
          incorporation_year?: number | null;
          indeed_rating?: number | null;
          infrastructure_safety?: string | null;
          innovation_roadmap?: string | null;
          instagram_url?: string | null;
          intellectual_property?: string | null;
          internal_mobility?: string | null;
          key_challenges_needs?: string | null;
          key_competitors?: string[] | null;
          key_investors?: string[] | null;
          key_leaders?: Json | null;
          layoff_history?: string | null;
          learning_culture?: string | null;
          leave_policy?: string | null;
          legal_issues?: string | null;
          lifestyle_benefits?: string | null;
          linkedin_url?: string | null;
          location_centrality?: string | null;
          logo_url?: string | null;
          macro_risks?: string | null;
          manager_quality?: string | null;
          market_share_percentage?: number | null;
          marketing_video_url?: string | null;
          mentorship_availability?: string | null;
          mission_clarity?: string | null;
          name?: string;
          nature_of_company?: string | null;
          network_strength?: string | null;
          offerings_description?: string | null;
          office_count?: number | null;
          office_locations?: string[] | null;
          office_zone_type?: string | null;
          onboarding_quality?: string | null;
          operating_countries?: string[] | null;
          overtime_expectations?: string | null;
          overview_text?: string | null;
          pain_points_addressed?: string | null;
          partnership_ecosystem?: string | null;
          primary_contact_email?: string | null;
          primary_phone_number?: string | null;
          product_pipeline?: string | null;
          profitability_status?: string | null;
          promotion_clarity?: string | null;
          psychological_safety?: string | null;
          public_transport_access?: string | null;
          r_and_d_investment?: string | null;
          recent_funding_rounds?: Json | null;
          recent_news?: Json | null;
          regulatory_status?: string | null;
          relocation_support?: string | null;
          remote_policy_details?: string | null;
          revenue_mix?: Json | null;
          role_clarity?: string | null;
          runway_months?: number | null;
          safety_policies?: string | null;
          sam?: string | null;
          short_name?: string | null;
          skill_relevance?: string | null;
          social_media_followers?: Json | null;
          som?: string | null;
          strategic_priorities?: string | null;
          supply_chain_dependencies?: string | null;
          tam?: string | null;
          tech_adoption_rating?: number | null;
          tech_stack?: string[] | null;
          technology_partners?: string[] | null;
          tools_access?: string | null;
          top_customers?: string[] | null;
          total_capital_raised?: string | null;
          training_spend?: string | null;
          twitter_handle?: string | null;
          typical_hours?: string | null;
          unique_differentiators?: string | null;
          updated_at?: string;
          valuation?: string | null;
          warm_intro_pathways?: string | null;
          weaknesses_gaps?: string | null;
          website_quality?: string | null;
          website_rating?: number | null;
          website_traffic_rank?: string | null;
          website_url?: string | null;
          weekend_work?: string | null;
          work_culture_summary?: string | null;
          work_impact?: string | null;
          yoy_growth_rate?: number | null;
        };
        Relationships: [];
      };
      company_json: {
        Row: {
          json_id: string;
          company_id: string;
          short_json: Json;
          full_json: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          json_id?: string;
          company_id: string;
          short_json: Json;
          full_json: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          json_id?: string;
          company_id?: string;
          short_json?: Json;
          full_json?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      company_hiring_rounds: {
        Row: {
          id: number;
          company_id: number;
          round_order: number;
          round_name: string;
          round_type: string | null;
          description: string | null;
          difficulty_level: string | null;
          elimination_rate: string | null;
          preparation_focus: string | null;
          tips: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          company_id: number;
          round_order: number;
          round_name: string;
          round_type?: string | null;
          description?: string | null;
          difficulty_level?: string | null;
          elimination_rate?: string | null;
          preparation_focus?: string | null;
          tips?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          company_id?: number;
          round_order?: number;
          round_name?: string;
          round_type?: string | null;
          description?: string | null;
          difficulty_level?: string | null;
          elimination_rate?: string | null;
          preparation_focus?: string | null;
          tips?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "company_hiring_rounds_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["company_id"];
          },
        ];
      };
      companies_json: {
        Row: {
          json_id: string;
          company_id: string;
          short_json: Json;
          full_json: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          json_id?: string;
          company_id: string;
          short_json: Json;
          full_json: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          json_id?: string;
          company_id?: string;
          short_json?: Json;
          full_json?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      innovx_json: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          json_data: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          json_data: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          name?: string;
          json_data?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      job_role_details_json: {
        Row: {
          id: string;
          company_id: string;
          company_name: string;
          job_role_json: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          company_name: string;
          job_role_json: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          company_name?: string;
          job_role_json?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
