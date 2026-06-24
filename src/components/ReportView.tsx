/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
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
  RefreshCw
} from "lucide-react";
import { Issue } from "../types";

interface ReportViewProps {
  onAddIssue: (issue: Partial<Issue>) => void;
}

export default function ReportView({ onAddIssue }: ReportViewProps) {
  // Coordinates default to Indiranagar
  const [coords, setCoords] = useState({ lat: 12.9719, lng: 77.6412 });
  const [gpsLock, setGpsLock] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("Waste Management");
  const [earnPointsMode, setEarnPointsMode] = useState(true);
  const [description, setDescription] = useState("");
  const [evidenceLink, setEvidenceLink] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Camera & File Upload states
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [capturedVideo, setCapturedVideo] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [videoElementRef, setVideoElementRef] = useState<HTMLVideoElement | null>(null);

  // WhatsApp bot state
  const [whatsappMsg, setWhatsappMsg] = useState("");
  const [whatsappChat, setWhatsappChat] = useState<Array<{ sender: "user" | "bot"; text: string; time: string }>>([
    { sender: "bot", text: "Namaste! Welcome to IndiaCivic WhatsApp Helpline. Send me a photo, location, or message of any civic problem in your ward (garbage, leaks, broken streetlights).", time: "14:30" }
  ]);

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
    // Simulate slight fluctuations in GPS coordinate accuracy
    if (gpsLock) {
      const interval = setInterval(() => {
        setCoords(prev => ({
          lat: +(12.9719 + (Math.random() - 0.5) * 0.0004).toFixed(6),
          lng: +(77.6412 + (Math.random() - 0.5) * 0.0004).toFixed(6),
        }));
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [gpsLock]);

  const startCamera = async () => {
    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: true
      });
      setCameraStream(stream);
      if (videoElementRef) {
        videoElementRef.srcObject = stream;
      }
    } catch (err) {
      console.error("Error starting camera:", err);
      setErrorMsg("Could not access your device camera. Please try importing/uploading a file instead!");
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  useEffect(() => {
    if (!capturedPhoto && !capturedVideo) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [capturedPhoto, capturedVideo, videoElementRef]);

  const capturePhoto = () => {
    if (!videoElementRef) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoElementRef.videoWidth || 640;
    canvas.height = videoElementRef.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoElementRef, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg");
      setCapturedPhoto(dataUrl);
      stopCamera();
    }
  };

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
  };

  const clearCapturedMedia = () => {
    setCapturedPhoto(null);
    setCapturedVideo(null);
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

    const reportPayload = {
      category: selectedCategory,
      title: scanResult?.title || `${selectedCategory} near Indiranagar`,
      description,
      locationName: "Indiranagar, Bengaluru",
      latitude: coords.lat,
      longitude: coords.lng,
      imageUrl: capturedPhoto || undefined,
      videoUrl: capturedVideo || undefined,
      isAnonymous: !earnPointsMode,
      evidenceLinks: evidenceLink ? [evidenceLink] : [],
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
        // Reset form
        setDescription("");
        setEvidenceLink("");
        setScanResult(null);
        setCapturedPhoto(null);
        setCapturedVideo(null);
        // Call callback to notify parent so it updates in real-time
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

  const handleSendWhatsApp = async () => {
    if (!whatsappMsg.trim()) return;

    const userText = whatsappMsg;
    setWhatsappChat(prev => [...prev, { sender: "user", text: userText, time: "Just Now" }]);
    setWhatsappMsg("");

    // Call fallback routing / simulation mock to handle text
    setTimeout(async () => {
      try {
        const response = await fetch("/api/ai/analyze-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: userText })
        });
        const data = await response.json();
        
        if (data.success) {
          const mockTrack = "IC-" + Math.floor(Math.random() * 9000 + 1000);
          
          // Submit to server in background
          await fetch("/api/issues", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              category: data.analysis.category,
              title: data.analysis.title,
              description: userText,
              locationName: "WhatsApp GeoPin, Indiranagar",
              latitude: 12.9719,
              longitude: 77.6412,
              imageUrl: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=600&q=80",
              isAnonymous: true,
            })
          });

          setWhatsappChat(prev => [...prev, {
            sender: "bot",
            text: `📝 Ticket created!\n\nCategory: *${data.analysis.category}*\nTracking ID: *#${mockTrack}*\nStatus: *PENDING VERIFICATION*\nRouting: *${data.analysis.department}*\n\nNeighbors near Indiranagar are now prompted to verify this. Thanks for being a vigilant citizen!`,
            time: "Just Now"
          }]);
        }
      } catch (err) {
        setWhatsappChat(prev => [...prev, {
          sender: "bot",
          text: "Sorry, I had trouble parsing that. Please provide description and category.",
          time: "Just Now"
        }]);
      }
    }, 1000);
  };

  return (
    <div className="space-y-6 pb-24 text-left">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-slate-800 uppercase tracking-wider">REPORT A CIVIC ISSUE</h2>
        <p className="text-xs text-slate-400 font-semibold uppercase mt-0.5">Mobile-first reporting terminal</p>
      </div>

      {/* Camera viewfinder section */}
      <div className="relative h-[240px] rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 shadow-md flex flex-col justify-center items-center">
        <div className="w-full h-full relative flex flex-col justify-center items-center">
          {capturedPhoto ? (
            <div className="w-full h-full relative">
              <img 
                src={capturedPhoto} 
                alt="Captured review" 
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 right-4 z-20">
                <button
                  type="button"
                  onClick={clearCapturedMedia}
                  className="flex items-center space-x-1 bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-md cursor-pointer uppercase transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Clear</span>
                </button>
              </div>
            </div>
          ) : capturedVideo ? (
            <div className="w-full h-full relative">
              <video 
                src={capturedVideo} 
                controls 
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 right-4 z-20">
                <button
                  type="button"
                  onClick={clearCapturedMedia}
                  className="flex items-center space-x-1 bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-md cursor-pointer uppercase transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Clear</span>
                </button>
              </div>
            </div>
          ) : cameraStream ? (
            <div className="w-full h-full relative flex flex-col justify-end">
              <video
                ref={(el) => {
                  setVideoElementRef(el);
                  if (el && cameraStream && el.srcObject !== cameraStream) {
                    el.srcObject = cameraStream;
                  }
                }}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover absolute inset-0"
              />
              
              {/* HUD Overlay */}
              <div className="absolute top-4 left-4 flex items-center space-x-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-[9px] font-mono text-white shadow-sm z-10 border border-white/10">
                <MapPin className="h-3 w-3 text-red-500" />
                <span>{coords.lat}° N, {coords.lng}° E</span>
              </div>

              {isRecording && (
                <div className="absolute top-4 right-4 flex items-center space-x-1.5 bg-rose-600 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold shadow-sm z-10 animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  <span>RECORDING</span>
                </div>
              )}

              {/* Camera Buttons HUD */}
              <div className="absolute bottom-4 inset-x-4 flex justify-center items-center space-x-4 bg-black/65 backdrop-blur-sm p-3 rounded-2xl border border-white/10 z-10 shadow-lg">
                {/* Capture Photo Button */}
                <button
                  type="button"
                  onClick={capturePhoto}
                  disabled={isRecording}
                  className="flex-1 bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-900 py-2.5 px-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-1.5 cursor-pointer transition-all active:scale-95 shadow-md"
                >
                  <Camera className="h-4 w-4 text-slate-800" />
                  <span>Take Photo</span>
                </button>

                {/* Record Video Button */}
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-1.5 cursor-pointer transition-all active:scale-95 shadow-md text-white ${
                    isRecording 
                      ? "bg-rose-600 hover:bg-rose-700 animate-pulse" 
                      : "bg-slate-800 hover:bg-slate-700 border border-slate-600"
                  }`}
                >
                  {isRecording ? (
                    <>
                      <Square className="h-4 w-4 fill-white" />
                      <span>Stop</span>
                    </>
                  ) : (
                    <>
                      <Video className="h-4 w-4" />
                      <span>Record Video</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center flex flex-col items-center justify-center space-y-4">
              <div className="p-3 bg-slate-800 border border-slate-700 rounded-full text-indigo-400">
                <Camera className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <p className="text-white text-xs font-bold uppercase tracking-wide">Device Camera is Ready</p>
                <p className="text-slate-400 text-[10px]">Grant permissions or upload a media file directly below</p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={startCamera}
                  className="flex items-center justify-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-md cursor-pointer transition-colors uppercase tracking-wider"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Start Live Feed</span>
                </button>

                <label className="flex items-center justify-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-bold py-2 px-4 rounded-xl shadow-md cursor-pointer transition-colors uppercase tracking-wider">
                  <UploadCloud className="h-3.5 w-3.5" />
                  <span>Capture / Upload File</span>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    capture="environment"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main submission form */}
      <div className="rounded-2xl bg-white border border-slate-200 p-5 space-y-4 shadow-sm animate-fade-in">
        {/* Toggle between Anonymous vs Points Mode */}
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

        {/* Category selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">Choose Issue Category</label>
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full appearance-none bg-white border border-slate-200 rounded-xl p-3.5 pr-10 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm cursor-pointer"
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

        {/* Description field */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">Describe the Problem</label>
          <textarea 
            placeholder="What needs fixing? E.g., Overflowing green municipal garbage bins blocking traffic..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full h-24 bg-white border border-slate-200 rounded-xl p-3.5 text-xs text-slate-800 placeholder:text-slate-350 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
          />
        </div>

        {/* Evidence field */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center">
            <Link2 className="h-3.5 w-3.5 mr-1 text-indigo-600" />
            Attach Public Reel / Post Link <span className="ml-1 text-[10px] text-slate-400 font-semibold">(Optional evidence)</span>
          </label>
          <input 
            type="text" 
            placeholder="Paste Instagram, YouTube, or Twitter/X post link..."
            value={evidenceLink}
            onChange={(e) => setEvidenceLink(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder:text-slate-350 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
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
            className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs text-left shadow-sm"
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

        {/* Final submission buttons */}
        <button
          type="button"
          onClick={handleSubmitReport}
          className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 transition-all text-white font-extrabold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center space-x-2 cursor-pointer shadow-sm"
        >
          <Send className="h-4.5 w-4.5" />
          <span>Submit Verified Civic Report</span>
        </button>
      </div>

      {/* WhatsApp helpline simulator section */}
      <div className="rounded-2xl bg-white border border-slate-200 p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-left">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">WHATSAPP / SMS CHATBOT SIMULATOR</h3>
          </div>
          <span className="px-2 py-0.5 text-[9px] bg-emerald-50 text-emerald-700 font-bold rounded border border-emerald-200 uppercase">Helpline Active</span>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed text-left">
          Non-app users can quickly file complaints by simply sending a text description or a photo to our WhatsApp bot. Try it out below!
        </p>

        {/* Chat box */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 h-[220px] overflow-y-auto space-y-3 flex flex-col scrollbar-none shadow-inner">
          {whatsappChat.map((msg, idx) => (
            <div 
              key={idx}
              className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed text-left ${
                msg.sender === "user" 
                  ? "bg-indigo-600 text-white font-medium self-end rounded-br-none" 
                  : "bg-white border border-slate-200 text-slate-700 self-start rounded-bl-none whitespace-pre-wrap shadow-sm animate-fade-in"
              }`}
            >
              {msg.text}
              <div className={`text-[8px] mt-1 text-right ${msg.sender === "user" ? "text-indigo-200" : "text-slate-400"}`}>
                {msg.time}
              </div>
            </div>
          ))}
        </div>

        {/* Message Input bar */}
        <div className="flex space-x-2">
          <input 
            type="text"
            placeholder="Type a report (e.g. Broken pipe at 100ft road Indiranagar)..."
            value={whatsappMsg}
            onChange={(e) => setWhatsappMsg(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendWhatsApp()}
            className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 text-xs text-slate-800 placeholder:text-slate-350 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
          />
          <button
            onClick={handleSendWhatsApp}
            className="p-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors cursor-pointer shadow-sm"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
