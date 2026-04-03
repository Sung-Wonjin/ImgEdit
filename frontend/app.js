// ── 상태 ────────────────────────────────────────────────
const state = {
  images: [],
  currentImage: null,
  originalImg: null,
  rotation: 0,
  flipH: false,
  flipV: false,
  brightness: 1.0,
  contrast: 1.0,
  saturation: 1.0,
  warmth: 0,
  sharpness: 0,
  blur: 0,
  vignette: 0,
  grayscale: 0,
  cropMode: false,
  cropRect: null,
  dragStart: null,
  // 줌
  zoom: 1.0,
  zoomOrigin: { x: 0, y: 0 },
  // 실행취소 스택 (originalImg 스냅샷)
  undoStack: [],
}

const DEFAULTS = {
  brightness: { value: 100, stateKey: 'brightness', divisor: 100 },
  contrast:   { value: 100, stateKey: 'contrast',   divisor: 100 },
  saturation: { value: 100, stateKey: 'saturation', divisor: 100 },
  warmth:     { value: 0,   stateKey: 'warmth',     divisor: 1   },
  sharpness:  { value: 0,   stateKey: 'sharpness',  divisor: 1   },
  blur:       { value: 0,   stateKey: 'blur',       divisor: 1   },
  vignette:   { value: 0,   stateKey: 'vignette',   divisor: 1   },
  grayscale:  { value: 0,   stateKey: 'grayscale',  divisor: 100 },
}

// ── DOM 참조 ─────────────────────────────────────────────
const $ = (id) => document.getElementById(id)

const treeSidebar    = $('tree-sidebar')
const treeRoot       = $('tree-root')
const folderInput    = $('folder-input')        // 사이드바 내 입력
const browseBtn      = $('browse-btn')
const folderError    = $('folder-error')
const folderInputInit = $('folder-input-init')  // 초기 화면 입력
const browseBtnInit  = $('browse-btn-init')
const folderErrorInit = $('folder-error-init')
const loadBtn        = $('load-btn')
const initialSection = $('initial-section')
const gallerySection = $('gallery-section')
const galleryEmpty   = $('gallery-empty')
const galleryGrid    = $('gallery-grid')
const galleryPath    = $('gallery-path')
const loadBtnGallery = $('load-btn-gallery')
const editorSection  = $('editor-section')
const editorFilename = $('editor-filename')
const backBtn        = $('back-btn')
const canvas         = $('editor-canvas')
const ctx            = canvas.getContext('2d')
const canvasSpinner  = $('canvas-spinner')
const cropToggle     = $('crop-toggle')
const cropApply      = $('crop-apply')
const undoBtn        = $('undo-btn')
const resetBtn       = $('reset-btn')
const saveBtn        = $('save-btn')
const overwriteBtn   = $('overwrite-btn')
const saveMsg        = $('save-msg')

// ── 디렉토리 트리 탐색기 ─────────────────────────────────
let selectedRow = null

async function startBrowse(path) {
  treeRoot.innerHTML = ''
  treeSidebar.classList.remove('hidden')
  folderInput.value = path
  folderError.classList.add('hidden')
  await loadTreeNode(treeRoot, path, true)
}

browseBtn.addEventListener('click', () => startBrowse(folderInput.value.trim() || '/'))
folderInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') startBrowse(folderInput.value.trim() || '/') })

browseBtnInit.addEventListener('click', () => startBrowse(folderInputInit.value.trim() || '/'))
folderInputInit.addEventListener('keydown', (e) => { if (e.key === 'Enter') startBrowse(folderInputInit.value.trim() || '/') })

async function fetchBrowse(folder) {
  const res = await fetch(`/api/images/browse?folder=${encodeURIComponent(folder)}`)
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.detail || '탐색 실패')
  }
  return res.json()
}

// API 1회 호출 → 현재 폴더 노드 + 자식 폴더 stub 노드 즉시 생성
// 자식 stub은 클릭 시에만 API 호출 (완전 lazy)
async function loadTreeNode(container, path, autoOpen = false) {
  let data
  try {
    data = await fetchBrowse(path)
  } catch (e) {
    folderError.textContent = e.message
    folderError.classList.remove('hidden')
    return
  }

  renderTreeNode(container, data, autoOpen)
}

