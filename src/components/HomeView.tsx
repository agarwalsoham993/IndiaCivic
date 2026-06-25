/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  MapPin, 
  Bell, 
  Flame, 
  Search, 
  ArrowUpRight, 
  SlidersHorizontal,
  ThumbsUp, 
  MessageSquare, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  User, 
  ChevronRight,
  TrendingUp,
  Award,
  Zap
} from "lucide-react";
import { Issue, UserProfile } from "../types";

interface HomeViewProps {
  user: UserProfile;
  issues: Issue[];
  onSelectIssue: (issue: Issue) => void;
  onNavigateToTab: (tab: string) => void;
  onVote: (issueId: string, voteType: 'UPVOTE' | 'AGREE') => void;
  onSignUpClick?: () => void;
  currentLocationName?: string;
  currentWardName?: string;
  isLocationLoading?: boolean;
}

export default function HomeView({ 
  user, 
  issues, 
  onSelectIssue, 
  onNavigateToTab, 
  onVote, 
  onSignUpClick,
  currentLocationName,
  currentWardName,
  isLocationLoading
}: HomeViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const categories = ["All", "Waste Management", "Drainage & Waterlogging", "Broken Public Assets", "Night Lighting & Women's Safety", "AQI & Pollution"];

  const filteredIssues = issues.filter(issue => {
    const matchesSearch = issue.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          issue.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          issue.locationName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || issue.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "URGENT":
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-50 border border-rose-200 text-rose-700">URGENT</span>;
      case "IN_PROGRESS":
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-50 border border-amber-200 text-amber-700">IN PROGRESS</span>;
      case "RESOLVED":
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">RESOLVED</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700">PENDING</span>;
    }
  };

  const getSeverityColor = (severity: number) => {
    if (severity >= 4) return "text-rose-600";
    if (severity === 3) return "text-amber-600";
    return "text-indigo-600";
  };

  return (
    <div className="space-y-6 pb-24 text-left max-w-7xl mx-auto">
      {/* Location and Header (Mobile only) */}
      <div className="flex items-center justify-between gap-1 sm:gap-2.5 lg:hidden w-full px-1">
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          <div className="p-2 sm:p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 shrink-0">
            <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="text-[9px] sm:text-xs text-slate-400 font-bold tracking-wider uppercase leading-none mb-0.5">CURRENT LOCATION</div>
            <div className="text-xs sm:text-sm font-extrabold text-slate-800 leading-tight truncate">
              {isLocationLoading ? (
                <span className="text-slate-400 italic font-medium">Detecting...</span>
              ) : (
                currentLocationName || "Indiranagar, Bengaluru"
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <span className="px-2 py-1 text-[9px] sm:text-[10px] bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100 font-sans font-bold whitespace-nowrap">
            {currentWardName || "Ward 88"}
          </span>
          
          {/* Notifications */}
          <button className="relative p-2 sm:p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer bg-transparent shrink-0">
            <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-rose-500 ring-1 ring-white" />
          </button>
          
          {/* Points Bubble styled exactly like Screenshot 2 with large score and smaller XP label */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 shrink-0 select-none">
            <Award className="h-4 w-4 text-indigo-600 shrink-0" />
            <div className="flex flex-col text-left leading-none">
              <span className="text-xs font-black">{user.civicScore}</span>
              <span className="text-[8px] font-bold text-indigo-500 uppercase tracking-wider">XP</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left main feed column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Guest Welcome Call to Action Banner */}
          {user.id === "guest" && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 p-5 text-white border border-indigo-500/20 relative overflow-hidden shadow-md"
            >
              <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
              <h3 className="text-sm font-black tracking-tight uppercase">Join IndiaCivic Today!</h3>
              <p className="text-[11px] font-semibold text-indigo-100 mt-1 leading-relaxed">
                Report local civic issues, vote on verifications, fund escrow-backed neighborhood projects, and earn civic points.
              </p>
              <button 
                onClick={onSignUpClick}
                className="mt-3 px-4 py-1.5 bg-white text-indigo-600 hover:text-indigo-700 hover:bg-slate-50 font-extrabold text-[10px] uppercase rounded-xl transition-all cursor-pointer shadow-sm border-none"
              >
                Create Your Account
              </button>
            </motion.div>
          )}

          {/* Search and Category Swiper */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search problems, keywords, locations..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-10 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/20 shadow-sm transition-all font-medium"
              />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer bg-transparent border-none">
                <SlidersHorizontal className="h-4 w-4" />
              </button>
            </div>

            {/* Category swiper */}
            <div className="flex space-x-2 overflow-x-auto pb-1.5 scrollbar-none snap-x snap-mandatory">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap snap-start transition-all cursor-pointer ${
                    selectedCategory === cat 
                      ? "bg-indigo-600 text-white border border-indigo-600 shadow-sm animate-none" 
                      : "bg-white text-slate-500 border border-slate-200 hover:border-slate-300 hover:text-slate-700 animate-none"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Recent Reports near You Feed */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-800 tracking-wider uppercase flex items-center">
                Recent Reports Near You
                <span className="ml-2 px-2 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100 font-sans">
                  {filteredIssues.length}
                </span>
              </h3>
              <button className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center space-x-1 cursor-pointer bg-transparent border-none">
                <span>VIEW ALL</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {filteredIssues.length === 0 ? (
              <div className="rounded-2xl bg-white border border-dashed border-slate-200 p-8 text-center shadow-sm">
                <AlertTriangle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-600 font-semibold">No issues matching search criteria</p>
                <p className="text-xs text-slate-400 mt-1">Be the first to report an issue in this category!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredIssues.map((issue) => (
                  <motion.div
                    key={issue.id}
                    layoutId={`issue-card-${issue.id}`}
                    className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    <div className="p-4 cursor-pointer animate-none" onClick={() => onSelectIssue(issue)}>
                      <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 text-[9px] font-bold tracking-widest bg-slate-100 text-slate-600 rounded-md border border-slate-200 uppercase font-sans">
                            {issue.category}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">{issue.trackingId}</span>
                        </div>
                        {getStatusBadge(issue.status === "PENDING" && issue.severity >= 4 ? "URGENT" : issue.status)}
                      </div>

                      <h4 className="text-base font-extrabold text-slate-800 mt-2.5 group-hover:text-indigo-600 transition-colors">
                        {issue.title}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 flex items-center font-medium">
                        <MapPin className="h-3 w-3 text-indigo-500 mr-1 flex-shrink-0" />
                        <span className="truncate">{issue.locationName}</span>
                      </p>

                      {issue.videoUrl ? (
                        <div className="mt-3.5 h-44 rounded-xl overflow-hidden relative border border-slate-100 bg-black">
                          <video 
                            src={issue.videoUrl} 
                            controls
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute bottom-3 left-3 text-[10px] font-bold text-white bg-black/60 px-2 py-0.5 rounded border border-white/10 shadow-sm font-mono">
                            VIRTUAL ASSET: {issue.virtualAssetId}
                          </div>
                        </div>
                      ) : issue.imageUrl && issue.imageUrl.trim() !== "" ? (
                        <div className="mt-3.5 h-44 rounded-xl overflow-hidden relative border border-slate-100">
                          <img 
                            src={issue.imageUrl} 
                            alt={issue.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />
                          <div className="absolute bottom-3 left-3 text-[10px] font-bold text-slate-700 bg-white/95 px-2 py-0.5 rounded border border-slate-200 shadow-sm font-mono">
                            VIRTUAL ASSET: {issue.virtualAssetId}
                          </div>
                        </div>
                      ) : null}

                      <p className="text-xs text-slate-500 mt-3 line-clamp-2 leading-relaxed font-medium">
                        {issue.description}
                      </p>
                    </div>

                    {/* Footer actions bar */}
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-500">
                      <div className="flex items-center space-x-4">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onVote(issue.id, "UPVOTE");
                          }}
                          className="flex items-center space-x-1.5 hover:text-indigo-600 transition-colors cursor-pointer bg-transparent border-none"
                        >
                          <ThumbsUp className="h-4 w-4" />
                          <span className="font-extrabold text-slate-700">{issue.upvotes}</span>
                        </button>
                        <button 
                          onClick={() => onSelectIssue(issue)}
                          className="flex items-center space-x-1.5 hover:text-indigo-600 transition-colors cursor-pointer bg-transparent border-none"
                        >
                          <MessageSquare className="h-4 w-4" />
                          <span className="font-extrabold text-slate-700">{issue.corroborations ? issue.corroborations.length : 0}</span>
                        </button>
                        <div className="text-[10px] font-mono text-slate-400 font-bold">
                          Severity: <span className={`font-extrabold ${getSeverityColor(issue.severity)}`}>{issue.severity}/5</span>
                        </div>
                      </div>
                      
                      <span className="text-[10px] font-bold text-slate-400 font-sans">
                        {new Date(issue.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Active
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Sticky stats */}
        <div className="lg:col-span-4 flex flex-col space-y-6 lg:sticky lg:top-24 h-full">
          {/* Locality Life Score Card */}
          <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-5 shadow-sm flex-1 flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-2xl pointer-events-none" />
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold tracking-wider uppercase text-slate-400">LOCALITY LIFE SCORE</span>
                <div className="flex items-baseline mt-1.5">
                  <span className="text-4xl font-extrabold text-slate-800 tracking-tight">B+</span>
                  <span className="ml-2 text-sm font-semibold text-emerald-700 flex items-center bg-emerald-50 px-2 py-0.5 rounded-full">
                    <TrendingUp className="h-3.5 w-3.5 mr-1 text-emerald-600" /> Improving
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 max-w-[200px] font-medium leading-relaxed">Based on 92% resolution speed, low active issues, and standard safety metrics.</p>
              </div>
              
              <button 
                onClick={() => onNavigateToTab("maps")}
                className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 transition-all text-indigo-700 text-xs font-bold flex items-center space-x-1 cursor-pointer"
              >
                <span>View Map</span>
                <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>

            {/* Progress bar to next tier */}
            <div className="mt-4 space-y-1.5">
              <div className="flex justify-between text-[11px] text-slate-400 font-medium">
                <span>Critical Density: Safe</span>
                <span>Next Tier: A- (7.8/10)</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/55">
                <div className="h-full w-[72%] bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100">
              <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/60">
                <div className="text-[10px] font-bold text-slate-400 uppercase">ACTIVE ISSUES</div>
                <div className="text-lg font-bold text-slate-700 mt-0.5">3 Ward Reports</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/60">
                <div className="text-[10px] font-bold text-slate-400 uppercase">YOUR ACTIVE RANK</div>
                <div className="text-lg font-bold text-slate-700 mt-0.5 font-sans">#12 in Ward 88</div>
              </div>
            </div>
          </motion.div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-white border border-slate-200 p-4 flex items-center space-x-3 shadow-sm">
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100">
                <Flame className="h-5 w-5 text-amber-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase">STREAK</div>
                <div className="text-xs font-extrabold text-slate-700 truncate">{user.streakDays} Days Daily</div>
              </div>
            </div>
            <div className="rounded-2xl bg-white border border-slate-200 p-4 flex items-center space-x-3 shadow-sm">
              <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100">
                <Zap className="h-5 w-5 text-indigo-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase">POINTS</div>
                <div className="text-xs font-extrabold text-indigo-700 truncate">{user.totalPoints} pts</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
