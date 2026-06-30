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
  onDetectLocation?: () => void;
  unreadCount: number;
  onOpenNotifications: () => void;
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
  isLocationLoading,
  onDetectLocation,
  unreadCount,
  onOpenNotifications
}: HomeViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityMin, setSeverityMin] = useState(1);

  // Compute all stats from real issue data
  const wardIssues = issues.filter(i =>
    i.ward === currentWardName || i.ward?.includes("Ward 88") || (currentWardName && i.ward?.includes(currentWardName))
  );
  const openWardIssues = wardIssues.filter(i => i.status !== "RESOLVED");
  const resolvedWardIssues = wardIssues.filter(i => i.status === "RESOLVED");

  // Locality Life Score: weighted from resolution rate, avg severity, issue count
  const resolutionRate = wardIssues.length > 0
    ? resolvedWardIssues.length / wardIssues.length : 1;
  const avgSeverity = wardIssues.length > 0
    ? wardIssues.reduce((s, i) => s + i.severity, 0) / wardIssues.length : 0;
  const severityPenalty = Math.max(0, (avgSeverity - 2) * 10);
  const rawScore = Math.round(resolutionRate * 100 - severityPenalty - openWardIssues.length * 2);
  const localityScore = Math.max(20, Math.min(100, rawScore));

  const getLetterGrade = (score: number) =>
    score >= 90 ? "A+" : score >= 80 ? "A" : score >= 70 ? "B+" : score >= 60 ? "B" : score >= 50 ? "C+" : "C";

  // Relative timestamp
  const timeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    if (isNaN(diff)) return "Active";
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const categories = ["All", "Waste Management", "Drainage & Waterlogging", "Broken Public Assets", "Night Lighting & Women's Safety", "AQI & Pollution"];

  const filteredIssues = issues.filter(issue => {
    const matchesSearch = issue.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          issue.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          issue.locationName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || issue.category === selectedCategory;
    const matchesStatus = statusFilter === "all" || issue.status === statusFilter;
    const matchesSeverity = issue.severity >= severityMin;
    return matchesSearch && matchesCategory && matchesStatus && matchesSeverity;
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
        <div 
          onClick={onDetectLocation}
          title="Click to trigger location detector"
          className="flex items-center space-x-2 min-w-0 flex-1 cursor-pointer hover:opacity-90 active:scale-98 transition-all"
        >
          <div className="p-2 sm:p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 shrink-0">
            <MapPin className={`h-4 w-4 sm:h-5 sm:w-5 text-indigo-600 dark:text-indigo-400 ${isLocationLoading ? 'animate-spin' : 'animate-pulse'}`} />
          </div>
          <div className="min-w-0">
            <div className="text-[9px] sm:text-xs text-slate-400 dark:text-slate-500 font-bold tracking-wider uppercase leading-none mb-0.5 flex items-center gap-1">
              <span>CURRENT LOCATION</span>
              <span className="text-[8px] text-indigo-500 dark:text-indigo-400 font-extrabold normal-case">(Click to trigger detector)</span>
            </div>
            <div className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-200 leading-tight truncate">
              {isLocationLoading ? (
                <span className="text-indigo-600 dark:text-indigo-400 italic font-medium">Detecting...</span>
              ) : (
                currentLocationName || "Indiranagar, Bengaluru"
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <span className="px-2 py-1 text-[9px] sm:text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded-full border border-indigo-100 dark:border-indigo-900/50 font-sans font-bold whitespace-nowrap">
            {currentWardName || "Ward 88"}
          </span>
          
          {/* Notifications */}
          <button 
            onClick={onOpenNotifications}
            className="relative p-2 sm:p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer bg-transparent shrink-0"
          >
            <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          
          {/* Points Bubble styled exactly like Screenshot 2 with large score and smaller XP label */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-300 shrink-0 select-none">
            <Award className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div className="flex flex-col text-left leading-none">
              <span className="text-xs font-black">{user.civicScore}</span>
              <span className="text-[8px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">XP</span>
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <input 
                type="text" 
                placeholder="Search problems, keywords, locations..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-10 py-3 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/20 shadow-sm transition-all font-medium"
              />
              <button 
                onClick={() => setShowFilterDrawer(!showFilterDrawer)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer bg-transparent border-none transition-colors ${showFilterDrawer ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}
              >
                <SlidersHorizontal className="h-4 w-4" />
              </button>

              {showFilterDrawer && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-4 z-20 space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400">Status</label>
                    <select 
                      value={statusFilter} 
                      onChange={e => setStatusFilter(e.target.value)} 
                      className="mt-1 block w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 py-1.5 px-3 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 font-medium"
                    >
                      <option value="all">All Statuses</option>
                      <option value="PENDING">Pending</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="RESOLVED">Resolved</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 flex justify-between">
                      <span>Min Severity</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-black">{severityMin}+</span>
                    </label>
                    <input 
                      type="range" 
                      min="1" 
                      max="5" 
                      value={severityMin}
                      onChange={e => setSeverityMin(Number(e.target.value))} 
                      className="w-full mt-1 accent-indigo-600 cursor-pointer"
                    />
                  </div>
                  <button 
                    onClick={() => setShowFilterDrawer(false)} 
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer border-none"
                  >
                    Apply Filters
                  </button>
                </div>
              )}
            </div>

            {/* Category swiper */}
            <div className="flex space-x-2 overflow-x-auto pb-1.5 scrollbar-none snap-x snap-mandatory">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap snap-start transition-all cursor-pointer ${
                    selectedCategory === cat 
                      ? "bg-indigo-600 text-white border border-indigo-600 shadow-sm" 
                      : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-700 dark:hover:text-slate-200"
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
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 tracking-wider uppercase flex items-center">
                Recent Reports Near You
                <span className="ml-2 px-2 py-0.5 text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded-full border border-indigo-100 dark:border-indigo-900/50 font-sans">
                  {filteredIssues.length}
                </span>
              </h3>
              <button 
                onClick={() => onNavigateToTab("maps")}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center space-x-1 cursor-pointer bg-transparent border-none"
              >
                <span>VIEW ALL</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {filteredIssues.length === 0 ? (
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center shadow-sm">
                <AlertTriangle className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-600 dark:text-slate-300 font-semibold">No issues matching search criteria</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Be the first to report an issue in this category!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredIssues.map((issue) => (
                  <motion.div
                    key={issue.id}
                    layoutId={`issue-card-${issue.id}`}
                    className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/85 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    <div className="p-4 cursor-pointer animate-none" onClick={() => onSelectIssue(issue)}>
                      <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 text-[9px] font-bold tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md border border-slate-200 dark:border-slate-700 uppercase font-sans">
                            {issue.category}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{issue.trackingId}</span>
                        </div>
                        {getStatusBadge(issue.status === "PENDING" && issue.severity >= 4 ? "URGENT" : issue.status)}
                      </div>

                      <h4 className="text-base font-extrabold text-slate-800 dark:text-slate-100 mt-2.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {issue.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center font-medium">
                        <MapPin className="h-3 w-3 text-indigo-500 mr-1 flex-shrink-0" />
                        <span className="truncate">{issue.locationName}</span>
                      </p>

                      {issue.videoUrl ? (
                        <div className="mt-3.5 h-44 rounded-xl overflow-hidden relative border border-slate-100 dark:border-slate-800/50 bg-black">
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
                        <div className="mt-3.5 h-44 rounded-xl overflow-hidden relative border border-slate-100 dark:border-slate-800/50">
                          <img 
                            src={issue.imageUrl} 
                            alt={issue.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />
                          <div className="absolute bottom-3 left-3 text-[10px] font-bold text-slate-700 dark:text-slate-300 bg-white/95 dark:bg-slate-800/95 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 shadow-sm font-mono">
                            VIRTUAL ASSET: {issue.virtualAssetId}
                          </div>
                        </div>
                      ) : null}

                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 line-clamp-2 leading-relaxed font-medium">
                        {issue.description}
                      </p>
                    </div>

                    {/* Footer actions bar */}
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-850/60 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center space-x-4">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onVote(issue.id, "UPVOTE");
                          }}
                          className="flex items-center space-x-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer bg-transparent border-none"
                        >
                          <ThumbsUp className="h-4 w-4" />
                          <span className="font-extrabold text-slate-700 dark:text-slate-300">{issue.upvotes}</span>
                        </button>
                        <button 
                          onClick={() => onSelectIssue(issue)}
                          className="flex items-center space-x-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer bg-transparent border-none"
                        >
                          <MessageSquare className="h-4 w-4" />
                          <span className="font-extrabold text-slate-700 dark:text-slate-300">{issue.corroborations ? issue.corroborations.length : 0}</span>
                        </button>
                        <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 font-bold">
                          Severity: <span className={`font-extrabold ${getSeverityColor(issue.severity)}`}>{issue.severity}/5</span>
                        </div>
                      </div>
                      
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 font-sans">
                        {timeAgo(issue.timestamp)} • Active
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
              className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex-1 flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 dark:bg-indigo-950/20 rounded-full blur-2xl pointer-events-none" />
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500">LOCALITY LIFE SCORE</span>
                <div className="flex items-baseline mt-1.5">
                  <span className="text-4xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">{getLetterGrade(localityScore)}</span>
                  <span className="ml-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400 flex items-center bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/50">
                    <TrendingUp className="h-3.5 w-3.5 mr-1 text-emerald-600 dark:text-emerald-400" /> Improving
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[200px] font-medium leading-relaxed">Based on {Math.round(resolutionRate * 100)}% resolution rate and {openWardIssues.length} open issues in {currentWardName || "your ward"}.</p>
              </div>
              
              <button 
                onClick={() => onNavigateToTab("maps")}
                className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 transition-all text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center space-x-1 cursor-pointer"
              >
                <span>View Map</span>
                <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>

            {/* Progress bar to next tier */}
            <div className="mt-4 space-y-1.5">
              <div className="flex justify-between text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                <span>Critical Density: Safe</span>
                <span>Score: {localityScore}/100</span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/55 dark:border-slate-700/60">
                <div style={{ width: `${localityScore}%` }} className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all duration-500" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="bg-slate-50 dark:bg-slate-850/60 rounded-xl p-2.5 border border-slate-200/60 dark:border-slate-800">
                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">ACTIVE ISSUES</div>
                <div className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-0.5 leading-tight">{openWardIssues.length} Open in {currentWardName || "your ward"}</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-850/60 rounded-xl p-2.5 border border-slate-200/60 dark:border-slate-800">
                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">YOUR ACTIVE RANK</div>
                <div className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-0.5 font-sans leading-tight">#12 in {currentWardName || "Ward 88"}</div>
              </div>
            </div>
          </motion.div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 flex items-center space-x-3 shadow-sm">
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/40">
                <Flame className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">STREAK</div>
                <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200 truncate">{user.streakDays} Days Daily</div>
              </div>
            </div>
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 flex items-center space-x-3 shadow-sm">
              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40">
                <Zap className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">POINTS</div>
                <div className="text-xs font-extrabold text-indigo-700 dark:text-indigo-300 truncate">{user.totalPoints} pts</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
