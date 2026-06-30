/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Award, 
  Flame, 
  Users, 
  Heart, 
  TrendingUp, 
  BarChart2, 
  Share2, 
  CheckCircle, 
  Leaf, 
  Map as MapIcon, 
  ShieldCheck, 
  ArrowRight,
  Download,
  Building,
  User,
  Zap,
  Info,
  X,
  MapPin,
  Search,
  Compass,
  Loader2,
  Check,
  Sparkles,
  Lock,
  FileText,
  Settings
} from "lucide-react";
import { UserProfile } from "../types";
import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import jsPDF from "jspdf";

// Setup Google Maps API key
const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  "";

const hasValidKey = Boolean(API_KEY) && API_KEY !== "YOUR_API_KEY";

const LIGHT_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#fbf5f0" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8b2635" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#fbf5f0" }, { weight: 2 }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#f5cbc4" }, { weight: 1.2 }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#f7ede2" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#d2edf2" }] }
];

const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#1f2937" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9ca3af" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#111827" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#111827" }] }
];

interface ProfileViewProps {
  user: UserProfile;
  citizen: UserProfile;
  org: UserProfile;
  onToggleRole: (targetRole: 'CITIZEN' | 'ORGANIZATION') => void;
  leaderboardUsers?: UserProfile[];
  onRefreshProfile?: () => void;
  onDetectLocation?: () => void;
  isLocationLoading?: boolean;
}

