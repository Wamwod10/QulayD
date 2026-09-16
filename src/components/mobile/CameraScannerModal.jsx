import { Camera, Keyboard, ScanBarcode, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

import { Modal, PrimaryButton, SecondaryButton } from "../prototype/PrototypeUI";

function CameraScannerModal({ open, onClose, onDetected, title = "Shtrix-kod skaneri" }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const animationRef = useRef(0);
  const fallbackControlsRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const onDetectedRef = useRef(onDetected);
  onCloseRef.current = onClose;
  onDetectedRef.current = onDetected;
  const [manual, setManual] = useState("");
  const [status, setStatus] = useState("Kamera tayyorlanmoqda...");

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;

    const stop = () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      fallbackControlsRef.current?.stop?.();
      fallbackControlsRef.current = null;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("Bu brauzer kameradan skanerlashni qo‘llamaydi. Kodni qo‘lda kiriting.");
        return;
      }
      try {
        if (!("BarcodeDetector" in window)) {
          setStatus("Kodni kamera markaziga tuting · moslik rejimi");
          const reader = new BrowserMultiFormatReader(undefined, { delayBetweenScanAttempts: 120 });
          const controls = await reader.decodeFromConstraints(
            { video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
            videoRef.current,
            (result) => {
              const value = result?.getText?.();
              if (!value || cancelled) return;
              onDetectedRef.current?.(value);
              onCloseRef.current?.();
            },
          );
          if (cancelled) controls.stop();
          else fallbackControlsRef.current = controls;
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (cancelled) { stream.getTracks().forEach((track) => track.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const detector = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "code_128", "qr_code", "upc_a", "upc_e"] });
        setStatus("Kodni kamera markaziga tuting");
        let busy = false;
        const detect = async () => {
          if (cancelled) return;
          if (!busy && videoRef.current?.readyState >= 2) {
            busy = true;
            try {
              const codes = await detector.detect(videoRef.current);
              const value = codes?.[0]?.rawValue;
              if (value) {
                onDetectedRef.current?.(value);
                onCloseRef.current?.();
                return;
              }
            } catch {
              // Keep scanner alive; manual input remains available.
            } finally {
              busy = false;
            }
          }
          animationRef.current = requestAnimationFrame(detect);
        };
        animationRef.current = requestAnimationFrame(detect);
      } catch {
        setStatus("Kameraga ruxsat berilmadi. Kodni qo‘lda kiriting yoki brauzer ruxsatini yoqing.");
      }
    };

    start();
    return () => { cancelled = true; stop(); };
  }, [open]);

  const submitManual = (event) => {
    event.preventDefault();
    const value = manual.trim();
    if (!value) return;
    onDetected?.(value);
    setManual("");
    onClose?.();
  };

  return (
    <Modal open={open} title={title} description="Telefon kamerasi bilan EAN, CODE128 yoki QR kodni o‘qing." onClose={onClose}>
      <div className="qp-camera-scanner">
        <div className="qp-camera-frame">
          <video ref={videoRef} muted playsInline />
          <span className="qp-camera-scan-line" aria-hidden="true" />
          <div className="qp-camera-frame-icon"><Camera size={18} /></div>
        </div>
        <div className="qp-camera-status"><ScanBarcode size={15}/><span>{status}</span></div>
        <form onSubmit={submitManual} className="qp-camera-manual">
          <label><span><Keyboard size={14}/> Kodni qo‘lda kiritish</span><input className="qp-input" value={manual} onChange={(event)=>setManual(event.target.value)} inputMode="numeric" autoComplete="off" placeholder="Shtrix-kod yoki QR qiymati"/></label>
          <div className="qp-form-actions"><SecondaryButton type="button" onClick={onClose}><X size={14}/> Yopish</SecondaryButton><PrimaryButton type="submit" disabled={!manual.trim()}>Topish</PrimaryButton></div>
        </form>
      </div>
    </Modal>
  );
}

export default CameraScannerModal;
