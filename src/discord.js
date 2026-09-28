export async function updateDiscordWidget(config, stats) {
  const { applicationId, userId, identityId, botToken } = config;
  
  if (!applicationId || !userId || !identityId || !botToken) {
    throw new Error('Missing required Discord credentials');
  }

  const url = `https://discord.com/api/v9/applications/${applicationId}/users/${userId}/identities/${identityId}/profile`;
  
  const payload = {
    username: stats.username,
    data: {
      dynamic: [
        {
          type: 1, // Text
          name: 'top_repo',
          value: stats.top_repo
        },
        {
          type: 2, // Number
          name: 'forks',
          value: stats.forks
        },
        {
          type: 2, // Number
          name: 'repos',
          value: stats.repos
        },
        {
          type: 1, // Text
          name: 'streak',
          value: stats.streak
        },
        {
          type: 2, // Number
          name: 'contributions',
          value: stats.contributions
        },
        {
          type: 1, // Text
          name: 'top_language',
          value: stats.top_language
        },
        {
          type: 1, // Text
          name: 'joined',
          value: stats.joined
        },
        {
          type: 3, // Image
          name: 'avatar',
          value: {
            url: stats.avatar
          }
        },
        {
          type: 2, // Number
          name: 'followers',
          value: stats.followers
        },
        {
          type: 2, // Number
          name: 'prs',
          value: stats.prs
        },
        {
          type: 1, // Text
          name: 'last_repo',
          value: stats.last_repo
        },
        {
          type: 1, // Text
          name: 'last_commit',
          value: stats.last_commit
        },
        {
          type: 1, // Text
          name: 'username',
          value: stats.username
        },
        {
          type: 1, // Text
          name: 'display_name',
          value: stats.displayName || stats.username
        }
      ]
    }
  };

  const maxRetries = 5;
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;
    console.log(`Sending PATCH request to Discord (attempt ${attempt}/${maxRetries})...`);
    
    try {
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bot ${botToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'discord-github-profile-widget'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        console.log('Successfully updated Discord Profile Widget!');
        return;
      }

      if (response.status === 429) {
        let retryAfterMs = 5000;
        
        const retryAfterHeader = response.headers.get('retry-after');
        if (retryAfterHeader) {
          const seconds = parseFloat(retryAfterHeader);
          if (!isNaN(seconds)) {
            retryAfterMs = seconds * 1000;
          }
        } else {
          try {
            const body = await response.json();
            if (body && typeof body.retry_after === 'number') {
              retryAfterMs = body.retry_after * 1000;
            }
          } catch (e) {
          }
        }

        console.warn(`Discord API rate limited (429). Retrying in ${retryAfterMs / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryAfterMs));
        continue;
      }

      const errorText = await response.text();
      const apiError = new Error(`Discord API returned status ${response.status}: ${errorText}`);
      // 4xx other than 429 are credential/setup errors. Retrying them burns the 5 attempts
      // and trips a real rate limit, which hides the actual cause in the logs.
      apiError.permanent = response.status >= 400 && response.status < 500;
      throw apiError;

    } catch (error) {
      if (error.permanent) {
        for (const line of explainDiscordError(error.message)) {
          console.error(line);
        }
        throw error;
      }

      if (attempt >= maxRetries) {
        throw error;
      }
      console.error(`Error communicating with Discord API: ${error.message}. Retrying in 3 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
}

function explainDiscordError(message) {
  if (message.includes('50025') || message.includes('Invalid OAuth2 access token')) {
    return [
      '',
      'Discord has no application identity for this (application, user) pair.',
      'Check, in order:',
      '  1. DISCORD_BOT_TOKEN belongs to the app in DISCORD_APPLICATION_ID.',
      '  2. The account in DISCORD_USER_ID authorized the app with the',
      '     openid + sdk.social_layer scopes (response_type=token).',
      '  Run `npm run doctor` for the exact URL and steps.',
      ''
    ];
  }

  if (message.includes('APPLICATION_IDENTITY_PROVIDER_USER_ID_MISMATCH')) {
    return [
      '',
      'An older identity record is still attached to this account.',
      'Deauthorize the app in Discord Settings -> Authorized Apps, then authorize it again.',
      'See docs/troubleshooting.md.',
      ''
    ];
  }

  if (message.includes('status 401')) {
    return [
      '',
      'The bot token was rejected outright: it was most likely reset in the',
      'Developer Portal after being copied. Reset it and update DISCORD_BOT_TOKEN.',
      ''
    ];
  }

  return [];
}
