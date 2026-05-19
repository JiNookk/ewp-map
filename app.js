const fallbackPowerSources = [
  { id: "thermal", label: "석탄", sortOrder: 10, color: "#4a4f55" },
  { id: "lng", label: "LNG", sortOrder: 20, color: "#1f7a8c" },
  { id: "hydrogen", label: "수소", sortOrder: 30, color: "#1769aa" },
  { id: "ammonia", label: "암모니아", sortOrder: 35, color: "#8a5a00" },
  { id: "solar", label: "태양광", sortOrder: 40, color: "#d28a00" },
  { id: "wind", label: "풍력", sortOrder: 45, color: "#3f8fb5" },
  { id: "biomass", label: "바이오매스", sortOrder: 50, color: "#5f7f2a" },
  { id: "small_hydro", label: "소수력", sortOrder: 55, color: "#2f6f9f" },
  { id: "waste_resource", label: "폐자원", sortOrder: 60, color: "#6b6b2f" },
  { id: "storage", label: "저장", sortOrder: 70, color: "#b56b1f" },
];

const fallbackStatuses = [
  { id: "operating", label: "운영중", sortOrder: 10, color: "#26734d", isFuture: false },
  { id: "construction", label: "건설중", sortOrder: 15, color: "#8b6f1f", isFuture: true },
  { id: "planned", label: "예정", sortOrder: 20, color: "#9a6a14", isFuture: true },
  { id: "proposed", label: "제안·확보", sortOrder: 25, color: "#7d6b91", isFuture: true },
  { id: "demo", label: "실증", sortOrder: 30, color: "#c83d3d", isFuture: true },
  { id: "transition", label: "전환", sortOrder: 40, color: "#7b5ab6", isFuture: true },
  { id: "retired", label: "폐지 주의", sortOrder: 50, color: "#8b3f3f", isFuture: false },
  { id: "check", label: "확인필요", sortOrder: 60, color: "#6a6f75", isFuture: true },
  { id: "mixed", label: "혼합", sortOrder: 90, color: "#626a70", isFuture: false },
];

const fallbackAssetSubtypes = [
  { id: "site_solar", label: "부지태양광", parentPowerSource: "solar", sortOrder: 10, color: "#d28a00" },
  { id: "floating_solar", label: "수상태양광", parentPowerSource: "solar", sortOrder: 20, color: "#c47700" },
  { id: "roof_solar", label: "지붕태양광", parentPowerSource: "solar", sortOrder: 30, color: "#a96500" },
  { id: "agrivoltaics", label: "영농형", parentPowerSource: "solar", sortOrder: 40, color: "#7a7f1e" },
  { id: "bipv", label: "BIPV", parentPowerSource: "solar", sortOrder: 50, color: "#8b6400" },
  { id: "solar_om", label: "태양광 O&M", parentPowerSource: "solar", sortOrder: 60, color: "#6f6f2b" },
  { id: "re100_ppa", label: "RE100·PPA", parentPowerSource: "solar", sortOrder: 70, color: "#6b6b50" },
  { id: "onshore_wind", label: "육상풍력", parentPowerSource: "wind", sortOrder: 80, color: "#3f8fb5" },
  { id: "floating_offshore_wind", label: "부유식 해상풍력", parentPowerSource: "wind", sortOrder: 90, color: "#236d91" },
  { id: "biomass_power", label: "바이오매스 발전", parentPowerSource: "biomass", sortOrder: 100, color: "#5f7f2a" },
  { id: "aquaculture_small_hydro", label: "양식장 소수력", parentPowerSource: "small_hydro", sortOrder: 110, color: "#2f6f9f" },
  { id: "bess", label: "BESS", parentPowerSource: "storage", sortOrder: 120, color: "#b56b1f" },
  { id: "pumped_hydro", label: "양수발전", parentPowerSource: "storage", sortOrder: 130, color: "#8f5f1f" },
];

const commentTypes = {
  correction: "수정제안",
  addition: "누락제보",
  question: "질문",
  source: "근거추가",
};

let powerSources = new Map(fallbackPowerSources.map((source) => [source.id, source]));
let statuses = new Map(fallbackStatuses.map((status) => [status.id, status]));
let assetSubtypes = new Map(fallbackAssetSubtypes.map((subtype) => [subtype.id, subtype]));

const tableNames = [
  "power_sources",
  "statuses",
  "asset_subtypes",
  "sites",
  "site_power_sources",
  "site_assets",
  "interview_points",
  "source_links",
  "comments",
];
const defaultCsvSources = {
  power_sources: "./data/power_sources.csv",
  statuses: "./data/statuses.csv",
  asset_subtypes: "./data/asset_subtypes.csv",
  sites: "./data/sites_normalized.csv",
  site_power_sources: "./data/site_power_sources.csv",
  site_assets: "./data/site_assets.csv",
  interview_points: "./data/interview_points.csv",
  source_links: "./data/source_links.csv",
  comments: "./data/comments.csv",
};

const state = {
  filter: "all",
  statusFilter: "all",
  query: "",
  selectedId: null,
  lockedId: null,
  loadError: null,
  commentFeedback: null,
};

const markers = new Map();
let map;
let sites = [];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getConfig() {
  return window.EWP_MAP_CONFIG ?? {};
}

async function fetchCsvRows(url) {
  const response = await fetch(url, { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`데이터 시트를 불러오지 못했습니다. ${url} HTTP ${response.status}`);
  }

  return parseCsv(await response.text());
}

