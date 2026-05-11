-- Rebuild company_json by joining available tables
-- This will populate the fields needed for the Analytics and Explore pages

TRUNCATE TABLE public.company_json;

INSERT INTO public.company_json (company_id, short_json, full_json)
SELECT 
  c.company_id,
  jsonb_build_object(
    'name', c.name,
    'short_name', c.short_name,
    'logo_url', null, -- Not in companies table directly, assuming null
    'category', c.category,
    'employee_size', c.employee_size,
    'focus_sectors', null, 
    'hiring_velocity', chv.hiring_velocity,
    'profitability_status', cf.profitability_status,
    'yoy_growth_rate', cf.yoy_growth_rate,
    'brand_value', null,
    'remote_policy_details', cl.remote_policy_details
  ) as short_json,
  jsonb_build_object(
    'id', c.company_id,
    'name', c.name,
    'short_name', c.short_name,
    'category', c.category,
    'incorporation_year', c.incorporation_year,
    'nature_of_company', c.nature_of_company,
    'headquarters_address', c.headquarters_address,
    'employee_size', c.employee_size,
    'website_url', c.website_url,
    'linkedin_url', c.linkedin_url,
    'twitter_handle', c.twitter_handle,
    'overview_text', c.overview_text,
    
    -- Financials
    'annual_revenue', cf.annual_revenue,
    'annual_profit', cf.annual_profit,
    'valuation', cf.valuation,
    'yoy_growth_rate', cf.yoy_growth_rate,
    'profitability_status', cf.profitability_status,
    'burn_rate', cf.burn_rate,
    'runway_months', cf.runway_months,
    'burn_multiplier', cf.burn_multiplier,
    
    -- Culture
    'hiring_velocity', chv.hiring_velocity,
    'employee_turnover', cc.employee_turnover,
    'avg_retention_tenure', cc.avg_retention_tenure,
    'layoff_history', cc.layoff_history,
    'manager_quality', cc.manager_quality,
    'psychological_safety', cc.psychological_safety,
    'mission_clarity', cc.mission_clarity,
    'burnout_risk', cc.burnout_risk,
    
    -- Logistics
    'typical_hours', cl.typical_hours,
    'overtime_expectations', cl.overtime_expectations,
    'weekend_work', cl.weekend_work,
    'remote_policy_details', cl.remote_policy_details,
    'location_centrality', cl.location_centrality,
    'airport_commute_time', cl.airport_commute_time,
    'office_zone_type', cl.office_zone_type
  ) as full_json
FROM public.companies c
LEFT JOIN public.company_financials cf ON c.company_id = cf.company_id
LEFT JOIN public.company_culture cc ON c.company_id = cc.company_id
LEFT JOIN public.company_hiring_velocity chv ON cc.company_culture_id = chv.company_culture_id
LEFT JOIN public.company_logistics cl ON c.company_id = cl.company_id;
