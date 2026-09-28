import { fetchUserData, fetchMoreRepositories } from './graphql.js';
import { calculateStreak, formatStreak } from './streak.js';
import { determineTopLanguage } from './language.js';

export async function getGitHubStats(username, token) {
  if (!username) {
    throw new Error('GitHub username is required');
  }
  if (!token) {
    throw new Error('GitHub token is required');
  }

  console.log(`Fetching GitHub user data for: ${username}...`);
  const initialData = await fetchUserData(username, token);
  
  if (!initialData.user) {
    throw new Error(`GitHub user "${username}" not found or API returned empty user object.`);
  }

  const user = initialData.user;
  const contributionCalendar = user.contributionsCollection?.contributionCalendar;
  
  const contributions = contributionCalendar?.totalContributions || 0;
  const followers = user.followers?.totalCount || 0;
  const prs = user.pullRequests?.totalCount || 0;

  const streakDays = calculateStreak(contributionCalendar);
  const streak = formatStreak(streakDays);

  const allRepos = [];
  if (user.repositories) {
    allRepos.push(...(user.repositories.nodes || []));
    let hasNextPage = user.repositories.pageInfo?.hasNextPage;
    let endCursor = user.repositories.pageInfo?.endCursor;

    while (hasNextPage && endCursor) {
      console.log(`Fetching next page of repositories starting at cursor: ${endCursor}...`);
      const pageData = await fetchMoreRepositories(username, endCursor, token);
      
      const pageRepos = pageData.user?.repositories?.nodes || [];
      allRepos.push(...pageRepos);
      
      hasNextPage = pageData.user?.repositories?.pageInfo?.hasNextPage;
      endCursor = pageData.user?.repositories?.pageInfo?.endCursor;
    }
  }

  let totalStars = 0;
  let forkedByUser = 0;

  for (const repo of allRepos) {
    if (repo) {
      totalStars += repo.stargazerCount || 0;
      if (repo.isFork) {
        forkedByUser++;
      }
    }
  }

  const sortedRepos = [...allRepos].sort((a, b) => {
    if (!a.pushedAt) return 1;
    if (!b.pushedAt) return -1;
    return new Date(b.pushedAt) - new Date(a.pushedAt);
  });

  let lastRepo = '—';
  let lastCommit = '—';

  if (sortedRepos.length > 0 && sortedRepos[0]) {
    lastRepo = sortedRepos[0].name;
    if (lastRepo.length > 100) {
      lastRepo = lastRepo.slice(0, 97) + '...';
    }

    const commitNode = sortedRepos[0].defaultBranchRef?.target?.history?.nodes?.[0];
    if (commitNode && commitNode.message) {
      const rawCommitMsg = commitNode.message.replace(/\n.*/s, '');
      if (rawCommitMsg.length > 100) {
        lastCommit = rawCommitMsg.slice(0, 97) + '...';
      } else {
        lastCommit = rawCommitMsg;
      }
    }
  }

  const topLanguage = determineTopLanguage(allRepos);
  const joined = formatJoinedDate(user.createdAt);

  const defaultAvatarUrl = 'https://github.com/identicons/guest.png';
  const avatar = user.avatarUrl || defaultAvatarUrl;

  return {
    username,
    displayName: user.name || '',
    joined,
    avatar,
    followers,
    prs,
    last_repo: lastRepo,
    last_commit: lastCommit,
    stars: totalStars,
    forks: forkedByUser,
    repos: allRepos.length,
    streak,
    contributions,
    top_language: topLanguage
  };
}

function formatJoinedDate(createdAtString) {
  if (!createdAtString) {
    return 'Joined —';
  }
  
  try {
    const date = new Date(createdAtString);
    if (isNaN(date.getTime())) {
      return 'Joined —';
    }
    
    const options = { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' };
    const formatter = new Intl.DateTimeFormat('en-US', options);
    const formattedDate = formatter.format(date);
    return `Joined ${formattedDate}`;
  } catch (error) {
    console.error('Error formatting joined date:', error);
    return 'Joined —';
  }
}