async function loadCsvTables(sources) {
  const urls = { ...defaultCsvSources, ...sources };
  const entries = await Promise.all(
    tableNames.map(async (tableName) => [tableName, await fetchCsvRows(urls[tableName])])
  );
  return Object.fromEntries(entries);
}

function getSheetNames() {
  return {
    power_sources: "power_sources",
    statuses: "statuses",
    asset_subtypes: "asset_subtypes",
    sites: "sites",
    site_power_sources: "site_power_sources",
    site_assets: "site_assets",
    interview_points: "interview_points",
    source_links: "source_links",
    comments: "comments",
    ...getConfig().sheetNames,
  };
}

function gvizCellValue(cell) {
  if (!cell || cell.v === null || cell.v === undefined) return "";
  return String(cell.f ?? cell.v);
}

function gvizTableToRows(table) {
  const headers = table.cols.map((column) => String(column.label || column.id || "").trim());
  return table.rows
    .map((row) =>
      Object.fromEntries(headers.map((header, index) => [header, gvizCellValue(row.c?.[index])]))
    )
    .filter((row) => Object.values(row).some((value) => String(value).trim() !== ""));
}

function loadGoogleSheetRows(spreadsheetId, sheetName) {
  return new Promise((resolve, reject) => {
    const callbackName = `__ewpSheet_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error(`${sheetName} 시트 응답 시간이 초과되었습니다.`));
    }, 12000);

    function cleanup() {
      window.clearTimeout(timeout);
      delete window[callbackName];
      script.remove();
    }

    window[callbackName] = (payload) => {
      cleanup();

      if (payload.status === "error") {
        const message = payload.errors?.map((error) => error.detailed_message || error.message).join(", ");
        reject(new Error(`${sheetName} 시트를 읽지 못했습니다. ${message || "공유 범위, resourcekey, 웹 게시 상태를 확인하세요."}`));
        return;
      }

      resolve(gvizTableToRows(payload.table));
    };

    const resourceKey = getConfig().googleSheetResourceKey;
    const url = new URL(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq`);
    url.searchParams.set("sheet", sheetName);
    url.searchParams.set("headers", "1");
    url.searchParams.set("_", String(Date.now()));
    url.searchParams.set("tqx", `out:json;responseHandler:${callbackName}`);
    if (resourceKey) {
      url.searchParams.set("resourcekey", resourceKey);
    }
    script.onerror = () => {
      cleanup();
      reject(new Error(`${sheetName} 시트 스크립트를 불러오지 못했습니다. 공유 범위가 '링크가 있는 모든 사용자 보기 가능'인지, 필요하면 resourcekey가 config에 들어갔는지 확인하세요.`));
    };
    script.src = url.toString();
    document.head.append(script);
  });
}

async function loadGoogleSheetTables(spreadsheetId) {
  const sheetNames = getSheetNames();
  const entries = await Promise.all(
    tableNames.map(async (tableName) => [tableName, await loadGoogleSheetRows(spreadsheetId, sheetNames[tableName])])
  );
  return Object.fromEntries(entries);
}

async function loadSpreadsheetTables() {
  const config = getConfig();
  const sheetId = config.googleSheetId || new URLSearchParams(window.location.search).get("sheetId");

  if (sheetId) {
    try {
      const tables = await loadGoogleSheetTables(sheetId);
      window.__ewpDataSource = "google-sheet";
      window.__ewpDataSourceError = "";
      return tables;
    } catch (error) {
      if (config.fallbackOnSheetError !== true) throw error;
      window.__ewpDataSource = "csv-tabs-fallback";
      window.__ewpDataSourceError = error instanceof Error ? error.message : String(error);
      console.warn(error);
    }
  }

  if (config.sources) {
    window.__ewpDataSource = window.__ewpDataSource || "csv-tabs";
    return loadCsvTables(config.sources);
  }

  throw new Error("데이터 원본이 설정되지 않았습니다. googleSheetId 또는 sources를 확인하세요.");
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  const source = text.replace(/^\uFEFF/, "");
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        value += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(value);
      if (row.some((cell) => cell.trim() !== "")) {
        rows.push(row);
      }
      row = [];
      value = "";
      continue;
    }

    value += char;
  }

  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }

  const headers = rows.shift()?.map((header) => header.trim()) ?? [];
  return rows.map((cells) =>
    Object.fromEntries(headers.map((header, index) => [header, cells[index]?.trim() ?? ""]))
  );
}

function splitPipe(value) {
  return String(value ?? "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toOrder(row) {
  const parsed = Number(row.item_order ?? row.asset_order ?? row.point_order ?? row.link_order ?? row.sort_order);
  return Number.isFinite(parsed) ? parsed : 9999;
}

function toBoolean(value) {
  return String(value).trim().toLowerCase() === "true";
}

function safeColor(value, fallback) {
  const color = String(value ?? "").trim();
  return /^#[0-9a-f]{3,8}$/i.test(color) ? color : fallback;
}

function definitionStyle(color, variableName) {
  return `${variableName}: ${escapeHtml(color)};`;
}

function sortedDefinitions(map, options = {}) {
  return [...map.values()]
    .filter((item) => !options.exclude?.includes(item.id))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, "ko"));
}

