import {
  SlackChannel,
  SlackMessage,
  // SlackOAuthResponse,
  // SlackWorkspaceInfo,
} from "@/lib/integrations/slack/types";
import { decryptSlackToken } from "@/lib/integrations/slack/utils";

export class SlackClient {
  private clientId: string;
  private clientSecret: string;
  private baseUrl = "https://slack.com/api";
  // private oauthUrl = "https://slack.com/oauth/v2/authorize";

  constructor() {
    this.clientId = process.env.SLACK_CLIENT_ID as string;
    this.clientSecret = process.env.SLACK_CLIENT_SECRET as string;

    if (!this.clientId || !this.clientSecret) {
      throw new Error("SLACK_CLIENT_ID and SLACK_CLIENT_SECRET must be set");
    }
  }

  // private decryptToken(accessToken: string): string {
  //   return decryptSlackToken(accessToken);
  // }

  /**
   * Get OAuth URL for Slack app installation
   */
  // getOAuthUrl(state: string, redirectUri: string): string {
  //   const params = new URLSearchParams({
  //     client_id: this.clientId,
  //     scope:
  //       // "channels:read,groups:read,mpim:read,im:read,chat:write,chat:write.public,team:read,users:read,users:read.email",
  //       "channels:read,chat:write,chat:write.public,groups:read,team:read,users:read",
  //     redirect_uri: redirectUri,
  //     state: state,
  //   });

  //   const oauthUrl = `${this.oauthUrl}?${params.toString()}`;

  //   return oauthUrl;
  // }

  /**
   * Exchange authorization code for access token
   */
  // async exchangeCodeForToken(
  //   code: string,
  //   redirectUri: string,
  // ): Promise<SlackOAuthResponse> {
  //   const ac = new AbortController();
  //   const t = setTimeout(() => ac.abort(), 10000);
  //   const response = await fetch(`${this.baseUrl}/oauth.v2.access`, {
  //     method: "POST",
  //     headers: {
  //       "Content-Type": "application/x-www-form-urlencoded",
  //     },
  //     body: new URLSearchParams({
  //       client_id: this.clientId,
  //       client_secret: this.clientSecret,
  //       code: code,
  //       redirect_uri: redirectUri,
  //     }),
  //     signal: ac.signal,
  //   })
  //     .catch((e) => {
  //       throw new Error(`Slack OAuth network error: ${e}`);
  //     })
  //     .finally(() => clearTimeout(t));

  //   if (!response.ok) {
  //     throw new Error(`Slack OAuth failed: ${response.statusText}`);
  //   }

  //   const data = await response.json();

  //   if (!data.ok) {
  //     throw new Error(`Slack OAuth error: ${data.error}`);
  //   }

  //   return data;
  // }

  /**
   * Get workspace information
   */
  // async getWorkspaceInfo(accessToken: string): Promise<SlackWorkspaceInfo> {
  //   const decryptedToken = this.decryptToken(accessToken);
  //   const response = await fetch(`${this.baseUrl}/team.info`, {
  //     headers: {
  //       Authorization: `Bearer ${decryptedToken}`,
  //       "Content-Type": "application/x-www-form-urlencoded",
  //     },
  //   });

  //   if (!response.ok) {
  //     throw new Error(`Failed to get workspace info: ${response.statusText}`);
  //   }

  //   const data = await response.json();

  //   if (!data.ok) {
  //     throw new Error(`Slack API error: ${data.error}`);
  //   }

  //   return {
  //     id: data.team.id,
  //     name: data.team.name,
  //     url: `https://${data.team.domain}.slack.com`, // not in use
  //     domain: data.team.domain,
  //   };
  // }

  /**
   * Get bot information
   */
  // async getBotInfo(accessToken: string): Promise<{ id: string; name: string }> {
  //   const decryptedToken = this.decryptToken(accessToken);
  //   const response = await fetch(`${this.baseUrl}/auth.test`, {
  //     headers: {
  //       Authorization: `Bearer ${decryptedToken}`,
  //       "Content-Type": "application/json",
  //     },
  //   });

  //   if (!response.ok) {
  //     throw new Error(`Failed to get bot info: ${response.statusText}`);
  //   }

  //   const data = await response.json();

  //   if (!data.ok) {
  //     throw new Error(`Slack API error: ${data.error}`);
  //   }

  //   return {
  //     id: data.bot_id,
  //     name: data.user,
  //   };
  // }

  async getChannels(accessToken: string): Promise<SlackChannel[]> {
    const decryptedToken = decryptSlackToken(accessToken);
    if (!decryptedToken) {
      throw new Error("Missing Slack access token");
    }

    const channels: SlackChannel[] = [];
    let cursor: string | undefined = undefined;

    do {
      const url = new URL(`${this.baseUrl}/conversations.list`);
      url.searchParams.set("types", "public_channel,private_channel");
      url.searchParams.set("exclude_archived", "true");
      if (cursor) url.searchParams.set("cursor", cursor);

      const requestUrl = url.toString();
      const ac = new AbortController();
      const to = setTimeout(() => ac.abort(), 10000);
      const resp = await fetch(requestUrl, {
        headers: {
          Authorization: `Bearer ${decryptedToken}`,
          "Content-Type": "application/json",
        },
        signal: ac.signal,
      }).finally(() => clearTimeout(to));
      // Basic 429 handling
      if (resp.status === 429) {
        const retry = Number(resp.headers.get("retry-after") || 1);
        await new Promise((r) => setTimeout(r, retry * 1000));
        continue;
      }
      if (!resp.ok)
        throw new Error(
          `Failed to get channels: ${resp.status} ${resp.statusText}`,
        );
      const data = await resp.json();
      if (!data.ok) throw new Error(`Slack API error: ${data.error}`);
      channels.push(
        ...data.channels.map((channel: any) => ({
          id: channel.id,
          name: channel.name,
          is_private: channel.is_private,
          is_archived: channel.is_archived,
          is_member: channel.is_member,
        })),
      );
      cursor = data.response_metadata?.next_cursor || undefined;
    } while (cursor);

    return channels;
  }

  /**
   * Send message to Slack channel
   */
  async sendMessage(
    accessToken: string,
    message: SlackMessage,
  ): Promise<{ ok: boolean; ts?: string; error?: string }> {
    const decryptedToken = decryptSlackToken(accessToken);
    if (!decryptedToken) {
      throw new Error("Missing Slack access token");
    }

    const requestUrl = `${this.baseUrl}/chat.postMessage`;
    const response = await fetch(requestUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${decryptedToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.ok) {
      return {
        ok: false,
        error: data.error,
      };
    }

    return {
      ok: true,
      ts: data.ts,
    };
  }
}

// Lazily instantiate
let _slackClient: SlackClient | null = null;
export function getSlackClient(): SlackClient {
  if (!_slackClient) _slackClient = new SlackClient();
  return _slackClient;
}
