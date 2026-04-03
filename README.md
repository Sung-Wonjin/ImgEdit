# ImgEdit - 로컬 이미지 에디터

로컬 폴더의 이미지를 웹 브라우저에서 편집할 수 있는 이미지 에디터입니다.

## 기술 스택

| 구분 | 기술 |
|------|------|
| Backend | Python 3.10+, FastAPI, Pillow |
| Frontend | React, Canvas API |
| 통신 | REST API (JSON) |

## 주요 기능

- 로컬 폴더 경로 입력 → 이미지 목록 불러오기
- 썸네일 갤러리 뷰
- Canvas 기반 이미지 에디터
  - 회전 (Rotate)
  - 자르기 (Crop)
  - 밝기 / 대비 조절
  - 리사이즈
- 편집 결과 저장 (원본 덮어쓰기 / 별도 저장)

## 프로젝트 구조

```
personal_proj/
├── backend/
│   ├── main.py              # FastAPI 앱 진입점
│   ├── routers/
│   │   ├── images.py        # 이미지 목록/조회 API
│   │   └── editor.py        # 이미지 편집 API (Pillow)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── FolderPicker.jsx   # 폴더 경로 입력
│   │   │   ├── ImageGallery.jsx   # 썸네일 갤러리
│   │   │   └── ImageEditor.jsx    # Canvas 에디터
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
└── docs/
    └── api.md               # API 명세
```

## 실행 방법

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# http://localhost:5173 접속
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
