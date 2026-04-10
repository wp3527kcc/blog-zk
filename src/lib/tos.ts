import { TosClient } from '@volcengine/tos-sdk';

const globalForTos = globalThis as unknown as {
  tosClient: TosClient;
};

export const tosClient =
  globalForTos.tosClient ??
  new TosClient({
    accessKeyId: process.env.TOS_ACCESS_KEY_ID!,
    accessKeySecret: process.env.TOS_ACCESS_KEY_SECRET!,
    region: process.env.TOS_REGION!,
    endpoint: process.env.TOS_ENDPOINT!,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForTos.tosClient = tosClient;
}

export const TOS_BUCKET = process.env.BUCKET_NAME!;

// CDN base URL，拼接 key 得到完整访问地址
export const CDN_BASE = (process.env.CDNBASEURL ?? '').replace(/\/$/, '');

export function buildCdnUrl(key: string): string {
  return `${CDN_BASE}/${key}`;
}
