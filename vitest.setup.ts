import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Server modules guard themselves with "server-only", which throws outside React Server Components.
vi.mock("server-only", () => ({}));
