import { useMutation } from "@tanstack/react-query";
import { analyzeResumeForATS } from "@/services/resumeOptimizerService";

export function useResumeOptimizerAnalysis() {
  return useMutation({
    mutationFn: ({ file, targetRole }: { file: File; targetRole?: string | null }) =>
      analyzeResumeForATS(file, targetRole),
  });
}
