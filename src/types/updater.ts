/**
 * Updater types for the self-updating mechanism
 */

export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  downloadUrl: string | null;
  releaseNotes: string | null;
  publishedAt: Date | null;
}

export interface UpdateConfig {
  /** Whether auto-update checks are enabled */
  autoCheck: boolean;
  /** How often to check for updates (in hours) */
  checkInterval: number;
  /** Whether to automatically download updates */
  autoDownload: boolean;
  /** Whether to show update notifications */
  showNotifications: boolean;
}

export const DEFAULT_UPDATE_CONFIG: UpdateConfig = {
  autoCheck: true,
  checkInterval: 24, // Check once per day
  autoDownload: false,
  showNotifications: true,
};

export interface UpdateCheckResult {
  success: boolean;
  info?: UpdateInfo;
  error?: string;
}

export interface DownloadProgress {
  downloaded: number;
  total: number;
  percentage: number;
}

export type UpdateState =
  | "idle"
  | "checking"
  | "downloading"
  | "installing"
  | "complete"
  | "error";
