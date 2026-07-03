import { useCallback, useState } from "react";
import type { Job } from "@/lib/types";

export function useCaptureMotion() {
  const [capturedJob, setCapturedJob] = useState<Job | null>(null);

  const startCapture = useCallback((job: Job) => {
    setCapturedJob(job);
  }, []);

  const clearCapture = useCallback(() => {
    setCapturedJob(null);
  }, []);

  return { capturedJob, startCapture, clearCapture };
}