function makeRow(name, fullPath, hasChildren, imageCount) {
  const row = document.createElement('div')
  row.className = 'tree-row'

  const toggle = document.createElement('span')
  toggle.className = 'tree-toggle'
  toggle.textContent = hasChildren ? '▶' : ''

  const icon = document.createElement('span')
  icon.className = 'tree-icon'
  icon.textContent = '📁'

  const label = document.createElement('span')
  label.className = 'tree-label'
  label.textContent = name
  label.title = fullPath

  const count = document.createElement('span')
  count.className = 'tree-count'
  if (imageCount > 0) count.textContent = imageCount

  row.append(toggle, icon, label, count)
  return { row, toggle, icon }
}

function renderTreeNode(container, data, autoOpen = false) {
  const name = data.breadcrumbs.at(-1)?.name || data.current
  const hasChildren = data.dirs.length > 0
  const { row, toggle, icon } = makeRow(name, data.current, hasChildren, data.image_count)

  const children = document.createElement('div')
  children.className = 'tree-children'

  const node = document.createElement('div')
  node.className = 'tree-node'
  node.append(row, children)
  container.appendChild(node)

  let childrenLoaded = false

  const openNode = async () => {
    if (!childrenLoaded) {
      childrenLoaded = true
      // 스피너 표시
      toggle.textContent = ''
      const spinner = document.createElement('div')
      spinner.className = 'tree-spinner'
      row.insertBefore(spinner, icon)

      // 자식 stub 즉시 생성 (API 호출 없음)
      data.dirs.forEach((dir) => createStubNode(children, dir.name, dir.path))

      // 스피너 제거
      row.removeChild(spinner)
      toggle.textContent = '▶'
    }
    children.classList.add('open')
    toggle.classList.add('open')
    icon.textContent = '📂'
  }

  const closeNode = () => {
    children.classList.remove('open')
    toggle.classList.remove('open')
    icon.textContent = '📁'
  }

  row.addEventListener('click', async () => {
    if (selectedRow) selectedRow.classList.remove('selected')
    selectedRow = row
    row.classList.add('selected')
    folderInput.value = data.current

    if (data.image_count > 0) renderGalleryFromBrowse(data)

    if (!hasChildren) return
    if (children.classList.contains('open')) {
      closeNode()
    } else {
      await openNode()
    }
  })

  if (autoOpen) {
    if (data.image_count > 0) renderGalleryFromBrowse(data)
    if (hasChildren) openNode()
  }
}

// stub 노드: 클릭 전까지 API 호출 안 함
function createStubNode(container, name, path) {
  const { row, toggle, icon } = makeRow(name, path, true, 0)

  const children = document.createElement('div')
  children.className = 'tree-children'

  const node = document.createElement('div')
  node.className = 'tree-node'
  node.append(row, children)
  container.appendChild(node)

  let loaded = false

  // 클릭 시 API 호출 → 데이터 로드 → 자식 stub 생성
  const expand = async () => {
    if (!loaded) {
      loaded = true
      toggle.textContent = ''
      const spinner = document.createElement('div')
      spinner.className = 'tree-spinner'
      row.insertBefore(spinner, icon)

      let data
      try {
        data = await fetchBrowse(path)
      } catch (e) {
        folderError.textContent = e.message
        folderError.classList.remove('hidden')
        row.removeChild(spinner)
        toggle.textContent = '▶'
        loaded = false
        return
      }

      // 이미지 수 업데이트 후 갤러리 바로 렌더링
      const countEl = row.querySelector('.tree-count')
      if (data.image_count > 0) {
        countEl.textContent = data.image_count
        renderGalleryFromBrowse(data)
      }

      // 자식 stub 생성
      data.dirs.forEach((dir) => createStubNode(children, dir.name, dir.path))

      row.removeChild(spinner)
      toggle.textContent = data.dirs.length > 0 ? '▶' : ''
    }

    children.classList.add('open')
    toggle.classList.add('open')
    icon.textContent = '📂'
  }

  const collapse = () => {
    children.classList.remove('open')
    toggle.classList.remove('open')
    icon.textContent = '📁'
  }

  row.addEventListener('click', async () => {
    if (selectedRow) selectedRow.classList.remove('selected')
    selectedRow = row
    row.classList.add('selected')
    folderInput.value = path

    if (children.classList.contains('open')) {
      collapse()
    } else {
      await expand()
    }
  })
}

