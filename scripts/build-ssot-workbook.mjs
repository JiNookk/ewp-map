import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const rootDir = path.resolve(new URL("../..", import.meta.url).pathname);
const dataDir = path.join(rootDir, "ewp-map", "data");
const outputDir = path.join(rootDir, "outputs", "ewp-map-ssot");
const outputPath = path.join(outputDir, "ewp-map-ssot.xlsx");

const sheetSpecs = [
  {
    name: "power_sources",
    file: "power_sources.csv",
    description: "발전원/분류 기준 테이블",
    widths: [150, 150, 90, 110, 560],
  },
  {
    name: "statuses",
    file: "statuses.csv",
    description: "운영 상태 기준 테이블",
    widths: [140, 130, 90, 110, 90, 560],
  },
  {
    name: "asset_subtypes",
    file: "asset_subtypes.csv",
    description: "발전원 아래 자산 하위 유형 기준 테이블",
    widths: [180, 160, 170, 90, 110, 560],
  },
  {
    name: "sites",
    file: "sites_normalized.csv",
    description: "지도에 표시할 사업소/사업지 기본 정보",
    widths: [120, 150, 110, 80, 80, 180, 130, 560],
  },
  {
    name: "site_power_sources",
    file: "site_power_sources.csv",
    description: "사업소와 발전원/분류의 다대다 연결",
    widths: [120, 150, 90],
  },
  {
    name: "site_assets",
    file: "site_assets.csv",
    description: "사업소별 발전원, 설비, 실증, 전환 항목",
    widths: [170, 120, 90, 170, 560, 150, 160, 110, 110, 110, 260],
  },
  {
    name: "interview_points",
    file: "interview_points.csv",
    description: "면접 답변 포인트",
    widths: [170, 120, 90, 680],
  },
  {
    name: "source_links",
    file: "source_links.csv",
    description: "Notion 근거 페이지 링크",
    widths: [170, 120, 90, 190, 520],
  },
  {
    name: "comments",
    file: "comments.csv",
    description: "스터디원 댓글과 수정 제안",
    widths: [170, 180, 120, 160, 120, 120, 180, 560, 360, 360, 120],
  },
  {
    name: "schema",
    file: "schema_normalized.csv",
    description: "편집 기준과 허용값",
    widths: [160, 170, 90, 230, 620],
  },
];

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;
  const source = text.replace(/^\uFEFF/, "");

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        value += "\"";
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
      if (char === "\r" && next === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
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

  return rows;
}

function a1Column(index) {
  let dividend = index + 1;
  let columnName = "";

  while (dividend > 0) {
    const modulo = (dividend - 1) % 26;
    columnName = String.fromCharCode(65 + modulo) + columnName;
    dividend = Math.floor((dividend - modulo) / 26);
  }

  return columnName;
}

function writeSheet(workbook, spec, rows) {
  const sheet = workbook.worksheets.add(spec.name);
  const rowCount = rows.length;
  const colCount = rows[0]?.length ?? 1;
  const endColumn = a1Column(colCount - 1);

  sheet.getRangeByIndexes(0, 0, rowCount, colCount).values = rows;
  sheet.freezePanes.freezeRows(1);
  sheet.getRange(`A1:${endColumn}1`).format = {
    fill: "#1F2937",
    font: { bold: true, color: "#FFFFFF" },
    wrapText: true,
  };
  sheet.getRange(`A2:${endColumn}${rowCount}`).format = {
    wrapText: true,
    verticalAlignment: "Top",
  };

  spec.widths.forEach((width, index) => {
    sheet.getRange(`${a1Column(index)}:${a1Column(index)}`).format.columnWidthPx = width;
  });

  sheet.tables.add(`A1:${endColumn}${rowCount}`, true, `${spec.name}_table`);
  sheet.getRange("A1").values = [[rows[0][0]]];
  return sheet;
}

const workbook = Workbook.create();

for (const spec of sheetSpecs) {
  const csvText = await fs.readFile(path.join(dataDir, spec.file), "utf8");
  const rows = parseCsv(csvText);
  writeSheet(workbook, spec, rows);
}

const readme = workbook.worksheets.add("README");
readme.getRange("A1:B11").values = [
  ["항목", "내용"],
  ["목적", "동서발전 사업소 지도앱의 정규화 SSOT"],
  ["앱이 읽는 기준 탭", "power_sources, statuses, asset_subtypes"],
  ["앱이 읽는 데이터 탭", "sites, site_power_sources, site_assets, interview_points, source_links, comments"],
  ["사업소 수정", "sites 탭에서 이름, 지역, 좌표, 대표 분류, 요약을 수정"],
  ["발전원 명칭/색상 수정", "power_sources 탭에서 한 번만 수정"],
  ["상태 명칭/색상 수정", "statuses 탭에서 한 번만 수정"],
  ["하위유형 명칭/색상 수정", "asset_subtypes 탭에서 한 번만 수정"],
  ["사업소-발전원 연결", "site_power_sources 탭에서 필터 연결을 수정"],
  ["발전원/실증 수정", "site_assets 탭에서 항목명, 설명, 발전원, 하위유형, 상태를 수정"],
  ["댓글 확인", "comments 탭에서 스터디원 댓글, 수정 제안, 근거 링크를 확인"],
];
readme.getRange("A1:B1").format = {
  fill: "#1F2937",
  font: { bold: true, color: "#FFFFFF" },
};
readme.getRange("A:B").format = { wrapText: true, verticalAlignment: "Top" };
readme.getRange("A:A").format.columnWidthPx = 160;
readme.getRange("B:B").format.columnWidthPx = 620;

await fs.mkdir(outputDir, { recursive: true });

for (const spec of sheetSpecs) {
  await workbook.render({ sheetName: spec.name, range: "A1:C8", scale: 1, format: "png" });
}

const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(outputPath);
console.log(outputPath);
