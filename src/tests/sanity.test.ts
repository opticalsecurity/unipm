import { vi, test, expect } from "vitest";

test("vi.fn sanity check", async () => {
  const m = vi.fn();
  m.mockReturnValue(1);
  expect(m()).toBe(1);

  const m2 = vi.fn(() => Promise.resolve(1));
  m2.mockResolvedValue(2);
  await expect(m2()).resolves.toBe(2);
});