// ── 갤러리 ───────────────────────────────────────────────
loadBtn.addEventListener('click', () => loadFolder(folderInputInit.value.trim()))
loadBtnGallery.addEventListener('click', () => loadFolder(folderInput.value.trim()))

async function loadFolder(folder) {
  folder = folder || folderInput.value.trim()
  if (!folder) return
  folderError.classList.add('hidden')
  try {
    const res = await fetch(`/api/images?folder=${encodeURIComponent(folder)}`)
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.detail || '불러오기 실패')
    }
    const data = await res.json()
    folderInput.value = folder
    state.images = data.images
    renderGallery(folder)
  } catch (e) {
    folderError.textContent = e.message
    folderError.classList.remove('hidden')
  }
}

function renderGallery(folder) {
  initialSection.classList.add('hidden')
  editorSection.classList.add('hidden')
  gallerySection.classList.remove('hidden')
  galleryPath.textContent = folder || folderInput.value
  galleryGrid.innerHTML = ''
  if (state.images.length === 0) {
    galleryEmpty.classList.remove('hidden')
    return
  }
  galleryEmpty.classList.add('hidden')
  state.images.forEach((img) => {
    galleryGrid.appendChild(makeGalleryItem(img))
  })
}

function renderGalleryFromBrowse(data) {
  state.images = data.images
  folderInput.value = data.current
  initialSection.classList.add('hidden')
  editorSection.classList.add('hidden')
  gallerySection.classList.remove('hidden')
  galleryPath.textContent = data.current
  galleryGrid.innerHTML = ''
  if (data.images.length === 0) {
    galleryEmpty.classList.remove('hidden')
    return
  }
  galleryEmpty.classList.add('hidden')
  data.images.forEach((img) => {
    galleryGrid.appendChild(makeGalleryItem(img))
  })
}

function makeGalleryItem(img) {
  const item = document.createElement('div')
  item.className = 'gallery-item'
  item.innerHTML = `
    <img src="/api/images/${img.id}/thumbnail?size=200" alt="${img.filename}" loading="lazy" />
    <p>${img.filename}</p>
  `
  item.addEventListener('click', () => openEditor(img))
  return item
}

// ── 에디터 열기/닫기 ─────────────────────────────────────
function resetControls() {
  state.rotation   = 0
  state.flipH      = false
  state.flipV      = false
  state.brightness = 1.0
  state.contrast   = 1.0
  state.saturation = 1.0
  state.warmth     = 0
  state.sharpness  = 0
  state.blur       = 0
  state.vignette   = 0
  state.grayscale  = 0
  state.cropMode   = false
  state.cropRect   = null
  state.undoStack  = []
  resetZoom()

  $('brightness').value  = 100;  $('brightness-val').textContent  = 100
  $('contrast').value    = 100;  $('contrast-val').textContent    = 100
  $('saturation').value  = 100;  $('saturation-val').textContent  = 100
  $('warmth').value      = 0;    $('warmth-val').textContent      = 0
  $('sharpness').value   = 0;    $('sharpness-val').textContent   = 0
  $('blur').value        = 0;    $('blur-val').textContent        = 0
  $('vignette').value    = 0;    $('vignette-val').textContent    = 0
  $('grayscale').value   = 0;    $('grayscale-val').textContent   = 0
  cropToggle.textContent = '✂ 자르기 모드'
  cropToggle.classList.remove('active')
  cropApply.classList.add('hidden')
  canvas.classList.remove('crop-cursor')
  saveMsg.classList.add('hidden')
  undoBtn.disabled = true
}

function setLoading(isLoading) {
  if (isLoading) {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    canvas.width = 0
    canvas.height = 0
    canvasSpinner.classList.remove('hidden')
  } else {
    canvasSpinner.classList.add('hidden')
  }
}

