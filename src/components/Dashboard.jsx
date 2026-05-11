import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function Dashboard() {
  const [companyCount, setCompanyCount] = useState(null);
  const [jobCount, setJobCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function fetchDashboardData() {
      setLoading(true);
      setError("");
      console.log("Dashboard fetching data...");

      try {
        const [companiesResponse, jobsResponse] = await Promise.all([
          supabase.from("company_json").select("json_id", { count: "exact" }),
          supabase.from("job_role_details_json").select("id", { count: "exact" }),
        ]);

        console.log("companiesResponse", companiesResponse);
        console.log("jobsResponse", jobsResponse);

        if (companiesResponse.error) {
          throw companiesResponse.error;
        }

        if (jobsResponse.error) {
          throw jobsResponse.error;
        }

        if (!isMounted) {
          return;
        }

        setCompanyCount(companiesResponse.count ?? companiesResponse.data?.length ?? 0);
        setJobCount(jobsResponse.count ?? jobsResponse.data?.length ?? 0);
      } catch (fetchError) {
        console.error("Error fetching dashboard data:", fetchError);
        if (isMounted) {
          setError(
            fetchError instanceof Error ? fetchError.message : "Unable to load dashboard data",
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchDashboardData();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="dashboard-block">
      <h1>Dashboard</h1>
      {error ? (
        <div role="alert" style={{ color: "var(--red-600)" }}>
          Error loading dashboard: {error}
        </div>
      ) : null}
      <div>
        <strong>Total companies count:</strong> {loading ? "Loading…" : (companyCount ?? "0")}
      </div>
      <div>
        <strong>Total jobs count:</strong> {loading ? "Loading…" : (jobCount ?? "0")}
      </div>
    </section>
  );
}
