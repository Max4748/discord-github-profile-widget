export function determineTopLanguage(repositories) {
  if (!repositories || repositories.length === 0) {
    return 'N/A';
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

  let topLanguageBySize = null;
  let maxSize = -1;
  for (const [lang, size] of Object.entries(languageSizes)) {
    if (size > maxSize) {
      maxSize = size;
      topLanguageBySize = lang;
    }
  }

  if (topLanguageBySize) {
    return topLanguageBySize;
  }

  let topLanguageByCount = null;
  let maxCount = -1;
  for (const [lang, count] of Object.entries(primaryLanguageCounts)) {
    if (count > maxCount) {
      maxCount = count;
      topLanguageByCount = lang;
    }
  }

  return topLanguageByCount || 'N/A';
}
