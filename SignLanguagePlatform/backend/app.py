from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
from keras import mixed_precision
import numpy as np
import cv2
import mediapipe as mp

app = Flask(__name__)
CORS(app)

# ================= MODEL ================


model = tf.keras.models.load_model("models/asl_model_patched.h5",compile=False, custom_objects={"DTypePolicy":mixed_precision.Policy})
print("✅ Model loaded successfully")


# ================= MediaPipe =================
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(
    static_image_mode=True,  
    max_num_hands=1,
    min_detection_confidence=0.5
)

LETTER_LABELS = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")

# ================= Landmarks =================
def extract_landmarks(image_bytes):
    img = np.frombuffer(image_bytes, np.uint8)
    frame = cv2.imdecode(img, cv2.IMREAD_COLOR)

    if frame is None:
        return None

    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    result = hands.process(frame_rgb)

    if not result.multi_hand_landmarks:
        return None

    lm = []
    for p in result.multi_hand_landmarks[0].landmark:
        lm.extend([p.x, p.y, p.z])

    # ⚠️ لازم يكون بالضبط 63
    return np.array(lm, dtype=np.float32)

# ================= API =================
@app.route("/predict-letter", methods=["POST"])
def predict_letter():

    if "image" not in request.files:
        return jsonify({"error": "No image sent"}), 400

    image_bytes = request.files["image"].read()
    landmarks = extract_landmarks(image_bytes)

    if landmarks is None:
        return jsonify({"error": "No hand detected"})

    landmarks = np.expand_dims(landmarks, axis=0)  # (1, 63)

    pred = model.predict(landmarks, verbose=0)[0]
    idx = int(np.argmax(pred))

    return jsonify({
        "letter": LETTER_LABELS[idx],
        "confidence": float(pred[idx])
    })

# ================= RUN =================
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