function loadReferenceDefinitions(tables) {
  powerSources = new Map(
    (tables.power_sources?.length ? tables.power_sources : fallbackPowerSources).map((row) => {
      const fallback = fallbackPowerSources.find((source) => source.id === (row.power_source_id || row.id));
      const id = row.power_source_id || row.id;
      return [
        id,
        {
          id,
          label: row.power_source_name || row.label || fallback?.label || id,
          sortOrder: Number(row.sort_order ?? row.sortOrder ?? fallback?.sortOrder ?? 999),
          color: safeColor(row.color_hex ?? row.color, fallback?.color || "#626a70"),
        },
      ];
    })
  );

  statuses = new Map(
    (tables.statuses?.length ? tables.statuses : fallbackStatuses).map((row) => {
      const fallback = fallbackStatuses.find((status) => status.id === (row.status_id || row.id));
      const id = row.status_id || row.id;
      return [
        id,
        {
          id,
          label: row.status_name || row.label || fallback?.label || id,
          sortOrder: Number(row.sort_order ?? row.sortOrder ?? fallback?.sortOrder ?? 999),
          color: safeColor(row.color_hex ?? row.color, fallback?.color || "#626a70"),
          isFuture: row.is_future === undefined ? Boolean(fallback?.isFuture) : toBoolean(row.is_future),
        },
      ];
    })
  );

  assetSubtypes = new Map(
    (tables.asset_subtypes?.length ? tables.asset_subtypes : fallbackAssetSubtypes).map((row) => {
      const id = row.asset_subtype_id || row.id;
      const fallback = fallbackAssetSubtypes.find((subtype) => subtype.id === id);
      return [
        id,
        {
          id,
          label: row.asset_subtype_name || row.label || fallback?.label || id,
          parentPowerSource: row.parent_power_source_id || row.parentPowerSource || fallback?.parentPowerSource || "",
          sortOrder: Number(row.sort_order ?? row.sortOrder ?? fallback?.sortOrder ?? 999),
          color: safeColor(row.color_hex ?? row.color, fallback?.color || "#626a70"),
        },
      ];
    })
  );
}

function requirePowerSource(value, context) {
  if (powerSources.has(value)) return value;
  throw new Error(`${context}의 power_source_id가 기준표에 없습니다: ${value || "(빈 값)"}`);
}

function requireStatus(value, context) {
  if (statuses.has(value)) return value;
  throw new Error(`${context}의 status_id가 기준표에 없습니다: ${value || "(빈 값)"}`);
}

function requireAssetSubtype(value, powerSourceId, context) {
  const id = String(value ?? "").trim();
  if (!id) return "";

  const subtype = assetSubtypes.get(id);
  if (!subtype) {
    throw new Error(`${context}의 asset_subtype_id가 기준표에 없습니다: ${id}`);
  }

  if (subtype.parentPowerSource && subtype.parentPowerSource !== powerSourceId) {
    throw new Error(
      `${context}의 asset_subtype_id(${id})가 power_source_id(${powerSourceId})와 맞지 않습니다. parent_power_source_id=${subtype.parentPowerSource}`
    );
  }

  return id;
}

function getPowerSourceLabel(id) {
  return powerSources.get(id)?.label ?? id;
}

function getPowerSourceColor(id) {
  return powerSources.get(id)?.color ?? "#626a70";
}

function getStatusLabel(id) {
  return statuses.get(id)?.label ?? id;
}

function getStatusColor(id) {
  return statuses.get(id)?.color ?? "#626a70";
}

function getCommentTypeLabel(id) {
  return commentTypes[id] ?? id ?? "댓글";
}

function getAssetSubtypeLabel(id) {
  if (!id) return "";
  return assetSubtypes.get(id)?.label ?? id;
}

function getAssetSubtypeColor(id) {
  if (!id) return "#626a70";
  return assetSubtypes.get(id)?.color ?? "#626a70";
}

function isFutureStatus(id) {
  return statuses.get(id)?.isFuture ?? false;
}

function getDisplayStatuses(site) {
  const statuses = [...new Set(site.assets.map((asset) => asset.status))].filter((status) => status !== "mixed");

  if (site.status !== "mixed" && !statuses.includes(site.status)) {
    statuses.unshift(site.status);
  }

  return statuses.length ? statuses : [site.status];
}

function getMarkerStatus(statuses) {
  const visibleStatuses = statuses.filter((status) => status !== "retired");
  if (visibleStatuses.length === 1) return visibleStatuses[0];
  if (visibleStatuses.length === 0) return "retired";
  return "mixed";
}

function uniqueValues(values) {
  return [...new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))];
}

function extractValues(text, pattern) {
  return uniqueValues(String(text ?? "").match(pattern) ?? []);
}

function formatCapacityValues(value, unit) {
  const values = splitPipe(value);
  const units = splitPipe(unit);
  if (!values.length) return [];

  return values.map((item, index) => {
    const suffix = units[index] ?? units[0] ?? "";
    return `${item}${suffix}`.trim();
  });
}

function extractCapacityValues(asset) {
  if (asset.hasStructuredCapacity) return asset.capacityValues;
  return extractValues(`${asset.label} ${asset.text}`, /\d{1,3}(?:,\d{3})*(?:\.\d+)?\s*(?:MW|MWh|kW)/gi);
}

function extractScheduleValues(asset) {
  if (asset.hasStructuredSchedule) return asset.scheduleValues;
  return extractValues(
    `${asset.label} ${asset.text}`,
    /\d{4}\.\d{1,2}(?:\.\d{1,2})?~?|\d{4}\s*년\s*\d{1,2}\s*월(?:\s*\d{1,2}\s*일)?|\d{4}\s*년/gi
  );
}

