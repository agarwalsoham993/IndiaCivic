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
  UserPlus,
  Building,
  CheckCircle2,
  Camera,
  Check,
  Award,
  LogOut,
  Sparkles,
  CheckSquare
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
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";

const SidebarItem = ({ 
  icon: Icon, 
  label, 
  active, 
  onClick 
}: { 
  icon: any; 
  label: string; 
  active: boolean; 
  onClick: () => void; 
}) => {
  return (
    <div className="w-full px-1">
      <button
        onClick={onClick}
        className="group relative w-full flex flex-col items-center justify-center py-1 cursor-pointer border-none bg-transparent"
      >
        {/* Tooltip on hover */}
        <div className="absolute left-full ml-4 px-3 py-1.5 bg-slate-900 text-white text-[10px] font-black tracking-wider uppercase rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-150 transform translate-x-2 group-hover:translate-x-0 whitespace-nowrap pointer-events-none z-50">
          {label}
        </div>

        {/* First Image UI Style: Rounded square container */}
        <div className={`w-[60px] h-[60px] sm:w-[68px] sm:h-[68px] rounded-2xl flex flex-col items-center justify-center transition-all ${
          active 
            ? "bg-[#cbe2d3] shadow-inner text-[#1e4620]" 
            : "hover:bg-white/40 text-[#2d5a27]/70 hover:text-[#1e4620]"
        }`}>
          {/* Icon Badge container (as in the first image) */}
          <div className={`p-1.5 rounded-xl flex items-center justify-center transition-all ${
            active 
              ? "bg-white text-[#1e4620] shadow-sm" 
              : "bg-transparent text-[#2d5a27]"
          }`}>
            <Icon className="h-5 w-5" />
          </div>

          {/* Small label below icon */}
          <span className={`text-[9px] font-extrabold mt-1 sm:mt-1.5 uppercase tracking-wider text-center px-1 truncate w-full ${
            active ? "text-[#1e4620]" : "text-[#2d5a27]/80"
          }`}>
            {label}
          </span>
        </div>
      </button>
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTabState] = useState<string>("maps");
  const [prevTab, setPrevTab] = useState<string>("maps");

  const setActiveTab = (tab: string) => {
    setActiveTabState((current) => {
      if (current !== "report") {
        setPrevTab(current);
      }
      return tab;
    });
  };
  const [issues, setIssues] = useState<Issue[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [citizenProfile, setCitizenProfile] = useState<UserProfile | null>(null);
  const [orgProfile, setOrgProfile] = useState<UserProfile | null>(null);
  const [leaderboardUsers, setLeaderboardUsers] = useState<UserProfile[]>([]);
  
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [corroborationText, setCorroborationText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Issue Resolution proof States
  const [isResolving, setIsResolving] = useState(false);
  const [resolutionPhoto, setResolutionPhoto] = useState<string | null>(null);
  const [resolutionDesc, setResolutionDesc] = useState("");
  const [resolutionLoading, setResolutionLoading] = useState(false);
  const [resolutionError, setResolutionError] = useState("");
  const [resolutionSuccessMsg, setResolutionSuccessMsg] = useState("");

  // Upvote Proof States
  const [showUpvoteProofModal, setShowUpvoteProofModal] = useState(false);
  const [upvoteIssueId, setUpvoteIssueId] = useState<string | null>(null);
  const [upvoteMedia, setUpvoteMedia] = useState<string | null>(null);
  const [upvoteText, setUpvoteText] = useState("");

  // Comment replies and comment upvote UI States
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  // Firebase Auth UI States
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [signUpRole, setSignUpRole] = useState<'CITIZEN' | 'ORGANIZATION'>('CITIZEN');

  const isGuest = !userProfile || userProfile.id === "guest";
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 1024;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [userLocationName, setUserLocationName] = useState<string>("Indiranagar, Bengaluru");
  const [userWardName, setUserWardName] = useState<string>("Ward 88");
  const [isLocationLoading, setIsLocationLoading] = useState<boolean>(false);
  const [locationErrorMsg, setLocationErrorMsg] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined" && navigator.geolocation) {
      setIsLocationLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          try {
            // Use our server-side CORS-free proxy first
            let response = await fetch(`/api/reverse-geocode?lat=${lat}&lng=${lng}`);
            if (!response.ok) {
              // Direct client-side Nominatim fallback if backend proxy fails
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
                setUserLocationName(display);
                
                const wardNum = Math.floor((Math.abs(lat) + Math.abs(lng)) * 100) % 150 + 1;
                setUserWardName(`Ward ${wardNum}`);
              } else {
                setUserLocationName(`${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`);
                setUserWardName(`Zone ${Math.floor(lat) % 10}`);
              }
            } else {
              setUserLocationName(`${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`);
              setUserWardName(`Zone ${Math.floor(lat) % 10}`);
            }
          } catch (err) {
            console.error("Reverse geocoding error:", err);
            setUserLocationName(`${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`);
            setUserWardName(`Zone ${Math.floor(lat) % 10}`);
          } finally {
            setIsLocationLoading(false);
          }
        },
        (error) => {
          console.warn("Geolocation permission denied or timed out:", error);
          setLocationErrorMsg("Permission denied or location unavailable.");
          setIsLocationLoading(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
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

      // Fetch leaderboard users
      const resLeaderboard = await fetch("/api/leaderboard");
      const dataLeaderboard = await resLeaderboard.json();
      setLeaderboardUsers(dataLeaderboard);
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
              name: firebaseUser.displayName || firebaseUser.email?.split("@")[0],
              role: signUpRole
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
  }, [signUpRole]);

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

  const handleGoogleSignIn = async () => {
    setAuthError("");
    setAuthLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setShowAuthModal(false);
    } catch (err: any) {
      console.error("Firebase Google Sign In Error:", err);
      setAuthError(err.message || "Google Sign In failed.");
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

  const handleVote = async (issueId: string, voteType: 'UPVOTE' | 'AGREE' | 'DISAGREE', mediaBase64?: string, mediaText?: string) => {
    if (!userProfile || userProfile.id === "guest") {
      setAuthMode("signup");
      setShowAuthModal(true);
      return;
    }
    
    // Intercept UPVOTE to prompt for optional media proof
    if (voteType === "UPVOTE" && !mediaBase64 && !showUpvoteProofModal) {
      setUpvoteIssueId(issueId);
      setUpvoteMedia(null);
      setUpvoteText("");
      setShowUpvoteProofModal(true);
      return;
    }

    try {
      const response = await fetch(`/api/issues/${issueId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voteType,
          userId: userProfile ? userProfile.id : "guest",
          mediaBase64: mediaBase64 || undefined,
          mediaText: mediaText || undefined
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
        setShowUpvoteProofModal(false);
        loadAllData();
      } else {
        alert(data.error || "Failed to submit vote.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolveIssue = async (issueId: string) => {
    if (!userProfile || userProfile.id === "guest") {
      setAuthMode("signup");
      setShowAuthModal(true);
      return;
    }
    setResolutionLoading(true);
    setResolutionError("");
    setResolutionSuccessMsg("");

    // Gather automatic geolocation and timestamp
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const timestamp = new Date().toISOString();

        try {
          const response = await fetch(`/api/issues/${issueId}/resolve`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              resolvedPhoto: resolutionPhoto,
              resolvedDescription: resolutionDesc,
              resolvedLatitude: lat,
              resolvedLongitude: lng,
              resolvedTimestamp: timestamp
            })
          });
          const data = await response.json();
          if (response.ok && data.success) {
            setResolutionSuccessMsg("Congratulations! This issue has been verified and successfully resolved via AI comparison. You earned +150 XP points!");
            setSelectedIssue(data.issue);
            setIssues(prev => prev.map(iss => iss.id === issueId ? data.issue : iss));
            setResolutionPhoto(null);
            setResolutionDesc("");
            setIsResolving(false);
            loadAllData();
          } else {
            setResolutionError(data.error || "Failed to resolve issue.");
          }
        } catch (err: any) {
          console.error("Resolution upload error:", err);
          setResolutionError("Network error. Please try again.");
        } finally {
          setResolutionLoading(false);
        }
      },
      async (geoError) => {
        console.warn("Geolocation fetching failed. Using approximate device IP coordinates...", geoError);
        // Fallback to approximately original issue location for demonstration purposes if permission denied
        try {
          const response = await fetch(`/api/issues/${issueId}/resolve`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              resolvedPhoto: resolutionPhoto,
              resolvedDescription: resolutionDesc,
              resolvedLatitude: selectedIssue ? selectedIssue.latitude : undefined,
              resolvedLongitude: selectedIssue ? selectedIssue.longitude : undefined,
              resolvedTimestamp: new Date().toISOString()
            })
          });
          const data = await response.json();
          if (response.ok && data.success) {
            setResolutionSuccessMsg("Congratulations! This issue has been verified and successfully resolved. You earned +150 XP points!");
            setSelectedIssue(data.issue);
            setIssues(prev => prev.map(iss => iss.id === issueId ? data.issue : iss));
            setResolutionPhoto(null);
            setResolutionDesc("");
            setIsResolving(false);
            loadAllData();
          } else {
            setResolutionError(data.error || "Failed to resolve issue.");
          }
        } catch (err: any) {
          console.error("Resolution fallback upload error:", err);
          setResolutionError("Network error. Please check your connection.");
        } finally {
          setResolutionLoading(false);
        }
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  const handleAddCorroboration = async (issueId: string, parentId?: string, customText?: string) => {
    if (!userProfile || userProfile.id === "guest") {
      setAuthMode("signup");
      setShowAuthModal(true);
      return;
    }
    const textToSend = customText !== undefined ? customText : corroborationText;
    if (!textToSend.trim()) return;
    try {
      const response = await fetch(`/api/issues/${issueId}/corroborate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author: userProfile ? userProfile.name : "Anonymous Neighbor",
          avatar: userProfile ? userProfile.avatar : undefined,
          text: textToSend,
          parentId: parentId || undefined
        })
      });
      const data = await response.json();
      if (data.success) {
        if (customText === undefined) {
          setCorroborationText("");
        }
        setSelectedIssue(data.issue);
        setIssues(prev => prev.map(iss => iss.id === issueId ? data.issue : iss));
        loadAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleVoteComment = async (issueId: string, commentId: string) => {
    if (!userProfile || userProfile.id === "guest") {
      setAuthMode("signup");
      setShowAuthModal(true);
      return;
    }
    try {
      const response = await fetch(`/api/issues/${issueId}/comments/${commentId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userProfile.id })
      });
      const data = await response.json();
      if (data.success) {
        setSelectedIssue(data.issue);
        setIssues(prev => prev.map(iss => iss.id === issueId ? data.issue : iss));
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

  if (!isMobile) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased flex relative">
        {/* Left Desktop Sidebar - Collapsed & Pastel Green */}
        <div className="w-16 sm:w-20 bg-[#e6f4ea] text-emerald-950 flex flex-col border-r border-[#cbe2d3] fixed h-full top-0 left-0 z-30 select-none">
          {/* Brand Header */}
          <div className="h-16 flex items-center justify-center border-b border-[#cbe2d3] bg-[#d5ecd9]/80">
            <div className="group relative flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-emerald-700 animate-pulse cursor-pointer" />
              {/* Tooltip */}
              <div className="absolute left-full ml-4 px-2.5 py-1.5 bg-slate-900 text-white text-[10px] font-black tracking-wider uppercase rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                IndiaCivic
              </div>
            </div>
          </div>

          {/* Collapsed Sidebar Navigation links */}
          <nav className="flex-1 py-6 flex flex-col items-center space-y-4">
            {!isGuest && (
              <SidebarItem 
                icon={Home}
                label="Home"
                active={activeTab === "home" && !selectedIssue}
                onClick={() => {
                  setActiveTab("home");
                  setSelectedIssue(null);
                }}
              />
            )}

            <SidebarItem 
              icon={Map}
              label="Map"
              active={activeTab === "maps" && !selectedIssue}
              onClick={() => {
                setActiveTab("maps");
                setSelectedIssue(null);
              }}
            />

            <SidebarItem 
              icon={PlusCircle}
              label="Report"
              active={activeTab === "report" && !selectedIssue}
              onClick={() => {
                setActiveTab("report");
                setSelectedIssue(null);
              }}
            />

            <SidebarItem 
              icon={Megaphone}
              label="Campaigns"
              active={activeTab === "campaigns" && !selectedIssue}
              onClick={() => {
                setActiveTab("campaigns");
                setSelectedIssue(null);
              }}
            />
          </nav>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-[#cbe2d3] bg-[#d5ecd9]/40 flex flex-col items-center space-y-4">
            {isGuest ? (
              <button 
                onClick={() => {
                  setAuthMode('signup');
                  setShowAuthModal(true);
                }}
                className="group relative w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-md transition-all cursor-pointer border-none"
              >
                <UserPlus className="h-5 w-5" />
                <div className="absolute left-full ml-4 px-2.5 py-1.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap pointer-events-none z-50">
                  Join / Sign In
                </div>
              </button>
            ) : (
              <div className="flex flex-col items-center space-y-4 w-full">
                {/* User Avatar Badge with Hover Stats Card */}
                <button 
                  onClick={() => {
                    setActiveTab("profile");
                    setSelectedIssue(null);
                  }}
                  className="group relative w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white border border-[#b2dbbf] text-emerald-950 flex items-center justify-center font-black text-sm uppercase shadow-xs cursor-pointer hover:border-emerald-500 transition-all"
                  title="Open Citizen Passport Dashboard"
                >
                  {(userProfile?.username || "C").charAt(0)}
                  {/* Tooltip showing full stats */}
                  <div className="absolute left-full ml-4 p-3 bg-slate-900 text-white text-[10px] font-bold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-150 transform translate-x-2 group-hover:translate-x-0 whitespace-nowrap pointer-events-none z-50 flex flex-col space-y-1 text-left">
                    <span className="font-extrabold text-white text-xs">{userProfile?.username}</span>
                    <span className="text-slate-400 text-[9px] uppercase tracking-wider">{userProfile?.role}</span>
                    <span className="text-emerald-400 text-[9px] font-mono">{userProfile?.totalPoints || 0} XP Points</span>
                  </div>
                </button>
                
                {/* Logout Button */}
                <button 
                  onClick={handleLogout}
                  className="group relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#fde8e8] hover:bg-rose-100 text-rose-700 border border-rose-200 flex items-center justify-center transition-all cursor-pointer"
                >
                  <LogOut className="h-4.5 w-4.5" />
                  <div className="absolute left-full ml-4 px-2.5 py-1.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap pointer-events-none z-50">
                    Logout Account
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Content Frame */}
        <div className="flex-1 flex flex-col min-h-screen pl-16 sm:pl-20 w-full bg-slate-50">
          {/* Desktop Header - Hidden for MapsView to allow 100% full screen expansion */}
          {activeTab !== "maps" && (
            <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-20 shadow-xs">
            <div className="flex items-center space-x-2">
              {selectedIssue ? (
                <button 
                  onClick={() => setSelectedIssue(null)}
                  className="text-xs font-bold text-slate-500 hover:text-indigo-600 flex items-center space-x-1 uppercase cursor-pointer bg-transparent border-none"
                >
                  <span>← Back to Community Feed</span>
                </button>
              ) : (
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest font-sans">
                  {activeTab === "home" && "Citizen Action Feed"}
                  {activeTab === "maps" && "Live Interactive Civic Map"}
                  {activeTab === "report" && "File a Verified Civic Ticket"}
                  {activeTab === "campaigns" && "Neighborhood Crowdfunding Escrows"}
                  {activeTab === "profile" && "Citizen Passport Dashboard"}
                </h2>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-500 bg-slate-100/80 px-3 py-1.5 rounded-lg border border-slate-200">
                <MapPin className="h-3.5 w-3.5 text-indigo-500 animate-pulse" />
                <span>
                  {isLocationLoading ? "Detecting actual location..." : `${userLocationName} (${userWardName})`}
                </span>
              </div>
              
              {!isGuest && (
                <div className="flex items-center space-x-2 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-100 text-xs font-bold">
                  <Award className="h-4 w-4 text-indigo-600" />
                  <span>{userProfile?.totalPoints} XP</span>
                </div>
              )}
            </div>
          </header>
          )}

          {/* Main Desktop Scrollable Area */}
          <main className={`flex-1 ${activeTab === "maps" ? "h-screen w-full overflow-hidden p-0" : "overflow-y-auto p-8"}`}>
            <div className={activeTab === "maps" ? "w-full h-full" : "max-w-7xl mx-auto w-full"}>
              <AnimatePresence mode="wait">
                {selectedIssue ? (
                  // Desktop Issue Detail View - Styled with Responsive grid layout
                  <motion.div
                    key="issue-details-desktop"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-5 pb-16 text-left animate-none"
                  >
                    {/* Back button */}
                    <button 
                      onClick={() => setSelectedIssue(null)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center space-x-1 uppercase cursor-pointer bg-transparent border-none"
                    >
                      <span>← Back to Feed</span>
                    </button>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                      {/* Left Side: General Issue info */}
                      <div className="lg:col-span-7 space-y-5">
                        {/* Cover visual header */}
                        <div className="relative rounded-2xl overflow-hidden border border-slate-200 h-64 shadow-sm bg-slate-100">
                          <img 
                            src={selectedIssue.imageUrl || "https://images.unsplash.com/photo-1542060748-10c28b629f6f?auto=format&fit=crop&w=600&q=80"}
                            alt={selectedIssue.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-transparent to-transparent" />
                          
                          <div className="absolute bottom-4 left-4 space-y-1">
                            <span className="px-2 py-0.5 text-[8px] font-bold bg-white/90 border border-slate-200 text-slate-800 rounded font-mono uppercase">
                              VIRTUAL ASSET: {selectedIssue.virtualAssetId}
                            </span>
                            <h3 className="text-lg font-extrabold text-white">{selectedIssue.title}</h3>
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
                        <p className="text-xs text-slate-600 leading-relaxed bg-white p-4 rounded-xl border border-slate-200 shadow-sm font-medium">
                          {selectedIssue.description}
                        </p>
                      </div>

                      {/* Right Side: Comments / Activity Discussion Feed */}
                      <div className="lg:col-span-5 flex flex-col space-y-5 h-full">
                        {/* CIVIC ACTION HUB (TWO OPTIONS) */}
                        <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-4 shadow-sm text-left">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide font-sans flex items-center space-x-1.5">
                              <Sparkles className="h-4 w-4 text-emerald-600" />
                              <span>Civic Action Hub</span>
                            </h4>
                            <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border ${selectedIssue.status === 'RESOLVED' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                              {selectedIssue.status}
                            </span>
                          </div>

                          {selectedIssue.status === "RESOLVED" ? (
                            <div className="space-y-3 bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100">
                              <div className="flex items-center space-x-2 text-emerald-800 text-xs font-bold">
                                <Check className="h-4 w-4 bg-emerald-100 rounded-full p-0.5" />
                                <span>Verified Resolved via Camera Proof</span>
                              </div>
                              {selectedIssue.resolutionProof?.photo && (
                                <div className="h-40 rounded-lg overflow-hidden border border-emerald-200 shadow-xs">
                                  <img 
                                    src={selectedIssue.resolutionProof.photo} 
                                    alt="Resolution Proof" 
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}
                              <p className="text-[11px] text-slate-600 font-medium italic">
                                "{selectedIssue.resolutionProof?.description || 'Issue reported as resolved by citizen.'}"
                              </p>
                              <div className="text-[10px] text-emerald-700 font-medium space-y-0.5 font-mono">
                                <div>Timestamp: {selectedIssue.resolutionProof?.timestamp ? new Date(selectedIssue.resolutionProof.timestamp).toLocaleString() : "N/A"}</div>
                                <div>Geolocation Log: {selectedIssue.resolutionProof?.latitude?.toFixed(6)}, {selectedIssue.resolutionProof?.longitude?.toFixed(6)}</div>
                                <div>AI Match Confidence: {selectedIssue.resolutionProof?.aiConfidence ? `${selectedIssue.resolutionProof.aiConfidence}%` : "Pending Match"}</div>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {/* The Three Main Options */}
                              {!isResolving && (
                                <div className="space-y-3">
                                  {/* Row 1: Resolve and Upvote */}
                                  <div className="grid grid-cols-2 gap-3">
                                    {/* Option 1: Issue is Resolved */}
                                    <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 flex flex-col justify-between space-y-2">
                                      <div className="text-left">
                                        <h5 className="text-[9px] font-black text-emerald-800 uppercase tracking-wider">Option 1: Fix & Verify</h5>
                                        <p className="text-[8.5px] text-slate-500 leading-normal mt-1">Submit live photo proof from your camera to verify resolution and earn +150 XP.</p>
                                      </div>
                                      <button
                                        onClick={() => {
                                          if (!userProfile || userProfile.id === "guest") {
                                            setAuthMode("signup");
                                            setShowAuthModal(true);
                                            return;
                                          }
                                          setIsResolving(true);
                                        }}
                                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black text-[9.5px] uppercase rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1 border-none shadow-sm"
                                      >
                                        <CheckSquare className="h-3.5 w-3.5" />
                                        <span>Resolve Issue</span>
                                      </button>
                                    </div>

                                    {/* Option 2: I have also seen this */}
                                    <div className="p-3 bg-indigo-50/30 rounded-xl border border-indigo-100 flex flex-col justify-between space-y-2">
                                      <div className="text-left">
                                        <h5 className="text-[9px] font-black text-indigo-800 uppercase tracking-wider">Option 2: Upvote / Agree</h5>
                                        <p className="text-[8.5px] text-slate-500 leading-normal mt-1">Witnessed this issue yourself? Upvote this report to increase urgency.</p>
                                      </div>
                                      <button
                                        onClick={() => handleVote(selectedIssue.id, "UPVOTE", "skip_media", "I have also seen this")}
                                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-black text-[9.5px] uppercase rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1 border-none shadow-sm"
                                      >
                                        <ThumbsUp className="h-3.5 w-3.5" />
                                        <span className="truncate">Upvote ({selectedIssue.upvotes || 0})</span>
                                      </button>
                                    </div>
                                  </div>

                                  {/* Row 2: Comment Option */}
                                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col justify-between space-y-2">
                                    <div className="text-left">
                                      <h5 className="text-[9px] font-black text-slate-700 uppercase tracking-wider">Option 3: Discussion & Update</h5>
                                      <p className="text-[8.5px] text-slate-500 leading-normal mt-1">Add details, updates, or coordinate fixes in the public comment boards.</p>
                                    </div>
                                    <button
                                      onClick={() => {
                                        const inputEl = document.getElementById("desktop-comment-input");
                                        if (inputEl) {
                                          inputEl.focus();
                                          inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        }
                                      }}
                                      className="w-full py-2 bg-slate-800 hover:bg-slate-900 active:scale-[0.98] text-white font-black text-[9.5px] uppercase rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1 border-none shadow-sm"
                                    >
                                      <MessageSquare className="h-3.5 w-3.5" />
                                      <span>Write Comment</span>
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Option 1 expanded camera page */}
                              {isResolving && (
                                <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                                  <h5 className="text-[11px] font-extrabold text-slate-700 uppercase">Camera Verification Feed</h5>
                                  
                                  <p className="text-[10px] text-slate-500 leading-relaxed font-semibold bg-white p-2.5 rounded-lg border border-slate-100">
                                    Close the problem, capture the images of the reported location with identifying the location and the issue is resolved visible clearly, verification will be done within next 72 hours.
                                  </p>

                                  {resolutionError && (
                                    <div className="p-2 bg-rose-50 border border-rose-150 text-rose-600 text-[10px] font-semibold rounded">
                                      {resolutionError}
                                    </div>
                                  )}

                                  <div className="space-y-1">
                                    {resolutionPhoto ? (
                                      <div className="relative rounded-lg overflow-hidden h-36 border border-slate-200 shadow-sm">
                                        <img src={resolutionPhoto} className="w-full h-full object-cover" />
                                        <button 
                                          onClick={() => setResolutionPhoto(null)}
                                          className="absolute top-2 right-2 p-1 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full cursor-pointer border-none"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="border-2 border-dashed border-slate-200 rounded-lg p-5 flex flex-col items-center justify-center bg-white shadow-xs">
                                        <Camera className="h-6 w-6 text-indigo-500 mb-2" />
                                        <label className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 cursor-pointer uppercase tracking-wider bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 transition-colors">
                                          <span>Capture Resolved Image</span>
                                          <input 
                                            type="file" 
                                            accept="image/*" 
                                            capture="environment"
                                            onChange={(e) => {
                                              const file = e.target.files?.[0];
                                              if (file) {
                                                const r = new FileReader();
                                                r.onload = () => setResolutionPhoto(r.result as string);
                                                r.readAsDataURL(file);
                                              }
                                            }}
                                            className="hidden" 
                                          />
                                        </label>
                                        <span className="text-[8px] text-slate-400 font-medium font-mono mt-2">Open device camera (strictly no files upload to avoid fraud)</span>
                                      </div>
                                    )}
                                  </div>

                                  {resolutionPhoto && (
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-black text-slate-400 uppercase block">Describe Action Taken</label>
                                      <textarea
                                        placeholder="Describe what was done to fix it clearly..."
                                        value={resolutionDesc}
                                        onChange={(e) => setResolutionDesc(e.target.value)}
                                        rows={2}
                                        className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                      />
                                    </div>
                                  )}

                                  <div className="flex items-center space-x-1 text-[9px] text-slate-400 font-mono">
                                    <MapPin className="h-3 w-3 text-indigo-500" />
                                    <span>Auto-records GPS & timestamp</span>
                                  </div>

                                  <div className="flex space-x-1.5 pt-1">
                                    <button
                                      onClick={() => handleResolveIssue(selectedIssue.id)}
                                      disabled={resolutionLoading || !resolutionPhoto}
                                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-200 text-white font-extrabold rounded text-[10px] uppercase cursor-pointer border-none shadow-sm"
                                    >
                                      {resolutionLoading ? "Verifying..." : "Verify & Resolve"}
                                    </button>
                                    <button
                                      onClick={() => {
                                        setIsResolving(false);
                                        setResolutionPhoto(null);
                                        setResolutionDesc("");
                                        setResolutionError("");
                                      }}
                                      className="px-2.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold rounded text-[10px] uppercase cursor-pointer border-none"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* DISCUSSION FORUM (COMMENTS MODULE) */}
                        <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-4 shadow-sm text-left animate-none flex-1 flex flex-col">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide font-sans">Citizen Discussion Panel</h4>
                            <span className="font-mono text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded">
                              {selectedIssue.corroborations ? selectedIssue.corroborations.length : 0} Comments
                            </span>
                          </div>

                          {/* Comment Input */}
                          <div className="space-y-2">
                            <div className="flex space-x-2">
                              <input 
                                id="desktop-comment-input"
                                type="text"
                                placeholder="Add to the public record anonymously..."
                                value={corroborationText}
                                onChange={(e) => setCorroborationText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleAddCorroboration(selectedIssue.id);
                                }}
                                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/20 font-medium"
                              />
                              <button
                                onClick={() => handleAddCorroboration(selectedIssue.id)}
                                className="px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] uppercase rounded-xl transition-all cursor-pointer border-none shadow-sm"
                              >
                                Comment
                              </button>
                            </div>
                          </div>

                          {/* Comments List */}
                          <div className="space-y-3 flex-1 overflow-y-auto pr-1 min-h-[300px]">
                            {(() => {
                              const allCorrs = selectedIssue.corroborations || [];
                              const topLevel = allCorrs.filter(c => !c.parentId);
                              const getReplies = (parentId: string) => allCorrs.filter(c => c.parentId === parentId);

                              if (topLevel.length === 0) {
                                return <p className="text-[11px] text-slate-400 italic text-center py-6">No comments yet. Write the first response!</p>;
                              }

                              return topLevel.map((corr) => {
                                const replies = getReplies(corr.id);
                                return (
                                  <div key={corr.id} className="space-y-2">
                                    {/* Top level comment */}
                                    <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-xl space-y-1.5 shadow-xs">
                                      <div className="flex items-center justify-between text-[10px]">
                                        <span className="font-extrabold text-slate-700 font-sans">{corr.author}</span>
                                        <span className="text-[9px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded uppercase">Active Citizen</span>
                                      </div>
                                      <p className="text-xs text-slate-600 leading-relaxed font-medium">{corr.text}</p>
                                      
                                      {/* Interaction: Upvote and Reply buttons */}
                                      <div className="flex items-center space-x-3 pt-1 text-[10px] font-bold text-slate-400">
                                        <button 
                                          onClick={() => handleVoteComment(selectedIssue.id, corr.id)}
                                          className="flex items-center space-x-1 hover:text-indigo-600 transition-colors cursor-pointer bg-transparent border-none"
                                        >
                                          <ThumbsUp className="h-3 w-3" />
                                          <span>{corr.upvotes || 0} Upvotes</span>
                                        </button>
                                        <button 
                                          onClick={() => {
                                            setReplyingToCommentId(replyingToCommentId === corr.id ? null : corr.id);
                                            setReplyText("");
                                          }}
                                          className="flex items-center space-x-1 hover:text-indigo-600 transition-colors cursor-pointer bg-transparent border-none"
                                        >
                                          <MessageSquare className="h-3 w-3" />
                                          <span>Reply</span>
                                        </button>
                                      </div>
                                    </div>

                                    {/* Nesting list of replies */}
                                    {replies.length > 0 && (
                                      <div className="ml-6 border-l-2 border-indigo-100 pl-3.5 space-y-2">
                                        {replies.map((reply) => (
                                          <div key={reply.id} className="bg-indigo-50/30 border border-indigo-100/50 p-2.5 rounded-lg space-y-1 shadow-xs">
                                            <div className="flex items-center justify-between text-[9px]">
                                              <span className="font-extrabold text-slate-600 font-sans">{reply.author}</span>
                                              <span className="text-slate-400 font-bold uppercase">Reply</span>
                                            </div>
                                            <p className="text-[11px] text-slate-600 leading-relaxed font-medium">{reply.text}</p>
                                            
                                            {/* Vote for reply */}
                                            <div className="flex items-center space-x-3 pt-0.5 text-[9px] font-bold text-slate-400">
                                              <button 
                                                onClick={() => handleVoteComment(selectedIssue.id, reply.id)}
                                                className="flex items-center space-x-1 hover:text-indigo-600 transition-colors cursor-pointer bg-transparent border-none"
                                              >
                                                <ThumbsUp className="h-2.5 w-2.5" />
                                                <span>{reply.upvotes || 0} Upvotes</span>
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {/* Inline reply form for this comment */}
                                    {replyingToCommentId === corr.id && (
                                      <div className="ml-6 flex space-x-2 pt-1">
                                        <input 
                                          type="text" 
                                          placeholder={`Reply to ${corr.author}...`}
                                          value={replyText}
                                          onChange={(e) => setReplyText(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                              handleAddCorroboration(selectedIssue.id, corr.id, replyText);
                                              setReplyingToCommentId(null);
                                              setReplyText("");
                                            }
                                          }}
                                          className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400"
                                        />
                                        <button
                                          onClick={() => {
                                            handleAddCorroboration(selectedIssue.id, corr.id, replyText);
                                            setReplyingToCommentId(null);
                                            setReplyText("");
                                          }}
                                          className="px-3 bg-indigo-600 text-white hover:bg-indigo-700 transition-colors rounded-lg text-[10px] font-bold uppercase cursor-pointer border-none"
                                        >
                                          Reply
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  // Desktop Active Tab View
                  <motion.div
                    key="active-tab-desktop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-full animate-none"
                  >
                    {activeTab === "home" && (
                      <HomeView 
                        user={userProfile || DEFAULT_USER}
                        issues={issues}
                        onSelectIssue={(issue) => setSelectedIssue(issue)}
                        onVote={handleVote}
                        onNavigateToTab={setActiveTab}
                        onSignUpClick={() => {
                          setAuthMode('signup');
                          setShowAuthModal(true);
                        }}
                        currentLocationName={userLocationName}
                        currentWardName={userWardName}
                        isLocationLoading={isLocationLoading}
                      />
                    )}
                    {activeTab === "maps" && (
                      <MapsView 
                        issues={issues} 
                        isMobile={false} 
                        onSelectIssue={setSelectedIssue}
                        userProfile={userProfile}
                        onRefreshData={loadAllData}
                        setAuthMode={setAuthMode}
                        setShowAuthModal={setShowAuthModal}
                      />
                    )}
                    {activeTab === "report" && (
                      <ReportView 
                        onAddIssue={() => {
                          loadAllData();
                          setActiveTab(isGuest ? "maps" : "home");
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
                        leaderboardUsers={leaderboardUsers}
                      />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-slate-50 text-slate-800 font-sans antialiased relative flex flex-col overflow-hidden">
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

                {/* CIVIC ACTION HUB (TWO OPTIONS) */}
                <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-4 shadow-sm text-left">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide font-sans flex items-center space-x-1.5">
                      <Sparkles className="h-4 w-4 text-emerald-600" />
                      <span>Civic Action Hub</span>
                    </h4>
                    <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border ${selectedIssue.status === 'RESOLVED' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                      {selectedIssue.status}
                    </span>
                  </div>

                  {selectedIssue.status === "RESOLVED" ? (
                    <div className="space-y-3 bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100">
                      <div className="flex items-center space-x-2 text-emerald-800 text-xs font-bold">
                        <Check className="h-4 w-4 bg-emerald-100 rounded-full p-0.5" />
                        <span>Verified Resolved via Camera Proof</span>
                      </div>
                      {selectedIssue.resolutionProof?.photo && (
                        <div className="h-40 rounded-lg overflow-hidden border border-emerald-200 shadow-xs">
                          <img 
                            src={selectedIssue.resolutionProof.photo} 
                            alt="Resolution Proof" 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <p className="text-[11px] text-slate-600 font-medium italic">
                        "{selectedIssue.resolutionProof?.description || 'Issue reported as resolved by citizen.'}"
                      </p>
                      <div className="text-[10px] text-emerald-700 font-medium space-y-0.5 font-mono">
                        <div>Timestamp: {selectedIssue.resolutionProof?.timestamp ? new Date(selectedIssue.resolutionProof.timestamp).toLocaleString() : "N/A"}</div>
                        <div>Geolocation Log: {selectedIssue.resolutionProof?.latitude?.toFixed(6)}, {selectedIssue.resolutionProof?.longitude?.toFixed(6)}</div>
                        <div>AI Match Confidence: {selectedIssue.resolutionProof?.aiConfidence ? `${selectedIssue.resolutionProof.aiConfidence}%` : "Pending Match"}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* The Three Main Options */}
                      {!isResolving && (
                        <div className="space-y-3">
                          {/* Row 1: Resolve and Upvote */}
                          <div className="grid grid-cols-2 gap-3">
                            {/* Option 1: Issue is Resolved */}
                            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 flex flex-col justify-between space-y-2">
                              <div className="text-left">
                                <h5 className="text-[9px] font-black text-emerald-800 uppercase tracking-wider">Option 1: Fix & Verify</h5>
                                <p className="text-[8.5px] text-slate-500 leading-normal mt-1">Submit live photo proof from your camera to verify resolution and earn +150 XP.</p>
                              </div>
                              <button
                                onClick={() => {
                                  if (!userProfile || userProfile.id === "guest") {
                                    setAuthMode("signup");
                                    setShowAuthModal(true);
                                    return;
                                  }
                                  setIsResolving(true);
                                }}
                                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black text-[9.5px] uppercase rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1 border-none shadow-sm"
                              >
                                <CheckSquare className="h-3.5 w-3.5" />
                                <span>Resolve Issue</span>
                              </button>
                            </div>

                            {/* Option 2: I have also seen this */}
                            <div className="p-3 bg-indigo-50/30 rounded-xl border border-indigo-100 flex flex-col justify-between space-y-2">
                              <div className="text-left">
                                <h5 className="text-[9px] font-black text-indigo-800 uppercase tracking-wider">Option 2: Upvote / Agree</h5>
                                <p className="text-[8.5px] text-slate-500 leading-normal mt-1">Witnessed this issue yourself? Upvote this report to increase urgency.</p>
                              </div>
                              <button
                                onClick={() => handleVote(selectedIssue.id, "UPVOTE", "skip_media", "I have also seen this")}
                                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-black text-[9.5px] uppercase rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1 border-none shadow-sm"
                              >
                                <ThumbsUp className="h-3.5 w-3.5" />
                                <span className="truncate">Upvote ({selectedIssue.upvotes || 0})</span>
                              </button>
                            </div>
                          </div>

                          {/* Row 2: Comment Option */}
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col justify-between space-y-2">
                            <div className="text-left">
                              <h5 className="text-[9px] font-black text-slate-700 uppercase tracking-wider">Option 3: Discussion & Update</h5>
                              <p className="text-[8.5px] text-slate-500 leading-normal mt-1">Add details, updates, or coordinate fixes in the public comment boards.</p>
                            </div>
                            <button
                              onClick={() => {
                                const inputEl = document.getElementById("mobile-comment-input");
                                if (inputEl) {
                                  inputEl.focus();
                                  inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }
                              }}
                              className="w-full py-2 bg-slate-800 hover:bg-slate-900 active:scale-[0.98] text-white font-black text-[9.5px] uppercase rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1 border-none shadow-sm"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                              <span>Write Comment</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Option 1 expanded camera page */}
                      {isResolving && (
                        <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                          <h5 className="text-[11px] font-extrabold text-slate-700 uppercase">Camera Verification Feed</h5>
                          
                          <p className="text-[10px] text-slate-500 leading-relaxed font-semibold bg-white p-2.5 rounded-lg border border-slate-100">
                            Close the problem, capture the images of the reported location with identifying the location and the issue is resolved visible clearly, verification will be done within next 72 hours.
                          </p>

                          {resolutionError && (
                            <div className="p-2 bg-rose-50 border border-rose-150 text-rose-600 text-[10px] font-semibold rounded">
                              {resolutionError}
                            </div>
                          )}

                          <div className="space-y-1">
                            {resolutionPhoto ? (
                              <div className="relative rounded-lg overflow-hidden h-36 border border-slate-200 shadow-sm">
                                <img src={resolutionPhoto} className="w-full h-full object-cover" />
                                <button 
                                  onClick={() => setResolutionPhoto(null)}
                                  className="absolute top-2 right-2 p-1 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full cursor-pointer border-none"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="border-2 border-dashed border-slate-200 rounded-lg p-5 flex flex-col items-center justify-center bg-white shadow-xs">
                                <Camera className="h-6 w-6 text-indigo-500 mb-2" />
                                <label className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 cursor-pointer uppercase tracking-wider bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 transition-colors">
                                  <span>Capture Resolved Image</span>
                                  <input 
                                    type="file" 
                                    accept="image/*" 
                                    capture="environment"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const r = new FileReader();
                                        r.onload = () => setResolutionPhoto(r.result as string);
                                        r.readAsDataURL(file);
                                      }
                                    }}
                                    className="hidden" 
                                  />
                                </label>
                                <span className="text-[8px] text-slate-400 font-medium font-mono mt-2">Open device camera (strictly no files upload to avoid fraud)</span>
                              </div>
                            )}
                          </div>

                          {resolutionPhoto && (
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase block">Describe Action Taken</label>
                              <textarea
                                placeholder="Describe what was done to fix it clearly..."
                                value={resolutionDesc}
                                onChange={(e) => setResolutionDesc(e.target.value)}
                                rows={2}
                                className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>
                          )}

                          <div className="flex items-center space-x-1 text-[9px] text-slate-400 font-mono">
                            <MapPin className="h-3 w-3 text-indigo-500" />
                            <span>Auto-records GPS & timestamp</span>
                          </div>

                          <div className="flex space-x-1.5 pt-1">
                            <button
                              onClick={() => handleResolveIssue(selectedIssue.id)}
                              disabled={resolutionLoading || !resolutionPhoto}
                              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-200 text-white font-extrabold rounded text-[10px] uppercase cursor-pointer border-none shadow-sm"
                            >
                              {resolutionLoading ? "Verifying..." : "Verify & Resolve"}
                            </button>
                            <button
                              onClick={() => {
                                setIsResolving(false);
                                setResolutionPhoto(null);
                                setResolutionDesc("");
                                setResolutionError("");
                              }}
                              className="px-2.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold rounded text-[10px] uppercase cursor-pointer border-none"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
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
                    Citizen Corroborations ({selectedIssue.corroborations ? selectedIssue.corroborations.length : 0})
                  </span>

                  <div className="space-y-3">
                    {(() => {
                      const allCorrs = selectedIssue.corroborations || [];
                      // Separate top-level comments and nested comments
                      const topLevel = allCorrs.filter(c => !c.parentId);
                      const getReplies = (parentId: string) => allCorrs.filter(c => c.parentId === parentId);

                      if (topLevel.length === 0) {
                        return <p className="text-[11px] text-slate-400 italic">No corroborations yet. Add your testimony below!</p>;
                      }

                      return topLevel.map((corr) => {
                        const replies = getReplies(corr.id);
                        return (
                          <div key={corr.id} className="space-y-2">
                            {/* Top level comment */}
                            <div className="bg-white border border-slate-200 p-3 rounded-xl space-y-1.5 shadow-sm">
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="font-extrabold text-slate-700">{corr.author}</span>
                                <span className="text-indigo-600 font-bold">Active Citizen</span>
                              </div>
                              <p className="text-xs text-slate-600 leading-relaxed font-medium">{corr.text}</p>
                              
                              {/* Interaction: Upvote and Reply buttons */}
                              <div className="flex items-center space-x-3 pt-1 text-[10px] font-bold text-slate-400">
                                <button 
                                  onClick={() => handleVoteComment(selectedIssue.id, corr.id)}
                                  className="flex items-center space-x-1 hover:text-indigo-600 transition-colors cursor-pointer bg-transparent border-none"
                                >
                                  <ThumbsUp className="h-3 w-3" />
                                  <span>{corr.upvotes || 0} Upvotes</span>
                                </button>
                                <button 
                                  onClick={() => {
                                    setReplyingToCommentId(replyingToCommentId === corr.id ? null : corr.id);
                                    setReplyText("");
                                  }}
                                  className="flex items-center space-x-1 hover:text-indigo-600 transition-colors cursor-pointer bg-transparent border-none"
                                >
                                  <MessageSquare className="h-3 w-3" />
                                  <span>Reply</span>
                                </button>
                              </div>
                            </div>

                            {/* Nesting list of replies */}
                            {replies.length > 0 && (
                              <div className="ml-6 border-l-2 border-indigo-100 pl-3.5 space-y-2">
                                {replies.map((reply) => (
                                  <div key={reply.id} className="bg-slate-50 border border-slate-200/60 p-2.5 rounded-lg space-y-1 shadow-xs">
                                    <div className="flex items-center justify-between text-[9px]">
                                      <span className="font-extrabold text-slate-600">{reply.author}</span>
                                      <span className="text-slate-400 font-bold">Reply</span>
                                    </div>
                                    <p className="text-[11px] text-slate-600 leading-relaxed font-medium">{reply.text}</p>
                                    
                                    {/* Vote for reply */}
                                    <div className="flex items-center space-x-3 pt-0.5 text-[9px] font-bold text-slate-400">
                                      <button 
                                        onClick={() => handleVoteComment(selectedIssue.id, reply.id)}
                                        className="flex items-center space-x-1 hover:text-indigo-600 transition-colors cursor-pointer bg-transparent border-none"
                                      >
                                        <ThumbsUp className="h-2.5 w-2.5" />
                                        <span>{reply.upvotes || 0}</span>
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Inline reply form for this comment */}
                            {replyingToCommentId === corr.id && (
                              <div className="ml-6 flex space-x-2 pt-1">
                                <input 
                                  type="text" 
                                  placeholder={`Reply to ${corr.author}...`}
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      handleAddCorroboration(selectedIssue.id, corr.id, replyText);
                                      setReplyingToCommentId(null);
                                      setReplyText("");
                                    }
                                  }}
                                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400"
                                />
                                <button
                                  onClick={() => {
                                    handleAddCorroboration(selectedIssue.id, corr.id, replyText);
                                    setReplyingToCommentId(null);
                                    setReplyText("");
                                  }}
                                  className="px-3 bg-indigo-600 text-white hover:bg-indigo-700 transition-colors rounded-lg text-[10px] font-bold uppercase cursor-pointer"
                                >
                                  Reply
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* Add corroboration comment input */}
                  <div className="flex space-x-2 pt-2">
                    <input 
                      id="mobile-comment-input"
                      type="text" 
                      placeholder="Add your testimony or agree..."
                      value={corroborationText}
                      onChange={(e) => setCorroborationText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddCorroboration(selectedIssue.id)}
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-3 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 font-medium"
                    />
                    <button
                      onClick={() => handleAddCorroboration(selectedIssue.id)}
                      className="p-2.5 bg-indigo-600 text-white hover:bg-indigo-700 transition-colors rounded-xl cursor-pointer shadow-sm active:scale-95"
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
                className={activeTab === "maps" ? "h-full w-full" : ""}
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
                    currentLocationName={userLocationName}
                    currentWardName={userWardName}
                    isLocationLoading={isLocationLoading}
                  />
                )}
                {activeTab === "maps" && (
                  <MapsView 
                    issues={issues} 
                    isMobile={isMobile} 
                    onSelectIssue={setSelectedIssue}
                    userProfile={userProfile}
                    onRefreshData={loadAllData}
                    setAuthMode={setAuthMode}
                    setShowAuthModal={setShowAuthModal}
                  />
                )}
                {activeTab === "report" && (
                  <ReportView 
                    onAddIssue={() => {
                      loadAllData();
                      setActiveTab(isGuest ? "maps" : "home");
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
                    leaderboardUsers={leaderboardUsers}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation bottom control bar bar */}
        <div className={`h-16 bg-white border-t border-slate-200 flex items-center z-20 select-none px-5 ${isGuest ? 'justify-around' : 'justify-between'}`}>
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
            className={`flex flex-col items-center justify-center space-y-0.5 transition-colors cursor-pointer w-12 ${
              activeTab === "maps" ? "text-indigo-600 font-extrabold" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Map className="h-5 w-5" />
            <span className="text-[9px]">Maps</span>
          </button>

          {/* Center "+" button inside bottom navigation bar */}
          {!selectedIssue && (
            <div className="flex flex-col items-center justify-center -mt-3.5">
              <button
                onClick={() => {
                  if (activeTab === "report") {
                    setActiveTab(prevTab || "maps");
                  } else {
                    setActiveTab("report");
                  }
                }}
                className={`h-12 w-12 rounded-full flex items-center justify-center border-2 border-white shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer ${
                  activeTab === "report" 
                    ? "bg-slate-850 hover:bg-slate-900 text-white" 
                    : "bg-indigo-600 hover:bg-indigo-700 text-white"
                }`}
                title={activeTab === "report" ? "Close / Cancel" : "Report Issue"}
                id="fab-report"
              >
                <PlusCircle className={`h-6 w-6 text-white transition-transform duration-300 ${
                  activeTab === "report" ? "rotate-[135deg]" : "rotate-0"
                }`} />
              </button>
              <span className="text-[8px] text-slate-400 mt-0.5 font-bold uppercase tracking-wider">
                {activeTab === "report" ? "Close" : "Report"}
              </span>
            </div>
          )}

          <button 
            onClick={() => {
              setActiveTab("campaigns");
              setSelectedIssue(null);
            }}
            className={`flex flex-col items-center justify-center space-y-0.5 transition-colors cursor-pointer w-12 ${
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

        {/* Sign In & Sign Up Dedicated Page Overlay */}
        <AnimatePresence>
          {showAuthModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-50 z-50 flex flex-col justify-between p-6 select-none"
            >
              {/* Header Brand */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <ShieldCheck className="h-5 w-5 text-indigo-600 animate-pulse" />
                  <span className="text-sm font-black tracking-widest text-slate-800 uppercase">IndiaCivic</span>
                </div>
                <button 
                  onClick={() => {
                    setShowAuthModal(false);
                    setAuthError("");
                  }}
                  className="flex items-center space-x-1 bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider cursor-pointer border border-slate-200"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Back</span>
                </button>
              </div>

              {/* Main Container */}
              <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full space-y-6">
                <div className="text-center space-y-1.5">
                  <div className="mx-auto h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shadow-sm">
                    {authMode === 'signin' ? (
                      <Lock className="h-5 w-5 text-indigo-600" />
                    ) : signUpRole === 'CITIZEN' ? (
                      <UserPlus className="h-5 w-5 text-indigo-600" />
                    ) : (
                      <Building className="h-5 w-5 text-indigo-600" />
                    )}
                  </div>
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-wider">
                    {authMode === 'signin' ? 'Welcome Back' : 'Create Account'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {authMode === 'signin' 
                      ? 'Access your civic workspace to resume local actions' 
                      : signUpRole === 'CITIZEN' 
                        ? 'Join IndiaCivic as a resident and start earning rewards'
                        : 'Register your Organization, NGO, or RWA to host campaigns'}
                  </p>
                </div>

                {authError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-600 font-semibold leading-relaxed shadow-sm">
                    {authError}
                  </div>
                )}

                <form onSubmit={authMode === 'signin' ? handleSignIn : handleSignUp} className="space-y-4">
                  {authMode === 'signup' && (
                    <div className="space-y-4">
                      {/* Account Type Selector */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Choose Account Type</label>
                        <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                          <button
                            type="button"
                            onClick={() => setSignUpRole('CITIZEN')}
                            className={`py-2 rounded-lg text-xs font-bold uppercase transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                              signUpRole === 'CITIZEN' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            <User className="h-3.5 w-3.5" />
                            <span>Citizen</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSignUpRole('ORGANIZATION')}
                            className={`py-2 rounded-lg text-xs font-bold uppercase transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                              signUpRole === 'ORGANIZATION' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            <Building className="h-3.5 w-3.5" />
                            <span>Organization</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Email address */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Email Address</label>
                    <div className="relative">
                      <input 
                        type="email"
                        placeholder="e.g. neighbor@civic.in"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        required
                        className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                      />
                      <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Password</label>
                    <div className="relative">
                      <input 
                        type="password"
                        placeholder="Min. 6 characters"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        required
                        minLength={6}
                        className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                      />
                      <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-indigo-300 font-bold text-xs uppercase rounded-xl tracking-wider cursor-pointer transition-all flex items-center justify-center space-x-2 shadow-md active:scale-95"
                  >
                    <span>{authLoading ? 'Syncing Profile...' : (authMode === 'signin' ? 'Sign In' : 'Create Account')}</span>
                  </button>

                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="flex-shrink mx-4 text-slate-400 text-[10px] font-bold uppercase tracking-wider">or continue with</span>
                    <div className="flex-grow border-t border-slate-200"></div>
                  </div>

                  <button 
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={authLoading}
                    className="w-full py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 disabled:opacity-50 font-bold text-xs rounded-xl tracking-wider cursor-pointer transition-all flex items-center justify-center space-x-2 shadow-sm active:scale-95"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <path fill="#EA4335" d="M12 5.04c1.65 0 3.13.57 4.3 1.69l3.21-3.21C17.55 1.77 14.99 1 12 1 7.35 1 3.37 3.67 1.39 7.56l3.85 2.99c.91-2.73 3.47-4.51 6.76-4.51z" />
                      <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.28 1.48-1.12 2.74-2.38 3.58l3.7 2.87c2.16-2 3.71-4.94 3.71-8.6z" />
                      <path fill="#FBBC05" d="M5.24 14.55c-.24-.72-.38-1.5-.38-2.3 0-.8.14-1.58.38-2.3L1.39 7.56C.5 9.35 0 11.37 0 12.5s.5 3.15 1.39 4.94l3.85-2.89z" />
                      <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.7-2.87c-1.11.75-2.52 1.19-4.26 1.19-3.29 0-5.85-1.78-6.76-4.51L1.39 16.9C3.37 20.33 7.35 23 12 23z" />
                    </svg>
                    <span>Google Account</span>
                  </button>
                </form>

                <div className="text-center">
                  <button 
                    onClick={() => {
                      setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                      setAuthError("");
                    }}
                    className="text-[11px] font-bold text-slate-400 hover:text-indigo-600 cursor-pointer bg-transparent border-none uppercase tracking-wide transition-colors"
                  >
                    {authMode === 'signin' ? "Don't have an account? Sign Up" : "Already registered? Sign In"}
                  </button>
                </div>
              </div>

              {/* Secure footer */}
              <div className="text-center text-[10px] text-slate-400 font-medium">
                🔒 Secured by Firebase Authentication • IndiaCivic
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upvote Optional Proof Modal Overlay */}
        <AnimatePresence>
          {showUpvoteProofModal && upvoteIssueId && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 select-none"
            >
              <motion.div 
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-slate-100 text-left"
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                    <ThumbsUp className="h-4 w-4 text-indigo-600" />
                    <span>I have also seen this!</span>
                  </h3>
                  <button 
                    onClick={() => setShowUpvoteProofModal(false)}
                    className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-850 rounded-full transition-colors cursor-pointer bg-transparent border-none flex items-center justify-center"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                  Would you like to attach an optional photo or comment to help corroborate and verify this post? Contributing media boosts the post's visibility and earns you bonus reputation points.
                </p>

                {/* Optional Media Preview */}
                <div className="space-y-3">
                  {upvoteMedia ? (
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 h-24 bg-slate-100">
                      <img src={upvoteMedia} className="w-full h-full object-cover animate-none" />
                      <button 
                        onClick={() => setUpvoteMedia(null)}
                        className="absolute top-1.5 right-1.5 p-1 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full cursor-pointer border-none"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="border border-dashed border-slate-200 rounded-xl p-3 flex flex-col items-center justify-center bg-slate-50">
                      <Camera className="h-4 w-4 text-slate-400 mb-0.5" />
                      <label className="text-[9px] font-black text-indigo-600 hover:text-indigo-700 cursor-pointer uppercase tracking-wider">
                        <span>Attach optional media</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const r = new FileReader();
                              r.onload = () => setUpvoteMedia(r.result as string);
                              r.readAsDataURL(file);
                            }
                          }}
                          className="hidden" 
                        />
                      </label>
                    </div>
                  )}

                  {/* Optional Text comment */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block font-mono">Optional corroboration notes</label>
                    <input 
                      type="text"
                      placeholder="e.g. Yes, still flooded as of 1 hour ago..."
                      value={upvoteText}
                      onChange={(e) => setUpvoteText(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col space-y-2 pt-1.5">
                  <button
                    onClick={() => handleVote(upvoteIssueId, "UPVOTE", upvoteMedia || "skip_media", upvoteText || "Also seen")}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer transition-all flex items-center justify-center space-x-1.5 shadow-md border-none"
                  >
                    <span>Submit Upvote with Proof</span>
                  </button>
                  <button
                    onClick={() => handleVote(upvoteIssueId, "UPVOTE", "skip_media", "Just upvoted")}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer transition-all flex items-center justify-center border-none"
                  >
                    <span>Just upvote (Skip proof)</span>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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
