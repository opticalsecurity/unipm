import { CommandMatching, PackageManagerConfig } from "../core/matching";
import { PackageManager } from "../types/package-managers";
import { describe, test, expect } from "vitest";

describe("Command Matching", () => {
    test("should have configuration for all package managers", () => {
        const managers = [
            PackageManager.BUN,
            PackageManager.PNPM,
            PackageManager.YARN,
            PackageManager.NPM,
        ];

        for (const manager of managers) {
            expect(PackageManagerConfig).toHaveProperty(manager);
            expect(PackageManagerConfig[manager]).toHaveProperty("add");
            expect(PackageManagerConfig[manager]).toHaveProperty("remove");
            expect(PackageManagerConfig[manager]).toHaveProperty("install");
            expect(PackageManagerConfig[manager]).toHaveProperty("update");
            expect(PackageManagerConfig[manager]).toHaveProperty("run");
            expect(PackageManagerConfig[manager]).toHaveProperty("exec");
        }
    });

    test("CommandMatching should be correctly derived from PackageManagerConfig", () => {
        // Check a few samples
        expect(CommandMatching.add[PackageManager.BUN]).toEqual(PackageManagerConfig[PackageManager.BUN].add);
        expect(CommandMatching.install[PackageManager.NPM]).toEqual(PackageManagerConfig[PackageManager.NPM].install);
    });
});
