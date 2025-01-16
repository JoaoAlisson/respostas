"use client";

import { useEffect, useRef, useState } from "react";

export default function CameraCapture() {
  const videoRef = useRef(null); // Referência para o vídeo da câmera
  const canvasRef = useRef(null); // Referência para o canvas da câmera
  const resultCanvasRef = useRef(null); // Referência para o canvas de resultado
  const [isProcessing, setIsProcessing] = useState(false);
  const [opencvLoaded, setOpenCVLoaded] = useState(false);

  useEffect(() => {
    const loadOpenCV = async () => {
      try {
        cv = await cv;
        setOpenCVLoaded(true);
      } catch (error) {
        console.error("Erro ao carregar OpenCV.js:", error);
      }
    };

    loadOpenCV();
    startCamera();

    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      if (videoRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });

        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Erro ao acessar a câmera:", err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const captureImage = () => {
    if (
      videoRef.current &&
      canvasRef.current &&
      resultCanvasRef.current &&
      opencvLoaded
    ) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const resultCanvas = resultCanvasRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      const resultCtx = resultCanvas.getContext("2d");

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      processImage(canvas, resultCtx);
    }
  };

  const processImage = (canvas, resultCtx) => {
    setIsProcessing(true);
    try {
      let mat = cv.imread(canvas);
      let gray = new cv.Mat();
      let edges = new cv.Mat();
      let contours = new cv.MatVector();
      let hierarchy = new cv.Mat();

      cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY);
      cv.Canny(gray, edges, 50, 150);
      cv.findContours(edges, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

      for (let i = 0; i < contours.size(); i++) {
        let contour = contours.get(i);
        let approx = new cv.Mat();
        let epsilon = 0.02 * cv.arcLength(contour, true);
        cv.approxPolyDP(contour, approx, epsilon, true);

        if (approx.rows === 4) {
          const rect = cv.boundingRect(approx);
          const roi = gray.roi(rect);
          const mean = cv.mean(roi);
          const isRasurado = mean[0] < 50; // Definir como "rasurado" se a média de intensidade for baixa

          const color = isRasurado
            ? new cv.Scalar(0, 255, 0) // Verde para quadrados rasurados
            : new cv.Scalar(255, 0, 0); // Azul para quadrados normais

          cv.drawContours(mat, contours, i, color, 2, cv.LINE_8, hierarchy, 0);

          roi.delete();
        }

        approx.delete();
      }

      cv.imshow(resultCanvasRef.current, mat);

      mat.delete();
      gray.delete();
      edges.delete();
      contours.delete();
      hierarchy.delete();
    } catch (err) {
      console.error("Erro ao processar imagem:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <h1>Captura da Câmera e Detecção de Quadrados</h1>

      <video
        ref={videoRef}
        width="640"
        height="480"
        style={{ border: "1px solid #000" }}
      />

      <canvas
        ref={canvasRef}
        width="640"
        height="480"
        style={{ display: "none" }}
      />

      <button onClick={captureImage} disabled={isProcessing || !opencvLoaded}>
        {isProcessing ? "Processando..." : "Capturar Imagem"}
      </button>

      <canvas
        ref={resultCanvasRef}
        width="640"
        height="480"
        style={{ border: "1px solid #000", marginTop: "20px" }}
      />

      {isProcessing && <p>Processando imagem...</p>}
      {!opencvLoaded && <p>Carregando OpenCV.js...</p>}
    </div>
  );
}
