import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { User, Building, MapPin, CheckCircle, Search, Mail, Loader2, ArrowRight, Sparkles } from "lucide-react";
import { doc, setDoc } from "firebase/firestore";
import { db as firestoreDb } from "../lib/firebase";
import { UserProfile } from "../types";

interface OnboardingWizardProps {
  uid: string;
  email: string;
  initialName: string;
  onComplete: (profile: UserProfile) => void;
}

export default function OnboardingWizard({ uid, email, initialName, onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState<number>(1);
  const [name, setName] = useState<string>(initialName || "");
  const [role, setRole] = useState<"CITIZEN" | "ORGANIZATION">("CITIZEN");
  const [avatar, setAvatar] = useState<string>(`https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`);
  
  // Location states
  const [detectedLocation, setDetectedLocation] = useState<string>("Indiranagar, Bengaluru");
  const [detectedWard, setDetectedWard] = useState<string>("Ward 88 (Indiranagar)");
  const [lat, setLat] = useState<number>(12.9719);
  const [lng, setLng] = useState<number>(77.6412);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  
  // Search states
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string>("");

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [generalError, setGeneralError] = useState<string>("");

  // Update avatar when name changes for fun bottts representation
  useEffect(() => {
    if (name.trim()) {
      setAvatar(`https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`);
    }
  }, [name]);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setSearchError("Geolocation is not supported by your browser.");
      return;
    }
    setIsDetecting(true);
    setSearchError("");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        setLat(latitude);
        setLng(longitude);
        try {
          const res = await fetch(`/api/reverse-geocode?lat=${latitude}&lng=${longitude}`);
          if (res.ok) {
            const data = await res.json();
            if (data && data.address) {
              const sub = data.address.suburb || data.address.neighbourhood || data.address.village || data.address.residential || data.address.road || "Local Area";
              const city = data.address.city || data.address.town || data.address.state_district || "India";
              const wardVal = data.address.suburb || data.address.neighbourhood || "Ward 88 (Indiranagar)";
              setDetectedLocation(`${sub}, ${city}`);
              setDetectedWard(wardVal.includes("Ward") ? wardVal : `Ward - ${wardVal}`);
            } else {
              setDetectedLocation(`${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E`);
              setDetectedWard("Local Ward");
            }
          } else {
            setSearchError("Failed to reverse geocode location.");
          }
        } catch (err: any) {
          console.error("Reverse geocoding error:", err);
          setSearchError("Failed to fetch address for detected location.");
        } finally {
          setIsDetecting(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        setSearchError("Permission denied or location detection failed. Please search manually.");
        setIsDetecting(false);
      }
    );
  };

  const handleManualSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchError("");
    try {
      const res = await fetch(`/api/search-geocode?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
        if (data.length === 0) {
          setSearchError("No places found. Try a different name.");
        }
      } else {
        setSearchError("Search service returned an error.");
      }
    } catch (err: any) {
      console.error("Geocoding search error:", err);
      setSearchError("Failed to connect to search service.");
    } finally {
      setIsSearching(false);
    }
  };

  const selectPlace = (item: any) => {
    const latitude = parseFloat(item.lat);
    const longitude = parseFloat(item.lon);
    if (!isNaN(latitude) && !isNaN(longitude)) {
      setLat(latitude);
      setLng(longitude);
      const parts = item.display_name ? item.display_name.split(",") : [item.name];
      const compactName = parts.slice(0, 2).map((p: string) => p.trim()).join(", ");
      setDetectedLocation(compactName || item.name || searchQuery);
      setDetectedWard(`Ward - ${parts[0] || item.name}`);
      setSearchResults([]);
      setSearchQuery("");
    }
  };

  const handleFinish = async () => {
    if (!name.trim()) {
      setGeneralError("Please enter your name first.");
      setStep(1);
      return;
    }
    setIsSaving(true);
    setGeneralError("");
    
    const initialProfile: UserProfile = {
      id: uid,
      name: name.trim(),
      avatar: avatar,
      location: detectedLocation,
      role: role,
      civicScore: 700, // standard Starting Score
      totalPoints: 100, // onboarding reward
      personalActiveScore: 50,
      contributionCount: 0,
      citizensHelped: 0,
      totalDonations: 0,
      pointsBreakdown: {
        reporting: 0,
        verifying: 0,
        donating: 0,
      },
      badges: ["New Citizen", "Onboarded"],
      streakDays: 1,
      availableFunds: 5000,
      wardName: detectedWard,
      latitude: lat,
      longitude: lng,
    };

    try {
      // Save profile doc to Firestore
      const profileRef = doc(firestoreDb, "profiles", uid);
      await setDoc(profileRef, initialProfile);

      // Save user session via server login endpoint to ensure synchronicity
      const res = await fetch("/api/profile/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: uid,
          email: email,
          name: name,
          role: role,
          wardName: detectedWard,
          latitude: lat,
          longitude: lng,
          location: detectedLocation
        })
      });

      if (!res.ok) {
        throw new Error("Failed to register session with server.");
      }

      const resData = await res.json();
      if (!resData.success) {
        throw new Error(resData.error || "Failed to register session with server.");
      }

      onComplete(initialProfile);
    } catch (err: any) {
      console.error("Error completing onboarding:", err);
      setGeneralError("Failed to save profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div id="onboarding_wizard_container" className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-[#0f172a] rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col text-left"
      >
        {/* Header Header */}
        <div className="p-6 bg-gradient-to-r from-emerald-600 to-teal-700 text-white relative">
          <div className="absolute right-4 top-4 flex items-center space-x-1 bg-white/10 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
            <Sparkles className="h-3 w-3 animate-pulse text-yellow-300" />
            <span>Onboarding • Step {step} of 3</span>
          </div>
          <h2 className="text-xl font-black uppercase tracking-wider">Welcome to IndiaCivic</h2>
          <p className="text-xs text-emerald-100 mt-1">Let's set up your profile and local ward jurisdiction.</p>
        </div>

        {generalError && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-600 font-semibold leading-relaxed shadow-sm">
            {generalError}
          </div>
        )}

        <div className="p-6 flex-grow flex flex-col space-y-6">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center space-x-4">
                  <div className="h-20 w-20 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-emerald-500 overflow-hidden flex items-center justify-center shadow-md relative group">
                    <img src={avatar} alt="Avatar Preview" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Personal Identity</h3>
                    <p className="text-xs text-slate-400">Confirm your display name that will appear on civic reports and community actions.</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your Full Name (e.g. Soham Agarwal)"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => name.trim() ? setStep(2) : setGeneralError("Please confirm your full name to proceed.")}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase rounded-xl tracking-wider cursor-pointer flex items-center justify-center space-x-1 shadow-md active:scale-95 transition-all"
                >
                  <span>Continue</span>
                  <ArrowRight className="h-4.5 w-4.5" />
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Account Type</h3>
                  <p className="text-xs text-slate-400">Select how you intend to interact with the IndiaCivic decentralized portal.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole("CITIZEN")}
                    className={`p-4 rounded-2xl border-2 text-left cursor-pointer transition-all flex flex-col space-y-2 bg-transparent ${
                      role === "CITIZEN"
                        ? "border-emerald-600 bg-emerald-50/10 dark:bg-emerald-950/20"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                    }`}
                  >
                    <div className={`p-2.5 rounded-xl inline-flex items-center justify-center ${role === "CITIZEN" ? "bg-emerald-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
                      <User className="h-5 w-5" />
                    </div>
                    <div className="text-xs font-black uppercase text-slate-800 dark:text-slate-100">Resident / Citizen</div>
                    <p className="text-[10px] text-slate-400 leading-normal">Report local municipal issues, verify complaints, participate in release votes, and earn civic points.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole("ORGANIZATION")}
                    className={`p-4 rounded-2xl border-2 text-left cursor-pointer transition-all flex flex-col space-y-2 bg-transparent ${
                      role === "ORGANIZATION"
                        ? "border-emerald-600 bg-emerald-50/10 dark:bg-emerald-950/20"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                    }`}
                  >
                    <div className={`p-2.5 rounded-xl inline-flex items-center justify-center ${role === "ORGANIZATION" ? "bg-emerald-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
                      <Building className="h-5 w-5" />
                    </div>
                    <div className="text-xs font-black uppercase text-slate-800 dark:text-slate-100">Organization / NGO</div>
                    <p className="text-[10px] text-slate-400 leading-normal">Adopt municipal wards, execute crowdfunding infrastructure campaigns, resolve issues, and earn carbon credits.</p>
                  </button>
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-1/3 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs uppercase rounded-xl tracking-wider cursor-pointer transition-all"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase rounded-xl tracking-wider cursor-pointer flex items-center justify-center space-x-1 shadow-md active:scale-95 transition-all"
                  >
                    <span>Continue</span>
                    <ArrowRight className="h-4.5 w-4.5" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Ward & Location Setup</h3>
                  <p className="text-xs text-slate-400">Specify your home base or locality. We match issues and campaigns based on your local Ward jurisdiction.</p>
                </div>

                {searchError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-xl text-[11px] text-rose-600 font-semibold leading-relaxed">
                    {searchError}
                  </div>
                )}

                <div className="space-y-3">
                  <button
                    type="button"
                    disabled={isDetecting}
                    onClick={detectLocation}
                    className="w-full py-3.5 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-emerald-800 rounded-2xl cursor-pointer flex items-center justify-center space-x-2 text-xs font-black uppercase tracking-wider transition-all"
                  >
                    {isDetecting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-emerald-800" />
                        <span>Detecting Local Coordinates...</span>
                      </>
                    ) : (
                      <>
                        <MapPin className="h-4 w-4 animate-pulse text-emerald-600" />
                        <span>Detect Location Automatically</span>
                      </>
                    )}
                  </button>

                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                    <span className="flex-shrink mx-4 text-slate-400 text-[10px] font-bold uppercase tracking-wider">or search locality</span>
                    <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                  </div>

                  <div className="flex space-x-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
                        placeholder="Search locality, e.g. Indiranagar, Bengaluru..."
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-9 pr-4 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    </div>
                    <button
                      type="button"
                      disabled={isSearching}
                      onClick={handleManualSearch}
                      className="px-4 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold uppercase rounded-xl cursor-pointer disabled:bg-slate-400"
                    >
                      {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                    </button>
                  </div>

                  {searchResults.length > 0 && (
                    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-40 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                      {searchResults.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => selectPlace(item)}
                          className="w-full text-left py-2 px-3 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border-none block"
                        >
                          {item.display_name || item.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Detected Ward and Location Panel */}
                  <div className="p-4 bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl flex flex-col space-y-2">
                    <div className="flex items-center space-x-2 text-emerald-800 dark:text-emerald-400">
                      <CheckCircle className="h-4.5 w-4.5" />
                      <span className="text-xs font-black uppercase tracking-wider">Identified Ward Jurisdiction</span>
                    </div>
                    <div className="text-xs font-black text-slate-800 dark:text-slate-100">
                      {detectedWard}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Locality: {detectedLocation} • Lat: {lat.toFixed(4)}, Lng: {lng.toFixed(4)}
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="w-1/4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs uppercase rounded-xl tracking-wider cursor-pointer transition-all"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleFinish}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-bold text-xs uppercase rounded-xl tracking-wider cursor-pointer flex items-center justify-center space-x-1.5 shadow-md active:scale-95 transition-all"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4.5 w-4.5 animate-spin" />
                        <span>Saving Passport...</span>
                      </>
                    ) : (
                      <>
                        <span>Confirm & Enter IndiaCivic</span>
                        <ArrowRight className="h-4.5 w-4.5" />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
