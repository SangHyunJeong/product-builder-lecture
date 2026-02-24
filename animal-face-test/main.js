const MODEL_URL = "./my_model/tm-my-image-model/";

let model;
let webcam;
let maxPredictions = 0;
let cameraActive = false;
let frameId = null;

const startButton = document.getElementById("btnStart");
const webcamContainer = document.getElementById("webcam-container");
const labelContainer = document.getElementById("label-container");
const statusBadge = document.getElementById("status");
const modeButtons = document.querySelectorAll(".mode-btn");
const cameraSection = document.getElementById("camera-section");
const uploadSection = document.getElementById("upload-section");
const uploadInput = document.getElementById("imageUpload");
const uploadPreview = document.getElementById("uploadPreview");

startButton.addEventListener("click", startCamera);
modeButtons.forEach((button) => {
  button.addEventListener("click", () => setMode(button.dataset.mode));
});
uploadInput.addEventListener("change", handleUpload);

setMode("camera");

async function ensureModel() {
  if (model) return;
  setStatus("모델 불러오는 중...");
  const modelURL = MODEL_URL + "model.json";
  const metadataURL = MODEL_URL + "metadata.json";
  model = await tmImage.load(modelURL, metadataURL);
  maxPredictions = model.getTotalClasses();
  initLabelRows();
}

function initLabelRows() {
  labelContainer.innerHTML = "";
  for (let i = 0; i < maxPredictions; i += 1) {
    const row = document.createElement("div");
    row.className = "label-row";
    row.innerHTML = `
      <div class="label-name">-</div>
      <div class="bar"><span></span></div>
    `;
    labelContainer.appendChild(row);
  }
}

function setStatus(text, live = false) {
  statusBadge.textContent = text;
  statusBadge.classList.toggle("live", live);
}

function setMode(mode) {
  modeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === mode);
  });

  if (mode === "upload") {
    cameraSection.classList.add("hidden");
    uploadSection.classList.remove("hidden");
    startButton.classList.add("hidden");
    stopCamera();
    setStatus("대기 중");
  } else {
    uploadSection.classList.add("hidden");
    cameraSection.classList.remove("hidden");
    startButton.classList.remove("hidden");
    setStatus(cameraActive ? "분석 중" : "대기 중", cameraActive);
  }
}

async function startCamera() {
  if (cameraActive) return;
  startButton.disabled = true;
  setStatus("카메라 준비 중...");

  try {
    await ensureModel();
    const flip = true;
    webcam = new tmImage.Webcam(320, 320, flip);
    await webcam.setup();
    await webcam.play();

    webcamContainer.innerHTML = "";
    webcamContainer.appendChild(webcam.canvas);
    cameraActive = true;
    setStatus("분석 중", true);
    startButton.textContent = "카메라 실행 중";
    loop();
  } catch (error) {
    startButton.disabled = false;
    setStatus("실패");
    alert("카메라 또는 모델을 불러오지 못했어요. 권한/모델 폴더를 확인해 주세요.");
    console.error(error);
  }
}

function stopCamera() {
  if (!cameraActive) return;
  cameraActive = false;
  if (frameId) {
    cancelAnimationFrame(frameId);
    frameId = null;
  }
  if (webcam) {
    webcam.stop();
    webcam = null;
  }
  startButton.disabled = false;
  startButton.textContent = "카메라 시작";
}

async function loop() {
  if (!cameraActive || !webcam) return;
  webcam.update();
  await predictFromSource(webcam.canvas);
  frameId = window.requestAnimationFrame(loop);
}

async function handleUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    await ensureModel();
    stopCamera();
    setStatus("사진 분석 중", true);
    const objectUrl = URL.createObjectURL(file);
    uploadPreview.onload = async () => {
      uploadPreview.classList.add("ready");
      await predictFromSource(uploadPreview);
      URL.revokeObjectURL(objectUrl);
      setStatus("분석 완료", true);
    };
    uploadPreview.src = objectUrl;
  } catch (error) {
    setStatus("실패");
    alert("사진 분석에 실패했어요. 다시 시도해 주세요.");
    console.error(error);
  }
}

async function predictFromSource(source) {
  const prediction = await model.predict(source);
  prediction.sort((a, b) => b.probability - a.probability);
  prediction.forEach((item, index) => {
    const row = labelContainer.children[index];
    if (!row) return;
    const nameEl = row.querySelector(".label-name");
    const barEl = row.querySelector(".bar span");
    const percent = Math.round(item.probability * 100);
    nameEl.textContent = `${item.className} · ${percent}%`;
    barEl.style.width = `${percent}%`;
  });
}
