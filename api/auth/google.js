// api/auth/google.js – Google OAuth Callback für Stellify

export default async function handler(req, res) {
  const { code, error } = req.query;

  if (error) return res.redirect("/?auth_error=" + encodeURIComponent(error));
  if (!code)  return res.status(400).send("Kein Auth-Code vorhanden.");

  const GOOGLE_CLIENT_ID     = process.env.GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  const BASE_URL = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://stellify.ch";

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET)
    return res.redirect("/?auth_error=google_not_configured");

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: `${BASE_URL}/api/auth/google`, grant_type: "authorization_code" }),
    });
    const tokens = await tokenRes.json();
    if (!tokenRes.ok) return res.redirect("/?auth_error=token_failed");

    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${tokens.access_token}` } });
    const user = await userRes.json();
    if (!user.email) return res.redirect("/?auth_error=no_email");

    const sessionData = { email: user.email.toLowerCase(), name: user.name||"",
      picture: user.picture||"", provider: "google", plan: "free", ts: Date.now() };
    const sessionToken = Buffer.from(JSON.stringify(sessionData)).toString("base64url");
    return res.redirect(`/?google_session=${encodeURIComponent(sessionToken)}`);
  } catch (err) {
    console.error("[api/auth/google]", err.message);
    return res.redirect("/?auth_error=server_error");
  }
}
