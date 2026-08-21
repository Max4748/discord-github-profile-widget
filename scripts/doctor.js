import dotenv from 'dotenv';

dotenv.config();

const API = 'https://discord.com/api/v10';

const results = [];
function record(ok, label, detail) {
  results.push({ ok, label });
  const tag = ok === null ? 'WARN' : ok ? 'OK  ' : 'FAIL';
  console.log(`${tag}  ${label}${detail ? `
        ${detail}` : ''}`);
}

async function main() {
  const {
    GH_USERNAME,
    GH_PAT,
    DISCORD_APPLICATION_ID: appId,
    DISCORD_USER_ID: userId,
    DISCORD_BOT_TOKEN: botToken
  } = process.env;

  const missing = ['GH_USERNAME', 'GH_PAT', 'DISCORD_APPLICATION_ID', 'DISCORD_USER_ID', 'DISCORD_BOT_TOKEN']
    .filter(key => !process.env[key]);

  record(missing.length === 0, 'Environment variables set',
    missing.length ? `Missing: ${missing.join(', ')}` : null);

  // Only the Discord trio blocks the remaining checks; a missing GH_PAT just skips its own.
  const blocking = missing.filter(key => key.startsWith('DISCORD_'));
  if (blocking.length > 0) {
    console.log(`
Fill ${blocking.join(', ')} in .env, then re-run: npm run doctor`);
    process.exit(1);
  }

  const headers = { Authorization: `Bot ${botToken}`, 'User-Agent': 'discord-github-profile-widget' };

  // The bot token embeds its own application id in the first (base64) segment.
  let idFromToken = null;
  try {
    idFromToken = Buffer.from(botToken.split('.')[0], 'base64').toString('utf8');
  } catch {}
  record(idFromToken === appId, 'Bot token belongs to DISCORD_APPLICATION_ID',
    idFromToken === appId ? null : `Token is for application ${idFromToken || '?'}, .env says ${appId}`);

  const appRes = await fetch(`${API}/oauth2/applications/@me`, { headers });
  const app = appRes.ok ? await appRes.json() : null;
  record(appRes.ok, 'Bot token is valid',
    appRes.ok ? `Application: ${app.name} (${app.id})` : `HTTP ${appRes.status} - reset the token in the Developer Portal`);

  if (app) {
    const uris = app.redirect_uris || [];
    const hasDiscord = uris.includes('https://discord.com');
    record(hasDiscord, 'OAuth2 redirect URI https://discord.com is registered',
      hasDiscord ? null : `Registered URIs: ${uris.length ? uris.join(', ') : '(none)'} - add https://discord.com under OAuth2 -> Redirects`);
  }

  const userRes = await fetch(`${API}/users/${userId}`, { headers });
  const user = userRes.ok ? await userRes.json() : null;
  record(userRes.ok, 'DISCORD_USER_ID resolves to a real account',
    userRes.ok ? `User: ${user.username} (${user.id})` : `HTTP ${userRes.status}`);

  // Discord exposes no documented GET here, so this probe reads the *auth layer*, not the record:
  //   403/50025 -> rejected before routing: no application identity exists.
  //   401       -> the bot token itself is dead; this probe says nothing about the identity.
  //   404       -> the auth layer accepted the call and the route has no GET handler.
  // Only 403 is conclusive. Anything else means "run the real sync to know".
  const profileRes = await fetch(
    `https://discord.com/api/v9/applications/${appId}/users/${userId}/identities/${userId}/profile`,
    { headers }
  );
  const profileBody = await profileRes.text();
  const identityMissing = profileRes.status === 403;
  const identityState = profileRes.ok ? true : identityMissing ? false : null;
  record(identityState, 'Application identity accepted by Discord',
    identityState === true
      ? null
      : identityMissing
        ? `HTTP 403: ${profileBody.slice(0, 160)}`
        : profileRes.status === 401
          ? 'Skipped: the bot token above is invalid, so this check cannot run.'
          : `HTTP ${profileRes.status} - endpoint is write-only. Run ` + '`npm start`' + ' to test the real PATCH.');

  if (GH_PAT) {
    const ghRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${GH_PAT}`, 'User-Agent': 'discord-github-profile-widget' }
    });
    record(ghRes.ok, 'GH_PAT is valid',
      ghRes.ok ? `Authenticated as ${(await ghRes.json()).login} (GH_USERNAME=${GH_USERNAME})` : `HTTP ${ghRes.status}`);
  } else {
    record(false, 'GH_PAT is set', 'Empty in .env - the sync cannot read your GitHub stats without it');
  }

  const failed = results.filter(r => r.ok === false);
  console.log('');

  if (identityMissing) {
    const authUrl = `https://discord.com/oauth2/authorize?client_id=${appId}`
      + '&response_type=token&redirect_uri=https%3A%2F%2Fdiscord.com&scope=openid+sdk.social_layer';
    console.log('The application identity is missing. Fix it in this order:');
    console.log('  1. Developer Portal -> your app -> OAuth2 -> Redirects: add https://discord.com and save.');
    console.log('  2. Discord Settings -> Authorized Apps: deauthorize this app if it is listed.');
    console.log('  3. Open this URL while logged in as the account above, and authorize:');
    console.log(`     ${authUrl}`);
    console.log('  4. Re-run: npm run doctor');
    console.log('');
  }

  if (failed.length === 0) {
    console.log('All checks passed. Run: npm start');
  } else {
    console.log(`${failed.length} check(s) failed: ${failed.map(f => f.label).join(' | ')}`);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Doctor crashed:', error.message);
  process.exit(1);
});
