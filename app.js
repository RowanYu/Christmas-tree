import { ParticleTree } from './scene.js';
import { advancePinch, classifyHand, trackHandMotion } from './gestures.js';

const canvas = document.querySelector('#tree');
const video = document.querySelector('#camera');
const cameraPreview = document.querySelector('#cameraPreview');
const cameraButton = document.querySelector('#cameraButton');
const buttonText = document.querySelector('#buttonText');
const statusTitle = document.querySelector('#statusTitle');
const statusText = document.querySelector('#statusText');
const cameraDot = document.querySelector('#cameraDot');
const photoDialog = document.querySelector('#photoDialog');
const photoImage = document.querySelector('#photoImage');
const photoCaption = document.querySelector('#photoCaption');
const albumDialog = document.querySelector('#albumDialog');
const albumGrid = document.querySelector('#albumGrid');
const albumEmpty = document.querySelector('#albumEmpty');
const albumMessage = document.querySelector('#albumMessage');
const photoFiles = document.querySelector('#photoFiles');
const albumCount = document.querySelector('#albumCount');
const albumPhotoCount = document.querySelector('#albumPhotoCount');
const photos = [
  { src: './photos/winter-lights.svg', caption: '冬夜里，灯火为我们亮起' },
  { src: './photos/gingerbread.svg', caption: '一块姜饼，一整个冬天的甜' },
  { src: './photos/snowy-window.svg', caption: '雪落窗前，圣诞刚刚好' },
];
const memoryDBName = 'christmas-tree-memory-album';
const memoryStoreName = 'photos';
let memoryDB = null;
let memoryRecords = [];
let memoryReady = Promise.resolve();
const memoryObjectUrls = new Map();

const tree = new ParticleTree(canvas);
let stream = null;
let hands = null;
let tracking = false;
let lastVideoTime = -1;
let animationFrame = 0;
let pinchFrames = 0;
let photoPinchActive = false;
let swipeCoolingUntil = 0;
let swipeScatterUntil = 0;
const handTrail = [];

function setStatus(title, detail, live = false) {
  statusTitle.textContent = title;
  statusText.textContent = detail;
  cameraDot.classList.toggle('live', live);
}

function toast(message) {
  const box = document.querySelector('#toast');
  box.textContent = message;
  box.classList.add('show');
  clearTimeout(toast.timeout);
  toast.timeout = setTimeout(() => box.classList.remove('show'), 1800);
}

function photoUrl(photo) {
  if (photo.src) return photo.src;
  if (!memoryObjectUrls.has(photo.id)) memoryObjectUrls.set(photo.id, URL.createObjectURL(photo.blob));
  return memoryObjectUrls.get(photo.id);
}

function showPhoto(photo) {
  if (albumDialog.open) albumDialog.close();
  photoImage.src = photoUrl(photo);
  photoCaption.textContent = photo.caption || photo.name || '一张圣诞回忆';
  if (!photoDialog.open) photoDialog.showModal();
}

function showRandomPhoto() {
  const collection = [...photos, ...memoryRecords];
  showPhoto(collection[Math.floor(Math.random() * collection.length)]);
}

function openMemoryDB() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) { reject(new Error('此浏览器不支持本地照片保存')); return; }
    const request = indexedDB.open(memoryDBName, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(memoryStoreName)) {
        request.result.createObjectStore(memoryStoreName, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('无法打开本地相册'));
  });
}

function storeMemory(record) {
  return new Promise((resolve, reject) => {
    const transaction = memoryDB.transaction(memoryStoreName, 'readwrite');
    transaction.objectStore(memoryStoreName).put(record);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error || new Error('照片保存失败'));
  });
}

function removeMemory(id) {
  return new Promise((resolve, reject) => {
    const transaction = memoryDB.transaction(memoryStoreName, 'readwrite');
    transaction.objectStore(memoryStoreName).delete(id);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error || new Error('照片删除失败'));
  });
}

function updateAlbumCount() {
  albumCount.textContent = String(memoryRecords.length);
  albumPhotoCount.textContent = `${memoryRecords.length} 张照片`;
}

function renderAlbum() {
  albumGrid.replaceChildren();
  albumEmpty.hidden = memoryRecords.length > 0;
  for (const photo of memoryRecords) {
    const tile = document.createElement('article');
    tile.className = 'album-tile';
    const preview = document.createElement('button');
    preview.className = 'memory-preview';
    preview.type = 'button';
    preview.setAttribute('aria-label', `打开照片：${photo.name || '圣诞回忆'}`);
    const img = document.createElement('img');
    img.src = photoUrl(photo);
    img.alt = photo.name || '已保存的圣诞照片';
    img.addEventListener('error', () => { img.alt = '图片无法显示'; tile.classList.add('image-error'); }, { once: true });
    preview.append(img);
    preview.addEventListener('click', () => showPhoto(photo));
    const remove = document.createElement('button');
    remove.className = 'memory-delete';
    remove.type = 'button';
    remove.setAttribute('aria-label', `删除照片：${photo.name || '圣诞回忆'}`);
    remove.textContent = '×';
    remove.addEventListener('click', async () => {
      try {
        if (memoryDB) await removeMemory(photo.id);
        memoryRecords = memoryRecords.filter(item => item.id !== photo.id);
        URL.revokeObjectURL(memoryObjectUrls.get(photo.id));
        memoryObjectUrls.delete(photo.id);
        albumMessage.textContent = '照片已删除';
        renderAlbum();
      } catch (error) { albumMessage.textContent = error.message; }
    });
    tile.append(preview, remove);
    albumGrid.append(tile);
  }
  updateAlbumCount();
}