function formatCommentDate(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value || "";
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function createPowerGroups(site, groupOrders) {
  const categoriesWithAssets = new Set(site.assets.map((asset) => asset.category));
  const orderedCategories = uniqueValues(site.categories)
    .filter((category) => categoriesWithAssets.has(category))
    .sort((a, b) => {
    const left = groupOrders.get(a) ?? powerSources.get(a)?.sortOrder ?? 999;
    const right = groupOrders.get(b) ?? powerSources.get(b)?.sortOrder ?? 999;
    return left - right || getPowerSourceLabel(a).localeCompare(getPowerSourceLabel(b), "ko");
  });

  return orderedCategories.map((category) => {
    const assets = site.assets.filter((asset) => asset.category === category);
    const groupStatuses = uniqueValues(assets.map((asset) => asset.status));
    const subtypeIds = uniqueValues(assets.map((asset) => asset.subtype)).sort((a, b) => {
      const left = assetSubtypes.get(a)?.sortOrder ?? 999;
      const right = assetSubtypes.get(b)?.sortOrder ?? 999;
      return left - right || getAssetSubtypeLabel(a).localeCompare(getAssetSubtypeLabel(b), "ko");
    });
    const capacityValues = uniqueValues(assets.flatMap(extractCapacityValues));
    const scheduleValues = uniqueValues(assets.flatMap(extractScheduleValues));
    const demoAssets = assets.filter((asset) => asset.status === "demo");

    return {
      id: category,
      label: getPowerSourceLabel(category),
      color: getPowerSourceColor(category),
      statuses: groupStatuses.length ? groupStatuses : [site.status],
      subtypeValues: subtypeIds.map(getAssetSubtypeLabel),
      capacityValues,
      scheduleValues,
      demoAssets,
      assets,
    };
  });
}

function buildDomainModel(tables) {
  loadReferenceDefinitions(tables);

  const siteMap = new Map();
  const siteRows = tables.sites ?? [];
  const sitePowerSourceRows = tables.site_power_sources ?? [];
  const assetRows = tables.site_assets ?? [];
  const pointRows = tables.interview_points ?? [];
  const linkRows = tables.source_links ?? [];
  const commentRows = tables.comments ?? [];
  const sitePowerSourceOrders = new Map();

  siteRows.forEach((row) => {
    const id = row.site_id;
    const lat = Number(row.lat);
    const lng = Number(row.lng);
    const primaryPowerSourceId = row.primary_power_source_id || row.primary_category;
    const siteStatusId = row.site_status_id || row.site_status || "mixed";

    if (!id || !row.site_name || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error(`site 행의 필수값이 비었습니다: ${id || "(site_id 없음)"}`);
    }

    siteMap.set(id, {
      id,
      name: row.site_name,
      region: row.region,
      coords: [lat, lng],
      primary: requirePowerSource(primaryPowerSourceId, `sites.${id}`),
      status: requireStatus(siteStatusId, `sites.${id}`),
      categories: [],
      summary: row.summary,
      assets: [],
      points: [],
      links: [],
      comments: [],
    });
  });

  if (sitePowerSourceRows.length > 0) {
    sitePowerSourceRows
      .slice()
      .sort((a, b) => toOrder(a) - toOrder(b))
      .forEach((row) => {
        const site = siteMap.get(row.site_id);
        if (!site) return;
        const powerSourceId = requirePowerSource(row.power_source_id, `site_power_sources.${row.site_id}`);
        site.categories.push(powerSourceId);
        sitePowerSourceOrders.set(`${row.site_id}:${powerSourceId}`, toOrder(row));
      });
  } else {
    siteRows.forEach((row) => {
      const site = siteMap.get(row.site_id);
      if (!site) return;
      site.categories.push(...splitPipe(row.categories).map((id) => requirePowerSource(id, `sites.${row.site_id}.categories`)));
    });
  }

  assetRows.forEach((row) => {
    const site = siteMap.get(row.site_id);
    if (!site) return;
    const powerSourceId = row.power_source_id || row.item_category || site.primary;
    const statusId = row.status_id || row.item_status || "operating";
    const context = `site_assets.${row.asset_id || row.site_id}`;
    const category = requirePowerSource(powerSourceId, context);
    const hasStructuredCapacity = "capacity_value" in row || "capacity_text" in row;
    const hasStructuredSchedule = "schedule_text" in row || "schedule" in row || "schedule_value" in row;

    site.assets.push({
      order: toOrder(row),
      label: row.asset_label || row.item_label,
      text: row.asset_text || row.item_text,
      category,
      subtype: requireAssetSubtype(row.asset_subtype_id || row.asset_subtype, category, context),
      status: requireStatus(statusId, context),
      hasStructuredCapacity,
      hasStructuredSchedule,
      capacityValues: formatCapacityValues(row.capacity_value || row.capacity_text, row.capacity_unit),
      scheduleValues: splitPipe(row.schedule_text || row.schedule || row.schedule_value),
    });
  });

  pointRows.forEach((row) => {
    const site = siteMap.get(row.site_id);
    if (!site) return;

    site.points.push({
      order: toOrder(row),
      text: row.point_text || row.item_text,
    });
  });

  linkRows.forEach((row) => {
    const site = siteMap.get(row.site_id);
    if (!site) return;

    site.links.push({
      order: toOrder(row),
      label: row.link_label,
      url: row.link_url,
    });
  });

  commentRows.forEach((row) => {
    const site = siteMap.get(row.site_id);
    if (!site || !row.message) return;

    site.comments.push({
      id: row.comment_id || `${row.site_id}-${row.created_at || row.message}`,
      createdAt: row.created_at,
      author: row.author || "익명",
      type: row.comment_type || "question",
      targetLabel: row.target_label,
      message: row.message,
      sourceUrl: row.source_url,
      status: row.comment_status || "open",
    });
  });

  return [...siteMap.values()].map((site) => {
    const categories = new Set(site.categories);
    categories.add(site.primary);
    site.assets.forEach((asset) => categories.add(asset.category));
    site.categories = [...categories].filter((category) => powerSources.has(category));
    site.assets.sort((a, b) => a.order - b.order);
    site.points.sort((a, b) => a.order - b.order);
    site.links.sort((a, b) => a.order - b.order);
    site.comments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    site.statuses = getDisplayStatuses(site);
    site.markerStatus = getMarkerStatus(site.statuses);
    site.powerGroups = createPowerGroups(
      site,
      new Map(site.categories.map((category) => [category, sitePowerSourceOrders.get(`${site.id}:${category}`)]))
    );
    return site;
  });
}

function getFilteredSites() {
  const query = state.query.trim().toLowerCase();

  return sites.filter((site) => {
    const matchesFilter = state.filter === "all" || site.categories.includes(state.filter);
    const matchesStatus =
      state.statusFilter === "all" ||
      site.status === state.statusFilter ||
      site.assets.some((asset) => asset.status === state.statusFilter);
    const text = [
      site.name,
      site.region,
      site.summary,
      site.categories.map((category) => getPowerSourceLabel(category)).join(" "),
      site.statuses.map((status) => getStatusLabel(status)).join(" "),
      site.powerGroups
        .map((group) => `${group.label} ${group.subtypeValues.join(" ")} ${group.capacityValues.join(" ")} ${group.scheduleValues.join(" ")}`)
        .join(" "),
      site.assets
        .map(
          (asset) =>
            `${asset.label} ${asset.text} ${getPowerSourceLabel(asset.category)} ${getAssetSubtypeLabel(asset.subtype)} ${getStatusLabel(asset.status)}`
        )
        .join(" "),
      site.points.map((point) => point.text).join(" "),
      site.links.map((link) => link.label).join(" "),
      site.comments
        .map((comment) => `${comment.author} ${getCommentTypeLabel(comment.type)} ${comment.targetLabel} ${comment.message} ${comment.sourceUrl}`)
        .join(" "),
    ]
      .join(" ")
      .toLowerCase();

    return matchesFilter && matchesStatus && (!query || text.includes(query));
  });
}

function categoryTags(categories) {
  return categories
    .map(
      (category) =>
        `<span class="tag ${category}" style="${definitionStyle(getPowerSourceColor(category), "--tag-color")}">${escapeHtml(getPowerSourceLabel(category))}</span>`
    )
    .join("");
}

function statusBadges(statuses) {
  return statuses
    .map(
      (status) =>
        `<span class="status-badge ${status}" style="${definitionStyle(getStatusColor(status), "--status-color")}">${escapeHtml(getStatusLabel(status))}</span>`
    )
    .join("");
}

function assetSubtypeBadge(subtype) {
  if (!subtype) return "";
  return `<span class="subtype-badge" style="${definitionStyle(getAssetSubtypeColor(subtype), "--subtype-color")}">${escapeHtml(getAssetSubtypeLabel(subtype))}</span>`;
}

function groupFact(label, values) {
  if (!values.length) return "";
  return `
    <div>
      <dt>${escapeHtml(label)}</dt>
      <dd>${values.map((value) => `<span>${escapeHtml(value)}</span>`).join("")}</dd>
    </div>
  `;
}

function commentTargetOptions(site) {
  const targets = uniqueValues([
    ...site.powerGroups.map((group) => `${group.label} 항목`),
    ...site.assets.map((asset) => asset.label),
  ]);

  return [
    '<option value="">전체</option>',
    ...targets.map((target) => `<option value="${escapeHtml(target)}">${escapeHtml(target)}</option>`),
  ].join("");
}

function renderCommentList(comments) {
  const visibleComments = comments.filter((comment) => comment.status !== "hidden");

  if (!visibleComments.length) {
    return '<li class="comment-empty">아직 등록된 댓글이 없습니다.</li>';
  }

  return visibleComments
    .map(
      (comment) => `
        <li class="comment-item status-${escapeHtml(comment.status)}">
          <div class="comment-head">
            <strong>${escapeHtml(comment.author)}</strong>
            <span>${escapeHtml(getCommentTypeLabel(comment.type))}</span>
            ${comment.targetLabel ? `<span>${escapeHtml(comment.targetLabel)}</span>` : ""}
            ${comment.createdAt ? `<time>${escapeHtml(formatCommentDate(comment.createdAt))}</time>` : ""}
          </div>
          <p>${escapeHtml(comment.message)}</p>
          ${
            comment.sourceUrl
              ? `<a class="comment-link" href="${escapeHtml(comment.sourceUrl)}" target="_blank" rel="noreferrer">근거 링크</a>`
              : ""
          }
        </li>
      `
    )
    .join("");
}

function renderCommentsSection(site) {
  const feedback = state.commentFeedback?.siteId === site.id ? state.commentFeedback : null;
  const endpointConfigured = Boolean(getConfig().commentsEndpoint);
  const disabled = endpointConfigured ? "" : "disabled";
  const feedbackMessage = feedback?.message || (endpointConfigured ? "" : "댓글 저장 API 미연결");

  return `
    <section class="detail-section comment-section">
      <div class="section-title-row">
        <h3>스터디 댓글</h3>
        <span>${site.comments.filter((comment) => comment.status !== "hidden").length}개</span>
      </div>
      <ul class="comment-list">
        ${renderCommentList(site.comments)}
      </ul>
      <form class="comment-form" data-comment-form data-site-id="${escapeHtml(site.id)}">
        <div class="comment-form-grid">
          <label>
            <span>이름</span>
            <input name="author" maxlength="24" autocomplete="name" required>
          </label>
          <label>
            <span>유형</span>
            <select name="comment_type">
              ${Object.entries(commentTypes)
                .map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`)
                .join("")}
            </select>
          </label>
        </div>
        <label>
          <span>대상</span>
          <select name="target_label">
            ${commentTargetOptions(site)}
          </select>
        </label>
        <label>
          <span>내용</span>
          <textarea name="message" rows="4" maxlength="800" required></textarea>
        </label>
        <label>
          <span>근거 링크</span>
          <input name="source_url" type="url" inputmode="url" placeholder="https://">
        </label>
        <input class="comment-honeypot" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
        <div class="comment-actions">
          <button type="submit" ${disabled}>댓글 등록</button>
          ${feedbackMessage ? `<span class="comment-feedback ${feedback?.type || ""}">${escapeHtml(feedbackMessage)}</span>` : ""}
        </div>
      </form>
    </section>
  `;
}

function renderPowerGroup(group, index) {
  const statusLabels = group.statuses.map((status) => getStatusLabel(status));
  const assetCountLabel = group.assets.length > 1 ? `<span>${group.assets.length}개 세부항목</span>` : "";
  const facts = [
    groupFact("하위유형", group.subtypeValues),
    groupFact("발전용량", group.capacityValues),
    groupFact("일정", group.scheduleValues),
    groupFact("상태", statusLabels),
    group.demoAssets.length ? groupFact("실증", group.demoAssets.map((asset) => asset.label)) : "",
  ].join("");

  return `
    <details class="power-group" ${index === 0 ? "open" : ""} style="${definitionStyle(group.color, "--power-group-color")}">
      <summary>
        <span class="tag ${group.id}" style="${definitionStyle(group.color, "--tag-color")}">${escapeHtml(group.label)}</span>
        <strong>${escapeHtml(group.label)} 항목</strong>
        ${assetCountLabel}
        <span class="status-row">${statusBadges(group.statuses)}</span>
      </summary>
      <div class="power-group-body">
        ${facts ? `<dl class="group-facts">${facts}</dl>` : ""}
        <ul class="asset-list">
          ${group.assets
            .map(
              (asset) => `
                <li class="asset status-${asset.status}" style="${definitionStyle(getStatusColor(asset.status), "--asset-status-color")}">
                  <div class="asset-meta">
                    <span class="status-badge ${asset.status}" style="${definitionStyle(getStatusColor(asset.status), "--status-color")}">${escapeHtml(getStatusLabel(asset.status))}</span>
                    ${assetSubtypeBadge(asset.subtype)}
                  </div>
                  <strong>${escapeHtml(asset.label)}</strong>
                  <p>${escapeHtml(asset.text)}</p>
                </li>
              `
            )
            .join("")}
        </ul>
      </div>
    </details>
  `;
}

function renderControls() {
  document.querySelector(".filters").innerHTML = [
    `<button class="filter ${state.filter === "all" ? "is-active" : ""}" type="button" data-filter="all">전체</button>`,
    ...sortedDefinitions(powerSources).map(
      (source) =>
        `<button class="filter ${state.filter === source.id ? "is-active" : ""}" type="button" data-filter="${escapeHtml(source.id)}">${escapeHtml(source.label)}</button>`
    ),
  ].join("");

  document.querySelector(".status-filters").innerHTML = [
    `<button class="status-filter ${state.statusFilter === "all" ? "is-active" : ""}" type="button" data-status-filter="all">전체상태</button>`,
    ...sortedDefinitions(statuses, { exclude: ["mixed"] }).map(
      (status) =>
        `<button class="status-filter ${state.statusFilter === status.id ? "is-active" : ""}" type="button" data-status-filter="${escapeHtml(status.id)}">${escapeHtml(status.label)}</button>`
    ),
  ].join("");
}

function renderList() {
  const list = document.querySelector("#site-list");
  const filtered = getFilteredSites();

  document.querySelector("#site-count").textContent = filtered.length;
  document.querySelector("#operating-count").textContent = filtered.reduce(
    (sum, site) => sum + site.assets.filter((asset) => asset.status === "operating").length,
    0
  );
  document.querySelector("#planned-count").textContent = filtered.reduce(
    (sum, site) => sum + site.assets.filter((asset) => isFutureStatus(asset.status)).length,
    0
  );

  if (state.loadError) {
    list.innerHTML = `<li class="no-results">${escapeHtml(state.loadError)}</li>`;
    return;
  }

  if (filtered.length === 0) {
    list.innerHTML = `<li class="no-results">조건에 맞는 지점이 없습니다.</li>`;
    return;
  }

  list.innerHTML = filtered
    .map(
      (site) => `
        <li>
          <button class="site-button ${site.id === state.selectedId ? "is-selected" : ""}" type="button" data-site-id="${site.id}">
            <strong>${escapeHtml(site.name)}</strong>
            <span>${escapeHtml(site.region)} · ${escapeHtml(site.summary)}</span>
            <span class="status-row">${statusBadges(site.statuses)}</span>
            <span class="tag-row">${categoryTags(site.categories)}</span>
          </button>
        </li>
      `
    )
    .join("");
}

function renderDetail(site) {
  const panel = document.querySelector("#detail-panel");

  if (state.loadError) {
    panel.innerHTML = `
      <div class="empty-state">
        <p class="eyebrow">데이터 오류</p>
        <h2>시트를 읽지 못했습니다</h2>
        <p>${escapeHtml(state.loadError)}</p>
      </div>
    `;
    return;
  }

  if (!site) {
    panel.innerHTML = `
      <div class="empty-state">
        <p class="eyebrow">선택 대기</p>
        <h2>사업소를 선택하세요</h2>
        <p>각 지점의 발전원, 용량, 실증 일정, 전환 계획, 면접 포인트를 계층으로 묶어 보여줍니다.</p>
      </div>
    `;
    return;
  }

  panel.innerHTML = `
    <p class="eyebrow">사업소·개발사업</p>
    <h2>${escapeHtml(site.name)}</h2>
    <p class="region">${escapeHtml(site.region)}</p>
    <div class="status-row">${statusBadges(site.statuses)}</div>
    <div class="tag-row">${categoryTags(site.categories)}</div>
    <p class="summary">${escapeHtml(site.summary)}</p>

    <section class="detail-section">
      <h3>발전원별 세부 내용</h3>
      <div class="power-group-list">
        ${site.powerGroups.map(renderPowerGroup).join("")}
      </div>
    </section>

    <section class="detail-section">
      <h3>면접 포인트</h3>
      <ul class="point-list">
        ${site.points.map((point) => `<li>${escapeHtml(point.text)}</li>`).join("")}
      </ul>
    </section>

    <section class="detail-section">
      <h3>근거 페이지</h3>
      <ul class="link-list">
        ${site.links
          .map(
            (link) => `
              <li>
                <a href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">
                  <span>${escapeHtml(link.label)}</span>
                  <span>열기</span>
                </a>
              </li>
            `
          )
          .join("")}
      </ul>
    </section>

    ${renderCommentsSection(site)}
  `;
}

function setSelected(siteId, options = {}) {
  const site = sites.find((item) => item.id === siteId) ?? null;
  state.selectedId = site?.id ?? null;

  if (options.lock) {
    state.lockedId = site?.id ?? null;
  }

  renderList();
  renderDetail(site);
  updateMarkerStyles();

  if (site && options.pan !== false) {
    focusMapOnSite(site, options);
  }
}

function previewSelected(siteId) {
  const site = sites.find((item) => item.id === siteId) ?? null;
  state.selectedId = site?.id ?? null;
  renderDetail(site);
  updateListSelection();
  updateMarkerStyles();
}

function updateListSelection() {
  document.querySelectorAll(".site-button").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.siteId === state.selectedId);
  });
}

function focusMapOnSite(site, options = {}) {
  if (!map || !site) return;

  const currentZoom = map.getZoom();
  const targetZoom = options.zoom ?? Math.max(currentZoom, 8);
  map.flyTo(site.coords, targetZoom, {
    animate: true,
    duration: options.duration ?? 0.6,
  });

  if (options.revealMap && window.matchMedia("(max-width: 760px)").matches) {
    document.querySelector(".map-shell")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
}

function syncSelectionWithFiltered(options = {}) {
  const filtered = getFilteredSites();

  if (filtered.length === 0) {
    state.selectedId = null;
    state.lockedId = null;
    renderDetail(null);
    return;
  }

  const selectedIsVisible = filtered.some((site) => site.id === state.selectedId);
  if (!state.selectedId || !selectedIsVisible) {
    state.selectedId = filtered[0].id;
    state.lockedId = null;
    renderDetail(filtered[0]);

    if (map && options.pan !== false) {
      focusMapOnSite(filtered[0], options);
    }
    return;
  }

  renderDetail(sites.find((site) => site.id === state.selectedId));
}

function updateMarkerStyles() {
  const filteredIds = new Set(getFilteredSites().map((site) => site.id));
  for (const [siteId, marker] of markers.entries()) {
    const element = marker.getElement();
    if (!element) continue;

    element.style.display = filteredIds.has(siteId) ? "" : "none";
    const pin = element.querySelector(".marker-pin");
    if (pin) {
      pin.classList.toggle("is-active", siteId === state.selectedId);
    }
  }
}

async function postComment(payload) {
  const endpoint = String(getConfig().commentsEndpoint || "").trim();
  if (!endpoint) {
    throw new Error("댓글 저장 API가 연결되지 않았습니다.");
  }

  await fetch(endpoint, {
    method: "POST",
    mode: getConfig().commentsCors === true ? "cors" : "no-cors",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify(payload),
  });
}

function setCommentFeedback(siteId, type, message) {
  state.commentFeedback = { siteId, type, message };
  const site = sites.find((item) => item.id === siteId);
  if (site) renderDetail(site);
}

async function handleCommentSubmit(form) {
  const site = sites.find((item) => item.id === form.dataset.siteId);
  if (!site) return;

  const formData = new FormData(form);
  if (String(formData.get("website") || "").trim()) return;

  const author = String(formData.get("author") || "").trim();
  const message = String(formData.get("message") || "").trim();
  const sourceUrl = String(formData.get("source_url") || "").trim();
  const commentType = String(formData.get("comment_type") || "question").trim();
  const targetLabel = String(formData.get("target_label") || "").trim();

  if (!author || !message) {
    setCommentFeedback(site.id, "error", "이름과 내용을 입력해야 합니다.");
    return;
  }

  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) submitButton.disabled = true;

  const createdAt = new Date().toISOString();
  const payload = {
    spreadsheetId: getConfig().googleSheetId || "",
    siteId: site.id,
    siteName: site.name,
    author,
    commentType,
    targetLabel,
    message,
    sourceUrl,
    pageUrl: window.location.href,
    createdAt,
  };

  try {
    await postComment(payload);
    site.comments.unshift({
      id: `local-${Date.now()}`,
      createdAt,
      author,
      type: commentType,
      targetLabel,
      message,
      sourceUrl,
      status: "open",
    });
    state.commentFeedback = { siteId: site.id, type: "success", message: "등록했습니다." };
    renderDetail(site);
  } catch (error) {
    setCommentFeedback(site.id, "error", error instanceof Error ? error.message : String(error));
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
}

function initMap() {
  if (!window.L) {
    document.querySelector(".map-shell").innerHTML =
      '<div class="no-results">지도를 불러오지 못했습니다. 네트워크 연결 또는 Leaflet CDN 접근을 확인하세요.</div>';
    return;
  }

  map = L.map("map", {
    zoomControl: true,
    scrollWheelZoom: true,
  }).setView([36.25, 127.9], 7);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);
}

function initMarkers() {
  for (const marker of markers.values()) {
    marker.remove();
  }
  markers.clear();

  sites.forEach((site) => {
    const marker = L.marker(site.coords, {
      icon: L.divIcon({
        className: "",
        html: `<div class="marker-pin ${site.primary} marker-${site.markerStatus}" style="${definitionStyle(getPowerSourceColor(site.primary), "--marker-bg")} ${definitionStyle(getStatusColor(site.markerStatus), "--marker-status-bg")}">${escapeHtml(site.name.slice(0, 1))}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      }),
      keyboard: true,
      title: site.name,
    }).addTo(map);

    marker.bindTooltip(site.name, {
      className: "site-tooltip",
      direction: "top",
      offset: [0, -12],
    });

    marker.on("mouseover", () => setSelected(site.id, { pan: false }));
    marker.on("click", () => setSelected(site.id, { lock: true, zoom: 9 }));
    marker.on("mouseout", () => {
      if (state.lockedId && state.lockedId !== site.id) {
        setSelected(state.lockedId, { pan: false });
      }
    });

    markers.set(site.id, marker);
  });
}

