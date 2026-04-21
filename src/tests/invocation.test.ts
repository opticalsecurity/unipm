import { describe, expect, test } from "vitest";
import { detectCliInvocation } from "../core/invocation";

describe("CLI invocation detection", () => {
  test("detects npm alias mode from argv0", () => {
    const invocation = detectCliInvocation({
      argv: ["/home/user/.local/bin/npm", "install", "react"],
      argv0: "/home/user/.local/bin/npm",
      execPath: "/home/user/.local/bin/unipm",
      env: {},
    });

    expect(invocation.aliasMode).toBe(true);
    expect(invocation.frontend).toBe("npm");
    expect(invocation.normalizedName).toBe("npm");
  });

  test("normalizes yarnpkg to yarn frontend", () => {
    const invocation = detectCliInvocation({
      argv: ["/usr/local/bin/yarnpkg", "build"],
      argv0: "/usr/local/bin/yarnpkg",
      execPath: "/usr/local/bin/unipm",
      env: {},
    });

    expect(invocation.aliasMode).toBe(true);
    expect(invocation.frontend).toBe("yarn");
  });

  test("treats unipm as native mode", () => {
    const invocation = detectCliInvocation({
      argv: ["/usr/local/bin/unipm", "install"],
      argv0: "/usr/local/bin/unipm",
      execPath: "/usr/local/bin/unipm",
      env: {},
    });

    expect(invocation.aliasMode).toBe(false);
    expect(invocation.frontend).toBeNull();
    expect(invocation.normalizedName).toBe("unipm");
  });

  test("supports explicit invocation override for tests and wrappers", () => {
    const invocation = detectCliInvocation({
      argv: ["/usr/local/bin/unipm", "install"],
      argv0: "/usr/local/bin/unipm",
      execPath: "/usr/local/bin/unipm",
      env: {
        UNIPM_INVOKED_AS: "pnpm",
      },
    });

    expect(invocation.aliasMode).toBe(true);
    expect(invocation.frontend).toBe("pnpm");
  });
});
