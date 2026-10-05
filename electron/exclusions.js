// Only suppress selections made entirely of links; prose containing a link
// still belongs in the writing assistant.
export function isUrlOnlyText(value) {
  const text = String(value ?? '').trim();
  if (!text) return false;
  return text.split(/\s+/).every(token => {
    const explicitScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(token);
    try {
      const url = new URL(explicitScheme ? token : `https://${token}`);
      if (explicitScheme) return Boolean(url.hostname) || (url.protocol === 'file:' && Boolean(url.pathname));
      // Avoid treating email addresses or ordinary words as bare website URLs.
      return !url.username && !url.password
        && /^(?:[a-z\d](?:[a-z\d-]*[a-z\d])?\.)+[a-z]{2,}\.?$/i.test(url.hostname);
    } catch { return false; }
  });
}

// Compare domains at label boundaries: example.com includes subdomains, never notexample.com.
export function normalizeExclusions(value, websites = false) {
  const entries = Array.isArray(value) ? value : String(value ?? '').split(/\r?\n/);
  if (entries.length > 200) throw new Error('Use at most 200 exclusions per list.');
  return [...new Set(entries.map(entry => {
    const text = String(entry).trim().toLowerCase();
    if (!text) return '';
    if (text.length > 255) throw new Error('Each exclusion must be at most 255 characters.');
    if (!websites) return text;
    try {
      const url = new URL(text.includes('://') ? text : `https://${text}`);
      if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password || /[\s*]/.test(text)) throw new Error();
      return url.hostname.replace(/\.$/, '');
    } catch { throw new Error(`Enter a valid website domain: ${text}`); }
  }).filter(Boolean))];
}

const chromium = new Set(['com.google.chrome', 'com.google.chrome.canary', 'com.brave.browser', 'com.microsoft.edgemac', 'com.vivaldi.vivaldi', 'com.operasoftware.opera', 'company.thebrowser.browser']);
export function browserKind(bundleId = '') {
  const id = bundleId.toLowerCase();
  if (id === 'com.apple.safari' || id === 'com.apple.safaritechnologypreview') return 'safari';
  if (chromium.has(id)) return 'chromium';
  if (/firefox|librewolf|zen-browser|orion/.test(id)) return 'unsupported';
  return null;
}

export async function shouldSuppressPopup(config, source, readUrl) {
  const apps = config.excludedApps ?? [];
  const sites = config.excludedWebsites ?? [];
  if (!source) return apps.length > 0 || sites.length > 0;
  const identities = [source.bundleId, source.name].filter(Boolean).map(value => value.toLowerCase());
  if (apps.some(value => identities.includes(value))) return true;
  if (!sites.length) return false;
  const kind = browserKind(source.bundleId);
  if (!kind) return false;
  if (kind === 'unsupported') return true;
  try {
    const url = new URL(await readUrl(source, kind));
    if (!['https:', 'http:'].includes(url.protocol)) return true;
    const host = url.hostname.toLowerCase().replace(/\.$/, '');
    return sites.some(domain => host === domain || host.endsWith(`.${domain}`));
  } catch { return true; }
}

export async function readBrowserUrl(execFileAsync, source, kind) {
  // Bundle IDs come from NSWorkspace, but still serialize them as data, never script syntax.
  const expression = kind === 'safari' ? 'browser.windows[0].currentTab.url()' : 'browser.windows[0].activeTab.url()';
  const script = `var browser = Application(${JSON.stringify(source.bundleId)}); browser.running() && browser.windows.length ? ${expression} : "";`;
  const { stdout } = await execFileAsync('osascript', ['-l', 'JavaScript', '-e', script], { timeout: 2500 });
  return stdout.trim();
}
