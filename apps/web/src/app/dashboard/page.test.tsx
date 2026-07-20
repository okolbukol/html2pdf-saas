import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, redirectMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  redirectMock: vi.fn()
}));

vi.mock("../../auth", () => ({ auth: authMock }));
vi.mock("../actions/auth", () => ({ signOutCurrentSession: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

import DashboardPage from "./page";

describe("protected dashboard", () => {
  beforeEach(() => {
    authMock.mockReset();
    redirectMock.mockReset();
  });

  it("shows the authenticated user's name and empty state", async () => {
    authMock.mockResolvedValue({
      expires: "2026-08-19T00:00:00.000Z",
      user: {
        email: "user@example.com",
        id: "user-1",
        name: "Example User"
      }
    });

    render(await DashboardPage());

    expect(screen.getByText("Authenticated")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Example User" })).toBeTruthy();
    expect(screen.getByText("No PDFs yet.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Log out" })).toBeTruthy();
  });

  it("redirects unauthenticated requests before rendering private content", async () => {
    authMock.mockResolvedValue(null);
    redirectMock.mockImplementation(() => {
      throw new Error("redirect:/");
    });

    await expect(DashboardPage()).rejects.toThrow("redirect:/");
    expect(redirectMock).toHaveBeenCalledWith("/");
  });
});
