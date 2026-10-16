import '../config/env.js';

export interface RTCIceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export class IceServerService {
  private static cachedIceServers: RTCIceServerConfig[] | null = null;
  private static cacheExpiry = 0;

  public static getDefaultIceServers(): RTCIceServerConfig[] {
    const servers: RTCIceServerConfig[] = [
      // Cloudflare Public Anycast STUN
      { urls: 'stun:stun.cloudflare.com:3478' },
      // Google Public Global STUN
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ];

    const turnUrl = process.env.TURN_URL || process.env.EXPRESSTURN_URL;
    const turnUsername = process.env.TURN_USERNAME || process.env.EXPRESSTURN_USERNAME;
    const turnCredential =
      process.env.TURN_CREDENTIAL ||
      process.env.TURN_PASSWORD ||
      process.env.EXPRESSTURN_PASSWORD ||
      process.env.EXPRESSTURN_CREDENTIAL;

    if (turnUrl && turnUsername && turnCredential) {
      const baseTurnHost = turnUrl.replace(/^(turn:|turns:|stun:)/, '').split('?')[0];
      servers.push(
        { urls: `stun:${baseTurnHost}` },
        {
          urls: `turn:${baseTurnHost}?transport=udp`,
          username: turnUsername,
          credential: turnCredential,
        },
        {
          urls: `turn:${baseTurnHost}?transport=tcp`,
          username: turnUsername,
          credential: turnCredential,
        }
      );
    }

    return servers;
  }

  public static async getIceServers(): Promise<RTCIceServerConfig[]> {
    if (this.cachedIceServers && Date.now() < this.cacheExpiry) {
      return this.cachedIceServers;
    }

    const keyId = process.env.CLOUDFLARE_TURN_KEY_ID;
    const apiToken = process.env.CLOUDFLARE_TURN_API_TOKEN;

    if (keyId && apiToken) {
      try {
        const response = await fetch(
          `https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate-ice-servers`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ttl: 86400 }),
          }
        );

        if (response.ok) {
          const data = (await response.json()) as { iceServers?: RTCIceServerConfig[] };
          if (data && Array.isArray(data.iceServers) && data.iceServers.length > 0) {
            this.cachedIceServers = [
              { urls: 'stun:stun.cloudflare.com:3478' },
              { urls: 'stun:stun.l.google.com:19302' },
              ...data.iceServers,
            ];
            this.cacheExpiry = Date.now() + 12 * 60 * 60 * 1000;
            console.info('[IceServerService] Generated fresh Cloudflare Realtime TURN credentials');
            return this.cachedIceServers;
          }
        } else {
          console.warn(
            '[IceServerService] Cloudflare TURN API responded with status:',
            response.status
          );
        }
      } catch (err) {
        console.error('[IceServerService] Error requesting Cloudflare TURN credentials:', err);
      }
    }

    return this.getDefaultIceServers();
  }
}
