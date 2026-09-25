import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, RefreshCw, X, Check, Image as ImageIcon, AlertCircle, Sparkles, SwitchCamera, Trash2 } from 'lucide-react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (base64Photo?: string) => void;
  currentPhoto?: string;
  userName?: string;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  currentPhoto,
  userName = 'Profile'
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isFlashing, setIsFlashing] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  // Start camera stream
  const startCamera = useCallback(async (mode: 'user' | 'environment' = facingMode) => {
    stopCamera();
    setCameraError(null);
    setIsInitializing(true);
    setCapturedImage(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser or environment.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 720 },
          height: { ideal: 720 },
          aspectRatio: { ideal: 1 }
        },
        audio: false
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {});
          setIsCameraActive(true);
          setIsInitializing(false);
        };
      }
    } catch (err: any) {
      console.error('Camera initialization error:', err);
      setIsInitializing(false);
      setIsCameraActive(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. Please allow camera access in your browser settings or upload a file.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera found on your device. You can upload an image from your device instead.');
      } else {
        setCameraError(err.message || 'Unable to access device camera.');
      }
    }
  }, [facingMode, stopCamera]);

  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      setCameraError(null);
      startCamera('user');
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  // Flip camera between front and back
  const handleToggleFacingMode = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Capture frame from video element
  const handleSnapPhoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    
    // Create a high-res square avatar (e.g. 512x512)
    const targetSize = 512;
    canvas.width = targetSize;
    canvas.height = targetSize;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Flash animation effect
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 200);

    const videoWidth = video.videoWidth || 640;
    const videoHeight = video.videoHeight || 480;

    // Calculate center-crop square
    const minDim = Math.min(videoWidth, videoHeight);
    const startX = (videoWidth - minDim) / 2;
    const startY = (videoHeight - minDim) / 2;

    // If front-facing camera, mirror the canvas horizontally for intuitive selfie
    if (facingMode === 'user') {
      ctx.translate(targetSize, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(
      video,
      startX,
      startY,
      minDim,
      minDim,
      0,
      0,
      targetSize,
      targetSize
    );

    const base64 = canvas.toDataURL('image/jpeg', 0.88);
    setCapturedImage(base64);
    stopCamera();
  };

  // Fallback: Upload an image file from device
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const targetSize = 512;
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const minDim = Math.min(img.width, img.height);
        const startX = (img.width - minDim) / 2;
        const startY = (img.height - minDim) / 2;

        ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, targetSize, targetSize);
        const base64 = canvas.toDataURL('image/jpeg', 0.88);
        setCapturedImage(base64);
        stopCamera();
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      handleClose();
    }
  };

  const handleRemovePhoto = () => {
    onCapture(undefined);
    handleClose();
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera(facingMode);
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop */}
          <motion.div 
            key="camera-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            className="fixed inset-0 bg-gray-950/80 backdrop-blur-md" 
            onClick={handleClose} 
          />

          {/* Modal Container */}
          <motion.div 
            key="camera-modal-container"
            initial={{ opacity: 0, scale: 0.90, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 15 }}
            transition={{ 
              type: 'spring', 
              damping: 26, 
              stiffness: 320, 
              mass: 0.85 
            }}
            className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden border border-gray-100 flex flex-col my-auto"
          >
            
            {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
              <Camera size={20} />
            </div>
            <div>
              <h3 className="text-base font-black uppercase text-gray-900 tracking-tight">
                Profile Camera
              </h3>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                {userName ? `${userName}'s Photo` : 'Capture Identification'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-100 flex items-center justify-center transition-all shadow-sm"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body / Camera View */}
        <div className="p-6 flex flex-col items-center">
          {/* Main Stage View */}
          <div className="relative w-72 h-72 rounded-[2rem] overflow-hidden bg-gray-950 border-4 border-white shadow-2xl flex items-center justify-center group">
            
            {/* Shutter flash effect */}
            {isFlashing && (
              <div className="absolute inset-0 bg-white z-30 animate-out fade-out duration-200" />
            )}

            {/* If a photo has been captured / previewing */}
            {capturedImage ? (
              <div className="relative w-full h-full">
                <img 
                  src={capturedImage} 
                  alt="Captured Profile" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-3 left-3 right-3 py-1.5 px-3 bg-emerald-500/90 backdrop-blur-md rounded-xl text-white text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg">
                  <Check size={14} /> Photo Captured
                </div>
              </div>
            ) : cameraError ? (
              /* Camera Error State */
              <div className="p-6 text-center text-white flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
                  <AlertCircle size={24} />
                </div>
                <p className="text-xs font-semibold text-rose-200 mb-4 px-2 leading-relaxed">
                  {cameraError}
                </p>
                <div className="flex flex-col gap-2 w-full">
                  <button
                    onClick={() => startCamera(facingMode)}
                    className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={14} /> Retry Camera
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    <ImageIcon size={14} /> Choose Image File
                  </button>
                </div>
              </div>
            ) : (
              /* Live Video Stream */
              <div className="relative w-full h-full bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                />
                
                {/* Live viewfinder overlay */}
                <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-white/40 rounded-[2rem] m-3 flex flex-col justify-between p-3">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-full text-[9px] font-black uppercase tracking-widest text-emerald-400 border border-white/10">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Live Feed
                    </span>
                    <span className="text-[9px] font-mono text-white/70 bg-black/40 px-2 py-0.5 rounded-md">
                      HD
                    </span>
                  </div>

                  <div className="text-center text-white/70 text-[10px] font-bold tracking-wide drop-shadow-md pb-1">
                    Center face in frame
                  </div>
                </div>

                {isInitializing && (
                  <div className="absolute inset-0 bg-gray-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                    <RefreshCw className="animate-spin text-indigo-400 mb-2" size={24} />
                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-300">
                      Starting Camera...
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Current Saved Photo Indicator */}
          {!capturedImage && currentPhoto && (
            <div className="mt-4 flex items-center gap-3 px-4 py-2 bg-gray-50 border border-gray-100 rounded-2xl">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
                Current Photo:
              </span>
              <img 
                src={currentPhoto} 
                alt="Current profile" 
                className="w-8 h-8 rounded-full object-cover border border-indigo-200" 
              />
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="text-[10px] font-black text-rose-500 hover:text-rose-700 uppercase ml-auto flex items-center gap-1"
              >
                <Trash2 size={12} /> Remove
              </button>
            </div>
          )}

          {/* Hidden File Input */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept="image/*" 
            className="hidden" 
          />

          {/* Action Controls */}
          <div className="mt-6 w-full space-y-3">
            {capturedImage ? (
              /* Review Captured Photo Mode */
              <div className="flex gap-3 w-full">
                <button
                  type="button"
                  onClick={handleRetake}
                  className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw size={16} /> Retake
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex-[1.5] py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2"
                >
                  <Check size={16} /> Save Photo
                </button>
              </div>
            ) : (
              /* Live Camera Capture Mode */
              <div className="flex flex-col gap-3 w-full">
                <div className="flex items-center gap-3 w-full">
                  <button
                    type="button"
                    onClick={handleToggleFacingMode}
                    title="Flip camera"
                    className="p-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl transition-all flex items-center justify-center shadow-sm"
                  >
                    <SwitchCamera size={18} />
                  </button>

                  <button
                    type="button"
                    onClick={handleSnapPhoto}
                    disabled={!isCameraActive || isInitializing}
                    className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2 active:scale-95"
                  >
                    <Camera size={18} /> Capture Photo
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Upload image file"
                    className="p-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl transition-all flex items-center justify-center shadow-sm"
                  >
                    <ImageIcon size={18} />
                  </button>
                </div>

                <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Stored as a secure base64 string with your account
                </p>
              </div>
            )}
          </div>
        </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CameraCaptureModal;
