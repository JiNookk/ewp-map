# 데이터 시트 구조

앱의 SSOT는 정규화된 탭형 시트입니다. 로컬 개발용으로 같은 구조의 CSV를 이 폴더에 두었습니다.

## 기준 테이블

- `power_sources.csv`: 발전원/분류 기준입니다. 필터명, 태그명, 색상을 한 곳에서 관리합니다.
- `statuses.csv`: 운영 상태 기준입니다. 상태 필터명, 배지명, 색상, 예정성 여부를 한 곳에서 관리합니다.
- `asset_subtypes.csv`: 발전원 아래 자산 하위 유형 기준입니다. 수상태양광, 지붕태양광, 영농형, BIPV, 육상풍력, BESS 같은 값은 여기에서 관리합니다.

## 업무 데이터 테이블

- `sites_normalized.csv`: 사업소/사업지 자체 정보입니다.
- `site_power_sources.csv`: 사업소와 발전원/분류를 연결하는 다대다 관계 테이블입니다.
- `site_assets.csv`: 사업소별 발전원, 설비, 실증, 전환 항목입니다. 용량과 일정은 `capacity_value`, `capacity_unit`, `schedule_text`에 구조화하고, 하위 유형은 `asset_subtype_id`에 둡니다.
- `interview_points.csv`: 면접 답변 포인트입니다.
- `source_links.csv`: Notion 근거 페이지 링크입니다.
- `comments.csv`: 스터디원 댓글, 수정 제안, 누락 제보, 근거 링크입니다.
- `schema_normalized.csv`: 편집 기준 설명입니다. 앱은 읽지 않고, 시트 편집자가 참고합니다.

## 연결 방식

- `sites_normalized.site_id`가 사업소 기본 키입니다.
- `site_power_sources.site_id`, `site_assets.site_id`, `interview_points.site_id`, `source_links.site_id`가 사업소를 참조합니다.
- `comments.site_id`도 사업소를 참조합니다.
- `sites_normalized.primary_power_source_id`, `site_power_sources.power_source_id`, `site_assets.power_source_id`는 `power_sources.power_source_id`를 참조합니다.
- `site_assets.asset_subtype_id`는 선택값이며, 값이 있으면 `asset_subtypes.asset_subtype_id`를 참조합니다.
- `sites_normalized.site_status_id`, `site_assets.status_id`는 `statuses.status_id`를 참조합니다.

## 수정 원칙

- 발전원 이름이나 색상은 `power_sources`에서 한 번만 고칩니다.
- `power_sources`에는 석탄, LNG, 수소, 암모니아, 태양광, 풍력, 바이오매스, 소수력 같은 발전원만 둡니다. 수상태양광, 지붕태양광, 영농형, BIPV는 발전원이 아니라 `asset_subtypes`입니다.
- 현재 `thermal` 키는 화면에서 `석탄`으로 표시합니다. 기존 참조키 호환 때문에 ID는 유지하지만, 의미는 일반 화력이 아니라 석탄·유동층 석탄입니다.
- 수소와 암모니아는 `power_sources`에서 별도 행으로 관리합니다. 수소혼소·연료전지는 `hydrogen`, 암모니아 혼소는 `ammonia`를 씁니다.
- 상태 이름이나 색상은 `statuses`에서 한 번만 고칩니다.
- 사업소에 필터 분류를 추가하려면 `site_power_sources`에 행을 추가합니다.
- 사업소별 설비·실증 내용을 바꾸려면 `site_assets`를 수정합니다. 용량은 본문에만 쓰지 말고 `capacity_value`와 `capacity_unit`에도 넣습니다.
- 같은 태양광 안에서 수상태양광, 지붕태양광, 영농형, BIPV를 구분하려면 `site_assets.asset_subtype_id`만 바꿉니다.
- 일정은 `schedule_text`에 넣습니다. 여러 일정은 `|`로 구분합니다.
- 스터디원 댓글은 `comments` 탭에 쌓입니다. 앱에서 댓글을 쓰려면 `ewp-map/scripts/comments-webapp.gs`를 Apps Script 웹앱으로 배포하고 `config.js`의 `commentsEndpoint`에 URL을 넣어야 합니다.
- `power_source_id`, `status_id`, `site_id`에 오타가 있으면 앱이 데이터 오류를 냅니다. 조용히 무시하면 SSOT가 깨지기 때문입니다.

## Google Sheets로 쓰는 법

정규화 Google Sheet의 탭 이름은 앱 기본값과 같아야 합니다:

`power_sources`, `statuses`, `asset_subtypes`, `sites`, `site_power_sources`, `site_assets`, `interview_points`, `source_links`, `comments`

탭 이름을 바꾸려면 `ewp-map/config.js`의 `sheetNames`도 같이 바꿉니다.