async function loadMemories() {
  try {
    memoryDB = await openMemoryDB();
    memoryRecords = await new Promise((resolve, reject) => {
      const request = memoryDB.transaction(memoryStoreName, 'readonly').objectStore(memoryStoreName).getAll();
      request.onsuccess = () => resolve(request.result.sort((a, b) => b.addedAt - a.addedAt));
      request.onerror = () => reject(request.error || new Error('无法读取本地照片'));
    });
  } catch (error) {
    console.warn('IndexedDB unavailable; the album will only last for this page session.', error);
    albumMessage.textContent = '本地持久化不可用：本次浏览期间可使用相册';
  }
  renderAlbum();
}

async function addMemoryFiles(fileList) {
  await memoryReady;
  const files = Array.from(fileList || []);
  let added = 0;
  for (const file of files) {
    if (!file.type.startsWith('image/')) { albumMessage.textContent = '只支持图片文件'; continue; }
    if (file.size > 20 * 1024 * 1024) { albumMessage.textContent = `${file.name} 超过 20 MB，已跳过`; continue; }
    const record = { id: `${Date.now()}-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`, name: file.name, caption: file.name.replace(/\.[^.]+$/, ''), blob: file, addedAt: Date.now() };
    try {
      if (memoryDB) await storeMemory(record);
      memoryRecords.unshift(record);
      added++;
    } catch (error) { albumMessage.textContent = `保存失败：${error.message}`; }
  }
  if (added) albumMessage.textContent = memoryDB ? `已保存 ${added} 张照片` : `已添加 ${added} 张（仅在本次页面打开期间保留）`;
  renderAlbum();
  photoFiles.value = '';
}

function detectSwipe(points, gesture) {
  const now = performance.now();
  const motion = trackHandMotion(points, gesture, handTrail, now);
  if (now >= swipeCoolingUntil && motion.swiped) {
    const direction = motion.direction;
    tree.swipe(direction);
    swipeCoolingUntil = now + 950;
    swipeScatterUntil = now + 1350;
    handTrail.length = 0;
    toast(direction > 0 ? '向右挥手 · 星树随之转动' : '向左挥手 · 星树随之转动');
    return motion;
  }
  return { ...motion, swiped: false };
}

function handleResults(results) {
  const points = results.multiHandLandmarks?.[0];
  if (!points) {
    const pinch = advancePinch(photoPinchActive, pinchFrames, false, true);
    const wasShowingPhoto = pinch.released;
    photoPinchActive = false;
    pinchFrames = pinch.frames;
    handTrail.length = 0;
    if (wasShowingPhoto) {
      if (photoDialog.open) photoDialog.close();
      tree.setMode('scatter');
      swipeScatterUntil = 0;
      setStatus('照片已收起 · 星尘散开', '再次张开手掌或握拳，继续与圣诞树互动', true);
    }
    return;
  }
  const detectedGesture = classifyHand(points, photoPinchActive);
  const motion = detectSwipe(points, detectedGesture);
  const now = performance.now();
  const swipeLocked = now < swipeScatterUntil;
  const previousPinchActive = photoPinchActive;
  const pinch = advancePinch(photoPinchActive, pinchFrames, detectedGesture === 'pinch',
    motion.fastHorizontal || motion.horizontalIntent || motion.swiped || swipeLocked || detectedGesture === 'fist');

  if (motion.swiped) {
    photoPinchActive = false;
    pinchFrames = 0;
    if (photoDialog.open) photoDialog.close();
    tree.setMode('scatter');
    setStatus('星尘正随挥手旋转', '圣诞树正在按挥手方向转动', true);
    return;
  }

  if (previousPinchActive && pinch.released) {
    photoPinchActive = false;
    pinchFrames = 0;
    if (photoDialog.open) photoDialog.close();
    tree.setMode('scatter');
    setStatus('照片已收起 · 星尘散开', '握拳可让圣诞树重新聚拢', true);
    // A fist on the release frame dismisses the photo first; the next fist frame may gather the tree.
    return;
  }

  if (detectedGesture === 'fist') {
    pinchFrames = 0;
    photoPinchActive = false;
    if (photoDialog.open) photoDialog.close();
    tree.setMode('tree');
    setStatus('圣诞树已回到身边', '张开手掌散开 · 捏合查看回忆照片', true);
    return;
  }

  if (swipeLocked) {
    pinchFrames = 0;
    photoPinchActive = false;
    if (photoDialog.open) photoDialog.close();
    tree.setMode('scatter');
    setStatus('星尘正随挥手旋转', '圣诞树正在按挥手方向转动', true);
    return;
  }

  if (motion.fastHorizontal || motion.horizontalIntent) {
    pinchFrames = 0;
    if (photoDialog.open) photoDialog.close();
    tree.setMode('scatter');
    setStatus('挥手优先识别', '横向移动时不会触发照片；静止捏合再试', true);
    return;
  }

  photoPinchActive = pinch.active;
  pinchFrames = pinch.frames;
  if (detectedGesture === 'pinch') {
    if (pinch.entered) showRandomPhoto();
    if (photoPinchActive) {
      setStatus('照片正在展示', '松开捏合会收起照片并散开粒子', true);
    } else {
      setStatus('检测到捏合', '保持一下即可打开回忆照片', true);
    }
    return;
  }

  pinchFrames = 0;
  if (detectedGesture === 'open') {
    tree.setMode('scatter');
    setStatus('星尘正在飞舞', '握拳，让粒子重新聚成圣诞树', true);
  }
}

