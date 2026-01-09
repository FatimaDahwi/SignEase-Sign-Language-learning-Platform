document.addEventListener("DOMContentLoaded", () => {

  const params = new URLSearchParams(window.location.search);
  const letter = params.get("letter");

  const title = document.getElementById("letterTitle");
  const image = document.getElementById("letterImage");
  const startBtn = document.getElementById("startBtn");
  const practiceSection = document.getElementById("practiceSection");

  const video = document.getElementById("camera");
  const canvas = document.getElementById("canvas");
  const predictionText = document.getElementById("predictionText");
  const scoreText = document.getElementById("scoreText");
  const ctx = canvas.getContext("2d");

  let correctCount = 0;
  let totalCount = 0;
  let intervalId = null;

  const CONFIDENCE_THRESHOLD = 0.6;

  if (!letter) {
    title.textContent = "No letter selected";
    return;
  }

  title.textContent = `Letter ${letter}`;
  image.src = `photos/Letter ${letter}-Filled-With Label.jpg`;

  startBtn.addEventListener("click", async () => {
    practiceSection.classList.remove("hidden");
    startBtn.disabled = true;

    await startCamera();
    startPredictionLoop();
  });

  async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;

    return new Promise(resolve => {
      video.onloadedmetadata = () => resolve();
    });
  }

  function startPredictionLoop() {
    // قللنا سرعة إرسال الصور لتخفيف الضغط على السيرفر
    intervalId = setInterval(captureAndPredict, 1000);
  }

  async function captureAndPredict() {
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    // قللنا حجم الصورة لتجنب server error
    const width = 320;
    const height = Math.floor(video.videoHeight / video.videoWidth * width);

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(video, 0, 0, width, height);

    const blob = await new Promise(resolve =>
      canvas.toBlob(resolve, "image/jpeg", 0.7)
    );

    if (!blob) return; // إذا فشل التحويل للصورة

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
        predictionText.textContent = data.error;
        return;
      }

      if (data.confidence < CONFIDENCE_THRESHOLD) {
        predictionText.textContent = "Show the sign clearly 👋";
        return;
      }

      totalCount++;

      if (data.letter === letter) {
        correctCount++;
        predictionText.textContent =
          `Correct ✅ (${data.letter}) ${(data.confidence * 100).toFixed(1)}%`;
      } else {
        predictionText.textContent =
          `Wrong ❌ (${data.letter}) ${(data.confidence * 100).toFixed(1)}%`;
      }

      scoreText.textContent =
        `Score: ${((correctCount / totalCount) * 100).toFixed(1)}%`;

    } catch (err) {
      console.error(err);
      predictionText.textContent = "Server error";
    }
  }
});
