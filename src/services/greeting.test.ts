import { describe, expect, it } from "vitest";
import { getGreetingPeriod, getPersonalizedGreeting } from "./greeting";
import { sanitizeDisplayName } from "./preferences";

describe("getGreetingPeriod", () => {
  it.each([
    [4, "night"],
    [5, "morning"],
    [11, "morning"],
    [12, "afternoon"],
    [16, "afternoon"],
    [17, "evening"],
    [20, "evening"],
    [21, "night"],
  ] as const)("uses the appropriate period at %s:00", (hour, expected) => {
    expect(getGreetingPeriod(new Date(2026, 0, 1, hour))).toBe(expected);
  });
});

describe("getPersonalizedGreeting", () => {
  it("uses the selected name and the local time period", () => {
    expect(getPersonalizedGreeting("en", "  Asha ", new Date(2026, 0, 1, 18)))
      .toBe("Good evening, Asha");
  });

  it("does not append punctuation for a blank name", () => {
    expect(getPersonalizedGreeting("hi", "", new Date(2026, 0, 1, 9)))
      .toBe("सुप्रभात");
  });
});

describe("sanitizeDisplayName", () => {
  it("removes control characters and trims the entered name", () => {
    expect(sanitizeDisplayName("  Asha\u0000 Rao  ")).toBe("Asha Rao");
  });

  it("limits saved names to 32 characters", () => {
    expect(sanitizeDisplayName("A".repeat(40))).toHaveLength(32);
  });
});
