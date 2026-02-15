/**
 * Twitter/X verification utilities.
 *
 * Uses @steipete/bird's programmatic API with cookie-based auth
 * to read tweets and verify claim codes.
 */

import { TwitterClient } from "@steipete/bird";

/**
 * Extract tweet ID from a tweet URL or ID.
 */
function parseTweetId(input: string): string | null {
  const value = input.trim();

  if (/^\d+$/.test(value)) {
    return value;
  }

  const match = value.match(
    /(?:twitter\.com|x\.com)\/(?:[^/]+\/status|i\/web\/status)\/(\d+)/i
  );
  return match ? match[1] : null;
}

function normalizeClaimCode(value: string): string {
  return value.trim().toLowerCase();
}

function includesClaimCode(text: string, expectedCode: string): boolean {
  return normalizeClaimCode(text).includes(normalizeClaimCode(expectedCode));
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex: string) => {
      try {
        return String.fromCodePoint(parseInt(hex, 16));
      } catch {
        return "";
      }
    })
    .replace(/&#([0-9]+);/g, (_match, dec: string) => {
      try {
        return String.fromCodePoint(parseInt(dec, 10));
      } catch {
        return "";
      }
    })
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function extractUsernameFromAuthorUrl(authorUrl?: string): string | null {
  if (!authorUrl) return null;
  const match = authorUrl.match(/(?:twitter\.com|x\.com)\/([A-Za-z0-9_]{1,15})/i);
  return match ? match[1] : null;
}

async function fetchTweetViaOEmbed(
  tweetUrl: string,
  tweetId: string
): Promise<{ text: string; username: string | null } | null> {
  const resolvedTweetUrl =
    /^https?:\/\//i.test(tweetUrl.trim())
      ? tweetUrl.trim()
      : `https://x.com/i/web/status/${tweetId}`;

  const oembedUrl = new URL("https://publish.twitter.com/oembed");
  oembedUrl.searchParams.set("omit_script", "true");
  oembedUrl.searchParams.set("url", resolvedTweetUrl);

  try {
    const response = await fetch(oembedUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      html?: string;
      author_url?: string;
    };

    if (!data.html) {
      return null;
    }

    const paragraphMatch = data.html.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i);
    const textHtml = paragraphMatch ? paragraphMatch[1] : data.html;
    const plainText = decodeHtmlEntities(
      textHtml
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    );

    if (!plainText) {
      return null;
    }

    return {
      text: plainText,
      username: extractUsernameFromAuthorUrl(data.author_url),
    };
  } catch {
    return null;
  }
}

function mapTweetFetchError(error?: string): string {
  if (!error) {
    return "Could not fetch tweet. Ensure the tweet is public and the URL is correct.";
  }

  if (error.includes("Tweet not found in response")) {
    return "Could not read tweet content yet. Ensure the tweet is public, then retry in 30-60 seconds.";
  }

  return error;
}

/**
 * Verify that a tweet contains the expected claim code.
 * Returns the Twitter handle on success, null on failure.
 */
export async function verifyTweet(
  tweetUrl: string,
  expectedCode: string
): Promise<{ verified: boolean; twitterHandle: string | null; error?: string }> {
  const tweetId = parseTweetId(tweetUrl);
  if (!tweetId) {
    return { verified: false, twitterHandle: null, error: "Invalid tweet URL" };
  }

  const authToken = process.env.X_AUTH_TOKEN;
  const ct0 = process.env.X_CT0;

  let text = "";
  let username: string | null = null;
  let primaryError: string | undefined;

  if (authToken && ct0) {
    const client = new TwitterClient({
      cookies: {
        authToken,
        ct0,
        cookieHeader: `auth_token=${authToken}; ct0=${ct0}`,
        source: "env",
      },
    });

    try {
      const result = await client.getTweet(tweetId);
      text = result.tweet?.text ?? "";
      username = result.tweet?.author?.username || null;
      primaryError = result.error;

      if ((!result.success || !result.tweet) && result.error?.includes("Tweet not found in response")) {
        try {
          const threadResult = await client.getThread(tweetId);
          const fallbackTweet =
            threadResult.success && threadResult.tweets
              ? (threadResult.tweets.find((tweet) => tweet.id === tweetId) ??
                threadResult.tweets[0])
              : undefined;

          if (fallbackTweet) {
            text = fallbackTweet.text;
            username = fallbackTweet.author?.username || null;
          }
        } catch {
          // keep primaryError and continue to public fallback
        }
      }
    } catch (error: unknown) {
      primaryError = error instanceof Error ? error.message : String(error);
    }
  } else {
    primaryError = "Missing X credentials (X_AUTH_TOKEN / X_CT0)";
  }

  // Public fallback path that does not depend on X session cookies.
  const needsPublicFallback = !text || !includesClaimCode(text, expectedCode);
  if (needsPublicFallback) {
    const publicTweet = await fetchTweetViaOEmbed(tweetUrl, tweetId);
    if (publicTweet?.text) {
      text = publicTweet.text;
      if (!username) {
        username = publicTweet.username;
      }
    }
  }

  if (!text) {
    return {
      verified: false,
      twitterHandle: null,
      error: mapTweetFetchError(primaryError),
    };
  }

  if (!includesClaimCode(text, expectedCode)) {
    return {
      verified: false,
      twitterHandle: username,
      error: `Tweet does not contain the verification code "${expectedCode}"`,
    };
  }

  return {
    verified: true,
    twitterHandle: username,
  };
}
