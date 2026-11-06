// How an order's status reads and looks in the account (.status--done / --warn / --stop).
export function statusTone(status: string): "done" | "warn" | "stop" | undefined {
  if (["FULFILLED", "DELIVERED", "COMPLETED"].includes(status)) return "done";
  if (["PENDING_PAYMENT", "ON_HOLD", "PARTIALLY_FULFILLED"].includes(status)) return "warn";
  if (status === "CANCELLED") return "stop";
  return undefined;
}

export const statusKey = (status: string) => status.toLowerCase();
