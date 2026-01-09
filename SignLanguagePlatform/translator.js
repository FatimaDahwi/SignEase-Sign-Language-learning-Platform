const video = document.getElementById("camera");
const canvas = document.getElementById("canvas");
const predictionText = document.getElementById("predictionText");
const finalText = document.getElementById("finalText");
const ctx = canvas.getContext("2d");

let lastPrediction = "";
let stableCount = 0;
let cooldown = false;
let text = "";
let noHandTimer = null;

const CONFIDENCE_THRESHOLD = 0.8;
const STABLE_FRAMES = 3;
const COOLDOWN_MS = 1500;
const NO_HAND_DELAY = 2000;

// ===== Start camera =====
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
  } catch (err) {
    console.error("Camera error:", err);
  }
}
startCamera();

// ===== Main loop =====
setInterval(captureAndPredict, 800); // كل 0.8 ثانية، لتخفيف الضغط على السيرفر

async function captureAndPredict() {
  if (video.videoWidth === 0 || video.videoHeight === 0) return;

  // ⚡ قللنا حجم الصورة لتخفيف حجم الـ request
  const width = 320;
  const height = Math.floor(video.videoHeight / video.videoWidth * width);
  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(video, 0, 0, width, height);

  const blob = await new Promise(res => canvas.toBlob(res, "image/jpeg", 0.7));
  if (!blob) return;

  const formData = new FormData();
  formData.append("image", blob, "frame.jpg");

  try {
    const res = await fetch("http://127.0.0.1:5000/predict-letter", {
      method: "POST",
      body: formData
    });

    if (!res.ok) {
      predictionText.textContent = "Server error";
      return;
    }

    const data = await res.json();

    if (data.error) {
      predictionText.textContent = "No hand detected";

      if (!noHandTimer) {
        noHandTimer = setTimeout(() => {
          text += " ";
          finalText.textContent = text;
        }, NO_HAND_DELAY);
      }
      return;
    }

    clearTimeout(noHandTimer);
    noHandTimer = null;

    predictionText.textContent = `Detected: ${data.letter}`;

    // ===== Stable detection logic =====
    if (data.letter === lastPrediction && data.confidence > CONFIDENCE_THRESHOLD) {
      stableCount++;
    } else {
      stableCount = 1;
      lastPrediction = data.letter;
    }

    if (stableCount >= STABLE_FRAMES && !cooldown) {
      text += data.letter;
      finalText.textContent = text;

      cooldown = true;
      setTimeout(() => cooldown = false, COOLDOWN_MS);
      stableCount = 0;
    }

  } catch (err) {
    console.error(err);
    predictionText.textContent = "Server error";
  }
}

// ===== Clear text button =====
function clearText() {
  text = "";
  finalText.textContent = "";
  lastPrediction = "";
  stableCount = 0;
  cooldown = false;
}
