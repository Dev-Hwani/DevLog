# Devlog

개발자를 위한 기술 블로그 웹 플랫폼입니다. Markdown 기반 글 작성/공유, 팔로우 피드, 태그·검색, 좋아요/북마크 등 Velog 핵심 기능을 풀스택으로 구현하고 있습니다.

- 개발 기간: 2026.01 ~ 현재 (개발 중)
- 형태: 웹 서비스 플랫폼 (프론트 + 백엔드 모노레포)
- 배포: 미배포 (로컬 안정화 후 배포 예정)

## Backend (Spring Boot / Java 17)

### 인증/인가
- JWT Access(24시간)/Refresh(14일) 쿠키 구조 + Refresh 토큰을 Redis에 저장(`refresh:{jti}`)
- OAuth2(Google/GitHub) 연동 구조 준비(환경변수 주입 방식)
- 왜: 쿠키 기반으로 보안/UX 균형을 맞추고, Redis로 Refresh 만료/폐기를 일원화

### 도메인/기능
- 글 CRUD + 공개/비공개 + 썸네일 업로드(10MB, JPG/PNG)
- 댓글 CRUD + 1-depth 대댓글
- 좋아요/북마크 반응, 팔로우/언팔로우
- 태그 등록/탐색, 검색(MySQL FULLTEXT)
- 팔로잉 피드/트렌딩 피드(커서 기반)
- 왜: DevLog 핵심 기능 범위를 기준으로 우선순위를 구성

### 프로필/목록
- 사용자 프로필 조회/수정/이미지 업데이트
- 팔로워/팔로잉 목록
- 좋아요한 글 목록 공개 조회
- 내가 본 글 목록 Redis ZSET 기반 기록/조회(로그인 사용자만)
- 왜: “테이블 추가 없이” 조회 기록을 저장하길 원해서 Redis로 처리

### Redis 활용
- Refresh 토큰 저장: `refresh:{jti}` 키로 TTL 저장 → 재발급/로그아웃 시 즉시 폐기 가능
- 조회 기록: ZSET `viewed:{userId}`에 articleId를 score(시간)로 저장 → 최근 조회 순서/페이징 처리
- 캐시:
  - 태그 목록: `cache:tags` (TTL 5분)
  - 트렌딩 피드: `cache:feed:trending:{cursor|first}:{size}` (TTL 1분, 비로그인 요청만)
  - 팔로잉 피드: `cache:feed:following:{userId}:{cursor|first}:{size}` (TTL 30초)
- 왜: DB 부하를 줄이고 응답 속도를 안정화(정합성은 TTL 내 eventually consistent)

### 성능/정합성
- 목록 응답에서 좋아요/북마크 상태를 배치 조회해 N+1을 줄임
- 피드/트렌딩은 커서 기반, 목록은 page/size 기반으로 분리
- 왜: 대량 목록 UX와 성능을 균형 있게 유지

### 운영/보안
- 에러 응답 스펙 통일(`message/code/errors`)
- 생성은 201 + Location, 수정/삭제는 204 규칙 적용
- CORS(프론트 URL 고정), CSRF는 로컬 기준 비활성화
- 레이트 리밋: `/api/auth` 30/min, 일반 API 300/min (Bucket4j)
- 왜: 최소 운영 안정성/보안 기준부터 확보

## Frontend (React)

### 라우팅/상태
- `react-router-dom` 기반 URL 구조 표준화: `page/size/sort/query/cursor`를 URL에 고정
- React Query로 서버 상태 캐싱/재시도/동기화
- 왜: 공유 가능한 링크 + 데이터 일관성 확보

### UI/UX 구성
- Velog 스타일의 미니멀 레이아웃, 라이트/다크 토글
- 검색/피드/태그/트렌딩/팔로잉/글 상세/에디터/프로필 페이지 구성
- 왜: 사용자의 탐색 흐름을 단순화

### 프로필
- 탭 기반 프로필: 글/좋아요/내가 본 글/팔로워/팔로잉
- 팔로워/팔로잉 리스트 UI
- 왜: 사용자 활동을 한 화면에서 이해 가능하게 구성

### 글/댓글/반응
- 댓글 작성/수정/삭제/대댓글 UX
- 좋아요/북마크 상태 반영 및 카운트 동기화

### 한국어 UX
- 빈 상태/에러/설명 메시지 한국어화(핵심 메시지 중심)
- 왜: 사용자 이해도를 빠르게 높이기 위해

## 사용 기술 스택 & 사용 이유

### Frontend
- React: SPA 구조 + 빠른 UI 구성
- React Router: URL 기반 화면 분리/공유
- React Query: 서버 상태 캐싱/동기화
- Axios: 공통 API 레이어 구현

### Backend
- Spring Boot: 빠른 API 개발/구성 표준화
- Spring Security: JWT/OAuth 인증 표준 구현
- JPA + Flyway: 모델링 + 스키마 버전 관리
- MySQL: 관계형 데이터 모델
- Redis: Refresh 토큰/조회 기록 저장
- Bucket4j: 레이트 리밋 기본 적용

## 수치 요약
- Access 24시간 / Refresh 14일
- 이미지 업로드 10MB, JPG/PNG
- 기본 페이지 사이즈 10
- 트렌딩 기준 24h
- 레이트 리밋: Auth 30/min, API 300/min
