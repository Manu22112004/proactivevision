// app.js — prototipo

const video = document.getElementById('cam');
const overlay = document.getElementById('overlay');
const canvasCtx = overlay.getContext('2d');
const effortVal = document.getElementById('effortVal');
const gazeVal = document.getElementById('gazeVal');
const reading = document.getElementById('reading');
const toggleCam = document.getElementById('toggleCam');
const forceEnlarge = document.getElementById('forceEnlarge');
const stopSpeech = document.getElementById('stopSpeech');
const localOnly = document.getElementById('localOnly');

let camVisible = true;
let lastGaze = {x:0,y:0};
let speechUtter = null;
let dwellTimer = null;
const DWELL_TIME = 600; // ms
const EFFORT_THRESHOLD = 0.6; // simulado

// Start camera
async function startCamera(){
  try {
    overlay.width = 320;
    overlay.height = 240;
    initFaceMesh();
  } catch (e) {
    alert('No se pudo acceder a la cámara: ' + e.message);
    console.error(e);
  }
}

// MediaPipe Face Mesh setup
function initFaceMesh(){
  const faceMesh = new FaceMesh({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/${file}`;
  }});
  faceMesh.setOptions({
    maxNumFaces:1,
    refineLandmarks:true,
    minDetectionConfidence:0.5,
    minTrackingConfidence:0.5
  });
  faceMesh.onResults(onFaceMeshResults);

  const cameraUtils = new Camera(video, {
    onFrame: async () => { await faceMesh.send({image: video}); },
    width:640, height:480
  });
  cameraUtils.start();
}

function onFaceMeshResults(results){
  // Dibujar overlay y calcular estimación simple de 'gaze' y 'effort'
  canvasCtx.clearRect(0,0,overlay.width,overlay.height);
  if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length===0) {
    effortVal.textContent = '0.00';
    return;
  }
  const lm = results.multiFaceLandmarks[0];
  // indices para ojos (approx)
  const leftEye = lm[33];
  const rightEye = lm[263];
  // Pupila focal aproximada: punto medio entre ojos
  const gazeX = (leftEye.x + rightEye.x)/2 * overlay.width;
  const gazeY = (leftEye.y + rightEye.y)/2 * overlay.height;
  lastGaze = {x:gazeX, y:gazeY};
  gazeVal.textContent = `${Math.round(gazeX)}, ${Math.round(gazeY)}`;

  // Simular esfuerzo: depende de apertura interocular (distance). Cuanto menor, mayor esfuerzo.
  const dx = (leftEye.x - rightEye.x);
  const dy = (leftEye.y - rightEye.y);
  const eyeDist = Math.sqrt(dx*dx + dy*dy);
  // Normalizar y mapear a esfuerzo
  const effort = Math.max(0, Math.min(1, 1 - ((eyeDist - 0.03) / 0.06)));
  effortVal.textContent = effort.toFixed(2);

  // Dibujar ojos y punto de gaze
  drawCircle(leftEye.x*overlay.width, leftEye.y*overlay.height, 3);
  drawCircle(rightEye.x*overlay.width, rightEye.y*overlay.height, 3);
  drawCross(gazeX, gazeY);

  // Lógica de magnificación automática
  if (effort > EFFORT_THRESHOLD) {
    // aplicar magnificación al article
    document.documentElement.style.setProperty('--base-font', '20px');
  } else {
    document.documentElement.style.setProperty('--base-font', '16px');
  }

  // Dwell-to-read: si la mirada permanece en una zona, iniciar lectura
  handleDwell(gazeX, gazeY);

  // (Opcional) enviar keypoints al backend si no está en modo localOnly
  // if (!localOnly.checked) sendKeypointsToBackend(lm);
}

function drawCircle(x,y,r){
  canvasCtx.fillStyle = 'red';
  canvasCtx.beginPath();
  canvasCtx.arc(x, y, r, 0, Math.PI*2);
  canvasCtx.fill();
}
function drawCross(x,y){
  canvasCtx.strokeStyle = 'lime';
  canvasCtx.beginPath();
  canvasCtx.moveTo(x-6, y);
  canvasCtx.lineTo(x+6, y);
  canvasCtx.moveTo(x, y-6);
  canvasCtx.lineTo(x, y+6);
  canvasCtx.stroke();
}

// Obtener palabra bajo punto (hit test)
function getWordAtPoint(clientX, clientY){
  // Ajustar coordenadas desde overlay (que está encima del video) a viewport
  const rect = overlay.getBoundingClientRect();
  const x = rect.left + (clientX/overlay.width)*rect.width;
  const y = rect.top + (clientY/overlay.height)*rect.height;

  let range;
  if (document.caretPositionFromPoint){
    const pos = document.caretPositionFromPoint(x,y);
    if (!pos) return null;
    range = document.createRange();
    range.setStart(pos.offsetNode,pos.offset);
  } else if (document.caretRangeFromPoint){
    range = document.caretRangeFromPoint(x,y);
  }
  if (!range) return null;
  // expand manual: walk left/right to build word
  const node = range.startContainer;
  if (!node || node.nodeType !== Node.TEXT_NODE) return null;
  const text = node.textContent;
  let idx = range.startOffset;
  if (idx > text.length) idx = text.length;
  // expand left
  let start = idx; while(start>0 && /[\wáéíóúüñÁÉÍÓÚÑ]/.test(text[start-1])) start--;
  let end = idx; while(end<text.length && /[\wáéíóúüñÁÉÍÓÚÑ]/.test(text[end])) end++;
  const word = text.slice(start,end).trim();
  return word || null;
}

function handleDwell(gx, gy){
  const threshold = 20; // px tolerance
  if (!dwellTimer){
    dwellTimer = {x:gx, y:gy, t:Date.now()};
    return;
  }
  const dist = Math.hypot(gx - dwellTimer.x, gy - dwellTimer.y);
  if (dist < threshold){
    // still in same place
    const elapsed = Date.now() - dwellTimer.t;
    if (elapsed > DWELL_TIME){
      // trigger read
      const word = getWordAtPoint(gx, gy);
      if (word){
        reading.textContent = `Leyendo: ${word}`;
        speak(word);
        // reset timer to prevent repeats
        dwellTimer = null;
      }
    }
  } else {
    // moved
    dwellTimer = {x:gx, y:gy, t:Date.now()};
  }
}

function speak(text){
  if (speechUtter){
    speechSynthesis.cancel();
  }
  speechUtter = new SpeechSynthesisUtterance(text);
  speechUtter.lang = 'es-MX';
  speechUtter.rate = 1.0;
  speechSynthesis.speak(speechUtter);
}

stopSpeech.addEventListener('click', ()=>{ speechSynthesis.cancel(); reading.textContent = '—'; });

// Toggle camera preview visibility
toggleCam.addEventListener('click', ()=>{
  camVisible = !camVisible;
  video.style.display = camVisible ? 'block':'none';
  overlay.style.display = camVisible ? 'block':'none';
  toggleCam.textContent = camVisible ? 'Ocultar cámara':'Mostrar cámara';
});

// Force enlarge button
forceEnlarge.addEventListener('click', ()=>{
  document.documentElement.style.setProperty('--base-font','22px');
  setTimeout(()=>document.documentElement.style.setProperty('--base-font','16px'), 4000);
});

// Optional: example WebSocket sender (comentado)

let ws;
function initWS(){
  ws = new WebSocket('ws://localhost:8765');
  ws.onopen = () => { document.getElementById('wsStatus').textContent='WS Conectado'; };
  ws.onmessage = (ev) => { const d = JSON.parse(ev.data); console.log('from server', d); };
}
function sendKeypointsToBackend(kp){
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({type:'kps', kp}));
}
initWS();


startCamera();
