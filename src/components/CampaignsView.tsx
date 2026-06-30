/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  TrendingUp, 
  Clock, 
  Calendar, 
  User, 
  CreditCard, 
  CheckCircle, 
  AlertTriangle, 
  DollarSign, 
  Sparkles, 
  ChevronRight, 
  Building,
  Heart,
  Receipt,
  RotateCcw,
  PlayCircle,
  ThumbsUp,
  X,
  Loader2
} from "lucide-react";
import { Campaign, Donation, UserProfile } from "../types";

interface CampaignsViewProps {
  user: UserProfile;
  campaigns: Campaign[];
  onDonate: (campaignId: string, amount: number, useWallet: boolean) => Promise<any>;
  onVerifyStep: (campaignId: string, step: number, vote?: 'AGREE' | 'DISAGREE') => Promise<any>;
  onSimulate90Days: (campaignId: string) => Promise<any>;
  onRefresh?: () => void;
}

export default function CampaignsView({ user, campaigns, onDonate, onVerifyStep, onSimulate90Days, onRefresh }: CampaignsViewProps) {
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [donationAmount, setDonationAmount] = useState<number>(1000);
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "card">("upi");
  const [useWallet, setUseWallet] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Donation | null>(null);
  
  const [activeTab, setActiveTab] = useState<"all" | "active" | "resolved">("all");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Campaign creation states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCampTitle, setNewCampTitle] = useState("");
  const [newCampDesc, setNewCampDesc] = useState("");
  const [newCampTarget, setNewCampTarget] = useState("");
  const [newCampCategory, setNewCampCategory] = useState("Drainage & Waterlogging");
  const [newCampLinkedIssues, setNewCampLinkedIssues] = useState<string[]>([]);
  const [isSubmittingCampaign, setIsSubmittingCampaign] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [allIssues, setAllIssues] = useState<any[]>([]);

  React.useEffect(() => {
    fetch("/api/issues")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error();
      })
      .then((data) => {
        setAllIssues(data || []);
      })
      .catch((err) => console.error("Error loading issues for campaign creation dropdown:", err));
  }, []);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    setCreateSuccess("");
    
    if (!newCampTitle.trim()) {
      setCreateError("Please provide a title for the Abhiyan.");
      return;
    }
    if (!newCampDesc.trim()) {
      setCreateError("Please provide a description of planned work.");
      return;
    }
    const target = Number(newCampTarget);
    if (isNaN(target) || target <= 0) {
      setCreateError("Please enter a valid target amount (greater than 0).");
      return;
    }

    setIsSubmittingCampaign(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newCampTitle,
          description: `[Category: ${newCampCategory}] ${newCampDesc}`,
          targetAmount: target,
          linkedIssueIds: newCampLinkedIssues
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setCreateSuccess("Abhiyan launched successfully! Escrow contract initialized.");
          setNewCampTitle("");
          setNewCampDesc("");
          setNewCampTarget("");
          setNewCampLinkedIssues([]);
          
          if (onRefresh) {
            onRefresh();
          }
          
          setTimeout(() => {
            setShowCreateModal(false);
            setCreateSuccess("");
          }, 1500);
        } else {
          setCreateError(data.error || "Failed to create campaign on server.");
        }
      } else {
        setCreateError("Server error launching Abhiyan.");
      }
    } catch (err: any) {
      setCreateError("Network error: " + err.message);
    } finally {
      setIsSubmittingCampaign(false);
    }
  };

  const filteredCampaigns = campaigns.filter(camp => {
    if (activeTab === "all") return true;
    if (activeTab === "active") return camp.status === "FUNDRAISING" || camp.status === "EXECUTION" || camp.status === "VERIFICATION";
    return camp.status === "RESOLVED";
  });

  const handleDonateSubmit = async (campId: string) => {
    setErrorMsg("");
    setSuccessMsg("");

    if (donationAmount <= 0) {
      setErrorMsg("Please enter a valid donation amount");
      return;
    }

    if (useWallet && user.availableFunds < donationAmount) {
      setErrorMsg("Insufficient balance in your in-app refund wallet!");
      return;
    }

    try {
      const receipt = await onDonate(campId, donationAmount, useWallet);
      if (receipt) {
        setSuccessMsg(`Thank you! ₹${donationAmount} contributed. Escrow holding verified. GST-exemption receipt issued!`);
        // Update selectedCampaign in UI
        const updated = campaigns.find(c => c.id === campId);
        if (updated) setSelectedCampaign(updated);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error processing payment escrow.");
    }
  };

  const handleVerifyAction = async (campId: string, step: number, vote?: 'AGREE' | 'DISAGREE') => {
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await onVerifyStep(campId, step, vote);
      setSuccessMsg(vote ? "Community verification vote cast successfully!" : "Milestone proof successfully submitted to escrow review!");
      const updated = campaigns.find(c => c.id === campId);
      if (updated) setSelectedCampaign(updated);
    } catch (err: any) {
      setErrorMsg(err.message || "Verification action failed.");
    }
  };

  const handleSimulateRefund = async (campId: string) => {
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await onSimulate90Days(campId);
      if (res.success) {
        setSuccessMsg(res.message);
        const updated = campaigns.find(c => c.id === campId);
        if (updated) setSelectedCampaign(updated);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Simulate refund failed.");
    }
  };

  return (
    <div className="space-y-6 pb-24 text-left">
      {/* Header with Launch Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wider">ABHIYAN HUB</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase mt-0.5">Crowdfunding Local Ward Projects</p>
        </div>
        {!selectedCampaign && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5 self-start sm:self-center border-none"
          >
            <Sparkles className="h-4 w-4 text-amber-300 animate-pulse" />
            <span>Launch New Abhiyan</span>
          </button>
        )}
      </div>

      {selectedCampaign ? (
        // Campaign Detail View
        <div className="space-y-6">
          <button 
            onClick={() => {
              setSelectedCampaign(null);
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center space-x-1 uppercase bg-transparent border-none cursor-pointer"
          >
            <span>← Back to Abhiyans</span>
          </button>

          <motion.div 
            layoutId={`camp-card-${selectedCampaign.id}`}
            className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-sm"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className={`px-2 py-0.5 text-[9px] font-bold rounded border uppercase ${
                  selectedCampaign.status === "RESOLVED" 
                    ? "bg-emerald-50 dark:bg-emerald-950/45 border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300"
                    : selectedCampaign.status === "REFUNDED"
                    ? "bg-rose-50 dark:bg-rose-950/45 border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300"
                    : "bg-indigo-50 dark:bg-indigo-950/45 border-indigo-200 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300"
                }`}>
                  {selectedCampaign.status} Campaign
                </span>
                <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 mt-2">{selectedCampaign.title}</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-0.5">ESCROW ID: #{selectedCampaign.id}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">{selectedCampaign.description}</p>

            {/* Escrow wallet tracking progress */}
            <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3.5 shadow-sm">
              <div className="flex justify-between text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase block">ESCROW WALLET FUNDS LOCK</span>
                  <span className="text-lg font-extrabold text-slate-800 dark:text-slate-100">₹{selectedCampaign.currentAmount.toLocaleString()}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase block">TARGET BUDGET</span>
                  <span className="text-lg font-extrabold text-indigo-600">₹{selectedCampaign.targetAmount.toLocaleString()}</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full" 
                  style={{ width: `${Math.min(100, (selectedCampaign.currentAmount / selectedCampaign.targetAmount) * 100)}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                <span>{Math.floor((selectedCampaign.currentAmount / selectedCampaign.targetAmount) * 100)}% Funded</span>
                <span className="flex items-center text-amber-700 dark:text-amber-500">
                  <Clock className="h-3 w-3 mr-1" /> {selectedCampaign.daysLeft} Days Until Auto-Refund
                </span>
              </div>
            </div>

            {/* 3-Step Milestone release verification dashboard */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center">
                <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 mr-1" />
                3-Step Release Verification
              </h4>
              
              <div className="grid grid-cols-3 gap-2">
                <div className={`p-3 rounded-xl text-center border text-[10px] ${
                  selectedCampaign.verificationStep >= 1 ? "bg-emerald-50 dark:bg-emerald-950/45 border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 font-semibold" : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500"
                }`}>
                  <div className="font-extrabold uppercase">1. Fund Lock</div>
                  <div className="mt-1 font-semibold">{selectedCampaign.currentAmount >= selectedCampaign.targetAmount ? "VERIFIED ✓" : "COLLECTING"}</div>
                </div>

                <div className={`p-3 rounded-xl text-center border text-[10px] ${
                  selectedCampaign.verificationStep >= 2 ? "bg-emerald-50 dark:bg-emerald-950/45 border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 font-semibold" : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500"
                }`}>
                  <div className="font-extrabold uppercase">2. Proof Upload</div>
                  <div className="mt-1 font-semibold">
                    {selectedCampaign.executionProof ? "VERIFIED ✓" : (selectedCampaign.verificationStep === 2 ? "AWAITING" : "LOCKED")}
                  </div>
                </div>

                <div className={`p-3 rounded-xl text-center border text-[10px] ${
                  selectedCampaign.verificationStep >= 3 ? "bg-emerald-50 dark:bg-emerald-950/45 border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 font-semibold" : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500"
                }`}>
                  <div className="font-extrabold uppercase">3. Public Vote</div>
                  <div className="mt-1 font-semibold">
                    {selectedCampaign.status === "RESOLVED" ? "RELEASED ✓" : (selectedCampaign.verificationStep === 3 ? "VOTING ACTIVE" : "LOCKED")}
                  </div>
                </div>
              </div>

              {/* Action Panels depending on active verification step */}
              {selectedCampaign.verificationStep === 2 && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <h5 className="text-[11px] font-bold text-slate-800 dark:text-slate-100 uppercase">Resolver: Submit Completion Proof</h5>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Upload before/after photo + video walk-proof of completed potholes/lighting road repairs to unlock neighbor voting.</p>
                  <button
                    onClick={() => handleVerifyAction(selectedCampaign.id, 2)}
                    className="py-1.5 px-3 bg-indigo-600 text-white hover:bg-indigo-700 font-bold rounded-lg text-[10px] uppercase cursor-pointer shadow-sm"
                  >
                    Upload Contractor Work Video/Photo Proof
                  </button>
                </div>
              )}

              {selectedCampaign.verificationStep === 3 && selectedCampaign.status !== "RESOLVED" && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 space-y-3">
                  <h5 className="text-[11px] font-bold text-slate-800 dark:text-slate-100 uppercase flex items-center">
                    <PlayCircle className="h-4 w-4 text-indigo-600 dark:text-indigo-400 mr-1.5" />
                    Public Verification Voting Active
                  </h5>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Contractor uploaded video proof of MG Road junction asphalt patching. Neighbors, did this resolve the problem? Vote below to release escrow budget.
                  </p>

                  <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[10px] font-mono text-indigo-700 dark:text-indigo-400 font-semibold shadow-sm">
                    <span>YES, FIXED: {selectedCampaign.votesAgree} votes</span>
                    <span>NO, STILL BROKEN: {selectedCampaign.votesDisagree} votes</span>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleVerifyAction(selectedCampaign.id, 3, "AGREE")}
                      className="flex-1 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 font-extrabold rounded-lg text-[10px] uppercase cursor-pointer flex items-center justify-center space-x-1 shadow-sm"
                    >
                      <ThumbsUp className="h-3 w-3" />
                      <span>Yes, Release Escrow</span>
                    </button>
                    <button
                      onClick={() => handleVerifyAction(selectedCampaign.id, 3, "DISAGREE")}
                      className="flex-1 py-1.5 bg-rose-600 text-white hover:bg-rose-700 font-extrabold rounded-lg text-[10px] uppercase cursor-pointer flex items-center justify-center space-x-1 shadow-sm"
                    >
                      <span>No, Still Faulty</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Donation crowdfunding card input */}
            {selectedCampaign.status === "FUNDRAISING" && (
              <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center">
                  <Heart className="h-3.5 w-3.5 text-rose-500 mr-1.5" /> Contribute Crowdfund Escrow
                </h4>

                {/* Pre-fill chip amounts */}
                <div className="grid grid-cols-4 gap-2">
                  {[500, 1000, 2500, 5000].map(amount => (
                    <button
                      key={amount}
                      onClick={() => setDonationAmount(amount)}
                      className={`py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                        donationAmount === amount 
                          ? "bg-indigo-600 border-indigo-500 text-white shadow-sm" 
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                    >
                      ₹{amount}
                    </button>
                  ))}
                </div>

                {/* Custom inputs */}
                <input 
                  type="number" 
                  value={donationAmount}
                  onChange={(e) => setDonationAmount(Number(e.target.value))}
                  placeholder="Custom contribution (₹)..."
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                />

                {/* In-app wallet options */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">Pay with Refund Wallet:</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">₹{user.availableFunds} available</span>
                    <input 
                      type="checkbox" 
                      checked={useWallet}
                      onChange={(e) => setUseWallet(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4"
                    />
                  </div>
                </div>

                {/* Payment channel toggles */}
                {!useWallet && (
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                    <button
                      onClick={() => setPaymentMethod("upi")}
                      className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                        paymentMethod === "upi" ? "bg-indigo-50 dark:bg-indigo-950/45 border-indigo-200 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      Unified UPI (Paytm/GPay)
                    </button>
                    <button
                      onClick={() => setPaymentMethod("card")}
                      className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                        paymentMethod === "card" ? "bg-indigo-50 dark:bg-indigo-950/45 border-indigo-200 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      Credit/Debit Card
                    </button>
                  </div>
                )}

                {errorMsg && (
                  <div className="p-2.5 bg-rose-50 dark:bg-rose-950/45 border border-rose-200 dark:border-rose-800/80 rounded-lg text-rose-700 dark:text-rose-300 text-[10px] font-semibold flex items-center space-x-1 shadow-sm">
                    <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/45 border border-emerald-200 dark:border-emerald-800/80 rounded-lg text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold flex items-center space-x-1 shadow-sm">
                    <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}

                <button
                  onClick={() => handleDonateSubmit(selectedCampaign.id)}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs uppercase cursor-pointer flex items-center justify-center space-x-1.5 shadow-sm"
                >
                  <CreditCard className="h-4 w-4" />
                  <span>Secure Payment (Fund Escrow Wallet)</span>
                </button>
              </div>
            )}

            {/* Simulated 90-days Auto-Refund option */}
            {selectedCampaign.status !== "RESOLVED" && selectedCampaign.status !== "REFUNDED" && (
              <div className="pt-2 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h5 className="text-[11px] font-bold text-slate-800 dark:text-slate-100 uppercase">Simulate 90 Days Elapsing</h5>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold">Triggers auto-return of idle escrow funds directly to donor wallets.</p>
                </div>
                <button
                  onClick={() => handleSimulateRefund(selectedCampaign.id)}
                  className="px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/45 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-all rounded-lg text-[10px] font-extrabold uppercase flex items-center space-x-1 cursor-pointer shadow-sm"
                >
                  <RotateCcw className="h-3.5 w-3.5 animate-spin-slow" />
                  <span>Elapse & Refund</span>
                </button>
              </div>
            )}

            {/* Donation Activity Log with receipts */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center">
                <Receipt className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 mr-1.5" /> Backer Donations & GST Receipts
              </h4>

              {selectedCampaign.donations.length === 0 ? (
                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase text-center py-2">No donations yet. Be the first backer!</p>
              ) : (
                <div className="space-y-2">
                  {selectedCampaign.donations.map((donation) => (
                    <div 
                      key={donation.id}
                      className="flex items-center justify-between bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 shadow-sm animate-fade-in"
                    >
                      <div className="flex items-center space-x-2">
                        <User className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                        <div>
                          <span className="font-bold">{donation.donorName}</span>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono block">Receipt: {donation.receiptNumber}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-emerald-600">+ ₹{donation.amount.toLocaleString()}</span>
                        <button
                          onClick={() => setSelectedReceipt(donation)}
                          className="p-1 rounded bg-indigo-50 dark:bg-indigo-950/45 border border-indigo-100 dark:border-indigo-900/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-all cursor-pointer"
                          title="View GST Receipt"
                        >
                          <Receipt className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      ) : (
        // Campaigns Grid List View
        <div className="space-y-5">
          {/* Tabs for Filtering */}
          <div className="flex space-x-2 border-b border-slate-200 pb-1">
            <button
              onClick={() => setActiveTab("all")}
              className={`pb-2 px-3 text-xs font-bold uppercase transition-all cursor-pointer ${
                activeTab === "all" ? "border-b-2 border-indigo-600 text-indigo-600" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              All Campaigns
            </button>
            <button
              onClick={() => setActiveTab("active")}
              className={`pb-2 px-3 text-xs font-bold uppercase transition-all cursor-pointer ${
                activeTab === "active" ? "border-b-2 border-indigo-600 text-indigo-600" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Active Escrows
            </button>
            <button
              onClick={() => setActiveTab("resolved")}
              className={`pb-2 px-3 text-xs font-bold uppercase transition-all cursor-pointer ${
                activeTab === "resolved" ? "border-b-2 border-indigo-600 text-indigo-600" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Fully Resolved
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredCampaigns.map((camp) => (
              <motion.div
                key={camp.id}
                layoutId={`camp-card-${camp.id}`}
                onClick={() => setSelectedCampaign(camp)}
                className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all duration-300 cursor-pointer relative shadow-sm hover:shadow-md text-left"
              >
                <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                  <span>ESCROW ID: #{camp.id}</span>
                  <span className="font-bold flex items-center text-amber-700 dark:text-amber-500">
                    <Clock className="h-3 w-3 mr-1" /> {camp.daysLeft} Days left
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 mt-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {camp.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2 leading-relaxed font-medium">
                  {camp.description}
                </p>

                {/* Progress indicators bar */}
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>₹{camp.currentAmount.toLocaleString()} locked</span>
                    <span className="text-slate-400 dark:text-slate-500">Goal: ₹{camp.targetAmount.toLocaleString()}</span>
                  </div>
                  
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full" 
                      style={{ width: `${Math.min(100, (camp.currentAmount / camp.targetAmount) * 100)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[9px] font-bold uppercase text-slate-400 dark:text-slate-500">
                    <span>{Math.floor((camp.currentAmount / camp.targetAmount) * 100)}% Funded</span>
                    <span className="text-indigo-700 dark:text-indigo-400">{camp.status} Mode</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400">
                  <span>Backed by {camp.donations.length} citizens</span>
                  <span className="font-extrabold text-indigo-600 dark:text-indigo-400 group-hover:underline">VIEW & FUND CAMPAIGN →</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Tax Exemption Receipt Overlay Modal */}
      {selectedReceipt && (
        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-6 relative overflow-hidden shadow-2xl space-y-4"
          >
            <button 
              onClick={() => setSelectedReceipt(null)}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-full transition-colors cursor-pointer bg-transparent border-none flex items-center justify-center"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            <div className="text-center border-b border-slate-100 pb-4">
              <Building className="h-10 w-10 text-indigo-600 mx-auto mb-1.5" />
              <h3 className="text-base font-extrabold text-slate-800">INDIACIVIC SECTION 8 FOUNDATION</h3>
              <p className="text-[9px] text-slate-400 font-semibold uppercase mt-0.5">80G TAX-EXEMPT COMMMUNITY CSR RECEIPT</p>
            </div>

            <div className="space-y-3.5 text-xs text-slate-700 leading-relaxed font-mono">
              <div className="grid grid-cols-2 gap-2 text-left">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">RECEIPT NUMBER</span>
                  <span>{selectedReceipt.receiptNumber}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">DATE ISSUED</span>
                  <span>{new Date(selectedReceipt.timestamp).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">DONOR NAME</span>
                  <span>{selectedReceipt.donorName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">PARTNER GSTIN</span>
                  <span>{selectedReceipt.gstin}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center shadow-sm">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">TOTAL ESCROW CONTRIBUTION</span>
                <span className="text-lg font-extrabold text-emerald-600">₹{selectedReceipt.amount.toLocaleString()}.00</span>
              </div>

              <div className="text-left">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">FOR PROJECT ABHIYAN</span>
                <span className="text-slate-800 font-semibold">{selectedReceipt.campaignName}</span>
              </div>

              <p className="text-[9px] text-slate-400 leading-snug font-sans text-left">
                * Note: IndiaCivic is a registered Section 8 public utility platform in association with partner registered NGOs (80G / 12A exemption status). This receipt constitutes valid verification for your CA / tax filing exemption.
              </p>
            </div>

            <button
              onClick={() => setSelectedReceipt(null)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs uppercase cursor-pointer flex items-center justify-center space-x-1 shadow-sm"
            >
              <span>Download PDF Copy</span>
            </button>
          </motion.div>
        </div>
      )}

      {/* Campaign (Abhiyan) Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800/80 p-6 relative overflow-hidden shadow-2xl space-y-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg">
                  <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wide">Launch New Abhiyan</h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase">Escrow Crowdfunded Local Resolution</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full transition-colors cursor-pointer bg-transparent border-none flex items-center justify-center"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 rounded-xl text-xs font-semibold">
                {createError}
              </div>
            )}

            {createSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-semibold">
                {createSuccess}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleCreateCampaign} className="space-y-4 text-xs">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Abhiyan Title</label>
                <input
                  type="text"
                  placeholder="e.g. Repair Indiranagar 12th Main Broken Water Pipe"
                  value={newCampTitle}
                  onChange={(e) => setNewCampTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>

              {/* Category & Budget */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Category</label>
                  <select
                    value={newCampCategory}
                    onChange={(e) => setNewCampCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="Drainage & Waterlogging">Drainage & Waterlogging</option>
                    <option value="Waste Management">Waste Management</option>
                    <option value="Broken Public Assets">Broken Public Assets</option>
                    <option value="Roads & Footpaths">Roads & Footpaths</option>
                    <option value="Safety & Lighting">Safety & Lighting</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Target Funding Goal (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 15000"
                    value={newCampTarget}
                    onChange={(e) => setNewCampTarget(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                    min="1"
                    required
                  />
                </div>
              </div>

              {/* Linked Ward Issue */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Link to Citizen-Reported Ward Issue</label>
                <select
                  value={newCampLinkedIssues[0] || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewCampLinkedIssues(val ? [val] : []);
                    // Auto-fill title if empty
                    if (val && !newCampTitle) {
                      const selected = allIssues.find(i => i.id === val);
                      if (selected) {
                        setNewCampTitle(`Resolve: ${selected.title}`);
                        if (!newCampDesc) {
                          setNewCampDesc(`Resolving citizen-reported issue ${selected.trackingId}: ${selected.description}`);
                        }
                      }
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">-- Don't link (General Public Utility project) --</option>
                  {allIssues.map((issue) => (
                    <option key={issue.id} value={issue.id}>
                      [{issue.trackingId}] {issue.title} ({issue.ward})
                    </option>
                  ))}
                </select>
                <p className="text-[9px] text-slate-400 font-medium">Linking to an active issue ensures backers can verify the exact spot and current status before committing capital.</p>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Plan of Execution & Scope of Work</label>
                <textarea
                  placeholder="Specify what work will be carried out, materials required, and vendor execution details..."
                  value={newCampDesc}
                  onChange={(e) => setNewCampDesc(e.target.value)}
                  rows={4}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none leading-relaxed"
                  required
                />
              </div>

              {/* Escrow note */}
              <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-xl space-y-1">
                <span className="text-[9px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wide block">Safe Escrow Architecture Enabled</span>
                <p className="text-[9px] text-indigo-600/90 dark:text-indigo-300 leading-snug">
                  All campaign contributions are locked in a 3-stage smart escrow. If the project is not executed or failed milestone verification by citizens within 90 days, capital is auto-refunded to backers' reinvestment wallets.
                </p>
              </div>

              {/* Footer Actions */}
              <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all border-none cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCampaign}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer text-center border-none flex items-center justify-center space-x-1"
                >
                  {isSubmittingCampaign ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-1" />
                  )}
                  <span>Launch Abhiyan</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
