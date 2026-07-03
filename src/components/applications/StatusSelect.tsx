"use client";

import { APPLICATION_STATUS, APPLICATION_STATUS_LABELS } from "@/lib/constants";
import { Select } from "@/components/ui/Select";
import type { ApplicationStatus } from "@/lib/types";

export function StatusSelect({
  value,
  onChange,
}: {
  value: ApplicationStatus;
  onChange: (value: ApplicationStatus) => void;
}) {
  return (
    <Select
      value={value}
      onChange={(event) => onChange(event.target.value as ApplicationStatus)}
    >
      {APPLICATION_STATUS.map((status) => (
        <option key={status} value={status}>
          {APPLICATION_STATUS_LABELS[status]}
        </option>
      ))}
    </Select>
  );
}
