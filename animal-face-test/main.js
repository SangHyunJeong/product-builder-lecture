const MODEL_URL = "./my_model/tm-my-image-model/";

let model;
let webcam;
let maxPredictions = 0;
let isRunning = false;

const startButton = document.getElementById("btnStart");
const webcamContainer = document.getElementById("webcam-container");
const labelContainer = document.getElementById("label-container");
const statusBadge = document.getElementById("status");

startButton.addEventListener("click", init);

async function init() {
  if (isRunning) return;
  startButton.disabled = true;
  statusBadge.textContent = "불러오는 중...";

  try {
    const modelURL = MODEL_URL + "model.json";
    const metadataURL = MODEL_URL + "metadata.json";

    model = await tmImage.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();

    const flip = true;
    webcam = new tmImage.Webcam(320, 320, flip);
    await webcam.setup();
    await webcam.play();
    window.requestAnimationFrame(loop);

    webcamContainer.innerHTML = "";
    webcamContainer.appendChild(webcam.canvas);

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

    statusBadge.textContent = "분석 중";
    statusBadge.classList.add("live");
    isRunning = true;
  } catch (error) {
    statusBadge.textContent = "실패";
    startButton.disabled = false;
    alert("모델을 불러오지 못했어요. my_model 폴더가 있는지 확인해 주세요.");
    console.error(error);
  }
}

async function loop() {
  if (!webcam) return;
  webcam.update();
  await predict();
  window.requestAnimationFrame(loop);
}

async function predict() {
  const prediction = await model.predict(webcam.canvas);
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