function updateCountdown() {
  const today = new Date();
  let christmas = new Date(today.getFullYear(), 11, 25);
  if (today >= christmas) christmas = new Date(today.getFullYear() + 1, 11, 25);
  const days = Math.ceil((christmas - today) / 86400000);
  document.querySelector('#countdown b').textContent = `${days} 天`;
}

async function loadScript(src) {
  if (document.querySelector(`script[data-dynamic-src="${src}"]`)) return;
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.dataset.dynamicSrc = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`无法加载本地手势库：${src}`));
    document.head.append(script);
  });
}

async function stopCamera() {
  tracking = false;
  cancelAnimationFrame(animationFrame);
  if (photoDialog.open) photoDialog.close();
  if (photoPinchActive) tree.setMode('scatter');
  swipeScatterUntil = 0;
  if (hands) {
    try { await hands.close(); } catch {}
    hands = null;
  }
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
  video.srcObject = null;
  cameraPreview.hidden = true;
  cameraButton.disabled = false;
  buttonText.textContent = '开启摄像头';
  photoPinchActive = false;
  pinchFrames = 0;
  handTrail.length = 0;
  setStatus('摄像头已关闭', '点击开启摄像头，开始手势互动');
}

async function startCamera() {
  cameraButton.disabled = true;
  setStatus('正在连接摄像头', '请在浏览器提示中允许摄像头访问');
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('当前页面不支持摄像头访问。请通过 localhost 或 HTTPS 打开。');
    }
    // Request permission directly from the user's button click.
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
    video.srcObject = stream;
    await video.play();
    cameraPreview.hidden = false;
    await loadScript('./upstream/mediapipe/control_utils/control_utils.js');
    if (!window.Hands) throw new Error('MediaPipe Hands 本地模块未能启动。');
    hands = new window.Hands({ locateFile: file => new URL(`./upstream/mediapipe/hands/${file}`, import.meta.url).href });
    hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.58, minTrackingConfidence: 0.55 });
    hands.onResults(handleResults);
    tracking = true;
    cameraButton.disabled = false;
    buttonText.textContent = '关闭摄像头';
    setStatus('摄像头已就绪', '张开手掌散开 · 握拳聚拢 · 捏合看照片', true);
    const onTrackEnded = () => { if (tracking) stopCamera(); };
    stream.getTracks().forEach(track => track.addEventListener('ended', onTrackEnded, { once: true }));
    const loop = async () => {
      if (!tracking) return;
      if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        try { await hands.send({ image: video }); }
        catch (error) { console.error('MediaPipe processing failed', error); }
      }
      if (tracking) animationFrame = requestAnimationFrame(loop);
    };
    animationFrame = requestAnimationFrame(loop);
  } catch (error) {
    console.error(error);
    await stopCamera();
    const message = error?.name === 'NotAllowedError'
      ? '摄像头权限被拒绝。请在浏览器地址栏设置中允许后重试。'
      : error?.name === 'NotFoundError'
        ? '没有找到可用的摄像头设备。'
        : error?.message || '摄像头启动失败，请检查设备或浏览器设置。';
    setStatus('无法启动摄像头', message);
    toast(message);
  }
}

cameraButton.addEventListener('click', () => tracking ? stopCamera() : startCamera());
document.querySelector('#albumButton').addEventListener('click', () => {
  albumMessage.textContent = '';
  renderAlbum();
  albumDialog.showModal();
});
document.querySelector('#closeAlbum').addEventListener('click', () => albumDialog.close());
document.querySelector('#addPhotosButton').addEventListener('click', () => photoFiles.click());
photoFiles.addEventListener('change', () => addMemoryFiles(photoFiles.files));
document.querySelector('#closePhoto').addEventListener('click', () => photoDialog.close());
photoDialog.addEventListener('click', event => { if (event.target === photoDialog) photoDialog.close(); });
window.addEventListener('pagehide', () => {
  tracking = false;
  stream?.getTracks().forEach(track => track.stop());
  hands?.close();
  for (const url of memoryObjectUrls.values()) URL.revokeObjectURL(url);
});

updateCountdown();
setInterval(updateCountdown, 60 * 60 * 1000);
memoryReady = loadMemories();