export default function ProfileView({ 
  user, 
  citizen, 
  org, 
  onToggleRole, 
  leaderboardUsers, 
  onRefreshProfile,
  onDetectLocation,
  isLocationLoading
}: ProfileViewProps) {
  const [selectedLeaderboard, setSelectedLeaderboard] = useState<"ward" | "city" | "national">("ward");
  const [profileTab, setProfileTab] = useState<"dashboard" | "settings">("dashboard");
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareBtnText, setShareBtnText] = useState("Download & Share on WhatsApp");

  // WhatsApp states
  const [whatsappHandshakeCode, setWhatsappHandshakeCode] = useState<string | null>(null);
  const [isRequestingHandshake, setIsRequestingHandshake] = useState(false);

  const handleRequestHandshake = async () => {
    setIsRequestingHandshake(true);
    try {
      const response = await fetch("/api/whatsapp/request-handshake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id })
      });
      const data = await response.json();
      if (data.success) {
        setWhatsappHandshakeCode(data.code);
        
        // Auto-refresh profile every 3 seconds to check if they completed verification
        const interval = setInterval(async () => {
          if (onRefreshProfile) {
            onRefreshProfile();
          }
        }, 3000);
        
        // Stop checking after 5 mins
        setTimeout(() => clearInterval(interval), 300000);
      }
    } catch (err) {
      console.error("Error requesting handshake code:", err);
    } finally {
      setIsRequestingHandshake(false);
    }
  };

  // Precise Location selection modal states
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [locationQuery, setLocationQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedMarkerPos, setSelectedMarkerPos] = useState({ lat: 12.9719, lng: 77.6412 });
  const [mapCenter, setMapCenter] = useState({ lat: 12.9719, lng: 77.6412 });
  const [mapZoom, setMapZoom] = useState(13);
  const [isSavingLoc, setIsSavingLoc] = useState(false);
  const [locModalError, setLocModalError] = useState("");

  // Verification state machine
  const [showVerificationWizard, setShowVerificationWizard] = useState(false);
  const [verificationStep, setVerificationStep] = useState(1); // 1: Info, 2: Upload, 3: Verifying, 4: Complete
  const [voterCardNum, setVoterCardNum] = useState("");
  const [govtIdType, setGovtIdType] = useState("VOTER_ID");
  const [orgRegistrationNum, setOrgRegistrationNum] = useState("");
  const [orgTaxExemptNum, setOrgTaxExemptNum] = useState("");
  const [verificationError, setVerificationError] = useState("");
  
  // Persistence of local verification status in localStorage
  const [isCitizenVerified, setIsCitizenVerified] = useState(false);
  const [isOrgVerified, setIsOrgVerified] = useState(false);

  useEffect(() => {
    // Read cached or database verification status
    const isDbVerified = !!user.isVerified;
    const civVerified = (user.role === "CITIZEN" && isDbVerified) || localStorage.getItem(`verified_citizen_${user.id}`) === "true";
    const firmVerified = (user.role === "ORGANIZATION" && isDbVerified) || localStorage.getItem(`verified_org_${user.id}`) === "true";
    setIsCitizenVerified(civVerified);
    setIsOrgVerified(firmVerified);
  }, [user.id, user.isVerified, user.role]);

  const handleOpenLocationModal = () => {
    setLocationQuery(user.location || "Indiranagar, Bengaluru");
    setLocModalError("");
    setSearchResults([]);
    setIsEditingLocation(true);
    
    // Attempt to seed from current user coordinates
    const initialLat = user.latitude || 12.9719;
    const initialLng = user.longitude || 77.6412;
    setSelectedMarkerPos({ lat: initialLat, lng: initialLng });
    setMapCenter({ lat: initialLat, lng: initialLng });
    setMapZoom(14);
  };

  const detectPreciseLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setSelectedMarkerPos(newCoords);
          setMapCenter(newCoords);
          setMapZoom(16);
          reverseGeocodeCoords(newCoords.lat, newCoords.lng);
        },
        (error) => {
          setLocModalError("Failed to fetch current position. Please enable GPS permissions.");
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      setLocModalError("Geolocation is not supported by your browser.");
    }
  };

  const handleSearchLocation = async () => {
    if (!locationQuery.trim()) return;
    setIsSearching(true);
    setLocModalError("");
    try {
      const res = await fetch(`/api/search-geocode?q=${encodeURIComponent(locationQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
        if (data.length === 0) {
          setLocModalError("No matching places found. Try checking the spelling.");
        }
      } else {
        setLocModalError("Geocoding service returned an error.");
      }
    } catch (e: any) {
      console.error(e);
      setLocModalError("Search error: " + e.message);
    } finally {
      setIsSearching(false);
    }
  };

  const selectSearchResult = (item: any) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    if (!isNaN(lat) && !isNaN(lon)) {
      const pos = { lat, lng: lon };
      setSelectedMarkerPos(pos);
      setMapCenter(pos);
      setMapZoom(16);
      
      const parts = item.display_name ? item.display_name.split(",") : [item.name];
      const compactName = parts.slice(0, 2).map((p: string) => p.trim()).join(", ");
      setLocationQuery(compactName || item.name || locationQuery);
      setSearchResults([]);
    }
  };

  const reverseGeocodeCoords = async (lat: number, lng: number) => {
    try {
      const res = await fetch(`/api/reverse-geocode?lat=${lat}&lng=${lng}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.address) {
          const sub = data.address.suburb || data.address.neighbourhood || data.address.village || data.address.residential || data.address.road || "Local Area";
          const city = data.address.city || data.address.town || data.address.state_district || "India";
          setLocationQuery(`${sub}, ${city}`);
        } else {
          setLocationQuery(`${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleMapClick = (e: any) => {
    let lat: number | null = null;
    let lng: number | null = null;
    
    if (e.detail?.latLng) {
      lat = typeof e.detail.latLng.lat === 'function' ? e.detail.latLng.lat() : e.detail.latLng.lat;
      lng = typeof e.detail.latLng.lng === 'function' ? e.detail.latLng.lng() : e.detail.latLng.lng;
    } else if (e.latLng) {
      lat = typeof e.latLng.lat === 'function' ? e.latLng.lat() : e.latLng.lat;
      lng = typeof e.latLng.lng === 'function' ? e.latLng.lng() : e.latLng.lng;
    }
    
    if (lat !== null && lng !== null) {
      const pos = { lat, lng };
      setSelectedMarkerPos(pos);
      reverseGeocodeCoords(lat, lng);
    }
  };

  const handleSaveLocation = async () => {
    if (!locationQuery.trim()) {
      setLocModalError("Please specify a location name.");
      return;
    }
    
    setIsSavingLoc(true);
    setLocModalError("");
    try {
      const wardNum = Math.floor((Math.abs(selectedMarkerPos.lat) + Math.abs(selectedMarkerPos.lng)) * 100) % 150 + 1;
      const wardName = `Ward ${wardNum}`;
      
      const res = await fetch("/api/profile/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: locationQuery,
          wardName,
          lat: selectedMarkerPos.lat,
          lng: selectedMarkerPos.lng
        })
      });
      
      if (res.ok) {
        setIsEditingLocation(false);
        if (onRefreshProfile) {
          onRefreshProfile();
        }
      } else {
        setLocModalError("Failed to update profile location on the server.");
      }
    } catch (e: any) {
      console.error(e);
      setLocModalError("Error saving location: " + e.message);
    } finally {
      setIsSavingLoc(false);
    }
  };

  const handleDownloadESGCertificate = () => {
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    pdf.setFillColor(15, 23, 42);
    pdf.rect(0, 0, 297, 210, "F");
    pdf.setTextColor(255, 255, 255);
    
    pdf.setFontSize(24);
    pdf.text("ESG IMPACT CERTIFICATE", 148, 50, { align: "center" });
    
    pdf.setFontSize(14);
    pdf.text(`Issued to: ${user.name}`, 148, 80, { align: "center" });
    pdf.text(`Carbon Credits: ${(user.carbonCredits || 0).toLocaleString()} C`, 148, 100, { align: "center" });
    pdf.text(`Civic Score: ${(user.civicScore || 0).toLocaleString()} XP`, 148, 115, { align: "center" });
    pdf.text(`Date: ${new Date().toLocaleDateString("en-IN")}`, 148, 130, { align: "center" });
    
    pdf.text("Verified by IndiaCivic Platform — CIN: U74999KA2026OPC000001", 148, 160, { align: "center" });
    pdf.save(`IndiaCivic_ESG_Certificate_${user.name.replace(/\s+/g, "_")}.pdf`);
  };

  const handleShareImpactCard = async () => {
    const shareText = `🏆 I'm making Indiranagar better!\n\n` +
      `📍 ${user.location || "My Ward"}\n` +
      `⚡ ${user.totalPoints.toLocaleString()} Civic XP\n` +
      `🤝 ${user.citizensHelped.toLocaleString()} neighbors helped\n` +
      `🔥 ${user.streakDays} day streak\n\n` +
      `Join me on IndiaCivic: https://indiacivic.app`;

    try {
      if (navigator.share) {
        await navigator.share({ title: "My IndiaCivic Impact", text: shareText });
      } else {
        await navigator.clipboard.writeText(shareText);
        setShareBtnText("Copied to Clipboard!");
        setTimeout(() => {
          setShareBtnText("Download & Share on WhatsApp");
          setShowShareModal(false);
        }, 1500);
      }
    } catch (err) {
      console.warn("Share API failed, falling back", err);
      try {
        await navigator.clipboard.writeText(shareText);
        setShareBtnText("Copied to Clipboard!");
        setTimeout(() => {
          setShareBtnText("Download & Share on WhatsApp");
          setShowShareModal(false);
        }, 1500);
      } catch (e) {
        setShareBtnText("Failed to copy/share");
        setTimeout(() => setShareBtnText("Download & Share on WhatsApp"), 2000);
      }
    }
  };

  // Start the verification simulation
  const startVerificationProcess = () => {
    setVerificationStep(2);
  };

  const submitVerificationDetails = async () => {
    setVerificationStep(3);
    setVerificationError("");

    const documentId = user.role === "CITIZEN" ? voterCardNum : orgRegistrationNum;
    const verificationType = user.role === "CITIZEN" ? govtIdType : "GSTIN";

    try {
      const response = await fetch("/api/profile/verify-identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          verificationType,
          documentId
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setVerificationStep(4);
        if (user.role === "CITIZEN") {
          setIsCitizenVerified(true);
          localStorage.setItem(`verified_citizen_${user.id}`, "true");
        } else {
          setIsOrgVerified(true);
          localStorage.setItem(`verified_org_${user.id}`, "true");
        }
        if (onRefreshProfile) {
          onRefreshProfile();
        }
      } else {
        setVerificationError(data.error || "Verification failed. Please check document format.");
        setVerificationStep(2);
      }
    } catch (err: any) {
      console.error("Verification API Error:", err);
      setVerificationError("Network error occurred during verification. Try again.");
      setVerificationStep(2);
    }
  };

  // Determine if database leaderboard data is loaded
  const hasDbUsers = leaderboardUsers && leaderboardUsers.length > 0;

  // Build the active user list ensuring the current user is included
  let activeUsersList = leaderboardUsers ? [...leaderboardUsers] : [];
  if (user && user.id && user.id !== 'guest' && !activeUsersList.some(u => u.id === user.id)) {
    activeUsersList.push(user);
  }

  // Filter citizens and organizations
  const dbCitizens = activeUsersList.filter(p => p.role === "CITIZEN");
  const dbOrgs = activeUsersList.filter(p => p.role === "ORGANIZATION");

  const getLeaderboardList = (profiles: UserProfile[]) => {
    return profiles
      .slice()
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((p, index) => ({
        rank: index + 1,
        name: p.name,
        points: p.totalPoints,
        badge: p.badges && p.badges.length > 0 ? p.badges[0] : "Active Citizen",
        isUser: p.id === user.id,
        credits: p.carbonCredits ? `${p.carbonCredits.toLocaleString()} C` : "0 C"
      }));
  };

  // Ward leaderboard filter (same location or Indiranagar, Bengaluru)
  const wardCitizens = dbCitizens.filter(p => 
    p.location === user.location || 
    p.location?.includes("Indiranagar") || 
    p.id === user.id
  );

  // City leaderboard filter (same city or Indiranagar/Bengaluru)
  const cityCitizens = dbCitizens.filter(p => 
    p.location?.includes("Bengaluru") || 
    p.location?.includes("Indiranagar") || 
    p.id === user.id
  );

  const dynamicLeaderboards = {
    ward: getLeaderboardList(wardCitizens),
    city: getLeaderboardList(cityCitizens),
    national: getLeaderboardList(dbCitizens)
  };

  const dynamicOrgLeaderboard = getLeaderboardList(dbOrgs);

  const finalLeaderboards = {
    ward: dynamicLeaderboards.ward,
    city: dynamicLeaderboards.city,
    national: dynamicLeaderboards.national,
  };

  const finalOrgLeaderboard = dynamicOrgLeaderboard;

  const userRankInWard = finalLeaderboards.ward.findIndex(e => e.isUser) + 1;
  const totalWardPlayers = finalLeaderboards.ward.length;
  const percentile = (userRankInWard && totalWardPlayers)
    ? Math.max(1, Math.round((userRankInWard / totalWardPlayers) * 100))
    : 5;

  // Render Verification Badge Status
  const renderVerificationStatusBadge = () => {
    const isVerified = user.role === "CITIZEN" ? isCitizenVerified : isOrgVerified;
    if (isVerified) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>VERIFIED ID ACTIVE</span>
        </span>
      );
    }
    return (
      <button 
        onClick={() => {
          setVerificationStep(1);
          setShowVerificationWizard(true);
        }}
        className="inline-flex items-center space-x-1.5 px-3 py-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/30 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-400 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow-sm cursor-pointer transition-colors"
      >
        <Lock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
        <span>Get Civic Verified</span>
      </button>
    );
  };

  return (
    <div className="space-y-6 pb-24 text-left">
      {/* Workspace Tabs: Separating Citizen Passport and Organization Corporate Workspace */}
      <div className="flex bg-slate-150 dark:bg-slate-900/60 p-1 rounded-2xl border border-slate-250 dark:border-slate-800/80 max-w-sm mx-auto shadow-sm">
        <button
          onClick={() => setProfileTab("dashboard")}
          className={`flex-1 py-2 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer border-none flex items-center justify-center space-x-1.5 ${
            profileTab === "dashboard"
              ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
              : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 bg-transparent font-extrabold"
          }`}
        >
          {user.role === "ORGANIZATION" ? (
            <>
              <Building className="h-3.5 w-3.5" />
              <span>Org Workspace</span>
            </>
          ) : (
            <>
              <User className="h-3.5 w-3.5" />
              <span>Citizen Passport</span>
            </>
          )}
        </button>
        <button
          onClick={() => setProfileTab("settings")}
          className={`flex-1 py-2 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer border-none flex items-center justify-center space-x-1.5 ${
            profileTab === "settings"
              ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
              : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 bg-transparent font-extrabold"
          }`}
        >
          <Settings className="h-3.5 w-3.5" />
          <span>Account Settings</span>
        </button>
      </div>

      {profileTab === "settings" ? (
        // ACCOUNT SETTINGS VIEW WITH OPTION TO CONVERT ACCOUNT TYPES
        <div className="space-y-6">
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />
            
            <div>
              <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Account Settings</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-bold">Manage localized credentials and cross-account type conversions</p>
            </div>

            {/* Profile Avatar & Info Card */}
            <div className="flex items-center space-x-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80">
              <img 
                src={user.avatar || undefined} 
                alt={user.name}
                referrerPolicy="no-referrer"
                className="h-14 w-14 rounded-full object-cover border-2 border-indigo-500 dark:border-indigo-400"
              />
              <div>
                <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">{user.name}</h4>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="uppercase text-[9px] font-black tracking-wider px-2 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800 text-slate-650 dark:text-slate-300">
                    {user.role} ACCOUNT
                  </span>
                  <span className="text-[9px] font-mono text-slate-450">ID: {user.id.substring(0, 12)}</span>
                </div>
              </div>
            </div>

            {/* Unified Location Settings Card */}
            <div className="space-y-3.5 p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <h5 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Registered Geographic Pin</h5>
                </div>
                <button
                  type="button"
                  onClick={handleOpenLocationModal}
                  className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 hover:border-indigo-300 dark:hover:border-indigo-800 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-lg font-black uppercase tracking-wider cursor-pointer transition-colors"
                >
                  Adjust Map Pin
                </button>
              </div>

              <div className="space-y-2 pt-1 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-800/60 text-slate-650 dark:text-slate-400">
                  <span className="font-extrabold">Geographic Area</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-100 text-right">{user.location || "Indiranagar, Bengaluru"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-800/60 text-slate-650 dark:text-slate-400">
                  <span className="font-extrabold">Electoral Ward</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-100">{user.wardName || "Ward 88"}</span>
                </div>
                <div className="flex justify-between py-1 text-slate-650 dark:text-slate-400">
                  <span className="font-extrabold">GPS Coordinates</span>
                  <span className="font-mono text-[10.5px] font-black text-slate-800 dark:text-slate-100">
                    {user.latitude ? user.latitude.toFixed(5) : "12.9719"}°N, {user.longitude ? user.longitude.toFixed(5) : "77.6412"}°E
                  </span>
                </div>
              </div>
            </div>

            {/* Account Conversion Card */}
            <div className="space-y-4 p-5 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                <h5 className="text-xs font-black text-indigo-950 dark:text-indigo-400 uppercase tracking-wider">
                  {user.role === "CITIZEN" ? "Convert Account to Organization Workspace" : "Revert Account to Citizen Profile"}
                </h5>
              </div>

              <p className="text-[11.5px] text-indigo-850 dark:text-indigo-300 leading-relaxed font-semibold">
                {user.role === "CITIZEN" 
                  ? "NGO, Corporate CSR Lead, or RWA representative? Upgrade your account to convert it into a verified Organization account. This completely transitions your dashboard into the Corporate NGO Workspace where you can adopt local municipal wards, manage high-impact crowdfunding, and claim verified carbon credits."
                  : "Convert this enterprise profile back into a standard Citizen account. This will restore your standard Citizen Passport dashboard, local leaderboard standings, and community gamified points tracker."
                }
              </p>

              <button
                type="button"
                onClick={() => onToggleRole(user.role === "CITIZEN" ? "ORGANIZATION" : "CITIZEN")}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer border-none flex items-center justify-center space-x-2"
              >
                {user.role === "CITIZEN" ? (
                  <>
                    <Building className="h-4 w-4" />
                    <span>Convert Account into Organization Account</span>
                  </>
                ) : (
                  <>
                    <User className="h-4 w-4" />
                    <span>Convert Account to Citizen Account</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        user.role === "CITIZEN" ? (
          // CITIZEN DASHBOARD LAYOUT
          <div className="space-y-6">
          
          {/* User badge metadata [Focused element CSS selector 2] */}
          <div className="flex flex-col items-center text-center space-y-4 p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg relative overflow-hidden transition-all duration-300">
            {/* Visual gradient backdrop overlay for custom branding and depth */}
            <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-emerald-500/10 dark:from-indigo-950/40 dark:via-purple-950/40 dark:to-emerald-950/40 pointer-events-none" />
            
            <div className="relative z-10">
              <div className="relative">
                <img 
                  src={user.avatar || undefined} 
                  alt={user.name}
                  referrerPolicy="no-referrer"
                  className="h-24 w-24 rounded-full object-cover border-4 border-indigo-500 dark:border-indigo-400 shadow-md"
                />
                <div className="absolute -bottom-1 -right-1 p-1.5 bg-amber-500 rounded-full border-2 border-white dark:border-slate-900 shadow">
                  <Flame className="h-5 w-5 text-white animate-pulse" />
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center space-y-1.5 z-10 w-full">
              <div className="flex items-center space-x-2">
                <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{user.name}</h3>
                {(user.role === "CITIZEN" ? isCitizenVerified : isOrgVerified) && (
                  <CheckCircle className="h-5 w-5 text-emerald-500 fill-emerald-100 dark:fill-emerald-950/40" title="Government Verified Identity" />
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={onDetectLocation}
                  disabled={isLocationLoading}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800/50 dark:hover:bg-indigo-950/30 border border-slate-200 dark:border-slate-700/80 hover:border-indigo-200 dark:hover:border-indigo-900/60 rounded-full transition-colors group cursor-pointer active:scale-95 disabled:opacity-70"
                  title="Click to automatically recalibrate location using high-accuracy GPS"
                >
                  <MapPin className={`h-3.5 w-3.5 text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 ${isLocationLoading ? 'animate-spin text-indigo-600' : 'animate-pulse'}`} />
                  <span className="text-xs text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                    {isLocationLoading ? "Recalibrating GPS..." : (user.location || "Recalibrate GPS")}
                  </span>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-extrabold normal-case pl-0.5">(Recalibrate)</span>
                </button>
                
                <button
                  type="button"
                  onClick={handleOpenLocationModal}
                  className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-extrabold uppercase shrink-0"
                  title="Manually set precise location on map"
                >
                  Map Pin
                </button>
              </div>
            </div>

            {/* Verification & Civic Info line */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1 z-10">
              <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-black shadow-xs">
                CIVIC SCORE: {user.civicScore}
              </span>
              <span className="px-3 py-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-400 rounded-full text-xs font-extrabold flex items-center shadow-xs">
                Top {percentile}% Ward Rank
              </span>
              {renderVerificationStatusBadge()}
            </div>

            {/* Quick Toggle Role Button inside layout */}
            <div className="w-full max-w-xs pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-center gap-2 z-10">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase">Switch Workspace:</span>
              <button
                onClick={() => onToggleRole("ORGANIZATION")}
                className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-black uppercase tracking-wider rounded-lg cursor-pointer transition-all border-none"
              >
                Organization View →
              </button>
            </div>
          </div>

          {/* Gamified Core Stat Badges */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl text-center space-y-1 shadow-sm">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase block tracking-wider">TOTAL POINTS</span>
              <span className="text-xl font-black text-slate-800 dark:text-slate-100 font-mono">{user.totalPoints.toLocaleString()}</span>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl text-center space-y-1 shadow-sm">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase block tracking-wider">ACTIVE SCORE</span>
              <span className="text-xl font-black text-slate-800 dark:text-slate-100 font-mono">{user.personalActiveScore}%</span>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl text-center space-y-1 shadow-sm">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase block tracking-wider">CONTRIBUTIONS</span>
              <span className="text-xl font-black text-slate-800 dark:text-slate-100 font-mono">{user.contributionCount}</span>
            </div>
          </div>

          {/* WhatsApp Integration Card */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black tracking-widest uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  WhatsApp Bot Connection
                </span>
                <h4 className="text-md font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                  {user.whatsappNumber && user.whatsappVerified ? "WhatsApp Linked Successfully" : "Connect WhatsApp Account"}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  {user.whatsappNumber && user.whatsappVerified 
                    ? `Your account is connected to ${user.whatsappNumber}. You will receive instant notifications and updates on reported issues directly on WhatsApp.`
                    : "Report municipal issues and upvote citizen tickets on-the-go. Link your account to claim +50 reward points automatically!"}
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-900/50 flex items-center justify-center text-emerald-600 shrink-0 shadow-xs">
                <svg className="h-5 w-5 fill-emerald-600 dark:fill-emerald-400" viewBox="0 0 24 24">
                  <path d="M12.004 2C6.48 2 2 6.48 2 12.004c0 1.908.533 3.69 1.458 5.215L2.022 22l4.908-1.411A9.972 9.972 0 0 0 12.004 22c5.524 0 10.004-4.48 10.004-10.004C22.008 6.48 17.528 2 12.004 2zm0 18.008c-1.674 0-3.238-.451-4.593-1.236l-.33-.191-2.906.837.85-2.784-.213-.338a8.006 8.006 0 0 1-1.229-4.298c0-4.417 3.593-8.008 8.008-8.008s8.008 3.591 8.008 8.008c-.004 4.421-3.597 8.012-8.118 8.012z"/>
                </svg>
              </div>
            </div>

            {user.whatsappNumber && user.whatsappVerified ? (
              <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 border border-white dark:border-slate-900 shadow-xs" />
                  Active Number: {user.whatsappNumber}
                </span>
                <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-500 tracking-wider">Verified</span>
              </div>
            ) : (
              <div className="space-y-3">
                {whatsappHandshakeCode ? (
                  <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-150 dark:border-indigo-900/50 rounded-2xl space-y-3">
                    <div className="text-center space-y-1">
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-450 block">Your Handshake Code:</span>
                      <span className="text-2xl font-black font-mono tracking-widest text-indigo-700 dark:text-indigo-400 select-all">{whatsappHandshakeCode}</span>
                      <span className="text-[9px] text-indigo-550 dark:text-indigo-400 font-bold block">Expires in 5 minutes</span>
                    </div>
                    
                    <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-150 dark:border-emerald-900/40 rounded-xl space-y-2 text-[11px] text-emerald-800 dark:text-emerald-350">
                      <p className="font-bold">Instructions:</p>
                      <ol className="list-decimal list-inside space-y-1 font-semibold">
                        <li>Send the handshake code message to our official WhatsApp bot.</li>
                        <li>Send exactly: <strong className="font-mono bg-emerald-100 dark:bg-emerald-900/60 px-1 py-0.5 rounded select-all text-xs text-indigo-700 dark:text-indigo-400 font-black">Verify {whatsappHandshakeCode}</strong></li>
                        <li>To: <strong className="font-mono bg-emerald-100 dark:bg-emerald-900/60 px-1 py-0.5 rounded select-all text-xs text-indigo-700 dark:text-indigo-400 font-black">+91 90123 45678</strong></li>
                      </ol>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleRequestHandshake}
                    disabled={isRequestingHandshake}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl transition-all shadow-md cursor-pointer border-none flex items-center justify-center space-x-2 disabled:opacity-75"
                  >
                    <span>Connect WhatsApp Bot</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Community impact visual payoff card */}
          <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-md transition-all duration-300">
            {/* Glowing neon green background orb for visual hierarchy */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-100/40 dark:bg-emerald-950/20 rounded-full blur-3xl pointer-events-none" />
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              
              {/* Focused element CSS selector 3 */}
              <div className="space-y-1">
                <span className="text-xs font-bold tracking-wider uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
                  COMMUNITY IMPACT PAYOFF
                </span>
                <div className="text-4xl font-black text-slate-800 dark:text-slate-100 mt-1 font-mono tracking-tight flex items-baseline gap-1">
                  {user.citizensHelped.toLocaleString()}
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 font-sans uppercase">neighbors benefited</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  Estimated neighbors benefited directly from your reported problems and community verifications in <span className="text-slate-700 dark:text-slate-300 font-bold">{user.location || "Indiranagar"}</span>.
                </p>
              </div>

              <Users className="h-12 w-12 text-emerald-600 dark:text-emerald-400 shrink-0 self-start sm:self-center" />
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase flex items-center">
              <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mr-1.5" />
              <span>Your pipeline report saved Indiranagar 12 hours of drinking water leakage!</span>
            </div>
          </div>

          {/* Points Breakdown charts [Focused element CSS selector 1] */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-md">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <h4 className="text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                <BarChart2 className="h-4 w-4" />
                Points Distribution (XP)
              </h4>
              <span className="text-[10px] font-bold px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full border border-indigo-100 dark:border-indigo-900/50">
                Total: {user.totalPoints.toLocaleString()} XP
              </span>
            </div>
            
            <div className="space-y-4.5 text-xs text-slate-700 dark:text-slate-300">
              <div className="space-y-2 group">
                <div className="flex justify-between font-bold text-slate-800 dark:text-slate-200">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                    Reporting Issues (+50 XP)
                  </span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{user.pointsBreakdown.reporting} XP</span>
                </div>
                <div className="h-3 w-full bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden p-[2px] border border-slate-200/50 dark:border-slate-700/50">
                  <div className="h-full bg-gradient-to-r from-indigo-600 to-purple-500 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(79,70,229,0.3)]" style={{ width: `${(user.pointsBreakdown.reporting / user.totalPoints) * 100}%` }} />
                </div>
              </div>

              <div className="space-y-2 group">
                <div className="flex justify-between font-bold text-slate-800 dark:text-slate-200">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                    Verifying Reports (+15 XP)
                  </span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{user.pointsBreakdown.verifying} XP</span>
                </div>
                <div className="h-3 w-full bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden p-[2px] border border-slate-200/50 dark:border-slate-700/50">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" style={{ width: `${(user.pointsBreakdown.verifying / user.totalPoints) * 100}%` }} />
                </div>
              </div>

              <div className="space-y-2 group">
                <div className="flex justify-between font-bold text-slate-800 dark:text-slate-200">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-500 dark:bg-amber-400" />
                    Funding Abhiyans (+1 XP per ₹10)
                  </span>
                  <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">{user.pointsBreakdown.donating} XP</span>
                </div>
                <div className="h-3 w-full bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden p-[2px] border border-slate-200/50 dark:border-slate-700/50">
                  <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-450 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]" style={{ width: `${(user.pointsBreakdown.donating / user.totalPoints) * 100}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Badges Showcase */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm">
            <h4 className="text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest">Earned Achievements</h4>
            <div className="flex flex-wrap gap-2">
              {user.badges.map((badge) => (
                <span 
                  key={badge}
                  className="px-3 py-1.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-black uppercase flex items-center space-x-1 shadow-xs"
                >
                  <Award className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
                  <span>{badge}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Shareable Impact Card and Leaderboards */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest">Regional Leaderboards</h4>
              
              <div className="flex space-x-1 text-[9px] font-black uppercase bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <button 
                  onClick={() => setSelectedLeaderboard("ward")}
                  className={`px-2.5 py-1 rounded-lg cursor-pointer transition-all border-none ${selectedLeaderboard === "ward" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-500 dark:text-slate-400"}`}
                >
                  Ward
                </button>
                <button 
                  onClick={() => setSelectedLeaderboard("city")}
                  className={`px-2.5 py-1 rounded-lg cursor-pointer transition-all border-none ${selectedLeaderboard === "city" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-500 dark:text-slate-400"}`}
                >
                  City
                </button>
                <button 
                  onClick={() => setSelectedLeaderboard("national")}
                  className={`px-2.5 py-1 rounded-lg cursor-pointer transition-all border-none ${selectedLeaderboard === "national" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-500 dark:text-slate-400"}`}
                >
                  National
                </button>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              {finalLeaderboards[selectedLeaderboard].length === 0 ? (
                <div className="text-center py-6 text-slate-400 font-bold bg-slate-50 dark:bg-slate-800 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                  Loading active citizens from actual database...
                </div>
              ) : (
                finalLeaderboards[selectedLeaderboard].map((entry: any) => (
                  <div 
                    key={entry.rank}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      entry.isUser 
                        ? "bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300 font-bold shadow-xs" 
                        : "bg-slate-50 dark:bg-slate-900/50 border-transparent dark:border-slate-800/40 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className="font-mono font-black text-slate-400 w-4">#{entry.rank}</span>
                      <span className="font-extrabold">{entry.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">{entry.badge}</span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-100">{entry.points} XP</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Generate shareable card trigger */}
            <button
              onClick={() => setShowShareModal(true)}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-2xl text-xs uppercase flex items-center justify-center space-x-1.5 cursor-pointer shadow-md transition-all border-none"
            >
              <Share2 className="h-4 w-4" />
              <span>Generate Shareable Impact Card</span>
            </button>
          </div>
        </div>
      ) : (
        // ORGANIZATION PROFILE LAYOUT
        <div className="space-y-6">
          {/* Org metadata */}
          <div className="flex flex-col items-center text-center space-y-4 p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg relative overflow-hidden transition-all duration-300">
            <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 dark:from-emerald-950/40 dark:via-teal-950/40 dark:to-indigo-950/40 pointer-events-none" />
            
            <div className="relative z-10">
              <div className="relative">
                <img 
                  src={user.avatar || undefined} 
                  alt={user.name}
                  referrerPolicy="no-referrer"
                  className="h-24 w-24 rounded-full object-cover border-4 border-emerald-500 dark:border-emerald-400 shadow-md"
                />
                <div className="absolute -bottom-1 -right-1 p-1.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 shadow">
                  <Leaf className="h-5 w-5 text-white animate-pulse" />
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center space-y-1.5 z-10 w-full">
              <div className="flex items-center space-x-2">
                <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{user.name}</h3>
                {(user.role === "ORGANIZATION" ? isOrgVerified : isCitizenVerified) && (
                  <CheckCircle className="h-5 w-5 text-emerald-500 fill-emerald-100 dark:fill-emerald-950/40" title="Corporate/NGO Verified Partner" />
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={onDetectLocation}
                  disabled={isLocationLoading}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-50 hover:bg-emerald-50 dark:bg-slate-800/50 dark:hover:bg-emerald-950/30 border border-slate-200 dark:border-slate-700/80 hover:border-emerald-200 dark:hover:border-emerald-900/60 rounded-full transition-colors group cursor-pointer active:scale-95 disabled:opacity-70"
                  title="Click to automatically recalibrate location using high-accuracy GPS"
                >
                  <MapPin className={`h-3.5 w-3.5 text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 ${isLocationLoading ? 'animate-spin text-emerald-600' : 'animate-pulse'}`} />
                  <span className="text-xs text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                    {isLocationLoading ? "Recalibrating GPS..." : (user.location || "Recalibrate GPS")}
                  </span>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-extrabold normal-case pl-0.5">(Recalibrate)</span>
                </button>
                
                <button
                  type="button"
                  onClick={handleOpenLocationModal}
                  className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline font-extrabold uppercase shrink-0"
                  title="Manually set precise location on map"
                >
                  Map Pin
                </button>
              </div>
            </div>

            {/* Verification and Public Trust Badge */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1 z-10">
              <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-black shadow-xs">
                PUBLIC TRUST INDEX: A+ RATED
              </span>
              {renderVerificationStatusBadge()}
            </div>

            {/* Quick Toggle Role Button inside layout */}
            <div className="w-full max-w-xs pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-center gap-2 z-10">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase">Switch Workspace:</span>
              <button
                onClick={() => onToggleRole("CITIZEN")}
                className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-black uppercase tracking-wider rounded-lg cursor-pointer transition-all border-none"
              >
                Citizen View →
              </button>
            </div>
          </div>

          {/* Org core stats adoptions / deployed funds */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl text-center space-y-1 shadow-sm">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase block tracking-wider">DEPLOYED CROWDFUNDS</span>
              <span className="text-lg font-black text-slate-800 dark:text-slate-100 font-mono">₹{user.totalDonations.toLocaleString()}</span>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl text-center space-y-1 shadow-sm">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase block tracking-wider">CSR WARD RESOLUTIONS</span>
              <span className="text-lg font-black text-slate-800 dark:text-slate-100 font-mono">{user.contributionCount} Projects</span>
            </div>
          </div>

          {/* WhatsApp Integration Card */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black tracking-widest uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  WhatsApp Bot Connection
                </span>
                <h4 className="text-md font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                  {user.whatsappNumber && user.whatsappVerified ? "WhatsApp Linked Successfully" : "Connect WhatsApp Account"}
                </h4>
                <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed font-medium">
                  {user.whatsappNumber && user.whatsappVerified 
                    ? `Your account is connected to ${user.whatsappNumber}. You will receive instant notifications and updates on reported issues directly on WhatsApp.`
                    : "Report municipal issues and upvote citizen tickets on-the-go. Link your account to claim +50 reward points automatically!"}
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-900/50 flex items-center justify-center text-emerald-600 shrink-0 shadow-xs">
                <svg className="h-5 w-5 fill-emerald-600 dark:fill-emerald-400" viewBox="0 0 24 24">
                  <path d="M12.004 2C6.48 2 2 6.48 2 12.004c0 1.908.533 3.69 1.458 5.215L2.022 22l4.908-1.411A9.972 9.972 0 0 0 12.004 22c5.524 0 10.004-4.48 10.004-10.004C22.008 6.48 17.528 2 12.004 2zm0 18.008c-1.674 0-3.238-.451-4.593-1.236l-.33-.191-2.906.837.85-2.784-.213-.338a8.006 8.006 0 0 1-1.229-4.298c0-4.417 3.593-8.008 8.008-8.008s8.008 3.591 8.008 8.008c-.004 4.421-3.597 8.012-8.118 8.012z"/>
                </svg>
              </div>
            </div>

            {user.whatsappNumber && user.whatsappVerified ? (
              <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 border border-white dark:border-slate-900 shadow-xs" />
                  Active Number: {user.whatsappNumber}
                </span>
                <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-500 tracking-wider">Verified</span>
              </div>
            ) : (
              <div className="space-y-3">
                {whatsappHandshakeCode ? (
                  <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-150 dark:border-indigo-900/50 rounded-2xl space-y-3">
                    <div className="text-center space-y-1">
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-450 block">Your Handshake Code:</span>
                      <span className="text-2xl font-black font-mono tracking-widest text-indigo-700 dark:text-indigo-400 select-all">{whatsappHandshakeCode}</span>
                      <span className="text-[9px] text-indigo-550 dark:text-indigo-400 font-bold block">Expires in 5 minutes</span>
                    </div>
                    
                    <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-150 dark:border-emerald-900/40 rounded-xl space-y-2 text-[11px] text-emerald-800 dark:text-emerald-350">
                      <p className="font-bold">Instructions:</p>
                      <ol className="list-decimal list-inside space-y-1 font-semibold">
                        <li>Send the handshake code message to our official WhatsApp bot.</li>
                        <li>Send exactly: <strong className="font-mono bg-emerald-100 dark:bg-emerald-900/60 px-1 py-0.5 rounded select-all text-xs text-indigo-700 dark:text-indigo-400 font-black">Verify {whatsappHandshakeCode}</strong></li>
                        <li>To: <strong className="font-mono bg-emerald-100 dark:bg-emerald-900/60 px-1 py-0.5 rounded select-all text-xs text-indigo-700 dark:text-indigo-400 font-black">+91 90123 45678</strong></li>
                      </ol>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleRequestHandshake}
                    disabled={isRequestingHandshake}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl transition-all shadow-md cursor-pointer border-none flex items-center justify-center space-x-2 disabled:opacity-75"
                  >
                    <span>Connect WhatsApp Bot</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Carbon Credit Tracker */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-50 dark:bg-emerald-950/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-xs font-bold tracking-wider uppercase text-emerald-700 dark:text-emerald-400 block">VERIFIED CARBON CREDITS EARNED</span>
                <div className="text-3xl font-black text-slate-800 dark:text-slate-100 font-mono tracking-tight">
                  {user.carbonCredits?.toLocaleString()} C
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed font-medium">
                  Accrued automatically via verified tree-plantation campaigns and localized solid waste recycling audits.
                </p>
              </div>
              <Leaf className="h-8 w-8 text-emerald-600 dark:text-emerald-400 shrink-0" />
            </div>

            {/* Adopted wards lists */}
            <div className="space-y-2 border-t border-slate-100 dark:border-slate-800/80 pt-4 text-xs">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase block">Adopted Categories & Wards</span>
              <div className="space-y-1.5 font-medium text-slate-700 dark:text-slate-300">
                {user.adoptedWards?.map((ward) => (
                  <div key={ward} className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    <MapIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span>{ward}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Certificate downloader button */}
            <button 
              onClick={handleDownloadESGCertificate}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl text-xs uppercase flex items-center justify-center space-x-1.5 cursor-pointer shadow-md transition-all border-none"
            >
              <Download className="h-4 w-4" />
              <span>Download Verified ESG Audit Certificate</span>
            </button>
          </div>

          {/* Org Leaderboard rankings */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-3.5 shadow-sm">
            <h4 className="text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest">Top Performing Organizations</h4>
            
            <div className="space-y-2 text-xs">
              {finalOrgLeaderboard.length === 0 ? (
                <div className="text-center py-6 text-slate-400 font-bold bg-slate-50 dark:bg-slate-800 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                  Loading top organizations from actual database...
                </div>
              ) : (
                finalOrgLeaderboard.map((entry) => (
                  <div 
                    key={entry.rank}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      entry.isUser 
                        ? "bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300 font-bold shadow-xs" 
                        : "bg-slate-50 dark:bg-slate-900/50 border-transparent dark:border-slate-800/40 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className="font-mono font-black text-slate-400 w-4">#{entry.rank}</span>
                      <span className="font-extrabold">{entry.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black">{entry.credits}</span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-100">{entry.points} pts</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        )
      )}

      {/* Shareable Impact Card Popup Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800/80 p-5 relative overflow-hidden shadow-2xl space-y-4"
          >
            <button 
              onClick={() => setShowShareModal(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 dark:text-slate-200 rounded-full transition-colors cursor-pointer bg-transparent border-none flex items-center justify-center"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            {/* Impact Card Content Layout */}
            <div className="relative rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 text-center space-y-3 shadow-sm">
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-600 via-emerald-400 to-amber-300" />
              
              <div className="pt-2">
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 tracking-wider uppercase">INDIACIVIC HERO CARD</h3>
                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold uppercase">Verified Citizen Contribution 2026</p>
              </div>

              <img 
                src={user.avatar || undefined} 
                alt={user.name}
                referrerPolicy="no-referrer"
                className="h-16 w-16 rounded-full object-cover border-2 border-indigo-500 mx-auto shadow-sm"
              />

              <div>
                <h4 className="text-base font-extrabold text-slate-800 dark:text-slate-100">{user.name}</h4>
                <span className="px-2 py-0.5 text-[9px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 rounded border border-indigo-100 dark:border-indigo-900/50">
                  CIVIC SCORE: {user.civicScore}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2">
                <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center shadow-xs">
                  <span className="text-[8px] text-slate-400 dark:text-slate-500 font-bold uppercase block">Wards Helped</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-100">{user.citizensHelped.toLocaleString()} people</span>
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center shadow-xs">
                  <span className="text-[8px] text-slate-400 dark:text-slate-500 font-bold uppercase block">Streak Active</span>
                  <span className="font-extrabold text-amber-600 dark:text-amber-400">{user.streakDays} Days Action</span>
                </div>
              </div>

              <div className="text-[10px] text-slate-600 dark:text-slate-300 leading-relaxed font-semibold italic">
                "I reported & helped resolve local infrastructure issues in Indiranagar, Bengaluru. Join me on IndiaCivic!"
              </div>
            </div>

            <button
              onClick={handleShareImpactCard}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs uppercase cursor-pointer shadow-sm border-none"
            >
              <span>{shareBtnText}</span>
            </button>
          </motion.div>
        </div>
      )}

      {/* Government ID / Organization Registration Verification Wizard Overlay Modal */}
      {showVerificationWizard && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800/80 p-6 relative overflow-hidden shadow-2xl space-y-4 text-left"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
                  <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">Civic Verification Center</h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase">Verify Identity & Enable Double Vote Weight</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowVerificationWizard(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full transition-colors cursor-pointer bg-transparent border-none flex items-center justify-center"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Step 1: Info Screen */}
            {verificationStep === 1 && (
              <div className="space-y-4 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                <div className="space-y-2">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Why should I verify my {user.role === "CITIZEN" ? "voter identity" : "organization registration"}?</p>
                  <ul className="list-disc pl-4 space-y-1.5">
                    <li><strong>Spam Prevention:</strong> Eliminates duplicate profiles and fake/synthetic issue reporting in Indiranagar.</li>
                    <li><strong>Democratic Authenticity:</strong> Unlocks a verified green badge on all your reported problems and comments.</li>
                    <li><strong>Vote Weight Multiplication:</strong> Verified accounts get a <span className="text-indigo-600 dark:text-indigo-400 font-bold">2x multiplier</span> on all BBMP corporator resolution release votes!</li>
                    {user.role === "ORGANIZATION" && (
                      <li><strong>Tax-Exemption:</strong> Fully activates your automated 80G tax-exempt invoice generation for public donations.</li>
                    )}
                  </ul>
                </div>

                <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-xl flex items-start space-x-2">
                  <Info className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-indigo-700 dark:text-indigo-300 leading-normal">
                    Privacy Shield: All input document details are hashed client-side and verified using secure zero-knowledge proof queries against local BBMP electoral list or Corporate Affairs registries.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={startVerificationProcess}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer border-none text-center"
                >
                  Start Verification
                </button>
              </div>
            )}

            {/* Step 2: Upload / Form Submission */}
            {verificationStep === 2 && (
              <div className="space-y-4 text-xs">
                {verificationError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40 rounded-xl text-xs text-rose-600 dark:text-rose-400 font-semibold leading-relaxed shadow-sm">
                    {verificationError}
                  </div>
                )}
                {user.role === "CITIZEN" ? (
                  // Citizen Form
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Select ID Document Type</label>
                      <select
                        value={govtIdType}
                        onChange={(e) => setGovtIdType(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="VOTER_ID">Electoral Voter Card (EPIC Number)</option>
                        <option value="AADHAAR">Aadhaar Card (UIDAI)</option>
                        <option value="DL">Driver's License</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Document Identification Number</label>
                      <input
                        type="text"
                        placeholder={govtIdType === "VOTER_ID" ? "e.g. ABC1234567" : govtIdType === "AADHAAR" ? "e.g. 5432 1098 7654" : "e.g. KA03-2023-0198"}
                        value={voterCardNum}
                        onChange={(e) => setVoterCardNum(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono text-xs uppercase"
                        required
                      />
                    </div>
                  </div>
                ) : (
                  // Organization Form
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Corporate Identification Number (CIN / NGO Darpan)</label>
                      <input
                        type="text"
                        placeholder="e.g. U74140DL2015PLC283942"
                        value={orgRegistrationNum}
                        onChange={(e) => setOrgRegistrationNum(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono text-xs uppercase"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">80G Tax Exemption Approval Number</label>
                      <input
                        type="text"
                        placeholder="e.g. CIT(EXEMPT)/80G/2021-22/A/1004"
                        value={orgTaxExemptNum}
                        onChange={(e) => setOrgTaxExemptNum(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono text-xs uppercase"
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Attach Photocopy (Simulated Upload)</label>
                  <div className="p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-500 rounded-2xl bg-slate-50 dark:bg-slate-900 text-center space-y-1 cursor-pointer transition-all">
                    <FileText className="h-6 w-6 text-slate-400 mx-auto" />
                    <span className="font-bold text-slate-700 dark:text-slate-300 block">Drag & drop ID copy here</span>
                    <span className="text-[10px] text-slate-400">or click to browse local files (PDF, PNG, JPG up to 10MB)</span>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setVerificationStep(1)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-xs uppercase tracking-wider rounded-xl cursor-pointer border-none"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={submitVerificationDetails}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer border-none"
                  >
                    Submit Details
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Verifying Spinner */}
            {verificationStep === 3 && (
              <div className="py-8 text-center space-y-4">
                <Loader2 className="h-10 w-10 text-indigo-600 dark:text-indigo-400 animate-spin mx-auto" />
                <div className="space-y-1">
                  <p className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">Verifying with Government Registry...</p>
                  <p className="text-[10px] text-slate-400">Performing secure decentralized database audit. Please wait.</p>
                </div>
              </div>
            )}

            {/* Step 4: Verification Success Animation */}
            {verificationStep === 4 && (
              <div className="py-4 text-center space-y-5">
                <div className="h-14 w-14 bg-emerald-100 dark:bg-emerald-950/60 rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <Check className="h-7 w-7 text-emerald-600 dark:text-emerald-400 font-black" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-base font-extrabold text-slate-800 dark:text-slate-100">Verification Successful!</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
                    Your {user.role === "CITIZEN" ? "Civic Identity" : "NGO Trust Registration"} has been verified. You have earned <span className="font-bold text-indigo-600 dark:text-indigo-400">+200 XP</span> and your vote multiplier is active!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowVerificationWizard(false)}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer border-none"
                >
                  Close & Refresh Profile
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Interactive Precise Location Selection & Geocoding Search Modal */}
      {isEditingLocation && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800/80 p-6 shadow-2xl relative space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg">
                  <MapPin className="h-5 w-5 text-indigo-600 dark:text-indigo-400 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Update Profile Location</h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Select a location by search or precise map placement</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingLocation(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer border-none bg-transparent"
              >
                <X className="h-4.5 w-4.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" />
              </button>
            </div>

            {/* Error alerts */}
            {locModalError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 rounded-xl text-[11px] font-semibold leading-relaxed">
                {locModalError}
              </div>
            )}

            {/* Search Input Box */}
            <div className="space-y-1.5 relative text-xs">
              <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Search Location or Ward</label>
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Enter neighborhood, area or landmark..."
                    value={locationQuery}
                    onChange={(e) => setLocationQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearchLocation()}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSearchLocation}
                  disabled={isSearching}
                  className="px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow transition-all border-none cursor-pointer flex items-center justify-center space-x-1"
                >
                  {isSearching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Search"}
                </button>
                <button
                  type="button"
                  onClick={detectPreciseLocation}
                  className="px-3 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/60 text-emerald-750 dark:text-emerald-400 rounded-xl flex items-center justify-center transition-all cursor-pointer bg-transparent"
                  title="Detect GPS precise spot"
                >
                  <Compass className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Search results dropdown popup */}
              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {searchResults.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => selectSearchResult(item)}
                      className="p-3 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors flex items-start space-x-2"
                    >
                      <MapPin className="h-3.5 w-3.5 text-indigo-500 shrink-0 mt-0.5" />
                      <span className="truncate">{item.display_name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Interactive Map view block */}
            <div className="space-y-1 text-xs">
              <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Selected Coordinates: {selectedMarkerPos.lat.toFixed(5)}°N, {selectedMarkerPos.lng.toFixed(5)}°E
              </label>

              {hasValidKey ? (
                <div className="relative rounded-2xl overflow-hidden border border-slate-300 dark:border-slate-700 shadow-inner h-[280px]">
                  <APIProvider apiKey={API_KEY} version="weekly">
                    <Map
                      center={mapCenter}
                      zoom={mapZoom}
                      onZoomChanged={(e) => setMapZoom(e.detail.zoom)}
                      onCenterChanged={(e) => setMapCenter(e.detail.center)}
                      onClick={handleMapClick}
                      mapId="DEMO_MAP_ID"
                      styles={LIGHT_MAP_STYLE}
                      internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                      style={{ width: "100%", height: "280px" }}
                    >
                      <AdvancedMarker position={selectedMarkerPos}>
                        <div className="flex flex-col items-center">
                          <div className="bg-rose-600 text-white p-2 rounded-full shadow-lg border-2 border-white animate-bounce">
                            <MapPin className="h-4.5 w-4.5" />
                          </div>
                          <div className="bg-slate-900/90 text-[8.5px] font-bold text-white px-2 py-0.5 rounded-md mt-1 border border-slate-700 shadow whitespace-nowrap">
                            Target Spot
                          </div>
                        </div>
                      </AdvancedMarker>
                    </Map>
                  </APIProvider>
                  <div className="absolute bottom-3 left-3 bg-black/75 text-white text-[9px] px-2.5 py-1 rounded-lg pointer-events-none font-medium border border-white/10 shadow-md">
                    Tap anywhere on map to pin precise spot
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 p-4 rounded-2xl text-center space-y-2 text-xs">
                  <Info className="h-6 w-6 text-amber-600 dark:text-amber-400 mx-auto animate-pulse" />
                  <p className="text-xs font-bold text-amber-850 dark:text-amber-400 uppercase tracking-wide">Interactive Map Preview</p>
                  <p className="text-[10px] text-amber-700 dark:text-amber-500 leading-relaxed max-w-sm mx-auto">
                    A Google Maps API Key is not set yet. You can still type in any custom location name above, or click below to save custom names instantly!
                  </p>
                </div>
              )}
            </div>

            {/* Actions Footer */}
            <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
              <button
                type="button"
                onClick={() => setIsEditingLocation(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all border-none cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveLocation}
                disabled={isSavingLoc}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer text-center border-none flex items-center justify-center space-x-1"
              >
                {isSavingLoc ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                <span>Save Location</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
