import { beforeEach, describe, expect, it, vi } from "vitest";

const { signInMock, signOutMock } = vi.hoisted(() => ({
  signInMock: vi.fn(),
  signOutMock: vi.fn()
}));

vi.mock("../../auth", () => ({
  signIn: signInMock,
  signOut: signOutMock
}));

import { signInWithGoogle, signOutCurrentSession } from "./auth";

describe("authentication actions", () => {
  beforeEach(() => {
    signInMock.mockReset();
    signOutMock.mockReset();
  });

  it("starts only the Google sign-in flow", async () => {
    await signInWithGoogle();

    expect(signInMock).toHaveBeenCalledWith("google", { redirectTo: "/dashboard" });
  });

  it("signs out the current session and returns home", async () => {
    await signOutCurrentSession();

    expect(signOutMock).toHaveBeenCalledWith({ redirectTo: "/" });
  });
});
