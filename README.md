# 동서발전 사업소 실증 지도

정적 HTML로 만든 스터디용 지도입니다.

## 로컬 확인

```bash
cd ewp-map
python3 -m http.server 4173
```

브라우저에서 `http://localhost:4173`을 열면 됩니다.

## 배포

빌드 과정이 없습니다. `ewp-map` 폴더를 GitHub Pages, Netlify, Vercel, Cloudflare Pages 중 하나에 정적 사이트로 올리면 됩니다.

## 데이터 소스

앱은 `config.js`를 보고 아래 순서로 데이터를 읽습니다.

1. `googleSheetId`가 있으면 Google Sheets의 정규화 탭을 읽습니다.
2. `googleSheetId`가 비어 있으면 `sources`의 로컬 CSV 탭을 읽습니다.
3. `fallbackOnSheetError`가 `true`일 때만 Google Sheets 오류 시 로컬 CSV로 후퇴합니다.

기본 구조:

```js
window.EWP_MAP_CONFIG = {
  googleSheetId: "",
  googleSheetResourceKey: "",
  fallbackOnSheetError: false,
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
```

앱 내부 흐름:

```text
Normalized Google Sheet tabs or CSV tabs
  -> loadSpreadsheetTables()
  -> buildDomainModel()
  -> power_sources / statuses / asset_subtypes lookup
  -> Site / Asset / InterviewPoint / SourceLink
  -> map/list/detail render
```

## 정규화 구조

- `power_sources`: 발전원/분류 기준. 필터명, 태그명, 색상의 SSOT입니다.
- `power_sources`에는 석탄, LNG, 수소, 암모니아, 태양광, 풍력, 바이오매스, 소수력처럼 1단계 발전원만 둡니다.
- `thermal` 키는 기존 참조키 호환을 위해 유지하지만 화면 표시는 `석탄`입니다. 여기서는 일반 화력이 아니라 석탄·유동층 석탄을 뜻합니다.
- `hydrogen`과 `ammonia`는 별도 발전원으로 둡니다. 수소혼소·연료전지는 `hydrogen`, 암모니아 혼소는 `ammonia`입니다.
- `statuses`: 운영 상태 기준. 상태 필터명, 배지명, 색상, 예정성 여부의 SSOT입니다.
- `asset_subtypes`: 발전원 아래 자산 하위 유형 기준. 수상태양광, 지붕태양광, 영농형, BIPV, 육상풍력, BESS처럼 필터 축이 아닌 세부 속성을 둡니다.
- `sites`: 사업소/사업지 자체 정보만 둡니다.
- `site_power_sources`: 사업소와 발전원/분류의 다대다 연결입니다.
- `site_assets`: 사업소별 설비, 발전원, 실증, 전환 항목입니다. `power_source_id`는 1단계 발전원, `asset_subtype_id`는 선택 하위 유형, 용량과 일정은 `capacity_value`, `capacity_unit`, `schedule_text`를 우선 사용합니다.
- `interview_points`: 면접 답변 포인트입니다.
- `source_links`: Notion 근거 링크입니다.
- `comments`: 스터디원 댓글, 수정 제안, 누락 제보, 근거 링크입니다.

## 댓글 저장

댓글 조회는 `comments` 탭을 읽습니다. 댓글 등록은 정적 사이트에서 Google Sheet에 직접 쓸 수 없으므로 Apps Script 웹앱을 중간에 둡니다.

1. Google Sheet에서 `확장 프로그램 > Apps Script`를 엽니다.
2. [comments-webapp.gs](/Users/jingwook/Documents/Codex/2026-05-13/ewp-pt-reviewer-users-jingwook-codex/ewp-map/scripts/comments-webapp.gs)의 내용을 붙입니다.
3. 웹앱으로 배포하고 실행 사용자는 본인, 액세스 권한은 링크가 있는 사용자로 둡니다.
4. 배포 URL을 `config.js`의 `commentsEndpoint`에 넣습니다.

## Google Sheets SSOT

정규화 Google Sheet:
`https://docs.google.com/spreadsheets/d/1eAT3-cYS2XXOD3aAHTsWQLescAl8OzhR0u-SCeJ6nOA`

브라우저에서 Google Sheet를 직접 읽으려면 시트가 접근 가능해야 합니다. 스터디원 배포용이면 Google Sheets에서 `파일 > 공유 > 웹에 게시`를 설정하거나 공개 접근 범위를 맞춘 뒤, `config.js`의 `googleSheetId`에 스프레드시트 ID를 넣습니다.

공유 링크에 `resourcekey=...`가 붙어 있으면 그 값을 `googleSheetResourceKey`에 넣습니다. resource key가 필요한 시트는 ID만으로는 익명 브라우저에서 읽히지 않습니다.

`fallbackOnSheetError`를 `false`로 두면 시트를 못 읽을 때 화면에 데이터 오류가 납니다. 이게 SSOT 관점에서는 맞습니다. `true`로 바꾸면 시트 오류 시 로컬 CSV로 후퇴하지만, 그 순간부터 시트가 단일 원천이라는 보장이 깨집니다.

## 데이터 기준

내용은 Notion `발전소별 원리·구조·생명주기 총정리` 하위 페이지의 `동서발전 현황·실증` 섹션을 사업소/사업지 기준으로 재배열한 것입니다. 지도 좌표는 도시·사업지 근처의 표시용 좌표이며, 정밀 측량 좌표가 아닙니다.
