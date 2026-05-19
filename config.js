window.EWP_MAP_CONFIG = {
  // Google Sheet ID for "동서발전 사업소 지도 SSOT 정규화 - 수소 암모니아 분리":
  // 1eAT3-cYS2XXOD3aAHTsWQLescAl8OzhR0u-SCeJ6nOA
  googleSheetId: "1eAT3-cYS2XXOD3aAHTsWQLescAl8OzhR0u-SCeJ6nOA",
  googleSheetResourceKey: "",
  fallbackOnSheetError: false,
  commentsEndpoint: "",
  commentsCors: false,
  sheetNames: {
    power_sources: "power_sources",
    statuses: "statuses",
    asset_subtypes: "asset_subtypes",
    sites: "sites",
    site_power_sources: "site_power_sources",
    site_assets: "site_assets",
    interview_points: "interview_points",
    source_links: "source_links",
    comments: "comments",
  },
  sources: {
    power_sources: "./data/power_sources.csv",
    statuses: "./data/statuses.csv",
    asset_subtypes: "./data/asset_subtypes.csv",
    sites: "./data/sites_normalized.csv",
    site_power_sources: "./data/site_power_sources.csv",
    site_assets: "./data/site_assets.csv",
    interview_points: "./data/interview_points.csv",
    source_links: "./data/source_links.csv",
    comments: "./data/comments.csv",
  },
};
