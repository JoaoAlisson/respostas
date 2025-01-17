"use client"

import { useRef, useEffect, useState } from "react";
import Webcam from "react-webcam";


export default function Home() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [opencvLoaded, setOpenCVLoaded] = useState(false);

  useEffect(() => {
    const loadOpenCV = async () => {
      // @ts-ignore 
      if (typeof cv !== "undefined") {
        console.log("OpenCV.js carregado com sucesso.");
        // @ts-ignore 
        cv = await cv;
        setOpenCVLoaded(true);
      } else {
        console.error("Falha ao carregar OpenCV.js. Verifique se foi incluído.");
      }
    };
    loadOpenCV();
  }, []);


  const captureAndProcess = () => {
    if (!opencvLoaded || isProcessing) return;

    setIsProcessing(true);
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const video = webcamRef.current.video;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imgData = context.getImageData(0, 0, canvas.width, canvas.height);
    const src = cv.matFromImageData(imgData);

    try {
      const gray = new cv.Mat();
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

      const blurred = new cv.Mat();
      cv.GaussianBlur(gray, blurred, new cv.Size(7, 7), 0);

      const edges = new cv.Mat();
      cv.Canny(blurred, edges, 30, 100);

      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      cv.findContours(
        edges,
        contours,
        hierarchy,
        cv.RETR_LIST,
        cv.CHAIN_APPROX_SIMPLE
      );

      const contoursOutput = src.clone();
      let squareCount = 0;

      const MAX_SQUARE_SIZE = 150; // Tamanho máximo do quadrado
const MIN_SQUARE_SIZE = 10; // Tamanho mínimo do quadrado
const APPROX_TOLERANCE = 0.1; // Tolerância para aproximação de polígonos (precisão de formato)

const rectangles = []; // Array para armazenar os quadrados encontrados

for (let i = 0; i < contours.size(); i++) {
  const cnt = contours.get(i);
  const approx = new cv.Mat();
  const peri = cv.arcLength(cnt, true);

  // Aproximar o contorno com tolerância ajustável
  // A tolerância ajusta a precisão da forma para o número de vértices (polígono aproximado)
  cv.approxPolyDP(cnt, approx, APPROX_TOLERANCE * peri, true);

  if (approx.rows === 4 && cv.isContourConvex(approx)) {
    const rect = cv.boundingRect(approx);

    // Verificar tamanho do quadrado
    if (
      rect.width > MAX_SQUARE_SIZE ||
      rect.height > MAX_SQUARE_SIZE ||
      rect.width < MIN_SQUARE_SIZE ||
      rect.height < MIN_SQUARE_SIZE
    ) {
      approx.delete();
      continue;
    }

    // Verificar se o quadrado está dentro de outro quadrado
    let isContained = false;
    for (let j = 0; j < rectangles.length; j++) {
      const existingRect = rectangles[j];
      // Se o quadrado atual está dentro de outro quadrado, não contar
      if (
        rect.x >= existingRect.x &&
        rect.y >= existingRect.y &&
        rect.x + rect.width <= existingRect.x + existingRect.width &&
        rect.y + rect.height <= existingRect.y + existingRect.height
      ) {
        isContained = true;
        break;
      }
    }

    // Se o quadrado não estiver contido, desenhar e adicionar
    if (!isContained) {
      cv.drawContours(contoursOutput, contours, i, new cv.Scalar(0, 255, 0, 255), 2); // Verde para quadrados
      rectangles.push(rect); // Adicionar à lista de quadrados encontrados
      squareCount++; // Incrementar contador de quadrados
    }
  } else {
    // Desenhar em vermelho para contornos que não são quadrados
    cv.drawContours(contoursOutput, contours, i, new cv.Scalar(0, 0, 255, 255), 2); // Vermelho para não quadrados
  }

  approx.delete();
}

      const text = `Quadrados Pretos Identificados: ${squareCount}`;
      const font = cv.FONT_HERSHEY_SIMPLEX;
      const scale = 1;
      const colorText = new cv.Scalar(255, 255, 255, 255);
      const thickness = 2;
      const position = new cv.Point(10, 50);

      cv.putText(contoursOutput, text, position, font, scale, colorText, thickness, cv.LINE_AA);

      cv.imshow(canvas, contoursOutput);

      gray.delete();
      blurred.delete();
      edges.delete();
      contours.delete();
      hierarchy.delete();
      contoursOutput.delete();
    } catch (err) {
      console.error("Erro ao processar imagem:", err);
    } finally {
      src.delete();
      setIsProcessing(false);
    }
  };



  return (
    <div style={{ textAlign: "center" }}>
      <h1>Leitor de Cartão Resposta</h1>
      {opencvLoaded ? (
        <>
          <Webcam
            ref={webcamRef}
            style={{
              width: "100%",
              maxWidth: "640px",
              border: "1px solid black",
            }}
          />
          <canvas
            ref={canvasRef}
            style={{
              display: "block",
              marginTop: "20px",
              width: "100%",
              maxWidth: "640px",
              border: "1px solid black",
            }}
          ></canvas>
          <button
            onClick={captureAndProcess}
            disabled={isProcessing}
            style={{
              marginTop: "20px",
              padding: "10px 20px",
              backgroundColor: "#0070f3",
              color: "#fff",
              border: "none",
              cursor: "pointer",
            }}
          >
            {isProcessing ? "Processando..." : "Capturar e Processar"}
          </button>
        </>
      ) : (
        <p>Carregando OpenCV.js...</p>
      )}
    </div>
  );
}
