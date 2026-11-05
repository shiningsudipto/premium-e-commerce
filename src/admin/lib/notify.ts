import { toast } from "sonner";
import { errorMessage } from "../store/api-errors";

// One place for how API outcomes are announced, so every screen words them the same way.
export const notifyError = (error: unknown) => toast.error(errorMessage(error));
export const notifySaved = (message = "Saved") => toast.success(message);
