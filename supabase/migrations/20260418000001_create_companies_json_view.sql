-- Create a view alias so runtime code can use either table name
-- companies_json points to the actual company_json table

CREATE VIEW IF NOT EXISTS public.companies_json AS
SELECT *
FROM public.company_json;
