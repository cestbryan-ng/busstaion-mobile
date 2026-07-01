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
  'https://www.termsfeed.com/live/2b6bd548-23a3-47e6-aee9-0e5dd0edb278';

export const SUPPORT_URL =
  'https://mega.nz/file/DEhFCTZZ#w_Q4cGKXBr5ysZv-1Zkkjct1CnOC3tBQki4LI6DEVQQ';

export const config = {
  apiUrl: ENV_API_URL,
  qrApiUrl: QR_API_URL,
  wsUrl: WS_URL,
  cguUrl: CGU_URL,
  supportUrl: SUPPORT_URL,
  mapsUrl: MAPS_URL,
} as const;
