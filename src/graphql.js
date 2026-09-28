const MAX_ATTEMPTS = 5;
const BASE_DELAY_MS = 2000;

async function fetchGraphQL(query, variables, token) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let response;
    try {
      response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'discord-github-profile-widget',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query, variables })
      });
    } catch (networkError) {
      if (attempt >= MAX_ATTEMPTS) {
        throw new Error(`GitHub GraphQL API request failed after ${MAX_ATTEMPTS} attempts: ${networkError.message}`);
      }
      await backoff(attempt, `Network error contacting GitHub GraphQL API: ${networkError.message}`);
      continue;
    }

    // 5xx/403/429 are transient (server hiccup, secondary rate limit); other 4xx are permanent (bad token, bad query).
    const transientStatus = response.status >= 500 || response.status === 403 || response.status === 429;
    if (!response.ok) {
      const errorText = await response.text();
      if (transientStatus && attempt < MAX_ATTEMPTS) {
        const retryAfterHeader = response.headers.get('retry-after');
        const retryAfterMs = retryAfterHeader ? parseFloat(retryAfterHeader) * 1000 : null;
        await backoff(attempt, `GitHub GraphQL API returned status ${response.status}`, retryAfterMs);
        continue;
      }
      throw new Error(`GitHub GraphQL API request failed with status ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    if (result.errors) {
      const rateLimited = result.errors.some(e => e.type === 'RATE_LIMITED');
      if (rateLimited && attempt < MAX_ATTEMPTS) {
        await backoff(attempt, 'GitHub GraphQL API rate limited');
        continue;
      }
      throw new Error(`GitHub GraphQL API returned errors: ${JSON.stringify(result.errors)}`);
    }

    return result.data;
  }
}

async function backoff(attempt, reason, retryAfterMs) {
  const delayMs = retryAfterMs && !isNaN(retryAfterMs) ? retryAfterMs : BASE_DELAY_MS * attempt;
  console.warn(`${reason} (attempt ${attempt}/${MAX_ATTEMPTS}). Retrying in ${delayMs / 1000}s...`);
  await new Promise(resolve => setTimeout(resolve, delayMs));
}

export async function fetchUserData(username, token) {
  const query = `
    query($username: String!) {
      user(login: $username) {
        name
        avatarUrl
        createdAt
        followers {
          totalCount
        }
        pullRequests {
          totalCount
        }
        contributionsCollection {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionCount
                date
              }
            }
          }
        }
        repositories(first: 100, privacy: PUBLIC, ownerAffiliations: OWNER, orderBy: {field: PUSHED_AT, direction: DESC}) {
          pageInfo {
            hasNextPage
            endCursor
          }
          totalCount
          nodes {
            name
            stargazerCount
            isFork
            pushedAt
            primaryLanguage {
              name
            }
            languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
              edges {
                size
                node {
                  name
                }
              }
            }
          }
        }
      }
    }
  `;

  return await fetchGraphQL(query, { username }, token);
}

export async function fetchMoreRepositories(username, cursor, token) {
  const query = `
    query($username: String!, $cursor: String!) {
      user(login: $username) {
        repositories(first: 100, after: $cursor, privacy: PUBLIC, ownerAffiliations: OWNER, orderBy: {field: PUSHED_AT, direction: DESC}) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            name
            stargazerCount
            isFork
            pushedAt
            primaryLanguage {
              name
            }
            languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
              edges {
                size
                node {
                  name
                }
              }
            }
          }
        }
      }
    }
  `;

  return await fetchGraphQL(query, { username, cursor }, token);
}
