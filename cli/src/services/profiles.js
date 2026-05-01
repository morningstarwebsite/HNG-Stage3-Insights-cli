function resolvePaths(config = {}) {
  return {
    profilesPath: config.profilesPath || "/profiles",
    profilesExportPath: config.profilesExportPath || "/profiles/export"
  };
}

export async function listProfiles(apiClient, filters = {}, config = {}) {
  const paths = resolvePaths(config);

  return apiClient.request(paths.profilesPath, {
    method: "GET",
    query: filters
  });
}

export async function getProfile(apiClient, id, config = {}) {
  const paths = resolvePaths(config);

  return apiClient.request(`${paths.profilesPath}/${encodeURIComponent(id)}`, {
    method: "GET"
  });
}

export async function searchProfiles(apiClient, query, config = {}) {
  const paths = resolvePaths(config);

  return apiClient.request(`${paths.profilesPath}/search`, {
    method: "GET",
    query: { query }
  });
}

export async function createProfile(apiClient, payload, config = {}) {
  const paths = resolvePaths(config);

  return apiClient.request(paths.profilesPath, {
    method: "POST",
    body: payload
  });
}

export async function exportProfiles(apiClient, format = "csv", config = {}) {
  const paths = resolvePaths(config);

  return apiClient.request(paths.profilesExportPath, {
    method: "GET",
    query: { format },
    responseType: format.toLowerCase() === "csv" ? "text" : "json"
  });
}
