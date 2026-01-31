/**
 * Twitter/X verification utilities.
 *
 * Primary: syndication endpoint (no auth).
 * Fallback: Twitter API v2 (requires TWITTER_BEARER_TOKEN).
 */

interface TweetData {
  text: string;
  username: string;
}

/**
 * Extract tweet ID from a tweet URL.
 * Supports x.com and twitter.com URLs.
 */
export function parseTweetId(url: string): string | null {
  const match = url.match(/\/status\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * Fetch tweet data via the syndication endpoint (no auth required).
 */
async function fetchViaSyndication(tweetId: string): Promise<TweetData | null> {
  try {
    const res = await fetch(
      `https://cdn.syndication.twit.com/tweet-result?id=${tweetId}&token=0`,
      {
        headers: { Accept: "application/json" },
      }
    );
    if (!res.ok) return null;

    const data = await res.json();
    const text: string = data?.text ?? "";
    const username: string = data?.user?.screen_name ?? "";
    if (!text) return null;
    return { text, username };
  } catch {
    return null;
  }
}

/**
 * Fetch tweet data via Twitter API v2 (requires bearer token).
 */
async function fetchViaApiV2(
  tweetId: string,
  bearerToken: string
): Promise<TweetData | null> {
  try {
    const res = await fetch(
      `https://api.x.com/2/tweets/${tweetId}?expansions=author_id&user.fields=username`,
      {
        headers: { Authorization: `Bearer ${bearerToken}` },
      }
    );
    if (!res.ok) return null;

    const data = await res.json();
    const text: string = data?.data?.text ?? "";
    const users = data?.includes?.users ?? [];
    const username: string = users[0]?.username ?? "";
    if (!text) return null;
    return { text, username };
  } catch {
    return null;
  }
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

  const bearerToken = process.env.TWITTER_BEARER_TOKEN;

  // Try syndication first, then API v2 as fallback
  let tweet = await fetchViaSyndication(tweetId);
  if (!tweet && bearerToken) {
    tweet = await fetchViaApiV2(tweetId, bearerToken);
  }

  if (!tweet) {
    return {
      verified: false,
      twitterHandle: null,
      error: "Could not fetch tweet. Ensure the tweet is public and the URL is correct.",
    };
  }

  if (!tweet.text.includes(expectedCode)) {
    return {
      verified: false,
      twitterHandle: tweet.username || null,
      error: `Tweet does not contain the verification code "${expectedCode}"`,
    };
  }

  return {
    verified: true,
    twitterHandle: tweet.username || null,
  };
}
