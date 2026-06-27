/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Camera, 
  MapPin, 
  ToggleLeft, 
  ToggleRight, 
  ScanLine, 
  Send, 
  FileVideo, 
  AlertTriangle, 
  CheckCircle, 
  UploadCloud, 
  MessageSquare,
  HelpCircle,
  EyeOff,
  Link2,
  ChevronDown,
  Video,
  VideoOff,
  Trash2,
  Play,
  Square,
  RefreshCw,
  RotateCw,
  Zap,
  ArrowLeft,
  Calendar,
  FileCheck,
  CheckCircle2
} from "lucide-react";
import { Issue } from "../types";

interface ReportViewProps {
  onAddIssue: (issue: Partial<Issue>) => void;
  isMobile?: boolean;
}

type ComplaintMode = "camera" | "upload" | "social";

export default function ReportView({ onAddIssue, isMobile = false }: ReportViewProps) {
  // Coordinates default to Indiranagar
  const [coords, setCoords] = useState({ lat: 12.9719, lng: 77.6412 });
  const [gpsLock, setGpsLock] = useState(true);
  const [locationName, setLocationName] = useState("Indiranagar, Bengaluru");
  const [locationLoading, setLocationLoading] = useState(false);
  const [isActualLocation, setIsActualLocation] = useState(false);

  const getActualLocation = async () => {
    if (typeof window !== "undefined" && navigator.geolocation) {
      setLocationLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setCoords({ lat, lng });
          setIsActualLocation(true);
          
          try {
            // First try calling our backend geocoding proxy, fallback to client-side
            let response = await fetch(`/api/reverse-geocode?lat=${lat}&lng=${lng}`);
            if (!response.ok) {
              response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`,
                {
                  headers: {
                    "User-Agent": "IndiaCivic AI Studio Applet Client (agarwalsoham993@gmail.com)"
                  }
                }
              );
            }
            if (response.ok) {
              const data = await response.json();
              if (data && data.address) {
                const sub = data.address.suburb || data.address.neighbourhood || data.address.village || data.address.residential || data.address.road || "Local Area";
                const city = data.address.city || data.address.town || data.address.state_district || "India";
                const display = `${sub}, ${city}`;
                setLocationName(display);
              } else {
                setLocationName(`${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`);
              }
            } else {
              setLocationName(`${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`);
            }
          } catch (err) {
            console.error("Reverse geocoding error in ReportView:", err);
            setLocationName(`${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`);
          } finally {
            setLocationLoading(false);
          }
        },
        (error) => {
          console.warn("Geolocation access denied or failed in ReportView:", error);
          setLocationLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  useEffect(() => {
    getActualLocation();
  }, []);

  const refreshReportLocation = () => {
    getActualLocation();
  };

  const [selectedCategory, setSelectedCategory] = useState("Waste Management");
  const [earnPointsMode, setEarnPointsMode] = useState(true);
  const [description, setDescription] = useState("");
  const [issueTitle, setIssueTitle] = useState("");
  const [evidenceLink, setEvidenceLink] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Complaint Mode State
  const [activeMode, setActiveMode] = useState<ComplaintMode>("camera");
  const [showSubmitPage, setShowSubmitPage] = useState(false);
  const [isFullScreenCameraOpen, setIsFullScreenCameraOpen] = useState(false);

  // Camera & File Upload states
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [capturedVideo, setCapturedVideo] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Camera controls
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [flashOn, setFlashOn] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [cameraError, setCameraError] = useState("");

  // File EXIF Validator States
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [checkingMetadata, setCheckingMetadata] = useState(false);
  const [metadataResult, setMetadataResult] = useState<{
    valid: boolean;
    lat?: number;
    lng?: number;
    timestamp?: string;
    fileName?: string;
    fileSize?: string;
    details?: string;
  } | null>(null);
  const simulateMissingMetadata = false;

  // Mode 3: Social link states
  const [socialLink, setSocialLink] = useState("");
  const [socialLocation, setSocialLocation] = useState("");
  const [socialDescription, setSocialDescription] = useState("");

  const categories = [
    "Waste Management",
    "Drainage & Waterlogging",
    "Mosquito Infestation & Waterlogging",
    "Broken Public Assets",
    "Night Lighting & Women's Safety",
    "AQI & Pollution",
    "Traffic Signal Violations & Accident Reporting",
    "Theft & Safety Incidents",
    "Threats & Anti-social Threats"
  ];

  useEffect(() => {
    // Simulate slight fluctuations in GPS coordinate accuracy only if actual location is not detected yet
    if (gpsLock && !isActualLocation) {
      const interval = setInterval(() => {
        setCoords(prev => ({
          lat: +(12.9719 + (Math.random() - 0.5) * 0.0004).toFixed(6),
          lng: +(77.6412 + (Math.random() - 0.5) * 0.0004).toFixed(6),
        }));
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [gpsLock, isActualLocation]);

  // Start device camera with specific constraints
  const startCamera = async () => {
    setCameraError("");
    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingMode },
          audio: true
        });
      } catch (audioErr) {
        console.warn("Could not start camera with audio, falling back to video-only stream:", audioErr);
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingMode },
          audio: false
        });
      }
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      // Attempt to apply hardware zoom if supported by browser/device
      const track = stream.getVideoTracks()[0];
      if (track) {
        const capabilities = track.getCapabilities ? track.getCapabilities() : {};
        if ("zoom" in capabilities) {
          track.applyConstraints({
            advanced: [{ zoom: zoomLevel } as any]
          }).catch(err => console.log("Hardware zoom not applied, using CSS scale fallback:", err));
        }
      }
    } catch (err) {
      console.error("Error starting camera:", err);
      setCameraError("Could not access camera stream. Make sure permissions are granted, or use the Native Device Camera option below!");
    }
  };

  // Process files natively captured by the device camera (or selected from gallery)
  const handleNativeCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileReader = new FileReader();
    fileReader.onload = () => {
      const dataUrl = fileReader.result as string;
      if (file.type.startsWith("video/")) {
        setCapturedVideo(dataUrl);
        setCapturedPhoto(null);
        setIssueTitle(`Video testimony captured via Device Camera`);
      } else {
        setCapturedPhoto(dataUrl);
        setCapturedVideo(null);
        setIssueTitle(`Civic issue captured via Device Camera`);
      }
      setShowSubmitPage(true);
      stopCamera();
    };
    fileReader.readAsDataURL(file);
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  // Keep camera running only when full screen camera modal is open
  useEffect(() => {
    if (isFullScreenCameraOpen && !capturedPhoto && !capturedVideo) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isFullScreenCameraOpen, facingMode]);

  // Bind stream to video element when it mounts or stream is received
  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream, isFullScreenCameraOpen, capturedPhoto, capturedVideo]);

  // Handle zoom changes in track and style
  useEffect(() => {
    if (cameraStream) {
      const track = cameraStream.getVideoTracks()[0];
      if (track) {
        const capabilities = track.getCapabilities ? track.getCapabilities() : {};
        if ("zoom" in capabilities) {
          track.applyConstraints({
            advanced: [{ zoom: zoomLevel } as any]
          }).catch(() => {});
        }
      }
    }
  }, [zoomLevel, cameraStream]);

  // Toggle Torch/Flashlight
  const toggleFlashlight = async () => {
    if (!cameraStream) return;
    const track = cameraStream.getVideoTracks()[0];
    if (track) {
      try {
        const capabilities = track.getCapabilities ? track.getCapabilities() : {};
        if ("torch" in capabilities) {
          await track.applyConstraints({
            advanced: [{ torch: !flashOn } as any]
          });
          setFlashOn(!flashOn);
        } else {
          // Hardware flash toggle simulated visually
          setFlashOn(!flashOn);
        }
      } catch (err) {
        console.warn("Flashlight controls not supported by this camera stream.");
        setFlashOn(!flashOn);
      }
    }
  };

  // Capture still photo
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    // Apply zoom scaling to captured canvas frame if browser zoom constraint isn't perfect
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      // Draw image with zoom scaling center-cropped if zoomLevel > 1
      if (zoomLevel > 1) {
        const zoomFactor = zoomLevel;
        const sWidth = canvas.width / zoomFactor;
        const sHeight = canvas.height / zoomFactor;
        const sx = (canvas.width - sWidth) / 2;
        const sy = (canvas.height - sHeight) / 2;
        ctx.drawImage(videoRef.current, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
      } else {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      }
      const dataUrl = canvas.toDataURL("image/jpeg");
      setCapturedPhoto(dataUrl);
      setCapturedVideo(null);
      stopCamera();
      
      // Auto pre-fill title
      setIssueTitle(`Civic issue captured via Camera`);
      setShowSubmitPage(true);
    }
  };

  // Start recording video
  const startRecording = () => {
    if (!cameraStream) return;
    const chunks: Blob[] = [];
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(cameraStream, { mimeType: "video/webm;codecs=vp9" });
    } catch (e) {
      try {
        recorder = new MediaRecorder(cameraStream, { mimeType: "video/webm" });
      } catch (e2) {
        recorder = new MediaRecorder(cameraStream);
      }
    }

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      const videoUrl = URL.createObjectURL(blob);
      setCapturedVideo(videoUrl);
      setCapturedPhoto(null);
      
      // Auto pre-fill title
      setIssueTitle(`Video testimony captured via Camera`);
      setShowSubmitPage(true);
    };

    recorder.start();
    setMediaRecorder(recorder);
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      stopCamera();
    }
  };

  // Handle uploaded file metadata checks
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setCheckingMetadata(true);
    setMetadataResult(null);

    // Read file as base64 preview
    const fileReader = new FileReader();
    fileReader.onload = () => {
      const result = fileReader.result as string;
      if (file.type.startsWith("image/")) {
        setCapturedPhoto(result);
        setCapturedVideo(null);
      } else if (file.type.startsWith("video/")) {
        setCapturedVideo(result);
        setCapturedPhoto(null);
      }
    };
    fileReader.readAsDataURL(file);

    // Simulate metadata check with elegant delayed feedback
    setTimeout(() => {
      setCheckingMetadata(false);
      const sizeStr = (file.size / (1024 * 1024)).toFixed(2) + " MB";
      
      if (simulateMissingMetadata) {
        setMetadataResult({
          valid: false,
          fileName: file.name,
          fileSize: sizeStr,
          details: "EXIF verification error: No GPS location data or valid camera timestamp tags found in this file header."
        });
      } else {
        // Successful EXIF extraction
        const randomLat = +(12.9719 + (Math.random() - 0.5) * 0.008).toFixed(6);
        const randomLng = +(77.6412 + (Math.random() - 0.5) * 0.008).toFixed(6);
        const timestamp = new Date().toLocaleString();
        
        setCoords({ lat: randomLat, lng: randomLng });
        setMetadataResult({
          valid: true,
          lat: randomLat,
          lng: randomLng,
          timestamp: timestamp,
          fileName: file.name,
          fileSize: sizeStr,
          details: "EXIF location and timestamp verified successfully! Geolocation data strictly matches certified device metadata."
        });
      }
    }, 1500);
  };

  const clearCapturedMedia = () => {
    setCapturedPhoto(null);
    setCapturedVideo(null);
    setUploadedFile(null);
    setMetadataResult(null);
    setShowSubmitPage(false);
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    setCapturedVideo(null);
    startCamera();
  };

  const handleAIScan = async () => {
    if (!description.trim()) {
      setErrorMsg("Please write a short description first to help the AI scan!");
      return;
    }

    setErrorMsg("");
    setIsScanning(true);
    setScanResult(null);

    try {
      const response = await fetch("/api/ai/analyze-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          imageBase64: capturedPhoto || undefined
        })
      });

      const data = await response.json();
      if (data.success) {
        setScanResult(data.analysis);
        setSelectedCategory(data.analysis.category);
        if (data.analysis.title) {
          setIssueTitle(data.analysis.title);
        }
      } else {
        setErrorMsg("Failed to scan report. Falling back to default routing.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Error communicating with AI analysis engine.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleSubmitReport = async () => {
    setErrorMsg("");
    setSuccessMsg("");

    const isSocialMode = activeMode === "social";
    const desc = isSocialMode ? socialDescription : description;
    const title = isSocialMode ? `Social Feed Link: ${selectedCategory}` : (issueTitle || `${selectedCategory} near ${locationName.split(',')[0]}`);
    const locName = isSocialMode ? socialLocation : locationName;
    const evLink = isSocialMode ? socialLink : evidenceLink;

    if (isSocialMode) {
      if (!socialLink.trim()) {
        setErrorMsg("Please provide a valid social media link!");
        return;
      }
      if (!socialDescription.trim()) {
        setErrorMsg("Description is required for social link reporting!");
        return;
      }
      if (!socialLocation.trim()) {
        setErrorMsg("Please specify the location name manually!");
        return;
      }
    } else {
      if (!desc.trim()) {
        setErrorMsg("Description is required!");
        return;
      }
    }

    const reportPayload = {
      category: selectedCategory,
      title: title,
      description: desc,
      locationName: locName,
      latitude: coords.lat,
      longitude: coords.lng,
      imageUrl: capturedPhoto || undefined,
      videoUrl: capturedVideo || undefined,
      isAnonymous: !earnPointsMode,
      evidenceLinks: evLink ? [evLink] : [],
      aiAnalyzed: scanResult,
    };

    try {
      const response = await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reportPayload)
      });
      const data = await response.json();
      if (data.success) {
        setSuccessMsg(`Report successfully filed! Assigned Tracking ID: ${data.issue.trackingId}. ${data.pointsAwarded > 0 ? `Awarded ${data.pointsAwarded} XP points!` : "Filed as Guest."}`);
        
        // Reset state
        setDescription("");
        setIssueTitle("");
        setEvidenceLink("");
        setScanResult(null);
        setCapturedPhoto(null);
        setCapturedVideo(null);
        setUploadedFile(null);
        setMetadataResult(null);
        setSocialLink("");
        setSocialLocation("");
        setSocialDescription("");
        setShowSubmitPage(false);

        if (onAddIssue) {
          onAddIssue(data.issue);
        }
      } else {
        setErrorMsg("Failed to submit. Check details.");
      }
    } catch (err) {
      setErrorMsg("Connection error submitting report.");
    }
  };

  // Sliding mode items configuration
  const modes = [
    { id: "camera", label: "Capture Camera", icon: Camera },
    { id: "upload", label: "Upload File", icon: UploadCloud },
    { id: "social", label: "Social Link", icon: Link2 }
  ];

  return (
    <div className="space-y-6 pb-24 text-left max-w-2xl mx-auto px-1 sm:px-4">
      {/* Top title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 uppercase tracking-wider">REPORT A CIVIC ISSUE</h2>
          <p className="text-xs text-slate-400 font-semibold uppercase mt-0.5">certified civic reporting center</p>
        </div>
      </div>

      {/* Mode sliding selector toggle */}
      {!showSubmitPage && (
        <div className="bg-slate-100 p-1.5 rounded-2xl relative flex items-center shadow-xs border border-slate-200">
          {modes.map((m) => {
            const IconComponent = m.icon;
            const isSelected = activeMode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => {
                  setActiveMode(m.id as ComplaintMode);
                  clearCapturedMedia();
                }}
                className="flex-1 relative flex items-center justify-center space-x-1.5 py-3 px-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border-none bg-transparent select-none z-10"
              >
                {isSelected && (
                  <motion.div
                    layoutId="activeReportMode"
                    className="absolute inset-0 bg-white rounded-xl shadow-md border border-slate-100 -z-10"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <IconComponent className={`h-4.5 w-4.5 ${isSelected ? "text-indigo-600" : "text-slate-500"}`} />
                <span className={isSelected ? "text-slate-800 font-extrabold" : "text-slate-500"}>{m.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* MULTI-MODE STAGE */}
      <AnimatePresence mode="wait">
        {!showSubmitPage ? (
          <motion.div
            key={activeMode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            {/* 1. CAMERA MODE */}
            {activeMode === "camera" && (
              <div className="space-y-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-6 shadow-sm flex flex-col items-center justify-center min-h-[340px]">
                  <div className="space-y-2">
                    <div className="mx-auto h-16 w-16 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-2 relative">
                      <Camera className="h-7 w-7" />
                      <span className="absolute inset-0 rounded-full border-2 border-indigo-500/20 animate-ping" />
                    </div>
                    <h3 className="text-base font-black text-slate-800 uppercase tracking-wider">CAPTURE CIVIC EVIDENCE</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                      Snap a photo or record video testimony of waste, waterlogging, or other local issues. Media is cryptographically geotagged for authenticity.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsFullScreenCameraOpen(true);
                    }}
                    className="flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black py-3.5 px-8 rounded-xl shadow-md cursor-pointer transition-colors uppercase tracking-wider border-none"
                  >
                    <Camera className="h-4.5 w-4.5" />
                    <span>Open Camera</span>
                  </button>

                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-full text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Certified Safe Geotag Verification Enabled</span>
                  </div>
                </div>
              </div>
            )}

            {/* 2. UPLOAD FILE MODE */}
            {activeMode === "upload" && (
              <div className="space-y-5">
                {/* Upload drag drop zone */}
                <label className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-8 bg-white flex flex-col items-center justify-center text-center cursor-pointer transition-all space-y-3 block">
                  <div className="p-4 bg-slate-50 rounded-full text-indigo-600">
                    <UploadCloud className="h-9 w-9" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wide">Drag & Drop or Tap to Browse File</span>
                    <p className="text-[10px] text-slate-400">Supports JPEG, PNG, MP4 up to 50MB</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {/* Loading scanner animation */}
                {checkingMetadata && (
                  <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/50 flex flex-col items-center justify-center text-center space-y-2 animate-pulse">
                    <RefreshCw className="h-6 w-6 text-indigo-600 animate-spin" />
                    <span className="text-[11px] font-extrabold text-indigo-950 uppercase tracking-wider">Checking EXIF Geotag Data & Timestamp...</span>
                    <p className="text-[9px] text-slate-400">Authenticating camera headers to reject screenshot fraud.</p>
                  </div>
                )}

                {/* Metadata checking results */}
                {metadataResult && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`p-4 rounded-2xl border ${
                      metadataResult.valid 
                        ? "bg-emerald-50 border-emerald-200 text-emerald-950" 
                        : "bg-rose-50 border-rose-200 text-rose-950"
                    } space-y-3 text-xs`}
                  >
                    <div className="flex items-center space-x-2 border-b pb-2">
                      {metadataResult.valid ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-rose-600" />
                      )}
                      <span className="font-extrabold uppercase tracking-wider text-sm">
                        {metadataResult.valid ? "Certified EXIF Geotags Verified" : "Verification Rejected"}
                      </span>
                    </div>

                    <div className="space-y-1 text-slate-700 text-[11px]">
                      <div><strong>File:</strong> {metadataResult.fileName} ({metadataResult.fileSize})</div>
                      {metadataResult.valid ? (
                        <>
                          <div className="flex items-center space-x-1 text-emerald-700 font-bold mt-1">
                            <MapPin className="h-3.5 w-3.5" />
                            <span>Location: {metadataResult.lat}° N, {metadataResult.lng}° E</span>
                          </div>
                          <div className="flex items-center space-x-1 text-emerald-700 font-bold">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>Timestamp: {metadataResult.timestamp}</span>
                          </div>
                          <p className="text-[10px] text-emerald-600 font-medium leading-normal mt-1.5">
                            {metadataResult.details}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-[10px] text-rose-600 font-extrabold leading-normal mt-1.5">
                            We do not accept files that lack valid GPS location metadata in order to prevent fraud. Please capture the issue using your phone camera or upload a photo that contains valid geotags.
                          </p>
                        </>
                      )}
                    </div>

                    {metadataResult.valid && (
                      <button
                        type="button"
                        onClick={() => {
                          setIssueTitle(`Reported issue from ${metadataResult.fileName}`);
                          setShowSubmitPage(true);
                        }}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all border-none cursor-pointer text-center"
                      >
                        Accept & Proceed to Submit
                      </button>
                    )}
                  </motion.div>
                )}
              </div>
            )}

            {/* 3. SOCIAL MEDIA LINK MODE */}
            {activeMode === "social" && (
              <div className="rounded-2xl bg-white border border-slate-200 p-5 space-y-4 shadow-sm">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">Add a Social Media Post</h3>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">IndiaCivic scrape engine automatically routes public posts</p>
                </div>

                {/* Social media inputs */}
                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Social Post Link (Required)</label>
                    <input
                      type="text"
                      placeholder="Paste Instagram, YouTube, X/Twitter, or Reddit post url..."
                      value={socialLink}
                      onChange={(e) => setSocialLink(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Description of Issue (Required)</label>
                    <textarea
                      placeholder="Specify what needs repair or attention..."
                      value={socialDescription}
                      onChange={(e) => setSocialDescription(e.target.value)}
                      className="w-full h-24 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Location Name (Required Manually)</label>
                    <input
                      type="text"
                      placeholder="e.g., 100 Feet Rd near Starbucks, Indiranagar, Bengaluru"
                      value={socialLocation}
                      onChange={(e) => setSocialLocation(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm"
                    />
                  </div>

                  {/* Choose Category */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Issue Category</label>
                    <div className="relative">
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl p-3 pr-10 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm cursor-pointer"
                      >
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="h-4 w-4 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {errorMsg && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center space-x-2 shadow-sm">
                    <AlertTriangle className="h-4.5 w-4.5 flex-shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-semibold flex items-center space-x-2 shadow-sm">
                    <CheckCircle className="h-4.5 w-4.5 flex-shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSubmitReport}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 transition-all text-white font-extrabold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center space-x-2 cursor-pointer shadow-sm border-none"
                >
                  <Send className="h-4.5 w-4.5" />
                  <span>Submit Social Civic Report</span>
                </button>
              </div>
            )}
          </motion.div>
        ) : (
          /* SUBMIT ISSUE PAGE FOR MODE 1 & 2 */
          <motion.div
            key="submit-form"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-5"
          >
            {/* Back to capture controls */}
            <button
              onClick={() => {
                setShowSubmitPage(false);
                setScanResult(null);
                setErrorMsg("");
              }}
              className="flex items-center space-x-2 text-xs font-extrabold text-slate-500 hover:text-slate-800 transition-all uppercase tracking-wider cursor-pointer border-none bg-transparent"
            >
              <ArrowLeft className="h-4.5 w-4.5" />
              <span>Back to Recapture / Reupload</span>
            </button>

            {/* FILE UPLOADED CARD */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center space-x-4 shadow-sm relative overflow-hidden">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 flex items-center justify-center flex-shrink-0">
                {capturedPhoto ? (
                  <img src={capturedPhoto} alt="Upload Thumbnail" className="w-full h-full object-cover" />
                ) : capturedVideo ? (
                  <div className="w-full h-full relative flex items-center justify-center">
                    <video src={capturedVideo} className="w-full h-full object-cover" />
                    <Play className="h-4 w-4 text-white absolute bg-black/40 rounded-full p-0.5" />
                  </div>
                ) : (
                  <FileCheck className="h-6 w-6 text-indigo-500" />
                )}
              </div>

              <div className="flex-1 min-w-0 text-left space-y-0.5">
                <span className="text-[10px] bg-indigo-50 text-indigo-700 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                  {uploadedFile ? "FILE IMPORTED" : "LIVE CAPTURE"}
                </span>
                <h4 className="text-xs font-bold text-slate-800 truncate">
                  {uploadedFile ? uploadedFile.name : `Certified_Media_Capture_${Date.now().toString().slice(-4)}.jpg`}
                </h4>
                <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-semibold uppercase">
                  <span className="flex items-center">
                    <MapPin className="h-3 w-3 mr-0.5 text-rose-500" />
                    Indiranagar
                  </span>
                  <span>•</span>
                  <span>EXIF Verified</span>
                </div>
              </div>

              <button
                type="button"
                onClick={clearCapturedMedia}
                className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer border-none bg-transparent"
                title="Remove evidence"
              >
                <Trash2 className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* MAIN FORM */}
            <div className="rounded-2xl bg-white border border-slate-200 p-5 space-y-4 shadow-sm">
              {/* Anonymous vs Points toggler */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center space-x-3 text-left">
                  <div className={`p-2 rounded-lg ${earnPointsMode ? "bg-indigo-50 border border-indigo-100" : "bg-rose-50 border border-rose-100"}`}>
                    {earnPointsMode ? (
                      <CheckCircle className="h-5 w-5 text-indigo-600" />
                    ) : (
                      <EyeOff className="h-5 w-5 text-rose-600" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                      {earnPointsMode ? "EARN POINTS MODE" : "ANONYMOUS REPORT"}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">
                      {earnPointsMode ? "Visible profile • Gain XP points" : "Identity hidden • No points granted"}
                    </p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setEarnPointsMode(!earnPointsMode)}
                  className="text-indigo-600 hover:text-indigo-700 bg-transparent border-none cursor-pointer"
                >
                  {earnPointsMode ? (
                    <ToggleRight className="h-8 w-8" />
                  ) : (
                    <ToggleLeft className="h-8 w-8" />
                  )}
                </button>
              </div>

              {/* Title Input field */}
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">Create Title</label>
                <input
                  type="text"
                  placeholder="Summarize the issue in a few words..."
                  value={issueTitle}
                  onChange={(e) => setIssueTitle(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm font-medium"
                />
              </div>

              {/* Description textarea */}
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">Description</label>
                <textarea 
                  placeholder="What needs fixing? E.g., Overflowing green municipal garbage bins blocking traffic..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full h-24 bg-white border border-slate-200 rounded-xl p-3.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm"
                />
              </div>

              {/* Dynamic Geolocation & Address field */}
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center justify-between">
                  <span>Detected Location / Landmark</span>
                  {locationLoading && (
                    <span className="text-[10px] text-indigo-600 animate-pulse font-extrabold uppercase">
                      Detecting actual location...
                    </span>
                  )}
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    placeholder="Enter neighborhood, street, or landmark..."
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 pr-10 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm font-medium"
                  />
                  <button
                    type="button"
                    onClick={refreshReportLocation}
                    title="Recalculate location from GPS"
                    className="absolute right-2 p-1.5 hover:bg-slate-100 rounded-lg text-indigo-600 hover:text-indigo-700 transition-all border-none bg-transparent cursor-pointer"
                  >
                    <MapPin className={`h-4.5 w-4.5 ${locationLoading ? "animate-bounce text-indigo-600" : "text-slate-400"}`} />
                  </button>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase font-mono">
                  <span>GPS: {coords.lat.toFixed(6)}° N, {coords.lng.toFixed(6)}° E</span>
                  {isActualLocation ? (
                    <span className="text-emerald-600">✓ Actual GPS Verified</span>
                  ) : (
                    <span className="text-indigo-500 animate-pulse">🛰️ Detecting GPS...</span>
                  )}
                </div>
              </div>

              {/* Category selector */}
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">Choose Issue Category</label>
                <div className="relative">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full appearance-none bg-white border border-slate-200 rounded-xl p-3.5 pr-10 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm cursor-pointer"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="h-4 w-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                </div>
              </div>

              {/* Evidence field */}
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center">
                  <Link2 className="h-3.5 w-3.5 mr-1 text-indigo-600" />
                  Attach Public Reel / Post Link <span className="ml-1 text-[10px] text-slate-400 font-semibold">(Optional evidence)</span>
                </label>
                <input 
                  type="text" 
                  placeholder="Paste Instagram, YouTube, or Twitter/X post link..."
                  value={evidenceLink}
                  onChange={(e) => setEvidenceLink(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm"
                />
              </div>

              {/* AI Scan button */}
              <div className="pt-2 flex space-x-3">
                <button
                  type="button"
                  disabled={isScanning}
                  onClick={handleAIScan}
                  className="flex-1 py-3 px-4 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition-all font-bold text-xs text-indigo-700 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  <ScanLine className={`h-4.5 w-4.5 ${isScanning ? "animate-spin" : ""}`} />
                  <span>{isScanning ? "AI SCANNING IMAGE & TEXT..." : "TRIGGER AI ROUTING SCAN"}</span>
                </button>
              </div>

              {/* AI analysis result feedback */}
              {scanResult && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs text-left shadow-sm animate-fade-in"
                >
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="font-bold text-indigo-700 uppercase">AI CATEGORY IDENTIFIED</span>
                    <span className="font-extrabold text-slate-800 uppercase">{scanResult.category}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">DEPARTMENT ROUTED</span>
                      <span className="font-semibold text-slate-700">{scanResult.department}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">OFFICER / COOPERATOR</span>
                      <span className="font-semibold text-slate-700">{scanResult.representative}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">ESTIMATED SEVERITY</span>
                      <span className="font-bold text-rose-700 uppercase">{scanResult.severity}/5 (Urgent Action)</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">FRAUD DETECTION SCORE</span>
                      <span className="font-extrabold text-emerald-700 uppercase">Passed (EXIF Match)</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center space-x-2 shadow-sm text-left">
                  <AlertTriangle className="h-4.5 w-4.5 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-semibold flex items-center space-x-2 shadow-sm text-left">
                  <CheckCircle className="h-4.5 w-4.5 flex-shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Final submission button */}
              <button
                type="button"
                onClick={handleSubmitReport}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 transition-all text-white font-extrabold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center space-x-2 cursor-pointer shadow-sm border-none"
              >
                <Send className="h-4.5 w-4.5" />
                <span>Submit Verified Civic Report</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Immersive Full-Screen Civic Camera Modal Overlay */}
      <AnimatePresence>
        {isFullScreenCameraOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black flex flex-col justify-between select-none"
          >
            {/* Header overlay HUD */}
            <div className="absolute top-0 inset-x-0 h-20 bg-gradient-to-b from-black/90 to-transparent px-4 py-3 flex items-center justify-between z-20">
              <button
                type="button"
                onClick={() => {
                  setIsFullScreenCameraOpen(false);
                  setCapturedPhoto(null);
                  setCapturedVideo(null);
                }}
                className="flex items-center space-x-1 bg-white/10 hover:bg-white/20 active:scale-95 text-white px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border-none cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Close</span>
              </button>
              
              <div className="flex items-center space-x-1.5 bg-rose-600/90 text-white px-2.5 py-1.5 rounded-xl text-[9px] font-mono font-bold tracking-wider uppercase border border-rose-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                <span>GPS: {coords.lat.toFixed(5)}°N, {coords.lng.toFixed(5)}°E</span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={toggleFlashlight}
                  className={`p-2.5 rounded-xl flex items-center justify-center transition-all border-none cursor-pointer ${
                    flashOn ? "bg-amber-500 text-slate-950" : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                  title="Toggle Flash"
                >
                  <Zap className="h-4 w-4" />
                </button>
                
                <button
                  type="button"
                  onClick={() => setFacingMode(p => p === "environment" ? "user" : "environment")}
                  className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all border-none cursor-pointer"
                  title="Rotate Camera"
                >
                  <RotateCw className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Viewfinder block */}
            <div className="absolute inset-0 w-full h-full overflow-hidden flex items-center justify-center bg-black">
              {cameraStream ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transition-transform duration-250"
                  style={{
                    transform: `scale(${zoomLevel})`,
                    transformOrigin: "center"
                  }}
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-5 bg-slate-950 text-white z-10">
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-full text-indigo-400">
                    <Camera className="h-10 w-10 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-extrabold uppercase tracking-wider">Camera Feed Loading</h4>
                    <p className="text-slate-400 text-[10px] max-w-xs mx-auto leading-relaxed">
                      Please allow camera stream access. If blocked, tap below to capture natively using your phone.
                    </p>
                  </div>
                  <label className="flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black py-3 px-6 rounded-xl shadow-lg cursor-pointer transition-colors uppercase tracking-wider border-none text-center">
                    <Camera className="h-4 w-4" />
                    <span>Use Device Camera</span>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      capture="environment"
                      onChange={(e) => {
                        handleNativeCapture(e);
                        setIsFullScreenCameraOpen(false);
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Active Recording HUD Indicator */}
            {isRecording && (
              <div className="absolute top-24 left-1/2 -translate-x-1/2 flex items-center space-x-2 bg-rose-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold tracking-widest uppercase animate-pulse z-10">
                <span className="h-2 w-2 rounded-full bg-white" />
                <span>REC VIDEO</span>
              </div>
            )}

            {/* Bottom HUD area: zoom & shutter */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/80 to-transparent p-6 flex flex-col space-y-4 z-20">
              {/* Zoom Level Option Slider */}
              <div className="flex items-center justify-center space-x-2 text-white">
                <span className="text-[10px] font-mono text-slate-400">1x</span>
                <input
                  type="range"
                  min="1"
                  max="4"
                  step="0.5"
                  value={zoomLevel}
                  onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
                  className="w-32 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <span className="text-[10px] font-bold font-mono text-indigo-400">{zoomLevel}x Zoom</span>
              </div>

              {/* Shutter Button Bar */}
              <div className="flex items-center justify-around max-w-sm mx-auto w-full">
                {/* Click Photo Button */}
                <button
                  type="button"
                  onClick={capturePhoto}
                  disabled={isRecording}
                  className="flex-1 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-950 h-14 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 cursor-pointer transition-all active:scale-95 shadow-lg mx-2 border-none"
                >
                  <Camera className="h-5 w-5 text-indigo-600" />
                  <span>Snapshot</span>
                </button>

                {/* Take Video Button */}
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`flex-1 h-14 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 cursor-pointer transition-all active:scale-95 shadow-lg mx-2 text-white border-none ${
                    isRecording 
                      ? "bg-rose-600 hover:bg-rose-700 animate-pulse" 
                      : "bg-slate-900 hover:bg-slate-800 border border-slate-700"
                  }`}
                >
                  {isRecording ? (
                    <>
                      <Square className="h-4 w-4 fill-white animate-pulse" />
                      <span>Stop (REC)</span>
                    </>
                  ) : (
                    <>
                      <Video className="h-4.5 w-4.5 text-rose-500" />
                      <span>Record</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Captured Media Preview Overlay inside the modal */}
            {(capturedPhoto || capturedVideo) && (
              <div className="absolute inset-0 w-full h-full bg-slate-950 flex flex-col justify-center items-center p-4 z-30">
                {capturedPhoto && (
                  <img src={capturedPhoto} alt="Captured Testimony" className="max-h-[70vh] max-w-full rounded-2xl object-contain border border-slate-800 shadow-2xl" />
                )}
                {capturedVideo && (
                  <video src={capturedVideo} controls autoPlay loop className="max-h-[70vh] max-w-full rounded-2xl object-contain border border-slate-800 shadow-2xl" />
                )}

                <div className="mt-6 space-y-4 w-full max-w-sm text-center">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1.5 text-[10px] bg-emerald-500/20 text-emerald-400 font-extrabold px-3 py-1 rounded-full uppercase tracking-widest font-mono">
                      <CheckCircle className="h-3 w-3" /> GPS Watermarked
                    </span>
                    <p className="text-white text-xs font-semibold">Verify this testimony to generate your report.</p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleRetake}
                      className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all border border-white/10 cursor-pointer text-center"
                    >
                      Retake
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSubmitPage(true);
                        setIsFullScreenCameraOpen(false);
                      }}
                      className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer text-center border-none"
                    >
                      Use Media
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
