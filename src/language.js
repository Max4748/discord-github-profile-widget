export function determineTopLanguages(repositories, count = 3) {
  if (!repositories || repositories.length === 0) {
    return [];
  }

  const languageSizes = {};
  const primaryLanguageCounts = {};

  for (const repo of repositories) {
    if (!repo) continue;

    if (repo.languages && repo.languages.edges && repo.languages.edges.length > 0) {
      for (const edge of repo.languages.edges) {
        if (edge && edge.node && edge.node.name && typeof edge.size === 'number') {
          const langName = edge.node.name;
          languageSizes[langName] = (languageSizes[langName] || 0) + edge.size;
        }
      }
    }

    if (repo.primaryLanguage && repo.primaryLanguage.name) {
      const primaryLang = repo.primaryLanguage.name;
      primaryLanguageCounts[primaryLang] = (primaryLanguageCounts[primaryLang] || 0) + 1;
    }
  }

  const bySize = Object.entries(languageSizes)
    .sort((a, b) => b[1] - a[1])
    .map(([lang]) => lang);

  if (bySize.length > 0) {
    return bySize.slice(0, count);
  }

  return Object.entries(primaryLanguageCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([lang]) => lang)
    .slice(0, count);
}
