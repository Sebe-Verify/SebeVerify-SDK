import { headers } from "next/headers";
import QRCode from "qrcode";

export type VerifyPageUrls = {
  verifyPageUrl: string;
  qrCodeImageUrl: string;
};

function getLanHost(localhostWithPort: string): string {
  try {
    // os is only available in Node.js runtime, not Edge
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const os = require("os") as typeof import("os");
    const port = localhostWithPort.split(":")[1] || "3000";
    const interfaces = os.networkInterfaces();

    for (const name of Object.keys(interfaces)) {
      for (const info of interfaces[name] || []) {
        const isIPv4 =
          info.family === "IPv4" ||
          (info as { family: string | number }).family === 4;
        if (isIPv4 && !info.internal) {
          return `${info.address}:${port}`;
        }
      }
    }
  } catch {
    // Edge runtime or unsupported env — fall back to localhost
  }
  return localhostWithPort;
}

/**
 * Builds the URL shown in the desktop QR code and used for deep links.
 * Replaces localhost with the machine LAN IP so phones on the same
 * network can reach the dev server.
 *
 * The QR code is generated locally — no API keys or URLs are ever sent
 * to a third-party service.
 */
export async function buildVerifyPageUrls(options?: {
  sessionId?: string;
  returnUrl?: string;
  projectId?: string;
  apiKey?: string;
}): Promise<VerifyPageUrls> {
  const headersList = await headers();

  let host = headersList.get("host") || "localhost:3000";

  // Replace localhost with LAN IP so mobile devices can reach the server
  if (host.startsWith("localhost")) {
    host = getLanHost(host);
  }

  const forwardedProto = headersList.get("x-forwarded-proto");
  const isLocal =
    host.startsWith("localhost") ||
    host.startsWith("192.168.") ||
    host.startsWith("10.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host);

  const protocol =
    forwardedProto === "https" || forwardedProto === "http"
      ? forwardedProto
      : isLocal
        ? "http"
        : "https";

  // Build path
  const sessionPath = options?.sessionId
    ? `/verify/${options.sessionId}`
    : "/verify";

  // Build query string once
  const queryParams = new URLSearchParams();
  if (options?.returnUrl) queryParams.set("returnUrl", options.returnUrl);
  if (options?.projectId) queryParams.set("projectId", options.projectId);
  if (options?.apiKey) queryParams.set("apiKey", options.apiKey);

  const qs = queryParams.toString();
  const verifyPageUrl = `${protocol}://${host}${sessionPath}${qs ? `?${qs}` : ""}`;

  // Generate QR code locally — avoids sending the URL (which may contain
  // an API key) to any external service.
  const qrCodeImageUrl = await QRCode.toDataURL(verifyPageUrl, {
    width: 200,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#000000", light: "#ffffff" },
  });

  return { verifyPageUrl, qrCodeImageUrl };
}
