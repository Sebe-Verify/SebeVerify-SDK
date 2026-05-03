import { headers } from "next/headers";

const MOBILE_UA =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|CriOS|FxiOS|EdgiOS/i;

/** Server-side hint from User-Agent so the first paint is not an endless spinner on phones */
export async function getInitialMobileFlow(): Promise<boolean> {
  const headersList = await headers();
  const ua = headersList.get("user-agent") || "";
  return MOBILE_UA.test(ua);
}
