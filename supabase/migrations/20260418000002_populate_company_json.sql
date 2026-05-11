-- Populate company_json from companies table
-- This assumes companies table has the data and company_json is empty

-- First, create the sequence if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS public.company_json_json_id_seq;

-- Insert data from companies into company_json
-- Note: Adjust the json structure based on your actual company columns
INSERT INTO public.company_json (company_id, short_json, full_json)
SELECT 
  c.company_id,
  jsonb_build_object(
    'name', c.name,
    'short_name', c.short_name,
    'logo_url', c.logo_url,
    'category', c.category,
    'employee_size', c.employee_size,
    'focus_sectors', CASE WHEN c.focus_sectors IS NOT NULL THEN to_jsonb(c.focus_sectors) ELSE null END,
    'hiring_velocity', c.hiring_velocity,
    'profitability_status', c.profitability_status,
    'yoy_growth_rate', c.yoy_growth_rate,
    'brand_value', c.brand_value
  ) as short_json,
  jsonb_build_object(
    'id', c.company_id,
    'name', c.name,
    'short_name', c.short_name,
    'logo_url', c.logo_url,
    'category', c.category,
    'incorporation_year', c.incorporation_year,
    'nature_of_company', c.nature_of_company,
    'headquarters_address', c.headquarters_address,
    'employee_size', c.employee_size,
    'website_url', c.website_url,
    'linkedin_url', c.linkedin_url,
    'twitter_handle', c.twitter_handle,
    'overview_text', c.overview_text
  ) as full_json
FROM public.companies c
WHERE NOT EXISTS (SELECT 1 FROM public.company_json cj WHERE cj.company_id = c.company_id)
ON CONFLICT (company_id) DO NOTHING;