function openEditor(img) {
  state.currentImage = img
  resetControls()
  editorFilename.textContent = img.filename
  initialSection.classList.add('hidden')
  gallerySection.classList.add('hidden')
  editorSection.classList.remove('hidden')
  setLoading(true)

  const image = new Image()
  image.crossOrigin = 'anonymous'
  image.src = `/api/images/${img.id}`
  image.onload = () => {
    state.originalImg = image
    setLoading(false)
    renderCanvas()
  }
}

backBtn.addEventListener('click', () => {
  editorSection.classList.add('hidden')
  gallerySection.classList.remove('hidden')
})

// ── Canvas 렌더링 ────────────────────────────────────────
// 선명도: 언샤프 마스크 방식으로 오프스크린 캔버스에서 처리
function applySharpness(srcCanvas, amount) {
  if (amount === 0) return srcCanvas
  const w = srcCanvas.width
  const h = srcCanvas.height
  const off = document.createElement('canvas')
  off.width = w
  off.height = h
  const offCtx = off.getContext('2d')
  offCtx.drawImage(srcCanvas, 0, 0)

  const src = offCtx.getImageData(0, 0, w, h)
  const dst = offCtx.createImageData(w, h)
  const s = src.data
  const d = dst.data
  const str = amount * 0.3  // 강도 조절

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4
      for (let c = 0; c < 3; c++) {
        const lap =
          -s[i - w * 4 + c] +
          -s[i - 4 + c] + (4 + 4 * str) * s[i + c] - s[i + 4 + c] +
          -s[i + w * 4 + c]
        d[i + c] = Math.min(255, Math.max(0, lap / (1 + 4 * str)))
      }
      d[i + 3] = s[i + 3]
    }
  }
  offCtx.putImageData(dst, 0, 0)
  return off
}

function _renderCanvasImmediate() {
  const img = state.originalImg
  if (!img) return

  const rad = (state.rotation * Math.PI) / 180
  const sin = Math.abs(Math.sin(rad))
  const cos = Math.abs(Math.cos(rad))
  const w = Math.round(img.width * cos + img.height * sin)
  const h = Math.round(img.width * sin + img.height * cos)

  canvas.width = w
  canvas.height = h

  ctx.save()
  ctx.translate(w / 2, h / 2)
  ctx.rotate(rad)
  ctx.scale(state.flipH ? -1 : 1, state.flipV ? -1 : 1)

  // CSS filter: 밝기/대비/채도/블러/흑백
  ctx.filter = [
    `brightness(${state.brightness})`,
    `contrast(${state.contrast})`,
    `saturate(${state.saturation})`,
    state.blur > 0    ? `blur(${state.blur}px)` : '',
    state.grayscale > 0 ? `grayscale(${state.grayscale})` : '',
  ].filter(Boolean).join(' ')

  ctx.drawImage(img, -img.width / 2, -img.height / 2)
  ctx.restore()

  // 색온도 픽셀 처리
  if (state.warmth !== 0) applyWarmth(ctx, w, h, state.warmth)

  // 선명도
  if (state.sharpness > 0) {
    const sharpened = applySharpness(canvas, state.sharpness)
    ctx.clearRect(0, 0, w, h)
    ctx.drawImage(sharpened, 0, 0)
  }

  // 비네팅
  if (state.vignette > 0) applyVignette(ctx, w, h, state.vignette)

  // crop 영역 표시
  if (state.cropMode && state.cropRect) {
    const r = state.cropRect
    ctx.save()
    ctx.strokeStyle = '#e94560'
    ctx.lineWidth = 2
    ctx.setLineDash([6, 3])
    ctx.strokeRect(r.x, r.y, r.w, r.h)
    ctx.restore()
  }
}

function applyWarmth(ctx, w, h, warmth) {
  const imageData = ctx.getImageData(0, 0, w, h)
  const d = imageData.data
  const r = Math.round(warmth * 1.5)
  const b = Math.round(warmth * -1.5)
  for (let i = 0; i < d.length; i += 4) {
    d[i]     = Math.min(255, Math.max(0, d[i]     + r))
    d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + b))
  }
  ctx.putImageData(imageData, 0, 0)
}

