import { useState, useEffect, useMemo } from "react";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Props {
  name: string;
  url?: string | null;
  website?: string | null;
  size?: number;
  className?: string;
}

function extractDomain(websiteUrl: string): string {
  try {
    const url = new URL(websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return websiteUrl
      .replace(/https?:\/\//, "")
      .replace(/\/.*$/, "")
      .split("?")[0]
      .trim()
      .replace(/^www\./, "");
  }
}

function isLikelyUrl(url: string): boolean {
  if (!url || /^n\/?a$/i.test(url)) return false;
  if (url.startsWith("/") || url.startsWith("data:image/") || url.startsWith("blob:")) return true;
  try {
    const parsed = new URL(url);
    return !!parsed.hostname;
  } catch {
    return false;
  }
}

/** Deterministic gradient colors from company name */
function nameToColors(name: string): [string, string] {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = name.charCodeAt(i) + ((h << 5) - h);
    h |= 0;
  }
  const palettes: [string, string][] = [
    ["#667eea", "#764ba2"],
    ["#f093fb", "#f5576c"],
    ["#4facfe", "#00f2fe"],
    ["#43e97b", "#38f9d7"],
    ["#fa709a", "#fee140"],
    ["#a18cd1", "#fbc2eb"],
    ["#fccb90", "#d57eeb"],
    ["#fd7043", "#ff8a65"],
    ["#26c6da", "#00acc1"],
    ["#7986cb", "#3949ab"],
    ["#66bb6a", "#388e3c"],
    ["#ef5350", "#b71c1c"],
    ["#ffa726", "#e65100"],
    ["#ab47bc", "#6a1b9a"],
    ["#26a69a", "#00695c"],
    ["#ec407a", "#ad1457"],
  ];
  return palettes[Math.abs(h) % palettes.length];
}

/** Inline SVG gradient avatar — instant, no network */
function generateSvgAvatar(name: string, size: number): string {
  const [from, to] = nameToColors(name);
  const abbr = initials(name);
  const fs = Math.max(Math.round(size * 0.38), 10);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${from}"/>
      <stop offset="100%" stop-color="${to}"/>
    </linearGradient>
  </defs>
  <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="url(#g)"/>
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central"
    font-family="system-ui,-apple-system,sans-serif"
    font-size="${fs}" font-weight="700" fill="white" opacity="0.95">${abbr}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Curated keyword → domain map.
 * Covers companies whose website_url may be missing or wrong in the DB.
 * Keys are lowercase keyword substrings; first match wins.
 */
const DOMAIN_OVERRIDES: [string, string][] = [
  // ── User-reported missing logos ──────────────────────────────────────────
  ["ather energy", "ather.energy"],
  ["ather", "ather.energy"],
  ["bigbasket", "bigbasket.com"],
  ["blackrock", "blackrock.com"],
  ["bmw techworks", "bmw.com"],
  ["bmw group", "bmw.com"],
  ["browserstack", "browserstack.com"],
  ["bytedance", "bytedance.com"],
  ["cisco", "cisco.com"],
  ["commonwealth bank", "commbank.com.au"],
  ["commonwealth", "commbank.com.au"],
  ["concentrix", "concentrix.com"],
  ["dunzo digital", "dunzo.com"],
  ["dunzo", "dunzo.com"],
  ["electronic arts", "ea.com"],
  ["electronics arts", "ea.com"],
  ["ea games", "ea.com"],
  ["mintair", "mintair.in"],
  ["mitsubishi electric", "mitsubishielectric.com"],
  ["mitsubishi", "mitsubishi.com"],
  ["nielseniq", "nielseniq.com"],
  ["nielsen", "nielseniq.com"],
  ["nutanix", "nutanix.com"],
  ["mobikwik", "mobikwik.com"],
  ["one mobikwik", "mobikwik.com"],
  ["optum", "optum.com"],
  ["tata consultancy", "tcs.com"],
  ["bank of new york mellon", "bnymellon.com"],
  ["bny mellon", "bnymellon.com"],
  ["mellon", "bnymellon.com"],
  ["the boeing", "boeing.com"],
  ["zepto", "zeptonow.com"],
  ["zepto tech", "zeptonow.com"],
  ["physics wallah", "pw.live"],
  ["physicswallah", "pw.live"],
  ["zs associates", "zs.com"],
  // ── Quick commerce / delivery ─────────────────────────────────────────────
  ["ecom express", "ecomexpress.in"],
  ["myntra", "myntra.com"],
  ["blinkit", "blinkit.com"],
  ["swiggy", "swiggy.com"],
  ["zomato", "zomato.com"],
  ["shadowfax", "shadowfax.in"],
  ["skyhigh", "skyhighsecurity.com"],
  // ── Indian IT / consulting ────────────────────────────────────────────────
  ["hexagon capability", "hexagon.com"],
  ["hexagon", "hexagon.com"],
  ["samsung prism", "samsung.com"],
  ["samsung", "samsung.com"],
  ["robert bosch", "bosch.com"],
  ["bosch", "bosch.com"],
  ["infosys", "infosys.com"],
  ["wipro", "wipro.com"],
  ["accenture", "accenture.com"],
  ["cognizant", "cognizant.com"],
  ["capgemini", "capgemini.com"],
  ["hcl tech", "hcltech.com"],
  ["hcl", "hcltech.com"],
  ["tech mahindra", "techmahindra.com"],
  // ── Media / entertainment ─────────────────────────────────────────────────
  ["warner bros", "warnerbros.com"],
  ["warner brothers", "warnerbros.com"],
  // ── Financial ─────────────────────────────────────────────────────────────
  ["wells fargo", "wellsfargo.com"],
  ["jp morgan", "jpmorgan.com"],
  ["jpmorgan", "jpmorgan.com"],
  ["goldman sachs", "goldmansachs.com"],
  ["morgan stanley", "morganstanley.com"],
  ["citigroup", "citi.com"],
  ["citibank", "citi.com"],
  ["hsbc", "hsbc.com"],
  ["barclays", "barclays.com"],
  ["deutsche bank", "db.com"],
  ["american express", "americanexpress.com"],
  // ── Big Tech ──────────────────────────────────────────────────────────────
  ["microsoft", "microsoft.com"],
  ["google", "google.com"],
  ["amazon", "amazon.com"],
  ["apple inc", "apple.com"],
  ["netflix", "netflix.com"],
  ["uber", "uber.com"],
  ["airbnb", "airbnb.com"],
  ["tesla", "tesla.com"],
  ["salesforce", "salesforce.com"],
  ["oracle", "oracle.com"],
  ["ibm", "ibm.com"],
  // ── Indian startups ───────────────────────────────────────────────────────
  ["flipkart", "flipkart.com"],
  ["paytm", "paytm.com"],
  ["byju", "byjus.com"],
  ["razorpay", "razorpay.com"],
  ["freshworks", "freshworks.com"],
  ["zoho", "zoho.com"],
  ["juspay", "juspay.in"],
  ["kalvium", "kalvium.com"],
  ["rupeek", "rupeek.com"],
  ["meesho", "meesho.com"],
  ["urban company", "urbancompany.com"],
  ["lenskart", "lenskart.com"],
  ["groww", "groww.in"],
  ["zerodha", "zerodha.com"],
  ["angel broking", "angelbroking.com"],
  ["upstox", "upstox.com"],
  ["bharatpe", "bharatpe.com"],
  ["phonepe", "phonepe.com"],
  ["cred", "cred.club"],
  ["navi", "navi.com"],
  ["acko", "acko.com"],
  ["airtel", "airtel.in"],
  ["jio", "jio.com"],
  // ── Enterprise software ───────────────────────────────────────────────────
  ["atlassian", "atlassian.com"],
  ["servicenow", "servicenow.com"],
  ["workday", "workday.com"],
  ["snowflake", "snowflake.com"],
  ["databricks", "databricks.com"],
  ["sap labs", "sap.com"],
  ["sap ", "sap.com"],
  // ── Hardware / cloud ──────────────────────────────────────────────────────
  ["qualcomm", "qualcomm.com"],
  ["intel", "intel.com"],
  ["nvidia", "nvidia.com"],
  ["broadcom", "broadcom.com"],
  ["dell", "dell.com"],
  ["hp inc", "hp.com"],
  ["hewlett", "hp.com"],
  ["lenovo", "lenovo.com"],
  ["vmware", "vmware.com"],
  // ── Creative / design ─────────────────────────────────────────────────────
  ["adobe", "adobe.com"],
  ["autodesk", "autodesk.com"],
  ["figma", "figma.com"],
  // ── Industrial ────────────────────────────────────────────────────────────
  ["siemens", "siemens.com"],
  ["schneider electric", "se.com"],
  ["philips", "philips.com"],
  ["honeywell", "honeywell.com"],
  // ── Automotive ────────────────────────────────────────────────────────────
  ["boeing", "boeing.com"],
  ["airbus", "airbus.com"],
  ["bmw", "bmw.com"],
  ["mercedes", "mercedes-benz.com"],
  ["volkswagen", "volkswagen.com"],
  ["hyundai", "hyundai.com"],
  ["mahindra", "mahindra.com"],
  ["tata motors", "tatamotors.com"],
  // ── Indian banking ────────────────────────────────────────────────────────
  ["hdfc", "hdfc.com"],
  ["icici", "icicibank.com"],
  ["axis bank", "axisbank.com"],
  ["kotak", "kotak.com"],
  ["sbi", "sbi.co.in"],
  // ── Indian conglomerates ──────────────────────────────────────────────────
  ["reliance", "ril.com"],
  ["adani", "adani.com"],
  ["larsen", "lntecc.com"],
  ["l&t", "lntecc.com"],
  ["tata", "tata.com"],
  // ── Pharma ────────────────────────────────────────────────────────────────
  ["sun pharma", "sunpharma.com"],
  ["dr. reddy", "drreddys.com"],
  ["cipla", "cipla.com"],
  // ── Payments ──────────────────────────────────────────────────────────────
  ["visa", "visa.com"],
  ["mastercard", "mastercard.com"],
  ["paypal", "paypal.com"],
  ["stripe", "stripe.com"],
  ["bloomberg", "bloomberg.com"],
  // ── Consulting ────────────────────────────────────────────────────────────
  ["deloitte", "deloitte.com"],
  ["mckinsey", "mckinsey.com"],
  ["kpmg", "kpmg.com"],
  ["pwc", "pwc.com"],
  // ── Logistics ─────────────────────────────────────────────────────────────
  ["fedex", "fedex.com"],
  ["dhl", "dhl.com"],
  ["blue dart", "bluedart.com"],
  // ── Misc ──────────────────────────────────────────────────────────────────
  ["spotify", "spotify.com"],
  ["slack", "slack.com"],
  ["notion", "notion.so"],
  ["canva", "canva.com"],
  ["brex", "brex.com"],
];

function getDomainOverride(name: string): string | null {
  const lower = name.toLowerCase();
  for (const [keyword, domain] of DOMAIN_OVERRIDES) {
    if (lower.includes(keyword.trim())) return domain;
  }
  return null;
}

/**
 * Hardcoded direct logo URLs for companies that can't be resolved via domain.
 * These are stable CDN-hosted images that bypass all domain-lookup services.
 */
const DIRECT_LOGO_OVERRIDES: [string, string][] = [
  // BMW TechWorks India — uses BMW Group visual identity
  ["bmw techworks", "https://cdn.brandfetch.io/bmw.com/fallback/404/w/200/h/200"],
  ["bmw group", "https://cdn.brandfetch.io/bmw.com/fallback/404/w/200/h/200"],
  // Zepto — Indian quick-commerce startup
  [
    "zepto",
    "https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://zeptonow.com&size=128",
  ],
  // Physics Wallah — EdTech brand at pw.live
  // Brandfetch 404s for pw.live; use Google faviconV2 which returns the PW orange logo
  [
    "physics wallah",
    "https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://pw.live&size=128",
  ],
  [
    "physicswallah",
    "https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://pw.live&size=128",
  ],
];

function getDirectLogoOverride(name: string): string | null {
  const lower = name.toLowerCase();
  for (const [keyword, url] of DIRECT_LOGO_OVERRIDES) {
    if (lower.includes(keyword.trim())) return url;
  }
  return null;
}

interface Source {
  url: string;
  /** Reject if naturalWidth <= 24 (Google's generic grey globe placeholder) */
  sizeGuard?: boolean;
}

export function CompanyLogo({ name, url, website, size = 40, className }: Props) {
  const cleanUrl = typeof url === "string" ? url.split(/(?:;|%20|\s)+https?:\/\//)[0]?.trim() : "";
  const primaryUrl = isLikelyUrl(cleanUrl) ? cleanUrl : null;

  const domain = useMemo(() => {
    if (
      website &&
      website.trim() !== "" &&
      website.toLowerCase() !== "na" &&
      website.toLowerCase() !== "n/a"
    ) {
      return extractDomain(website);
    }
    return getDomainOverride(name);
  }, [website, name]);

  // Hardcoded direct logo URL — wins over DB logo_url when set (prevents wrong/person photos)
  const directLogoUrl = useMemo(() => getDirectLogoOverride(name), [name]);

  /**
   * Probe chain (tried silently in background, gradient avatar shows immediately):
   * 0. DIRECT_LOGO_OVERRIDES — curated override, skips bad DB logo_url when set
   * 1. Direct DB logo URL    — skipped when directLogoUrl is set
   * 2. Brandfetch CDN        — 15M+ brands, 404s cleanly for unknowns
   * 3. apple-touch-icon.png  — 180×180 on most modern sites
   * 4. apple-touch-icon-precomposed.png
   * 5. favicon.ico           — size-guarded
   * 6. Google S2 favicon     — wide coverage, size-guarded
   * 7. logo.dev              — clean 404s for unknowns
   *
   * Gradient avatar is always shown as base layer — never a blank white circle.
   */
  const sources: Source[] = useMemo(() => {
    const list: Source[] = [];
    if (directLogoUrl) {
      // Curated override: skip DB logo_url (it may be wrong/a person photo)
      list.push({ url: directLogoUrl });
    } else if (primaryUrl) {
      list.push({ url: primaryUrl });
    }
    if (domain) {
      // Brandfetch (brand.dev) — best quality brand logos, 404 for unknowns
      list.push({ url: `https://cdn.brandfetch.io/${domain}/fallback/404/w/200/h/200` });
      // apple-touch-icon is 180×180 on virtually all modern sites — high quality
      list.push({ url: `https://${domain}/apple-touch-icon.png` });
      list.push({ url: `https://${domain}/apple-touch-icon-precomposed.png` });
      list.push({ url: `https://${domain}/favicon.ico`, sizeGuard: true });
      // Google S2: great coverage but returns 16×16 globe for unknowns
      list.push({
        url: `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
        sizeGuard: true,
      });
      // logo.dev: clean 404s for unknowns
      list.push({ url: `https://img.logo.dev/${domain}?token=pk_TCK9KvOzTn-9x0cFrFbDJg&size=64` });
    }
    return list;
  }, [directLogoUrl, primaryUrl, domain]);

  const [probeIdx, setProbeIdx] = useState(0);
  const [realLogoUrl, setRealLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    setProbeIdx(0);
    setRealLogoUrl(null);
  }, [directLogoUrl, primaryUrl, domain]);

  const currentProbe = probeIdx < sources.length ? sources[probeIdx] : null;
  const advance = () => setProbeIdx((prev) => prev + 1);

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (!currentProbe) return;
    const img = e.currentTarget;
    if (currentProbe.sizeGuard && (img.naturalWidth <= 24 || img.naturalHeight <= 24)) {
      advance();
      return;
    }
    setRealLogoUrl(currentProbe.url);
  };

  const handleError = () => advance();

  const [from, to] = useMemo(() => nameToColors(name), [name]);
  const abbr = initials(name);

  return (
    <div
      style={{ width: size, height: size }}
      className={cn(
        "relative grid place-items-center overflow-hidden rounded-full border border-border shadow-sm shrink-0",
        className,
      )}
    >
      {/* Gradient avatar — always rendered instantly as base layer */}
      <div
        className="absolute inset-0 grid place-items-center"
        style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
        aria-hidden
      >
        <span
          className="select-none font-bold tracking-tight text-white"
          style={{ fontSize: Math.max(Math.round(size * 0.38), 10) }}
        >
          {abbr}
        </span>
      </div>

      {/* Real brand logo fades in on top when any probe succeeds */}
      {realLogoUrl && (
        <img
          key={realLogoUrl}
          src={realLogoUrl}
          alt={`${name} logo`}
          className="absolute inset-0 h-full w-full object-contain p-1 bg-white animate-in fade-in duration-300"
        />
      )}

      {/* Hidden probe: silently tries sources in order, no broken-image flashes */}
      {currentProbe && !realLogoUrl && (
        <img
          key={currentProbe.url}
          src={currentProbe.url}
          alt=""
          aria-hidden
          className="absolute opacity-0 pointer-events-none h-px w-px"
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
    </div>
  );
}
