export interface RTCIceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export class IceServerService {
  private static cachedIceServers: RTCIceServerConfig[] | null = null;
  private static cacheExpiry = 0;

  public static getDefaultIceServers(): RTCIceServerConfig[] {
    return [
      // Cloudflare Public Anycast STUN (100% free, no credit card)
      { urls: 'stun:stun.cloudflare.com:3478' },
      // Google Public Global Anycast STUN (100% free, no credit card)
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      // Open Relay Free STUN + TURN (100% free, no credit card, no signup)
      { urls: 'stun:openrelay.metered.ca:80' },
      {
        urls: 'turn:openrelay.metered.ca:80?transport=udp',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: 'turn:openrelay.metered.ca:80?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: 'turns:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
    ];
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
          console.warn('[IceServerService] Cloudflare TURN API responded with status:', response.status);
        }
      } catch (err) {
        console.error('[IceServerService] Error requesting Cloudflare TURN credentials:', err);
      }
    }

    return this.getDefaultIceServers();
  }
}