function bindEvents() {
  document.querySelector("#site-search").addEventListener("input", (event) => {
    state.query = event.target.value;
    syncSelectionWithFiltered();
    renderList();
    updateMarkerStyles();
  });

  document.querySelector(".filters").addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;

    state.filter = button.dataset.filter;
    document.querySelectorAll(".filter").forEach((filter) => {
      filter.classList.toggle("is-active", filter === button);
    });

    syncSelectionWithFiltered();
    renderList();
    updateMarkerStyles();
  });

  document.querySelector(".status-filters").addEventListener("click", (event) => {
    const button = event.target.closest("[data-status-filter]");
    if (!button) return;

    state.statusFilter = button.dataset.statusFilter;
    document.querySelectorAll(".status-filter").forEach((filter) => {
      filter.classList.toggle("is-active", filter === button);
    });

    syncSelectionWithFiltered();
    renderList();
    updateMarkerStyles();
  });

  document.querySelector("#site-list").addEventListener("mouseover", (event) => {
    const button = event.target.closest("[data-site-id]");
    if (!button) return;
    previewSelected(button.dataset.siteId);
  });

  document.querySelector("#site-list").addEventListener("click", (event) => {
    const button = event.target.closest("[data-site-id]");
    if (!button) return;
    event.preventDefault();
    setSelected(button.dataset.siteId, { lock: true, zoom: 9, revealMap: true });
  });

  document.querySelector("#site-list").addEventListener("focusin", (event) => {
    const button = event.target.closest("[data-site-id]");
    if (!button) return;
    previewSelected(button.dataset.siteId);
  });

  document.querySelector("#detail-panel").addEventListener("submit", (event) => {
    const form = event.target.closest("[data-comment-form]");
    if (!form) return;
    event.preventDefault();
    handleCommentSubmit(form);
  });
}

async function boot() {
  initMap();
  renderControls();
  bindEvents();
  renderList();
  renderDetail(null);

  try {
    sites = buildDomainModel(await loadSpreadsheetTables());
    state.loadError = null;
    renderControls();
    initMarkers();
    renderList();

    const defaultSite = sites.find((site) => site.id === "dangjin") ?? sites[0];
    if (defaultSite) {
      setSelected(defaultSite.id, { pan: false });
    }
  } catch (error) {
    state.loadError = error instanceof Error ? error.message : String(error);
    renderList();
    renderDetail(null);
  }
}

boot();
