// Shared tone for statuses across the dashboard (classes .status--done / --warn / --stop).
export function statusTone(status: string | null | undefined): "done" | "warn" | "stop" | null {
  switch (status) {
    case "ACTIVE":
    case "APPROVED":
    case "PAID":
    case "DELIVERED":
    case "COMPLETED":
      return "done";
    case "PENDING":
    case "PENDING_APPROVAL":
    case "DRAFT":
    case "PROCESSING":
    case "SCHEDULED":
      return "warn";
    case "REVERSED":
    case "CANCELLED":
    case "FAILED":
    case "REJECTED":
    case "SUSPENDED":
    case "CLOSED":
    case "REFUNDED":
    case "DISABLED":
    case "EXPIRED":
    case "ENDED":
    case "ARCHIVED":
      return "stop";
    default:
      return null;
  }
}
