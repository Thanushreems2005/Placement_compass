-- Create JSON tables for runtime data access

CREATE TABLE IF NOT EXISTS public.company_json (
  json_id INTEGER PRIMARY KEY DEFAULT nextval('company_json_json_id_seq'::regclass),
  company_id INTEGER NOT NULL UNIQUE,
  short_json JSONB NOT NULL,
  full_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT company_json_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(company_id)
);

CREATE TABLE IF NOT EXISTS public.innovx_json (
  id INTEGER PRIMARY KEY DEFAULT nextval('innovx_json_id_seq'::regclass),
  company_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  json_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT innovx_json_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(company_id)
);

CREATE TABLE IF NOT EXISTS public.job_role_details_json (
  id INTEGER PRIMARY KEY DEFAULT nextval('job_role_details_json_id_seq'::regclass),
  company_id INTEGER NOT NULL,
  company_name TEXT NOT NULL,
  job_role_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT job_role_details_json_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(company_id)
);

-- Enable RLS
ALTER TABLE public.company_json ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.innovx_json ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_role_details_json ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (no auth required)
CREATE POLICY "Allow public read access on company_json" ON public.company_json
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access on innovx_json" ON public.innovx_json
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access on job_role_details_json" ON public.job_role_details_json
  FOR SELECT USING (true);