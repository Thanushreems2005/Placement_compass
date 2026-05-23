import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  analyzeResumeFirst,
  fetchCompanyMatches,
  fetchProfileAnalysis,
  fetchRoadmap,
  fetchSkillGap,
  generateReadinessReport,
  loginCareerUser,
  uploadResume,
} from "@/services/careerService";

export const CAREER_TOKEN_KEY = "placement_career_token";
export const RESUME_CAREER_TOKEN_KEY = "placement_resume_career_token";

export function getStoredCareerToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(RESUME_CAREER_TOKEN_KEY);
}

export function setStoredCareerToken(token: string | null) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CAREER_TOKEN_KEY);
  if (token) window.localStorage.setItem(RESUME_CAREER_TOKEN_KEY, token);
  else window.localStorage.removeItem(RESUME_CAREER_TOKEN_KEY);
}

export function useCareerProfile(token: string | null) {
  return useQuery({
    queryKey: ["career-profile", token],
    enabled: !!token,
    queryFn: () => fetchProfileAnalysis(token!),
    retry: 1,
  });
}

export function useCareerMatches(token: string | null) {
  return useQuery({
    queryKey: ["career-company-matches", token],
    enabled: !!token,
    queryFn: () => fetchCompanyMatches(token!, 9),
    retry: 1,
  });
}

export function useCareerSkillGap(token: string | null, companyName: string | null) {
  return useQuery({
    queryKey: ["career-skill-gap", token, companyName],
    enabled: !!token && !!companyName,
    queryFn: () => fetchSkillGap(token!, companyName!),
    retry: 1,
  });
}

export function useCareerRoadmap(token: string | null, companyName: string | null) {
  return useQuery({
    queryKey: ["career-roadmap", token, companyName],
    enabled: !!token && !!companyName,
    queryFn: () => fetchRoadmap(token!, companyName!),
    retry: 1,
  });
}

export function useCareerLogin() {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      loginCareerUser(email, password),
  });
}

export function useResumeFirstAnalysis() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => analyzeResumeFirst(file),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["career-profile"] });
      queryClient.removeQueries({ queryKey: ["career-company-matches"] });
      queryClient.removeQueries({ queryKey: ["career-skill-gap"] });
      queryClient.removeQueries({ queryKey: ["career-roadmap"] });
    },
  });
}

export function useReadinessReport(token: string | null, companyName: string | null) {
  return useMutation({
    mutationFn: () => generateReadinessReport(token!, companyName!),
  });
}

export function useResumeUpload(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadResume(token!, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["career-profile", token] });
      queryClient.invalidateQueries({ queryKey: ["career-company-matches", token] });
      queryClient.invalidateQueries({ queryKey: ["career-skill-gap", token] });
      queryClient.invalidateQueries({ queryKey: ["career-roadmap", token] });
    },
  });
}
