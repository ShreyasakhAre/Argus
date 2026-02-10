/**
 * CENTRALIZED RISKY / ABUSED DOMAINS LIST
 * 
 * These domains are frequently abused for:
 * - Phishing attacks
 * - Malware delivery
 * - Credential harvesting
 * - Tunneling/C2 communication
 * - Free hosting exploitation
 * 
 * USAGE: Use as a HIGH-RISK signal (+25 score), NOT for blocking
 * Combine with other signals (keywords, entropy, file types) for decisions
 */

export const RISKY_DOMAINS = [
  // ============================================
  // URL SHORTENERS (hide true destination)
  // ============================================
  "tinyurl.com",
  "bit.ly",
  "t.co",
  "goo.gl",
  "ow.ly",
  "buff.ly",
  "is.gd",
  "tiny.cc",
  "v.gd",
  "shorte.st",
  "tr.im",

  // ============================================
  // TUNNELING & TEMPORARY INFRASTRUCTURE
  // (Used for C2, phishing, malware distribution)
  // ============================================
  "serveo.net",
  "ngrok.io",
  "ngrok.com",
  "trycloudflare.com",
  "localtunnel.me",
  "tunnel.pyjail.com",
  "ssh.pythonanywhere.com",

  // ============================================
  // FREE HOSTING ABUSE
  // (GitHub Pages, Vercel, Netlify used for phishing)
  // ============================================
  "vercel.app",
  "vercel.dev",
  "netlify.app",
  "github.io",
  "pages.dev",
  "workers.dev",
  "glitch.me",
  "repl.co",
  "railway.app",
  "onrender.com",
  "render.com",
  "surge.sh",
  "fleek.co",

  // ============================================
  // CLOUD STORAGE ABUSE
  // (Google Drive, Dropbox for malware delivery)
  // ============================================
  "drive.google.com",
  "docs.google.com",
  "sheets.google.com",
  "slides.google.com",
  "dropbox.com",
  "dl.dropbox.com",
  "onedrive.live.com",
  "1drv.ms",

  // ============================================
  // PASTEBIN & TEXT SHARING
  // (Command injection, credential dumps)
  // ============================================
  "pastebin.com",
  "paste.ubuntu.com",
  "gist.github.com",
  "hastebin.com",
  "pastie.org",

  // ============================================
  // DYNAMIC DNS & IP MASKING
  // (Difficult to track, often malicious)
  // ============================================
  "no-ip.com",
  "noip.com",
  "duckdns.org",
  "freedns.afraid.org",
  "zapto.org",
  "ddns.net",
  "homeip.net",
];

/**
 * PHISHING / SOCIAL ENGINEERING KEYWORDS
 * 
 * High indicator of credential harvesting or fraud
 * Often combined with risky domains = CRITICAL
 */
export const PHISHING_KEYWORDS = [
  "login",
  "signin",
  "sign-in",
  "authenticate",
  "secure",
  "verify",
  "confirm",
  "validate",
  "update",
  "upgrade",
  "auth",
  "account",
  "password",
  "credentials",
  "payment",
  "billing",
  "invoice",
  "receipt",
  "transaction",
  "urgent",
  "action",
  "required",
  "now",
  "immediately",
  "confirm-identity",
  "verify-account",
  "update-payment",
  "confirm-security",
];

/**
 * DANGEROUS FILE EXTENSIONS
 * 
 * Files that can execute code or compromise system
 * Found in URL paths or download URLs = high risk
 */
export const DANGEROUS_EXTENSIONS = [
  // Executables
  ".exe",
  ".msi",
  ".com",
  ".scr",
  ".pif",
  ".vbs",
  ".bat",
  ".cmd",
  ".jar",
  ".jnlp",
  ".app",
  ".deb",
  ".rpm",

  // Scripts
  ".ps1",
  ".ps2",
  ".psc1",
  ".psc2",
  ".msh",
  ".msh1",
  ".msh2",
  ".mshxml",
  ".msh1xml",
  ".msh2xml",
  ".scf",
  ".vbe",
  ".js",
  ".jse",
  ".ws",
  ".wsf",
  ".wsh",
  ".py",
  ".pyw",
  ".sh",
  ".bash",
  ".rb",
  ".pl",

  // Macros & Office
  ".docm",
  ".xlsm",
  ".pptm",
  ".sldm",
  ".xlam",
  ".xltm",
  ".potm",
  ".ppam",
  ".ppsm",
  ".sldm",

  // Archives
  ".zip",
  ".rar",
  ".7z",
  ".tar",
  ".gz",
  ".iso",

  // Disk images
  ".dmg",
  ".img",
  ".vhd",
  ".vmdk",
];

/**
 * LEGITIMATE TRUSTED DOMAINS
 * 
 * Major tech companies, government sites
 * Can still be dangerous if URL contains executable or phishing keywords
 */
