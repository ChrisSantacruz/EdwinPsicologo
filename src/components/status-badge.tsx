import { STATUS_LABEL } from "@/lib/constants";

const classMap: Record<string, string> = {
  PENDING_PATIENT: "badge-pending",
  AWAITING_PROOF: "badge-awaiting",
  CONFIRMED: "badge-confirmed",
  CANCELLED: "badge-cancelled",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${classMap[status] ?? "badge-pending"}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}
