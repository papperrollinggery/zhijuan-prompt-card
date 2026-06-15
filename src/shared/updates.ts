export const RELEASES_URL = 'https://github.com/papperrollinggery/zhijuan-prompt-card/releases';
export const LATEST_RELEASE_API_URL = 'https://api.github.com/repos/papperrollinggery/zhijuan-prompt-card/releases/latest';

export type UpdateState = 'idle' | 'checking' | 'current' | 'available' | 'failed';

export interface UpdateInfo {
  state: UpdateState;
  currentVersion: string;
  latestVersion: string;
  releaseUrl: string;
}

export function createIdleUpdateInfo(): UpdateInfo {
  return {
    state: 'idle',
    currentVersion: getInstalledVersion(),
    latestVersion: '',
    releaseUrl: RELEASES_URL
  };
}

export async function checkLatestRelease(currentVersion = getInstalledVersion()): Promise<UpdateInfo> {
  const response = await fetch(LATEST_RELEASE_API_URL, { headers: { Accept: 'application/vnd.github+json' } });
  if (!response.ok) throw new Error(`GitHub release check failed: ${response.status}`);
  const release = (await response.json()) as { tag_name?: string; name?: string; html_url?: string };
  const latestVersion = normalizeReleaseVersion(release.tag_name || release.name || '');
  if (!latestVersion) throw new Error('Latest release did not include a version.');
  const hasUpdate = compareVersions(latestVersion, currentVersion) > 0;
  return {
    state: hasUpdate ? 'available' : 'current',
    currentVersion,
    latestVersion,
    releaseUrl: release.html_url || RELEASES_URL
  };
}

export function getInstalledVersion() {
  if (typeof chrome === 'undefined' || !chrome.runtime?.getManifest) return 'unknown';
  const manifest = chrome.runtime.getManifest();
  return manifest.version || manifest.version_name || 'unknown';
}

export function normalizeReleaseVersion(version: string) {
  return version.trim().replace(/^v/i, '').split(/\s+/)[0] || '';
}

export function compareVersions(a: string, b: string) {
  const left = parseVersion(a);
  const right = parseVersion(b);
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const diff = (left[index] || 0) - (right[index] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function parseVersion(version: string) {
  return normalizeReleaseVersion(version)
    .split('.')
    .map((part) => Number.parseInt(part, 10))
    .filter((part) => Number.isFinite(part));
}
