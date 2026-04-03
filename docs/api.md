# API 명세

Base URL: `http://localhost:8000`

---

## Images API

### 이미지 목록 조회
```
GET /api/images?folder={폴더경로}
```
**Response**
```json
{
  "folder": "/path/to/folder",
  "images": [
    {
      "id": "uuid",
      "filename": "photo.jpg",
      "path": "/path/to/folder/photo.jpg",
      "width": 1920,
      "height": 1080,
      "size": 204800
    }
  ]
}
```

### 이미지 원본 반환
```
GET /api/images/{id}
```
**Response**: 이미지 파일 (image/jpeg, image/png 등)

### 썸네일 반환
```
GET /api/images/{id}/thumbnail?size=200
```
**Response**: 썸네일 이미지 파일

---

## Editor API

### 회전
```
POST /api/editor/rotate
```
**Body**
```json
{
  "image_path": "/path/to/image.jpg",
  "angle": 90
}
```

### 자르기
```
POST /api/editor/crop
```
**Body**
```json
{
  "image_path": "/path/to/image.jpg",
  "x": 100,
  "y": 100,
  "width": 500,
  "height": 400
}
```

### 밝기/대비 조절
```
POST /api/editor/adjust
```
**Body**
```json
{
  "image_path": "/path/to/image.jpg",
  "brightness": 1.2,
  "contrast": 1.1
}
```

### 리사이즈
```
POST /api/editor/resize
```
**Body**
```json
{
  "image_path": "/path/to/image.jpg",
  "width": 800,
  "height": 600
}
```

### 저장
```
POST /api/editor/save
```
**Body**
```json
{
  "image_path": "/path/to/image.jpg",
  "image_data": "base64_encoded_image",
  "overwrite": true,
  "output_path": "/path/to/output.jpg"
}
```
