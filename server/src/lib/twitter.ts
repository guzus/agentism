/**
 * Twitter/X verification utilities.
 *
 * Uses the bird CLI (@steipete/bird) with cookie-based auth
 * to read tweets and verify claim codes.
 */

import { execFile } from "node:child_process";

interface TweetData {
  text: string;
  username: string;
}

/**
 * Fetch tweet data using the bird CLI.
 * Uses execFile to avoid shell injection.
 */
async function fetchViaBird(tweetUrl: string): Promise<TweetData | null> {
  const authToken = process.env.X_AUTH_TOKEN;
  const ct0 = process.env.X_CT0;

  if (!authToken || !ct0) {
    return null;
  }

  try {
    const output = await new Promise<string>((resolve, reject) => {
      execFile(
        "npx",
        ["bird", "read", tweetUrl, "--auth-token", authToken, "--ct0", ct0, "--plain"],
        { timeout: 30_000 },
        (error, stdout) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(stdout);
        }
      );
    });

    return parseBirdOutput(output);
  } catch {
    return null;
  }
}

/**
 * Parse bird --plain output format:
 *
 * @username (Display Name):
 * Tweet text here
 * possibly multiple lines
 * date: ...
 * url: ...
 * likes: N  retweets: N  replies: N
 */
function parseBirdOutput(output: string): TweetData | null {
  const lines = output.split("\n");
  if (lines.length < 2) return null;

  // Line 1: @username (Display Name):
  const headerMatch = lines[0].match(/^@(\w+)\s/);
  if (!headerMatch) return null;
  const username = headerMatch[1];

  // Collect tweet text lines (between header and metadata lines)
  const textLines: string[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^date:\s/.test(line)) break;
    textLines.push(line);
  }

  const text = textLines.join("\n").trim();
  if (!text) return null;

  return { text, username };
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

  const tweet = await fetchViaBird(tweetUrl);

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
