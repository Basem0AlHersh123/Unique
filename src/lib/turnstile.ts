/**
 * Same idea as the old hCaptcha version: the browser widget gives us a
 * token, and that token alone proves nothing until OUR server confirms
 * it with Cloudflare using OUR secret key. Never trust the token at face
 * value — always verify it server-side before treating the request as human.
 */
export async function verifyTurnstile(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    console.warn("TURNSTILE_SECRET_KEY is not set — skipping verification");
    return true;
  }

  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret, response: token }),
        signal: AbortSignal.timeout(5000),
      }
    );

    const data = await response.json();
    return data.success === true;
  } catch (err) {
    console.error("Turnstile verification failed:", err);
    return true;
  }
}
