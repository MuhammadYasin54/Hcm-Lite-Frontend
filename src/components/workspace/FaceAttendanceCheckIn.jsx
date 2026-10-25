"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError, apiRequest } from "@/lib/api";

export default function FaceAttendanceCheckIn({ onClose, onSuccess }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const frameRef = useRef(0);
  const faceSeenAtRef = useRef(0);
  const [status, setStatus] = useState("idle");
  const [faces, setFaces] = useState(0);
  const [faceReady, setFaceReady] = useState(false);
  const [error, setError] = useState("");

  function stopCamera() {
    cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    detectorRef.current?.close();
    detectorRef.current = null;
  }

  useEffect(() => () => stopCamera(), []);

  async function startCamera() {
    setError("");
    setStatus("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      // MediaPipe's WASM runtime writes this informational XNNPACK line through
      // console.error; Next dev otherwise displays an INFO message as an error overlay.
      const originalConsoleError = console.error;
      console.error = (...args) => {
        if (args.some((value) => String(value).includes("Created TensorFlow Lite XNNPACK delegate for CPU"))) return;
        originalConsoleError(...args);
      };
      try {
        const { FaceDetector, FilesetResolver } = await import("@mediapipe/tasks-vision");
        const files = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm");
        detectorRef.current = await FaceDetector.createFromOptions(files, {
          baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite" },
          runningMode: "VIDEO", minDetectionConfidence: 0.65,
        });
      } finally {
        console.error = originalConsoleError;
      }
      setStatus("detecting");
      const detect = () => {
        if (!videoRef.current || !detectorRef.current) return;
        let result;
        const originalConsoleError = console.error;
        console.error = (...args) => {
          if (args.some((value) => String(value).includes("Created TensorFlow Lite XNNPACK delegate for CPU"))) return;
          originalConsoleError(...args);
        };
        try { result = detectorRef.current.detectForVideo(videoRef.current, performance.now()); }
        finally { console.error = originalConsoleError; }
        const count = result.detections?.length || 0;
        setFaces(count);
        const ready = count === 1;
        if (ready) faceSeenAtRef.current = Date.now();
        setFaceReady(ready);
        frameRef.current = requestAnimationFrame(detect);
      };
      detect();
    } catch (cause) {
      stopCamera();
      setStatus("idle");
      setError(cause?.name === "NotAllowedError" ? "Camera permission was denied. Allow camera access and try again." : "Camera or face detection could not start. Check your connection and camera permissions.");
    }
  }

  function getLocation() {
    return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(
      ({ coords }) => coords.accuracy <= 100 ? resolve(coords) : reject(new Error("Location accuracy must be 100 metres or better. Move to an area with a stronger GPS signal and try again.")),
      () => reject(new Error("Precise location is unavailable. Allow location access and try again.")),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    ));
  }

  async function submit() {
    if (faces !== 1 || Date.now() - faceSeenAtRef.current > 1200) { setError("Keep exactly one face visible in the camera before checking in."); return; }
    setStatus("submitting"); setError("");
    try {
      const coords = await getLocation();
      await apiRequest("/attendance/check-in", { method: "POST", body: JSON.stringify({ source: "camera", faceCount: 1, latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy }) });
      stopCamera(); onSuccess();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : cause.message || "Unable to complete attendance check-in.");
      setStatus("detecting");
    }
  }

  return <div className="face-attendance-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { stopCamera(); onClose(); } }}>
    <section className="face-attendance-dialog" role="dialog" aria-modal="true" aria-labelledby="face-attendance-title">
      <div className="module-card-heading"><div><h2 id="face-attendance-title">Camera attendance check-in</h2><p>Allow camera and precise location access to verify attendance.</p></div><button className="module-secondary-action" type="button" onClick={() => { stopCamera(); onClose(); }}>Close</button></div>
      <div className="face-attendance-preview">{status === "idle" || status === "starting" ? <div className="face-attendance-placeholder">{status === "starting" ? "Starting camera and face detection…" : "Camera preview will appear here."}</div> : null}<video ref={videoRef} className={status === "idle" || status === "starting" ? "face-attendance-video hidden" : "face-attendance-video"} playsInline muted aria-label="Local camera preview" /></div>
      <p className="face-attendance-state" aria-live="polite">{status === "detecting" ? faces === 1 ? "One face detected. You can check in." : faces === 0 ? "No face detected. Position your face in the frame." : "More than one face detected. Ensure only you are in frame." : status === "submitting" ? "Verifying location and recording attendance…" : "Start the camera when you are ready."}</p>
      <p className="module-helper">Face detection runs in this browser. No photo or face image is sent or stored. GPS coordinates are used to verify the office radius; the server records only distance and accuracy.</p>
      {error ? <p className="face-attendance-error" role="alert">{error}</p> : null}
      <div className="module-form-actions">{status === "idle" ? <button className="primary-button" type="button" onClick={startCamera}>Enable camera and face detection</button> : null}<button className="primary-button" type="button" onClick={submit} disabled={status !== "detecting" || faces !== 1 || !faceReady}>Check in</button></div>
    </section>
  </div>;
}
