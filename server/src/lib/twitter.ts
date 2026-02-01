/**
 * Twitter/X verification utilities.
 *
 * Uses @steipete/bird's programmatic API with cookie-based auth
 * to read tweets and verify claim codes.
 */

import { TwitterClient } from "@steipete/bird";

/**
 * Extract tweet ID from a tweet URL.
 */
function parseTweetId(url: string): string | null {
  const match = url.match(/\/status\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * Verify that a tweet contains the expected claim code.
 * Returns the Twitter handle on success, null on failure.
 */
export async function verifyTweet(
  tweetUrl: string,
  expectedCode: string
): Promise<{ verified: boolean; twitterHandle: string | null; error?: string }> {
  const authToken = process.env.X_AUTH_TOKEN;
  const ct0 = process.env.X_CT0;

  if (!authToken || !ct0) {
    return {
      verified: false,
      twitterHandle: null,
      error: "Missing X credentials (X_AUTH_TOKEN / X_CT0)",
    };
  }

  const tweetId = parseTweetId(tweetUrl);
  if (!tweetId) {
    return { verified: false, twitterHandle: null, error: "Invalid tweet URL" };
  }

  const client = new TwitterClient({
    cookies: {
      authToken,
      ct0,
      cookieHeader: `auth_token=${authToken}; ct0=${ct0}`,
      source: "env",
    },
  });

  let result;
  try {
    result = await client.getTweet(tweetId);
  } catch {
    return {
      verified: false,
      twitterHandle: null,
      error: "Could not fetch tweet. Ensure the tweet is public and the URL is correct.",
    };
  }

  if (!result.success || !result.tweet) {
    return {
      verified: false,
      twitterHandle: null,
      error: result.error ?? "Could not fetch tweet. Ensure the tweet is public and the URL is correct.",
    };
  }

  const { text, author } = result.tweet;
  const username = author.username || null;

  if (!text.includes(expectedCode)) {
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
