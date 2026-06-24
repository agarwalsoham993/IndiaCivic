/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Home, 
  Map, 
  PlusCircle, 
  Megaphone, 
  User, 
  CheckCircle, 
  ThumbsUp, 
  MessageSquare, 
  ThumbsDown,
  X,
  Share2,
  Calendar,
  Clock,
  ShieldCheck,
  AlertTriangle,
  MapPin,
  Send,
  Lock,
  Mail,
  UserPlus
} from "lucide-react";

import { Issue, Campaign, UserProfile, Comment, Donation } from "./types";
import HomeView from "./components/HomeView";
import MapsView from "./components/MapsView";
import ReportView from "./components/ReportView";
import CampaignsView from "./components/CampaignsView";
import ProfileView from "./components/ProfileView";

// Firebase Auth & Config
import { auth } from "./lib/firebase";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut 
} from "firebase/auth";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("maps");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [citizenProfile, setCitizenProfile] = useState<UserProfile | null>(null);
  const [orgProfile, setOrgProfile] = useState<UserProfile | null>(null);
  
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [corroborationText, setCorroborationText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Firebase Auth UI States
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const isGuest = !userProfile || userProfile.id === "guest";
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    const isTouchOrMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
    return window.innerWidth < 768 || isTouchOrMobileUA;
  });

  useEffect(() => {
    const handleResize = () => {
      const isTouchOrMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      setIsMobile(window.innerWidth < 768 || isTouchOrMobileUA);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (isGuest && (activeTab === "home" || activeTab === "profile")) {
      setActiveTab("maps");
    }
  }, [isGuest, activeTab]);

  const loadAllData = async () => {
    try {
      // Fetch issues
      const resIssues = await fetch("/api/issues");
      const dataIssues = await resIssues.json();
      setIssues(dataIssues);

      // Fetch campaigns
      const resCamps = await fetch("/api/campaigns");
      const dataCamps = await resCamps.json();
      setCampaigns(dataCamps);

      // Fetch profiles
      const resProfile = await fetch("/api/profile");
      const dataProfile = await resProfile.json();
      setUserProfile(dataProfile.activeUser);
      setCitizenProfile(dataProfile.citizen);
      setOrgProfile(dataProfile.org);
    } catch (err) {
      console.error("Error loading server data:", err);
    }
  };

  // Sync Firebase authentication with our Express + Firestore actual database
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        console.log("Firebase Auth User state changed: LOGGED IN", firebaseUser.email);
        try {
          const res = await fetch("/api/profile/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: authName || firebaseUser.displayName || firebaseUser.email?.split("@")[0]
            })
          });
          const data = await res.json();
          if (data.success) {
            setUserProfile(data.activeUser);
            setCitizenProfile(data.citizen);
            setOrgProfile(data.org);
          }
        } catch (err) {
          console.error("Error syncing authenticated user with backend:", err);
        }
      } else {
        console.log("Firebase Auth User state changed: GUEST MODE");
        try {
          const res = await fetch("/api/profile/logout", { method: "POST" });
          const data = await res.json();
          if (data.success) {
            setUserProfile(data.activeUser);
          }
        } catch (err) {
          console.error("Error signing out backend session:", err);
        }
      }
      loadAllData();
    });

    return () => unsubscribe();
  }, [authName]);

  useEffect(() => {
    loadAllData();
  }, [activeTab]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    try {
      await signInWithEmailAndPassword(auth, authEmail, authPassword);
      setShowAuthModal(false);
      setAuthEmail("");
      setAuthPassword("");
    } catch (err: any) {
      console.error("Firebase Sign In Error:", err);
      setAuthError(err.message || "Failed to sign in. Please verify your credentials.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      setShowAuthModal(false);
      setAuthEmail("");
      setAuthPassword("");
    } catch (err: any) {
      console.error("Firebase Sign Up Error:", err);
      setAuthError(err.message || "Failed to create account.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Firebase Sign Out Error:", err);
    }
  };

  const handleToggleRole = async (targetRole: 'CITIZEN' | 'ORGANIZATION') => {
    try {
      const response = await fetch("/api/profile/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetRole })
      });
      const data = await response.json();
      if (data.success) {
        setUserProfile(data.activeUser);
        loadAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleVote = async (issueId: string, voteType: 'UPVOTE' | 'AGREE' | 'DISAGREE') => {
    if (!userProfile || userProfile.id === "guest") {
      setAuthMode("signup");
      setShowAuthModal(true);
      return;
    }
    try {
      const response = await fetch(`/api/issues/${issueId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voteType,
          userId: userProfile ? userProfile.id : "guest"
        })
      });
      const data = await response.json();
      if (data.success) {
        // Update local issues list
        setIssues(prev => prev.map(iss => iss.id === issueId ? data.issue : iss));
        // Update currently opened selectedIssue
        if (selectedIssue && selectedIssue.id === issueId) {
          setSelectedIssue(data.issue);
        }
        loadAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddCorroboration = async (issueId: string) => {
    if (!userProfile || userProfile.id === "guest") {
      setAuthMode("signup");
      setShowAuthModal(true);
      return;
    }
    if (!corroborationText.trim()) return;
    try {
      const response = await fetch(`/api/issues/${issueId}/corroborate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author: userProfile ? userProfile.name : "Anonymous Neighbor",
          avatar: userProfile ? userProfile.avatar : undefined,
          text: corroborationText
        })
      });
      const data = await response.json();
      if (data.success) {
        setCorroborationText("");
        setSelectedIssue(data.issue);
        loadAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDonateEscrow = async (campaignId: string, amount: number, useWallet: boolean) => {
    if (!userProfile || userProfile.id === "guest") {
      setAuthMode("signup");
      setShowAuthModal(true);
      throw new Error("Please log in or sign up to contribute funds to escrow campaigns.");
    }
    const response = await fetch(`/api/campaigns/${campaignId}/donate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount,
        donorName: userProfile ? userProfile.name : "Anonymous Neighbor",
        donorId: userProfile ? userProfile.id : "guest",
        useWallet
      })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Failed to process donation");
    }
    loadAllData();
    return data.receipt;
  };

  const handleVerifyStep = async (campaignId: string, step: number, vote?: 'AGREE' | 'DISAGREE') => {
    if (!userProfile || userProfile.id === "guest") {
      setAuthMode("signup");
      setShowAuthModal(true);
      throw new Error("Please log in or sign up to participate in community verification.");
    }
    const response = await fetch(`/api/campaigns/${campaignId}/verify-step`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        step,
        vote,
        userId: userProfile ? userProfile.id : "guest"
      })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Failed to process verification step");
    }
    loadAllData();
    return data.campaign;
  };

  const handleSimulate90Days = async (campaignId: string) => {
    const response = await fetch(`/api/campaigns/${campaignId}/simulate-90-days`, {
      method: "POST"
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Refund simulation failed");
    }
    loadAllData();
    return data;
  };

  const getSeverityBadgeColor = (severity: number) => {
    if (severity >= 4) return "text-rose-700 bg-rose-50 border-rose-200";
    if (severity === 3) return "text-amber-700 bg-amber-50 border-amber-200";
    return "text-indigo-700 bg-indigo-50 border-indigo-200";
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans antialiased py-6 px-4 flex flex-col items-center justify-center">
      
      {/* Decorative blurred circles for atmosphere */}
      <div className="absolute top-[10%] left-[20%] w-[320px] h-[320px] bg-indigo-100/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[10%] right-[20%] w-[350px] h-[350px] bg-slate-200/50 rounded-full blur-3xl pointer-events-none" />

      {/* Main mobile viewport emulator shell container */}
      <div className="w-full max-w-[440px] h-[860px] rounded-[36px] bg-white border-4 border-slate-300 shadow-2xl relative flex flex-col overflow-hidden">
        
        {/* Mobile speaker notch / status bar details */}
        <div className="w-full bg-slate-50 h-7 flex items-center justify-between px-6 z-30 select-none border-b border-slate-100">
          <span className="text-[10px] font-bold font-mono text-slate-400">14:32 IST</span>
          <div className="w-20 h-4 bg-slate-200 rounded-full flex items-center justify-center">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
          </div>
          <span className="text-[10px] font-bold font-mono text-slate-400">LTE 100%</span>
        </div>

        {/* Inner header brand bar */}
        <div className="h-14 bg-white border-b border-slate-200 px-5 flex items-center justify-between z-10">
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className="h-5 w-5 text-indigo-600" />
            <h1 className="text-md font-black tracking-widest text-slate-800 uppercase">IndiaCivic</h1>
          </div>
          {(!userProfile || userProfile.id === 'guest') ? (
            <button 
              onClick={() => {
                setAuthMode('signup');
                setShowAuthModal(true);
              }}
              className="text-[10px] font-black uppercase text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded shadow-sm tracking-wider cursor-pointer transition-all"
            >
              Sign Up
            </button>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="text-[9px] font-black uppercase text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 tracking-wider">
                {userProfile.role}
              </span>
              <button 
                onClick={handleLogout}
                className="text-[9px] font-bold text-slate-400 hover:text-rose-600 cursor-pointer"
              >
                Logout
              </button>
            </div>
          )}
        </div>

        {/* Scrollable Viewport Stage */}
        <div className={`flex-1 ${activeTab === "maps" ? "overflow-hidden p-0 bg-slate-950" : "overflow-y-auto px-4 py-4 bg-slate-50"} scrollbar-none relative`}>
          
          <AnimatePresence mode="wait">
            {selectedIssue ? (
              // Immersive Issue Detail Sub-View
              <motion.div
                key="issue-details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5 pb-16 text-left"
              >
                {/* Back button */}
                <button 
                  onClick={() => setSelectedIssue(null)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center space-x-1 uppercase cursor-pointer"
                >
                  <span>← Back to Feed</span>
                </button>

                {/* Cover visual header */}
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 h-48 shadow-sm">
                  <img 
                    src={selectedIssue.imageUrl || "https://images.unsplash.com/photo-1542060748-10c28b629f6f?auto=format&fit=crop&w=600&q=80"}
                    alt={selectedIssue.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-transparent to-transparent" />
                  
                  <div className="absolute bottom-3 left-3 space-y-1">
                    <span className="px-2 py-0.5 text-[8px] font-bold bg-white/90 border border-slate-200 text-slate-800 rounded font-mono uppercase">
                      VIRTUAL ASSET: {selectedIssue.virtualAssetId}
                    </span>
                    <h3 className="text-md font-extrabold text-white">{selectedIssue.title}</h3>
                  </div>
                </div>

                {/* Subheader info stats */}
                <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2 shadow-sm">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">TRACKING TICKET</span>
                    <span className="font-mono text-indigo-600 font-bold">{selectedIssue.trackingId}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">REPORTER ROLE</span>
                    <span className="font-semibold text-slate-700">{selectedIssue.reporterName}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">ROUTED PUBLIC DIVISION</span>
                    <span className="font-semibold text-slate-700 truncate max-w-[200px]">{selectedIssue.department}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">WARD ASSIGNED</span>
                    <span className="font-semibold text-slate-700">{selectedIssue.ward}</span>
                  </div>
                </div>

                {/* Description paragraph */}
                <p className="text-xs text-slate-600 leading-relaxed bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                  {selectedIssue.description}
                </p>

                {/* Community consensus verification action panel */}
                <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3 shadow-sm">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="h-4.5 w-4.5 text-indigo-600" />
                    <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">Community Verification</h4>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Is this problem real and described accurately? Your verification consensus triggers auto-escalation to the Ward {selectedIssue.representative}.
                  </p>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleVote(selectedIssue.id, "AGREE")}
                      className="flex-1 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 font-extrabold rounded-lg text-[10px] uppercase cursor-pointer flex items-center justify-center space-x-1"
                    >
                      <ThumbsUp className="h-3 w-3" />
                      <span>Yes, Verified</span>
                    </button>
                    <button
                      onClick={() => handleVote(selectedIssue.id, "DISAGREE")}
                      className="flex-1 py-1.5 bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 font-extrabold rounded-lg text-[10px] uppercase cursor-pointer flex items-center justify-center space-x-1"
                    >
                      <ThumbsDown className="h-3 w-3" />
                      <span>Inaccurate</span>
                    </button>
                  </div>

                  {/* Consensus bar indicator */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-[9px] text-slate-400 font-bold uppercase">
                      <span>consensus agreement</span>
                      <span>{selectedIssue.agreeVotes} / {selectedIssue.agreeVotes + selectedIssue.disagreeVotes} votes</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full" 
                        style={{ width: `${selectedIssue.agreeVotes + selectedIssue.disagreeVotes > 0 ? (selectedIssue.agreeVotes / (selectedIssue.agreeVotes + selectedIssue.disagreeVotes)) * 100 : 50}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Supporting evidence panel */}
                {selectedIssue.evidenceLinks.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2 shadow-sm">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Verified Supporting Evidence</span>
                    <div className="flex items-center space-x-2 text-xs text-indigo-600">
                      <Clock className="h-4.5 w-4.5 text-indigo-500 flex-shrink-0" />
                      <a href={selectedIssue.evidenceLinks[0]} target="_blank" rel="noreferrer" className="underline truncate hover:text-indigo-800">
                        {selectedIssue.evidenceLinks[0]}
                      </a>
                    </div>
                  </div>
                )}

                {/* Timeline status track list */}
                <div className="space-y-2">
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Audit Timeline Ledger</span>
                  <div className="space-y-3 pl-2.5 border-l border-slate-200 text-[10px]">
                    <div className="relative">
                      <div className="absolute -left-[14px] top-1 h-2 w-2 rounded-full bg-indigo-500" />
                      <div className="font-bold text-slate-700">Report Submitted</div>
                      <div className="text-slate-400 font-mono">{new Date(selectedIssue.timestamp).toLocaleDateString()} • {selectedIssue.reporterName}</div>
                    </div>
                    <div className="relative">
                      <div className="absolute -left-[14px] top-1 h-2 w-2 rounded-full bg-indigo-500" />
                      <div className="font-bold text-slate-700">GPS Metadata match Verified</div>
                      <div className="text-slate-400 font-mono">Location verified inside BBMP boundaries</div>
                    </div>
                    <div className="relative">
                      <div className="absolute -left-[14px] top-1 h-2 w-2 rounded-full bg-indigo-500" />
                      <div className="font-bold text-slate-700">Virtual Asset ID Assigned</div>
                      <div className="text-slate-400 font-mono">Identifier: {selectedIssue.virtualAssetId}</div>
                    </div>
                  </div>
                </div>

                {/* Corroborations list */}
                <div className="space-y-3">
                  <span className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider block">
                    Citizen Corroborations ({selectedIssue.corroborations.length})
                  </span>

                  <div className="space-y-2.5">
                    {selectedIssue.corroborations.map((corr) => (
                      <div key={corr.id} className="bg-white border border-slate-200 p-3 rounded-xl space-y-1 shadow-sm">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-extrabold text-slate-700">{corr.author}</span>
                          <span className="text-indigo-600 font-bold">Active Citizen</span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed font-medium">{corr.text}</p>
                      </div>
                    ))}
                  </div>

                  {/* Add corroboration comment input */}
                  <div className="flex space-x-2 pt-2">
                    <input 
                      type="text" 
                      placeholder="Add your testimony or agree..."
                      value={corroborationText}
                      onChange={(e) => setCorroborationText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddCorroboration(selectedIssue.id)}
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-3 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400"
                    />
                    <button
                      onClick={() => handleAddCorroboration(selectedIssue.id)}
                      className="p-2.5 bg-indigo-600 text-white hover:bg-indigo-700 transition-colors rounded-xl cursor-pointer"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              // Navigation Tab Routing Switchboard
              <motion.div
                key="tab-views"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {activeTab === "home" && (
                  <HomeView 
                    user={userProfile || DEFAULT_USER}
                    issues={issues}
                    onSelectIssue={setSelectedIssue}
                    onNavigateToTab={setActiveTab}
                    onVote={(id, type) => handleVote(id, type)}
                    onSignUpClick={() => {
                      setAuthMode('signup');
                      setShowAuthModal(true);
                    }}
                  />
                )}
                {activeTab === "maps" && <MapsView issues={issues} isMobile={isMobile} />}
                {activeTab === "report" && (
                  <ReportView 
                    onAddIssue={() => {
                      loadAllData();
                      setActiveTab("home");
                    }} 
                  />
                )}
                {activeTab === "campaigns" && (
                  <CampaignsView 
                    user={userProfile || DEFAULT_USER}
                    campaigns={campaigns}
                    onDonate={handleDonateEscrow}
                    onVerifyStep={handleVerifyStep}
                    onSimulate90Days={handleSimulate90Days}
                  />
                )}
                {activeTab === "profile" && (
                  <ProfileView 
                    user={userProfile || DEFAULT_USER}
                    citizen={citizenProfile || DEFAULT_USER}
                    org={orgProfile || DEFAULT_ORG}
                    onToggleRole={handleToggleRole}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Floating Add Issue Center Bottom bar button */}
        {isMobile && activeTab !== "report" && !selectedIssue && (
          <div className="absolute bottom-[66px] left-1/2 -translate-x-1/2 z-25">
            <button
              onClick={() => setActiveTab("report")}
              className="h-14 w-14 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-600/30 border-2 border-white flex items-center justify-center transition-all hover:scale-105 cursor-pointer"
              title="Report Issue"
              id="fab-report"
            >
              <PlusCircle className="h-8 w-8 text-white font-black" />
            </button>
          </div>
        )}

        {/* Navigation bottom control bar bar */}
        <div className="h-16 bg-white border-t border-slate-200 px-5 flex items-center justify-between z-20 select-none">
          {!isGuest && (
            <button 
              onClick={() => {
                setActiveTab("home");
                setSelectedIssue(null);
              }}
              className={`flex flex-col items-center space-y-0.5 w-12 transition-colors cursor-pointer ${
                activeTab === "home" && !selectedIssue ? "text-indigo-600 font-extrabold" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <Home className="h-5 w-5" />
              <span className="text-[9px]">Home</span>
            </button>
          )}
          
          <button 
            onClick={() => {
              setActiveTab("maps");
              setSelectedIssue(null);
            }}
            className={`flex flex-col items-center space-y-0.5 w-12 transition-colors cursor-pointer ${
              activeTab === "maps" ? "text-indigo-600 font-extrabold" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Map className="h-5 w-5" />
            <span className="text-[9px]">Maps</span>
          </button>

          {/* Spacer for floating FAB report button */}
          <div className="w-10" />

          <button 
            onClick={() => {
              setActiveTab("campaigns");
              setSelectedIssue(null);
            }}
            className={`flex flex-col items-center space-y-0.5 w-12 transition-colors cursor-pointer ${
              activeTab === "campaigns" ? "text-indigo-600 font-extrabold" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Megaphone className="h-5 w-5" />
            <span className="text-[9px]">Campaigns</span>
          </button>

          {!isGuest && (
            <button 
              onClick={() => {
                setActiveTab("profile");
                setSelectedIssue(null);
              }}
              className={`flex flex-col items-center space-y-0.5 w-12 transition-colors cursor-pointer ${
                activeTab === "profile" ? "text-indigo-600 font-extrabold" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <User className="h-5 w-5" />
              <span className="text-[9px]">Profile</span>
            </button>
          )}
        </div>

        {/* Sign In & Sign Up Modal Overlay */}
        <AnimatePresence>
          {showAuthModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-[340px] space-y-4 shadow-xl relative text-left"
              >
                <button 
                  onClick={() => {
                    setShowAuthModal(false);
                    setAuthError("");
                  }}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="text-center space-y-1">
                  <div className="mx-auto h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                    <UserPlus className="h-5 w-5 text-indigo-600" />
                  </div>
                  <h3 className="text-md font-extrabold text-slate-800 uppercase tracking-wider">
                    {authMode === 'signin' ? 'Sign In' : 'Create Account'}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {authMode === 'signin' ? 'Access your civic workspace' : 'Join local citizen campaigns'}
                  </p>
                </div>

                {authError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-xl text-[10px] text-rose-600 font-semibold leading-relaxed">
                    {authError}
                  </div>
                )}

                <form onSubmit={authMode === 'signin' ? handleSignIn : handleSignUp} className="space-y-3">
                  {authMode === 'signup' && (
                    <div className="relative">
                      <input 
                        type="text"
                        placeholder="Full Name (Rahul Sharma)"
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400"
                      />
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    </div>
                  )}

                  <div className="relative">
                    <input 
                      type="email"
                      placeholder="Email (neighbor@civic.in)"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400"
                    />
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  </div>

                  <div className="relative">
                    <input 
                      type="password"
                      placeholder="Password (6+ characters)"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400"
                    />
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  </div>

                  <button 
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-indigo-300 font-black text-[11px] uppercase rounded-xl tracking-wider cursor-pointer transition-all flex items-center justify-center space-x-1 shadow-sm"
                  >
                    {authLoading ? 'Syncing...' : (authMode === 'signin' ? 'Sign In' : 'Sign Up')}
                  </button>
                </form>

                <div className="text-center">
                  <button 
                    onClick={() => {
                      setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                      setAuthError("");
                    }}
                    className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 cursor-pointer bg-transparent border-none"
                  >
                    {authMode === 'signin' ? "Don't have an account? Sign Up" : "Already registered? Sign In"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}

// Fallback seed dummy users if load profile fails on first render cycle
const DEFAULT_USER: UserProfile = {
  id: "user-rahul-sharma",
  name: "Rahul Sharma",
  avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
  location: "Indiranagar, Bengaluru",
  role: "CITIZEN",
  civicScore: 740,
  totalPoints: 1850,
  personalActiveScore: 85,
  contributionCount: 42,
  citizensHelped: 1240,
  totalDonations: 6500,
  pointsBreakdown: {
    reporting: 850,
    verifying: 600,
    donating: 400,
  },
  badges: ["First Responder", "Verified Eye", "Streak Champion", "Safety Auditor", "Top Donor"],
  streakDays: 14,
  availableFunds: 2500,
};

const DEFAULT_ORG: UserProfile = {
  id: "org-green-ward",
  name: "Green Ward Foundation",
  avatar: "https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=150&q=80",
  location: "North Bengaluru, Ward 42",
  role: "ORGANIZATION",
  civicScore: 920,
  totalPoints: 8500,
  personalActiveScore: 95,
  contributionCount: 156,
  citizensHelped: 12450,
  totalDonations: 45000,
  pointsBreakdown: {
    reporting: 3500,
    verifying: 2000,
    donating: 3000,
  },
  badges: ["Eco Guardian", "Ward Adoptive Leader", "Gold ESG Rating", "CSR Platinum Partner"],
  streakDays: 28,
  adoptedWards: ["Ward 42, North Zone", "Ward 18, Central", "Ward 05, East Zone"],
  carbonCredits: 12450,
  availableFunds: 15000,
};