function applyVignette(ctx, w, h, amount) {
  // amount: -100(밝은 비네팅) ~ 100(어두운 비네팅)
  const alpha = Math.abs(amount) / 100 * 0.85
  const color = amount > 0 ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha})`
  const grad = ctx.createRadialGradient(w/2, h/2, Math.min(w,h) * 0.25, w/2, h/2, Math.max(w,h) * 0.85)
  grad.addColorStop(0, 'rgba(0,0,0,0)')
  grad.addColorStop(1, color)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)
}

let _rafId = null

function renderCanvas() { _renderCanvasImmediate() }

// ── 줌 ───────────────────────────────────────────────────
function resetZoom() {
  state.zoom = 1.0
  canvas.style.transform = ''
  canvas.style.transformOrigin = ''
  canvas.classList.remove('zoomed')
}

function applyZoom(zoomLevel, originX, originY) {
  state.zoom = zoomLevel
  canvas.style.transformOrigin = `${originX}px ${originY}px`
  canvas.style.transform = `scale(${zoomLevel})`
  canvas.classList.toggle('zoomed', zoomLevel > 1)
}

canvas.addEventListener('click', (e) => {
  if (state.cropMode) return
  const rect = canvas.getBoundingClientRect()
  const ox = (e.clientX - rect.left) / state.zoom
  const oy = (e.clientY - rect.top)  / state.zoom
  if (state.zoom === 1.0) {
    applyZoom(2.5, ox, oy)
  } else {
    resetZoom()
  }
})

// 마우스 휠 줌
canvas.addEventListener('wheel', (e) => {
  if (state.cropMode) return
  e.preventDefault()
  const rect = canvas.getBoundingClientRect()
  const ox = (e.clientX - rect.left) / state.zoom
  const oy = (e.clientY - rect.top)  / state.zoom
  const delta = e.deltaY < 0 ? 0.25 : -0.25
  const next = Math.min(5, Math.max(1, state.zoom + delta))
  if (next === 1) resetZoom()
  else applyZoom(next, ox, oy)
}, { passive: false })

// ── 실행취소 ─────────────────────────────────────────────
function pushUndo() {
  // 현재 canvas 픽셀을 새 Image로 스냅샷
  const snap = new Image()
  snap.src = canvas.toDataURL()
  state.undoStack.push(snap)
  if (state.undoStack.length > 10) state.undoStack.shift()
  undoBtn.disabled = false
}

undoBtn.addEventListener('click', () => {
  if (state.undoStack.length === 0) return
  const snap = state.undoStack.pop()
  snap.onload = () => {
    state.originalImg = snap
    resetControls()
    renderCanvas()
  }
  if (snap.complete) {
    state.originalImg = snap
    resetControls()
    renderCanvas()
  }
  undoBtn.disabled = state.undoStack.length === 0
})

// Ctrl+Z 단축키
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    e.preventDefault()
    undoBtn.click()
  }
})

// ── 회전 / 뒤집기 ────────────────────────────────────────
$('rotate-left').addEventListener('click', () => {
  pushUndo()
  state.rotation = (state.rotation - 90 + 360) % 360
  renderCanvas()
})
$('rotate-right').addEventListener('click', () => {
  pushUndo()
  state.rotation = (state.rotation + 90) % 360
  renderCanvas()
})
$('flip-h').addEventListener('click', () => {
  pushUndo()
  state.flipH = !state.flipH
  renderCanvas()
})
$('flip-v').addEventListener('click', () => {
  pushUndo()
  state.flipV = !state.flipV
  renderCanvas()
})

// ── 슬라이더 공통 처리 ───────────────────────────────────
function bindSlider(id, stateKey, divisor) {
  const rangeEl = $(id)
  const valEl   = $(`${id}-val`)
  rangeEl.addEventListener('input', () => {
    state[stateKey] = rangeEl.value / divisor
    valEl.textContent = rangeEl.value
    // 선명도는 RAF 1프레임 디바운스, 나머지는 즉시
    if (id === 'sharpness') {
      if (_rafId) cancelAnimationFrame(_rafId)
      _rafId = requestAnimationFrame(() => { _rafId = null; _renderCanvasImmediate() })
    } else {
      _renderCanvasImmediate()
    }
  })
  rangeEl.addEventListener('dblclick', () => {
    const def = DEFAULTS[id]
    rangeEl.value     = def.value
    state[stateKey]   = def.value / divisor
    valEl.textContent = def.value
    _renderCanvasImmediate()
  })
}

bindSlider('brightness', 'brightness', 100)
bindSlider('contrast',   'contrast',   100)
bindSlider('saturation', 'saturation', 100)
bindSlider('warmth',     'warmth',     1)
bindSlider('sharpness',  'sharpness',  1)
bindSlider('blur',       'blur',       1)
bindSlider('vignette',   'vignette',   1)
bindSlider('grayscale',  'grayscale',  100)

// ── 자르기 ───────────────────────────────────────────────
cropToggle.addEventListener('click', () => {
  state.cropMode = !state.cropMode
  state.cropRect = null
  cropToggle.textContent = state.cropMode ? '자르기 취소' : '자르기 모드'
  cropToggle.classList.toggle('active', state.cropMode)
  cropApply.classList.add('hidden')
  canvas.classList.toggle('crop-cursor', state.cropMode)
  renderCanvas()
})

function getCanvasPos(e) {
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  }
}

canvas.addEventListener('mousedown', (e) => {
  if (!state.cropMode) return
  state.dragStart = getCanvasPos(e)
  state.cropRect = null
  cropApply.classList.add('hidden')
})
canvas.addEventListener('mousemove', (e) => {
  if (!state.cropMode || !state.dragStart) return
  const pos = getCanvasPos(e)
  state.cropRect = {
    x: Math.min(state.dragStart.x, pos.x),
    y: Math.min(state.dragStart.y, pos.y),
    w: Math.abs(pos.x - state.dragStart.x),
    h: Math.abs(pos.y - state.dragStart.y),
  }
  renderCanvas()
})
canvas.addEventListener('mouseup', () => {
  if (!state.cropMode) return
  state.dragStart = null
  if (state.cropRect && state.cropRect.w > 5 && state.cropRect.h > 5) {
    cropApply.classList.remove('hidden')
  }
})

cropApply.addEventListener('click', async () => {
  const r = state.cropRect
  if (!r) return
  pushUndo()
  const res = await fetch('/api/editor/crop', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_path: state.currentImage.path,
      x: Math.round(r.x),
      y: Math.round(r.y),
      width: Math.round(r.w),
      height: Math.round(r.h),
    }),
  })
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const img = new Image()
  img.onload = () => {
    state.originalImg = img
    state.cropRect = null
    state.cropMode = false
    cropToggle.textContent = '자르기 모드'
    cropToggle.classList.remove('active')
    cropApply.classList.add('hidden')
    canvas.classList.remove('crop-cursor')
    renderCanvas()
  }
  img.src = url
})

// ── 초기화 ───────────────────────────────────────────────
resetBtn.addEventListener('click', () => {
  resetControls()
  setLoading(true)
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.src = `/api/images/${state.currentImage.id}`
  img.onload = () => {
    state.originalImg = img
    setLoading(false)
    renderCanvas()
  }
})

// ── 저장 ─────────────────────────────────────────────────
async function saveImage(overwrite) {
  const dataUrl = canvas.toDataURL('image/jpeg', 0.95)
  const base64 = dataUrl.split(',')[1]
  saveMsg.classList.add('hidden')
  try {
    const res = await fetch('/api/editor/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_path: state.currentImage.path,
        image_data: base64,
        overwrite,
        output_path: '',
      }),
    })
    const data = await res.json()
    saveMsg.textContent = `저장 완료: ${data.saved_path}`
    saveMsg.classList.remove('hidden')
  } catch {
    saveMsg.textContent = '저장 실패'
    saveMsg.classList.remove('hidden')
  }
}

saveBtn.addEventListener('click', () => saveImage(false))
overwriteBtn.addEventListener('click', () => saveImage(true))
