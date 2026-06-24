/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion } from "motion/react";
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
  Map, 
  ShieldCheck, 
  ArrowRight,
  Download,
  Building,
  User,
  Zap,
  Info,
  X
} from "lucide-react";
import { UserProfile } from "../types";

interface ProfileViewProps {
  user: UserProfile;
  citizen: UserProfile;
  org: UserProfile;
  onToggleRole: (targetRole: 'CITIZEN' | 'ORGANIZATION') => void;
}

export default function ProfileView({ user, citizen, org, onToggleRole }: ProfileViewProps) {
  const [selectedLeaderboard, setSelectedLeaderboard] = useState<"ward" | "city" | "national">("ward");
  const [showShareModal, setShowShareModal] = useState(false);

  // Sample leaderboards
  const leaderboards = {
    ward: [
      { rank: 1, name: "Karan_Goel", points: 2950, badge: "Grand Guardian" },
      { rank: 2, name: "Meera_Nair", points: 2710, badge: "Clean Ward Hero" },
      { rank: 3, name: "Rahul Sharma", points: 1850, badge: "Vigilant Eye", isUser: true },
      { rank: 4, name: "Suresh_K", points: 1620, badge: "Local Sentinel" },
    ],
    city: [
      { rank: 1, name: "Ramesh_BBMP_Liaison", points: 8450, badge: "City Champion" },
      { rank: 12, name: "Rahul Sharma", points: 1850, badge: "Vigilant Eye", isUser: true },
      { rank: 50, name: "Ananya_K", points: 950, badge: "Active Citizen" },
    ],
    national: [
      { rank: 1, name: "Green_Bengaluru_RWA", points: 45900, badge: "National Legend" },
      { rank: 248, name: "Rahul Sharma", points: 1850, badge: "Vigilant Eye", isUser: true },
    ]
  };

  const orgLeaderboard = [
    { rank: 1, name: "Green Ward Foundation", points: 8500, credits: "12,450 C", isUser: true },
    { rank: 2, name: "Tata CSR Sanitation", points: 7200, credits: "10,800 C" },
    { rank: 3, name: "Indiranagar Rotary Club", points: 4100, credits: "5,400 C" },
  ];

  return (
    <div className="space-y-6 pb-24 text-left">
      {/* Header Account Toggle */}
      <div className="flex items-center justify-between p-1 bg-slate-100 border border-slate-200 rounded-xl">
        <button
          onClick={() => onToggleRole("CITIZEN")}
          className={`flex-1 py-2.5 rounded-lg text-xs font-extrabold uppercase transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
            user.role === "CITIZEN" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <User className="h-4 w-4" />
          <span>Citizen Profile</span>
        </button>
        <button
          onClick={() => onToggleRole("ORGANIZATION")}
          className={`flex-1 py-2.5 rounded-lg text-xs font-extrabold uppercase transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
            user.role === "ORGANIZATION" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Building className="h-4 w-4" />
          <span>Organization</span>
        </button>
      </div>

      {user.role === "CITIZEN" ? (
        // CITIZEN DASHBOARD LAYOUT
        <div className="space-y-6">
          {/* User badge metadata */}
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="relative">
              <img 
                src={user.avatar || undefined} 
                alt={user.name}
                referrerPolicy="no-referrer"
                className="h-20 w-20 rounded-full object-cover border-2 border-indigo-500 shadow-sm"
              />
              <div className="absolute -bottom-1 -right-1 p-1 bg-amber-500 rounded-full border border-white">
                <Flame className="h-4.5 w-4.5 text-white animate-pulse" />
              </div>
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-slate-800">{user.name}</h3>
              <p className="text-xs text-slate-400 font-semibold uppercase">{user.location}</p>
            </div>

            <div className="flex items-center space-x-2.5 pt-1">
              <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-full text-xs font-bold shadow-sm">
                CIVIC SCORE: {user.civicScore}
              </span>
              <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-full text-xs font-bold flex items-center shadow-sm">
                Top 5% Ward Rank
              </span>
            </div>
          </div>

          {/* Gamified Core Stat Badges */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white border border-slate-200 p-3.5 rounded-xl text-center space-y-1 shadow-sm">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">TOTAL POINTS</span>
              <span className="text-lg font-extrabold text-slate-800">{user.totalPoints.toLocaleString()}</span>
            </div>
            <div className="bg-white border border-slate-200 p-3.5 rounded-xl text-center space-y-1 shadow-sm">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">ACTIVE SCORE</span>
              <span className="text-lg font-extrabold text-slate-800">{user.personalActiveScore}%</span>
            </div>
            <div className="bg-white border border-slate-200 p-3.5 rounded-xl text-center space-y-1 shadow-sm">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">CONTRIBUTIONS</span>
              <span className="text-lg font-extrabold text-slate-800">{user.contributionCount}</span>
            </div>
          </div>

          {/* Community impact visual payoff card */}
          <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-2xl pointer-events-none" />
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold tracking-wider uppercase text-emerald-700">COMMUNITY IMPACT PAYOFF</span>
                <div className="text-3xl font-extrabold text-slate-800 mt-1.5 font-mono">
                  {user.citizensHelped.toLocaleString()}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Estimated neighbors benefited directly from your reported problems and community verifications.
                </p>
              </div>
              <Users className="h-9 w-9 text-emerald-600" />
            </div>

            <div className="mt-4 pt-3.5 border-t border-slate-100 text-[10px] font-bold text-slate-500 uppercase flex items-center space-x-1">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-600 mr-1" />
              <span>Your pipeline report saved Indiranagar 12 hours of drinking water leakage!</span>
            </div>
          </div>

          {/* Points Breakdown charts */}
          <div className="rounded-2xl bg-white border border-slate-200 p-5 space-y-4 shadow-sm">
            <h4 className="text-xs font-extrabold text-indigo-700 uppercase tracking-wider">Points Distribution</h4>
            
            <div className="space-y-3.5 text-xs text-slate-700">
              <div className="space-y-1.5">
                <div className="flex justify-between font-bold">
                  <span>Reporting Issues (+50 XP each)</span>
                  <span>{user.pointsBreakdown.reporting} pts</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${(user.pointsBreakdown.reporting / user.totalPoints) * 100}%` }} />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between font-bold">
                  <span>Verifying Neighborhood Reports (+15 XP each)</span>
                  <span>{user.pointsBreakdown.verifying} pts</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(user.pointsBreakdown.verifying / user.totalPoints) * 100}%` }} />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between font-bold">
                  <span>Funding Abhiyans (+1 pt per ₹10)</span>
                  <span>{user.pointsBreakdown.donating} pts</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(user.pointsBreakdown.donating / user.totalPoints) * 100}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Badges Showcase */}
          <div className="rounded-2xl bg-white border border-slate-200 p-5 space-y-3 shadow-sm">
            <h4 className="text-xs font-extrabold text-indigo-700 uppercase tracking-wider">Earned Achievements</h4>
            <div className="flex flex-wrap gap-2">
              {user.badges.map((badge) => (
                <span 
                  key={badge}
                  className="px-2.5 py-1.5 rounded-xl bg-indigo-50/50 border border-indigo-100 text-indigo-700 text-[10px] font-bold uppercase flex items-center space-x-1"
                >
                  <Award className="h-3.5 w-3.5 text-amber-500" />
                  <span>{badge}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Shareable Impact Card and Leaderboards */}
          <div className="rounded-2xl bg-white border border-slate-200 p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-indigo-700 uppercase tracking-wider">Regional Leaderboards</h4>
              
              <div className="flex space-x-1.5 text-[9px] font-bold uppercase bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button 
                  onClick={() => setSelectedLeaderboard("ward")}
                  className={`px-1.5 py-1 rounded cursor-pointer ${selectedLeaderboard === "ward" ? "bg-indigo-600 text-white" : "text-slate-500"}`}
                >
                  Ward
                </button>
                <button 
                  onClick={() => setSelectedLeaderboard("city")}
                  className={`px-1.5 py-1 rounded cursor-pointer ${selectedLeaderboard === "city" ? "bg-indigo-600 text-white" : "text-slate-500"}`}
                >
                  City
                </button>
                <button 
                  onClick={() => setSelectedLeaderboard("national")}
                  className={`px-1.5 py-1 rounded cursor-pointer ${selectedLeaderboard === "national" ? "bg-indigo-600 text-white" : "text-slate-500"}`}
                >
                  National
                </button>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              {leaderboards[selectedLeaderboard].map((entry: any) => (
                <div 
                  key={entry.rank}
                  className={`flex items-center justify-between p-2.5 rounded-xl border ${
                    entry.isUser 
                      ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold shadow-sm" 
                      : "bg-slate-50 border-transparent text-slate-600"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold w-4">#{entry.rank}</span>
                    <span className="font-bold">{entry.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] text-slate-400">{entry.badge}</span>
                    <span className="font-extrabold text-slate-800">{entry.points} XP</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Generate shareable card trigger */}
            <button
              onClick={() => setShowShareModal(true)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs uppercase flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm"
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
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="relative">
              <img 
                src={user.avatar || undefined} 
                alt={user.name}
                referrerPolicy="no-referrer"
                className="h-20 w-20 rounded-full object-cover border-2 border-indigo-500 shadow-sm"
              />
              <div className="absolute -bottom-1 -right-1 p-1 bg-emerald-500 rounded-full border border-white">
                <Leaf className="h-4.5 w-4.5 text-white animate-pulse" />
              </div>
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-slate-800">{user.name}</h3>
              <p className="text-xs text-slate-400 font-semibold uppercase">{user.location}</p>
            </div>

            <div className="flex items-center space-x-2.5 pt-1">
              <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-full text-xs font-bold shadow-sm">
                PUBLIC TRUST INDEX: A+ RATED
              </span>
            </div>
          </div>

          {/* Org core stats adoptions / deployed funds */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border border-slate-200 p-4 rounded-xl text-center space-y-1 shadow-sm">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">DEPLOYED CROWDFUNDS</span>
              <span className="text-base font-extrabold text-slate-800">₹{user.totalDonations.toLocaleString()}</span>
            </div>
            <div className="bg-white border border-slate-200 p-4 rounded-xl text-center space-y-1 shadow-sm">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">CSR WARD RESOLUTIONS</span>
              <span className="text-base font-extrabold text-slate-800">{user.contributionCount} Projects</span>
            </div>
          </div>

          {/* Carbon Credit Tracker */}
          <div className="rounded-2xl bg-white border border-slate-200 p-5 space-y-4 shadow-sm relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-2xl pointer-events-none" />
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold tracking-wider uppercase text-emerald-700">VERIFIED CARBON CREDITS EARNED</span>
                <div className="text-3xl font-extrabold text-slate-800 mt-1.5 font-mono">
                  {user.carbonCredits?.toLocaleString()} C
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Accrued automatically via verified tree-plantation campaigns and localized solid waste recycling audits.
                </p>
              </div>
              <Leaf className="h-8 w-8 text-emerald-600" />
            </div>

            {/* Adopted wards lists */}
            <div className="space-y-2 border-t border-slate-100 pt-4 text-xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Adopted Categories & Wards</span>
              <div className="space-y-1.5 font-medium text-slate-700">
                {user.adoptedWards?.map((ward) => (
                  <div key={ward} className="flex items-center space-x-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <Map className="h-4 w-4 text-indigo-600" />
                    <span>{ward}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Certificate downloader button */}
            <button className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs uppercase flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm">
              <Download className="h-4 w-4" />
              <span>Download Verified ESG Audit Certificate</span>
            </button>
          </div>

          {/* Org Leaderboard rankings */}
          <div className="rounded-2xl bg-white border border-slate-200 p-5 space-y-3.5 shadow-sm">
            <h4 className="text-xs font-extrabold text-indigo-700 uppercase tracking-wider">Top Performing Organizations</h4>
            
            <div className="space-y-2 text-xs">
              {orgLeaderboard.map((entry) => (
                <div 
                  key={entry.rank}
                  className={`flex items-center justify-between p-2.5 rounded-xl border ${
                    entry.isUser 
                      ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold shadow-sm" 
                      : "bg-slate-50 border-transparent text-slate-600"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold w-4">#{entry.rank}</span>
                    <span className="font-bold">{entry.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] text-emerald-600 font-bold">{entry.credits}</span>
                    <span className="font-extrabold text-slate-800">{entry.points} pts</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Shareable Impact Card Popup Modal */}
      {showShareModal && (
        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 p-5 relative overflow-hidden shadow-2xl space-y-4"
          >
            <button 
              onClick={() => setShowShareModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer bg-transparent border-none"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Impact Card Content Layout */}
            <div className="relative rounded-xl overflow-hidden bg-slate-50 border border-slate-200 p-5 text-center space-y-3 shadow-sm">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-600 via-emerald-400 to-amber-300" />
              
              <div className="pt-2">
                <h3 className="text-sm font-extrabold text-slate-800 tracking-wider uppercase">INDIACIVIC HERO CARD</h3>
                <p className="text-[9px] text-slate-400 font-semibold uppercase">Verified Citizen Contribution 2026</p>
              </div>

              <img 
                src={user.avatar || undefined} 
                alt={user.name}
                referrerPolicy="no-referrer"
                className="h-16 w-16 rounded-full object-cover border border-indigo-500 mx-auto shadow-sm"
              />

              <div>
                <h4 className="text-base font-extrabold text-slate-800">{user.name}</h4>
                <span className="px-2 py-0.5 text-[9px] font-bold text-indigo-700 bg-indigo-50 rounded border border-indigo-100">
                  CIVIC SCORE: {user.civicScore}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2">
                <div className="p-2 rounded bg-white border border-slate-200 text-center shadow-sm">
                  <span className="text-[8px] text-slate-400 font-bold uppercase block">Wards Helped</span>
                  <span className="font-extrabold text-slate-800">{user.citizensHelped.toLocaleString()} people</span>
                </div>
                <div className="p-2 rounded bg-white border border-slate-200 text-center shadow-sm">
                  <span className="text-[8px] text-slate-400 font-bold uppercase block">Streak Active</span>
                  <span className="font-extrabold text-amber-600">{user.streakDays} Days Action</span>
                </div>
              </div>

              <div className="text-[10px] text-slate-600 leading-relaxed font-semibold italic">
                "I reported & helped resolve local infrastructure issues in Indiranagar, Bengaluru. Join me on IndiaCivic!"
              </div>
            </div>

            <button
              onClick={() => setShowShareModal(false)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs uppercase cursor-pointer shadow-sm"
            >
              <span>Download & Share on WhatsApp</span>
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
