const params = new URLSearchParams(window.location.search);
const word = params.get("word");

document.getElementById("wordTitle").textContent = `Practice: ${word}`;

const input = document.getElementById("videoInput");
const preview = document.getElementById("preview");
const result = document.getElementById("resultText");

input.addEventListener("change", () => {
  const file = input.files[0];
  if (!file) return;

  preview.src = URL.createObjectURL(file);
  preview.style.display = "block";
});

document.getElementById("predictBtn").addEventListener("click", async () => {
  const file = input.files[0];
  if (!file) {
    result.textContent = "Upload a video first";
    return;
  }

  result.textContent = "Processing...";

  const formData = new FormData();
  formData.append("video", file);

  const res = await fetch(`http://127.0.0.1:5000/predict-word?target=${word}`, {
    method: "POST",
    body: formData
  });

  const data = await res.json();

  if (data.error) {
    result.textContent = data.error;
    return;
  }

  if (data.predicted === word) {
    result.textContent = `Correct ✅ (${data.predicted})`;
  } else {
    result.textContent = `Wrong ❌ Predicted: ${data.predicted}`;
  }
});
