# ImgEdit - 로컬 이미지 에디터

로컬 폴더의 이미지를 웹 브라우저에서 편집할 수 있는 이미지 에디터입니다.

## 기술 스택

| 구분 | 기술 |
|------|------|
| Backend | Python 3.11+, FastAPI, Pillow |
| Frontend | Vanilla JS, Canvas API |
| 통신 | REST API (JSON) |

## 실행 방법 (Windows)

### 간편 실행 (권장)
```
start.bat 더블클릭
```
- Python 미설치 시 자동 설치 (winget 또는 공식 인스톨러)
- 가상환경 자동 생성 및 패키지 설치 (최초 1회)
- 서버 시작 후 브라우저 자동 오픈

### 서버 종료
```
stop.bat 더블클릭
```

### 수동 실행
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

## 주요 기능

- 디렉토리 트리 탐색기 (좌측 사이드바)
- 썸네일 갤러리 뷰
- Canvas 기반 이미지 에디터
  - 클릭/휠 줌 (커서 위치 기준)
  - 회전, 좌우/상하 반전
  - 밝기, 대비, 채도, 색온도
  - 선명도, 블러, 비네팅, 흑백
  - 자르기 (Crop)
  - 실행 취소 (Ctrl+Z, 최대 10단계)
- 편집 결과 저장 (원본 덮어쓰기 / 별도 저장)

## 프로젝트 구조

```
personal_proj/
├── start.bat            # Windows 실행 스크립트
├── stop.bat             # 서버 종료 스크립트
├── backend/
│   ├── main.py          # FastAPI 앱
│   ├── routers/
│   │   ├── images.py    # 이미지 목록/조회/탐색 API
│   │   └── editor.py    # 이미지 편집 API (Pillow)
│   └── requirements.txt
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── app.js
└── docs/
    └── api.md
```

## API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/images?folder={path}` | 폴더 내 이미지 목록 |
| GET | `/api/images/{id}` | 이미지 원본 반환 |
| GET | `/api/images/{id}/thumbnail` | 썸네일 반환 |
| POST | `/api/editor/rotate` | 이미지 회전 |
| POST | `/api/editor/crop` | 이미지 자르기 |
| POST | `/api/editor/adjust` | 밝기/대비 조절 |
| POST | `/api/editor/resize` | 리사이즈 |
| POST | `/api/editor/save` | 편집 결과 저장 |

## 개발 이력

| 날짜 | 내용 |
|------|------|
| 2026-04-03 | 프로젝트 초기 설정, 구조 설계 |
