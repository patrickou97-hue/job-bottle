import { useMemo } from "react";
import { calculateBottleStack } from "@/components/applications/bottleGeometry";
import type { ApplicationWithJob } from "@/lib/types";

export function useBottleStack(applications: ApplicationWithJob[]) {
  return useMemo(() => calculateBottleStack(applications), [applications]);
}
