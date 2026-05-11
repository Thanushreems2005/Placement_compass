-- Add indexes for job_role_details_json table

CREATE INDEX IF NOT EXISTS idx_job_role_company_id ON public.job_role_details_json USING btree (company_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_job_role_company_name ON public.job_role_details_json USING btree (company_name) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_job_role_json ON public.job_role_details_json USING gin (job_role_json) TABLESPACE pg_default;