export const TRUSTED_DOMAINS = [
  // Microsoft
  "microsoft.com",
  "windows.com",
  "outlook.com",
  "office.com",
  "github.com",
  "visualstudio.com",
  "azure.microsoft.com",

  // Google
  "google.com",
  "gmail.com",
  "googlesource.com",
  "chromium.org",

  // Apple
  "apple.com",
  "icloud.com",
  "developer.apple.com",

  // Amazon
  "amazon.com",
  "aws.amazon.com",
  "amazonaws.com",

  // Major tech
  "github.com",
  "docker.com",
  "npmjs.com",
  "python.org",
  "nodejs.org",
  "oracle.com",
  "sun.com",
  "ibm.com",

  // Government
  "gov",
  "mil",
  "edu",
];

/**
 * Check if domain is in risky list
 * Handles subdomains: example.com matches risky.example.com
 */
export function isRiskyDomain(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  return RISKY_DOMAINS.some(
    (domain) => lower === domain || lower.endsWith("." + domain)
  );
}

/**
 * Check if domain is trusted
 */
export function isTrustedDomain(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  return TRUSTED_DOMAINS.some(
    (domain) => lower === domain || lower.endsWith("." + domain)
  );
}

/**
 * Check if URL contains phishing keywords
 */
export function containsPhishingKeywords(url: string): string[] {
  const lower = url.toLowerCase();
  const found: string[] = [];

  for (const keyword of PHISHING_KEYWORDS) {
    if (lower.includes(keyword)) {
      found.push(keyword);
    }
  }

  return found;
}

/**
 * Check if URL contains dangerous file extensions (only in path, not domain)
 */
export function containsDangerousExtension(url: string): string | null {
  const lower = url.toLowerCase();
  
  // Extract the path part of the URL (after the domain)
  try {
    const urlObj = new URL(url);
    const pathAndQuery = (urlObj.pathname + urlObj.search).toLowerCase();
    
    for (const ext of DANGEROUS_EXTENSIONS) {
      // Skip .com which is a valid TLD
      if (ext === ".com") continue;
      
      if (
        pathAndQuery.includes(ext) ||
        pathAndQuery.endsWith(ext) ||
        pathAndQuery.includes(ext + "/") ||
        pathAndQuery.includes(ext + "?") ||
        pathAndQuery.includes(ext + "&")
      ) {
        return ext;
      }
    }
  } catch (e) {
    // If URL parsing fails, do a simpler check on path after the domain
    const pathMatch = lower.match(/^https?:\/\/[^\/]+(.*)$/);
    if (pathMatch) {
      const pathPart = pathMatch[1];
      for (const ext of DANGEROUS_EXTENSIONS) {
        if (ext === ".com") continue;
        if (
          pathPart.includes(ext) ||
          pathPart.endsWith(ext) ||
          pathPart.includes(ext + "/") ||
          pathPart.includes(ext + "?") ||
          pathPart.includes(ext + "&")
        ) {
          return ext;
        }
      }
    }
  }

  return null;
}

/**
 * Get the risk level of a domain
 */
export function getRiskyDomainCategory(
  hostname: string
): "shortener" | "tunneling" | "free-hosting" | "cloud-storage" | "pastebin" | "dynamic-dns" | null {
  const lower = hostname.toLowerCase();

  // URL Shorteners
  const shorteners = [
    "tinyurl.com",
    "bit.ly",
    "t.co",
    "goo.gl",
    "ow.ly",
    "buff.ly",
    "is.gd",
    "tiny.cc",
    "v.gd",
    "shorte.st",
    "tr.im",
  ];
  if (shorteners.some((d) => lower === d || lower.endsWith("." + d)))
    return "shortener";

  // Tunneling
  const tunneling = [
    "serveo.net",
    "ngrok.io",
    "ngrok.com",
    "trycloudflare.com",
    "localtunnel.me",
    "tunnel.pyjail.com",
    "ssh.pythonanywhere.com",
  ];
  if (tunneling.some((d) => lower === d || lower.endsWith("." + d)))
    return "tunneling";

  // Free hosting
  const freeHosting = [
    "vercel.app",
    "vercel.dev",
    "netlify.app",
    "github.io",
    "pages.dev",
    "workers.dev",
    "glitch.me",
    "repl.co",
    "railway.app",
    "onrender.com",
    "render.com",
    "surge.sh",
    "fleek.co",
  ];
  if (freeHosting.some((d) => lower === d || lower.endsWith("." + d)))
    return "free-hosting";

  // Cloud storage
  const cloudStorage = [
    "drive.google.com",
    "docs.google.com",
    "sheets.google.com",
    "slides.google.com",
    "dropbox.com",
    "dl.dropbox.com",
    "onedrive.live.com",
    "1drv.ms",
  ];
  if (cloudStorage.some((d) => lower === d || lower.endsWith("." + d)))
    return "cloud-storage";

  // Pastebin
  const pastebin = [
    "pastebin.com",
    "paste.ubuntu.com",
    "gist.github.com",
    "hastebin.com",
    "pastie.org",
  ];
  if (pastebin.some((d) => lower === d || lower.endsWith("." + d)))
    return "pastebin";

  // Dynamic DNS
  const dynamicDns = [
    "no-ip.com",
    "noip.com",
    "duckdns.org",
    "freedns.afraid.org",
    "zapto.org",
    "ddns.net",
    "homeip.net",
  ];
  if (dynamicDns.some((d) => lower === d || lower.endsWith("." + d)))
    return "dynamic-dns";

  return null;
}
