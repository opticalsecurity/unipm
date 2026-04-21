import { describe, expect, test } from "vitest";
import { buildCompatibilityPlan } from "../core/compatibility";

describe("Compatibility mode", () => {
  test("translates npm install package flags to bun install", () => {
    const plan = buildCompatibilityPlan("npm", [
      "install",
      "react",
      "-D",
      "--save-exact",
    ]);

    expect(plan.executable).toBe("bun");
    expect(plan.args).toEqual(["install", "react", "--dev", "--exact"]);
  });

  test("translates npm init template usage to bun create", () => {
    const plan = buildCompatibilityPlan("npm", ["init", "vite@latest", "app"]);

    expect(plan.executable).toBe("bun");
    expect(plan.args).toEqual(["create", "vite@latest", "app"]);
  });

  test("keeps npm init flags on bun init", () => {
    const plan = buildCompatibilityPlan("npm", ["init", "-y"]);

    expect(plan.executable).toBe("bun");
    expect(plan.args).toEqual(["init", "-y"]);
  });

  test("translates npm cache clean to bun pm cache rm", () => {
    const plan = buildCompatibilityPlan("npm", ["cache", "clean", "--force"]);

    expect(plan.executable).toBe("bun");
    expect(plan.args).toEqual(["pm", "cache", "rm"]);
  });

  test("falls back to npm cli via bunx for npm-only commands", () => {
    const plan = buildCompatibilityPlan("npm", ["config", "set", "registry", "https://registry.npmjs.org"]);

    expect(plan.executable).toBe("bunx");
    expect(plan.args).toEqual([
      "npm",
      "config",
      "set",
      "registry",
      "https://registry.npmjs.org",
    ]);
  });

  test("translates pnpm dlx to bunx", () => {
    const plan = buildCompatibilityPlan("pnpm", ["dlx", "create-next-app@latest", "app"]);

    expect(plan.executable).toBe("bunx");
    expect(plan.args).toEqual(["create-next-app@latest", "app"]);
  });

  test("translates yarn bare commands to bun run", () => {
    const plan = buildCompatibilityPlan("yarn", ["build", "--watch"]);

    expect(plan.executable).toBe("bun");
    expect(plan.args).toEqual(["run", "build", "--watch"]);
  });

  test("preserves run separator semantics", () => {
    const plan = buildCompatibilityPlan("npm", ["run", "dev", "--", "--watch"]);

    expect(plan.executable).toBe("bun");
    expect(plan.args).toEqual(["run", "dev", "--watch"]);
  });

  test("translates npx directly to bunx", () => {
    const plan = buildCompatibilityPlan("npx", ["-p", "@angular/cli", "ng", "new", "demo"]);

    expect(plan.executable).toBe("bunx");
    expect(plan.args).toEqual(["-p", "@angular/cli", "ng", "new", "demo"]);
  });

  test("prints Bun version for frontend version flags", () => {
    const plan = buildCompatibilityPlan("npm", ["--version"]);

    expect(plan.executable).toBeNull();
    expect(plan.stdout).toBe(`${Bun.version}\n`);
  });
});
