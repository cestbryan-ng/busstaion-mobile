import { API_URL as ENV_API_URL } from '@env';
import { WS_URL as ENV_WS_URL } from '@env';

if (!ENV_API_URL) {
  throw new Error('API_URL is not defined. Check your .env file.');
}

export const API_URL = ENV_API_URL;

export const WS_URL = ENV_WS_URL;

export const QR_API_URL = 'https://api.qrserver.com/v1/create-qr-code/';

export const MAPS_URL = 'https://maps.google.com/';

export const CGU_URL =
  'https://busstation.yowyob.com/term-and-conditions';

export const PRIVACY_URL =
  'https://busstation.yowyob.com/privacy-policy';

export const SUPPORT_URL =
  'https://mega.nz/file/DEhFCTZZ#w_Q4cGKXBr5ysZv-1Zkkjct1CnOC3tBQki4LI6DEVQQ';

export const config = {
  apiUrl: ENV_API_URL,
  qrApiUrl: QR_API_URL,
  wsUrl: WS_URL,
  cguUrl: CGU_URL,
  privacyUrl: PRIVACY_URL,
  supportUrl: SUPPORT_URL,
  mapsUrl: MAPS_URL,
} as const;
