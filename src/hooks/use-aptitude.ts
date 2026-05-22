import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchAptitudeDashboard,
  submitAptitudeAttempt,
  generateAptitudeRoadmap,
} from "@/services/aptitudeService";
import type {
  DashboardResponse,
  AptitudeAttemptCreate,
  RoadmapRequest,
} from "@/types/aptitude";

export function useAptitudeDashboard(studentId: string | null) {
  return useQuery<DashboardResponse, Error>({
    queryKey: ["aptitude", "dashboard", studentId],
    queryFn: () => fetchAptitudeDashboard(studentId!),
    enabled: !!studentId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useSubmitAttemptMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: AptitudeAttemptCreate) => submitAptitudeAttempt(data),
    onSuccess: (_, variables) => {
      // Invalidate the dashboard query to force refresh
      queryClient.invalidateQueries({
        queryKey: ["aptitude", "dashboard", variables.student_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["aptitude", "analytics", variables.student_id],
      });
    },
  });
}

export function useGenerateRoadmapMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ studentId, request }: { studentId: string; request: RoadmapRequest }) =>
      generateAptitudeRoadmap(studentId, request),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["aptitude", "dashboard", variables.studentId],
      });
    },
  });
}
