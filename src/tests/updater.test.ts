import { describe, it, expect, vi, afterEach } from "vitest";
import {
  compareVersions,
  getPlatformIdentifier,
  findAssetUrl,
  fetchLatestRelease,
  getCurrentExecutablePath,
} from "../core/updater";
import type { GithubCheckVersionResponse } from "../types/github-check-version";

describe("Updater", () => {
  describe("compareVersions", () => {
    it("should return 0 for equal versions", () => {
      expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
      expect(compareVersions("v1.0.0", "1.0.0")).toBe(0);
      expect(compareVersions("1.0.0", "v1.0.0")).toBe(0);
    });

    it("should return -1 when first version is lower", () => {
      expect(compareVersions("1.0.0", "1.0.1")).toBe(-1);
      expect(compareVersions("1.0.0", "1.1.0")).toBe(-1);
      expect(compareVersions("1.0.0", "2.0.0")).toBe(-1);
      expect(compareVersions("0.9.9", "1.0.0")).toBe(-1);
    });

    it("should return 1 when first version is higher", () => {
      expect(compareVersions("1.0.1", "1.0.0")).toBe(1);
      expect(compareVersions("1.1.0", "1.0.0")).toBe(1);
      expect(compareVersions("2.0.0", "1.0.0")).toBe(1);
      expect(compareVersions("1.0.0", "0.9.9")).toBe(1);
    });

    it("should handle versions with different segment counts", () => {
      expect(compareVersions("1.0", "1.0.0")).toBe(0);
      expect(compareVersions("1.0.0", "1.0")).toBe(0);
      expect(compareVersions("1.0", "1.0.1")).toBe(-1);
      expect(compareVersions("1.0.1", "1.0")).toBe(1);
    });

    it("should handle v prefix", () => {
      expect(compareVersions("v1.2.3", "v1.2.4")).toBe(-1);
      expect(compareVersions("v2.0.0", "v1.9.9")).toBe(1);
    });
  });

  describe("getPlatformIdentifier", () => {
    it("should return a valid platform identifier", () => {
      const identifier = getPlatformIdentifier();
      expect(identifier).toMatch(/^(linux|darwin|windows)-(x64|arm64)$/);
    });
  });

  describe("findAssetUrl", () => {
    const mockRelease: GithubCheckVersionResponse = {
      url: "https://api.github.com/repos/test/test/releases/1",
      html_url: "https://github.com/test/test/releases/v1.0.0",
      assets_url: "https://api.github.com/repos/test/test/releases/1/assets",
      upload_url:
        "https://uploads.github.com/repos/test/test/releases/1/assets",
      tarball_url: "https://api.github.com/repos/test/test/tarball/v1.0.0",
      zipball_url: "https://api.github.com/repos/test/test/zipball/v1.0.0",
      discussion_url: "",
      id: 1,
      node_id: "test",
      tag_name: "v1.0.0",
      target_commitish: "main",
      name: "v1.0.0",
      body: "Release notes",
      draft: false,
      prerelease: false,
      created_at: new Date(),
      published_at: new Date(),
      author: {
        login: "test",
        id: 1,
        node_id: "test",
        avatar_url: "",
        gravatar_id: "",
        url: "",
        html_url: "",
        followers_url: "",
        following_url: "",
        gists_url: "",
        starred_url: "",
        subscriptions_url: "",
        organizations_url: "",
        repos_url: "",
        events_url: "",
        received_events_url: "",
        type: "User",
        site_admin: false,
      },
      assets: [
        {
          url: "https://api.github.com/repos/test/test/releases/assets/1",
          browser_download_url:
            "https://github.com/test/test/releases/download/v1.0.0/unipm-linux-x64",
          id: 1,
          node_id: "asset1",
          name: "unipm-linux-x64",
          label: "",
          state: "uploaded",
          content_type: "application/octet-stream",
          size: 1000000,
          download_count: 100,
          created_at: new Date(),
          updated_at: new Date(),
          uploader: {
            login: "test",
            id: 1,
            node_id: "test",
            avatar_url: "",
            gravatar_id: "",
            url: "",
            html_url: "",
            followers_url: "",
            following_url: "",
            gists_url: "",
            starred_url: "",
            subscriptions_url: "",
            organizations_url: "",
            repos_url: "",
            events_url: "",
            received_events_url: "",
            type: "User",
            site_admin: false,
          },
        },
        {
          url: "https://api.github.com/repos/test/test/releases/assets/2",
          browser_download_url:
            "https://github.com/test/test/releases/download/v1.0.0/unipm-darwin-arm64",
          id: 2,
          node_id: "asset2",
          name: "unipm-darwin-arm64",
          label: "",
          state: "uploaded",
          content_type: "application/octet-stream",
          size: 1000000,
          download_count: 50,
          created_at: new Date(),
          updated_at: new Date(),
          uploader: {
            login: "test",
            id: 1,
            node_id: "test",
            avatar_url: "",
            gravatar_id: "",
            url: "",
            html_url: "",
            followers_url: "",
            following_url: "",
            gists_url: "",
            starred_url: "",
            subscriptions_url: "",
            organizations_url: "",
            repos_url: "",
            events_url: "",
            received_events_url: "",
            type: "User",
            site_admin: false,
          },
        },
        {
          url: "https://api.github.com/repos/test/test/releases/assets/3",
          browser_download_url:
            "https://github.com/test/test/releases/download/v1.0.0/unipm-windows-x64.exe",
          id: 3,
          node_id: "asset3",
          name: "unipm-windows-x64.exe",
          label: "",
          state: "uploaded",
          content_type: "application/octet-stream",
          size: 1000000,
          download_count: 200,
          created_at: new Date(),
          updated_at: new Date(),
          uploader: {
            login: "test",
            id: 1,
            node_id: "test",
            avatar_url: "",
            gravatar_id: "",
            url: "",
            html_url: "",
            followers_url: "",
            following_url: "",
            gists_url: "",
            starred_url: "",
            subscriptions_url: "",
            organizations_url: "",
            repos_url: "",
            events_url: "",
            received_events_url: "",
            type: "User",
            site_admin: false,
          },
        },
      ],
    };

    it("should find linux-x64 asset", () => {
      const url = findAssetUrl(mockRelease, "linux-x64");
      expect(url).toBe(
        "https://github.com/test/test/releases/download/v1.0.0/unipm-linux-x64"
      );
    });

    it("should find darwin-arm64 asset", () => {
      const url = findAssetUrl(mockRelease, "darwin-arm64");
      expect(url).toBe(
        "https://github.com/test/test/releases/download/v1.0.0/unipm-darwin-arm64"
      );
    });

    it("should find windows-x64 asset", () => {
      const url = findAssetUrl(mockRelease, "windows-x64");
      expect(url).toBe(
        "https://github.com/test/test/releases/download/v1.0.0/unipm-windows-x64.exe"
      );
    });

    it("should return null for non-existent platform", () => {
      const url = findAssetUrl(mockRelease, "freebsd-x64");
      expect(url).toBeNull();
    });

    it("should be case-insensitive", () => {
      const url = findAssetUrl(mockRelease, "LINUX-X64");
      expect(url).toBe(
        "https://github.com/test/test/releases/download/v1.0.0/unipm-linux-x64"
      );
    });
  });

  describe("fetchLatestRelease", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should return release data on success", async () => {
      const mockData = { tag_name: "v1.0.0", assets: [] };
      vi.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockData),
      } as unknown as Response);

      const result = await fetchLatestRelease();
      expect(result).toEqual(mockData);
    });
  });

  describe("getCurrentExecutablePath", () => {
    it("should return the process executable path", () => {
      const path = getCurrentExecutablePath();
      expect(path).toBe(process.execPath);
    });
  });
});
