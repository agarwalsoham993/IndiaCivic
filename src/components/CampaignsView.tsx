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
  X
} from "lucide-react";
import { Campaign, Donation, UserProfile } from "../types";

interface CampaignsViewProps {
  user: UserProfile;
  campaigns: Campaign[];
  onDonate: (campaignId: string, amount: number, useWallet: boolean) => Promise<any>;
  onVerifyStep: (campaignId: string, step: number, vote?: 'AGREE' | 'DISAGREE') => Promise<any>;
  onSimulate90Days: (campaignId: string) => Promise<any>;
}

export default function CampaignsView({ user, campaigns, onDonate, onVerifyStep, onSimulate90Days }: CampaignsViewProps) {
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [donationAmount, setDonationAmount] = useState<number>(1000);
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "card">("upi");
  const [useWallet, setUseWallet] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Donation | null>(null);
  
  const [activeTab, setActiveTab] = useState<"all" | "active" | "resolved">("all");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

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
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-slate-800 uppercase tracking-wider">ABHIYAN HUB</h2>
        <p className="text-xs text-slate-400 font-semibold uppercase mt-0.5">Crowdfunding Local Ward Projects</p>
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
            className="rounded-2xl bg-white border border-slate-200 p-5 space-y-4 shadow-sm"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className={`px-2 py-0.5 text-[9px] font-bold rounded border uppercase ${
                  selectedCampaign.status === "RESOLVED" 
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : selectedCampaign.status === "REFUNDED"
                    ? "bg-rose-50 border-rose-200 text-rose-700"
                    : "bg-indigo-50 border-indigo-200 text-indigo-700"
                }`}>
                  {selectedCampaign.status} Campaign
                </span>
                <h3 className="text-lg font-extrabold text-slate-800 mt-2">{selectedCampaign.title}</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">ESCROW ID: #{selectedCampaign.id}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">{selectedCampaign.description}</p>

            {/* Escrow wallet tracking progress */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3.5 shadow-sm">
              <div className="flex justify-between text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">ESCROW WALLET FUNDS LOCK</span>
                  <span className="text-lg font-extrabold text-slate-800">₹{selectedCampaign.currentAmount.toLocaleString()}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">TARGET BUDGET</span>
                  <span className="text-lg font-extrabold text-indigo-600">₹{selectedCampaign.targetAmount.toLocaleString()}</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full" 
                  style={{ width: `${Math.min(100, (selectedCampaign.currentAmount / selectedCampaign.targetAmount) * 100)}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase">
                <span>{Math.floor((selectedCampaign.currentAmount / selectedCampaign.targetAmount) * 100)}% Funded</span>
                <span className="flex items-center text-amber-700">
                  <Clock className="h-3 w-3 mr-1" /> {selectedCampaign.daysLeft} Days Until Auto-Refund
                </span>
              </div>
            </div>

            {/* 3-Step Milestone release verification dashboard */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold text-indigo-700 uppercase tracking-wider flex items-center">
                <Sparkles className="h-3.5 w-3.5 text-indigo-600 mr-1" />
                3-Step Release Verification
              </h4>
              
              <div className="grid grid-cols-3 gap-2">
                <div className={`p-3 rounded-xl text-center border text-[10px] ${
                  selectedCampaign.verificationStep >= 1 ? "bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold" : "bg-slate-100 border-slate-200 text-slate-400"
                }`}>
                  <div className="font-extrabold uppercase">1. Fund Lock</div>
                  <div className="mt-1 font-semibold">{selectedCampaign.currentAmount >= selectedCampaign.targetAmount ? "VERIFIED ✓" : "COLLECTING"}</div>
                </div>

                <div className={`p-3 rounded-xl text-center border text-[10px] ${
                  selectedCampaign.verificationStep >= 2 ? "bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold" : "bg-slate-100 border-slate-200 text-slate-400"
                }`}>
                  <div className="font-extrabold uppercase">2. Proof Upload</div>
                  <div className="mt-1 font-semibold">
                    {selectedCampaign.executionProof ? "VERIFIED ✓" : (selectedCampaign.verificationStep === 2 ? "AWAITING" : "LOCKED")}
                  </div>
                </div>

                <div className={`p-3 rounded-xl text-center border text-[10px] ${
                  selectedCampaign.verificationStep >= 3 ? "bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold" : "bg-slate-100 border-slate-200 text-slate-400"
                }`}>
                  <div className="font-extrabold uppercase">3. Public Vote</div>
                  <div className="mt-1 font-semibold">
                    {selectedCampaign.status === "RESOLVED" ? "RELEASED ✓" : (selectedCampaign.verificationStep === 3 ? "VOTING ACTIVE" : "LOCKED")}
                  </div>
                </div>
              </div>

              {/* Action Panels depending on active verification step */}
              {selectedCampaign.verificationStep === 2 && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <h5 className="text-[11px] font-bold text-slate-800 uppercase">Resolver: Submit Completion Proof</h5>
                  <p className="text-[10px] text-slate-500">Upload before/after photo + video walk-proof of completed potholes/lighting road repairs to unlock neighbor voting.</p>
                  <button
                    onClick={() => handleVerifyAction(selectedCampaign.id, 2)}
                    className="py-1.5 px-3 bg-indigo-600 text-white hover:bg-indigo-700 font-bold rounded-lg text-[10px] uppercase cursor-pointer shadow-sm"
                  >
                    Upload Contractor Work Video/Photo Proof
                  </button>
                </div>
              )}

              {selectedCampaign.verificationStep === 3 && selectedCampaign.status !== "RESOLVED" && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <h5 className="text-[11px] font-bold text-slate-800 uppercase flex items-center">
                    <PlayCircle className="h-4 w-4 text-indigo-600 mr-1.5" />
                    Public Verification Voting Active
                  </h5>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Contractor uploaded video proof of MG Road junction asphalt patching. Neighbors, did this resolve the problem? Vote below to release escrow budget.
                  </p>

                  <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200 text-[10px] font-mono text-indigo-700 font-semibold shadow-sm">
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
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 shadow-sm">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
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
                          : "bg-white border-slate-200 text-slate-600 hover:text-slate-800"
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
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                />

                {/* In-app wallet options */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200 shadow-sm">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase">Pay with Refund Wallet:</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-emerald-600">₹{user.availableFunds} available</span>
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
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-600 uppercase">
                    <button
                      onClick={() => setPaymentMethod("upi")}
                      className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                        paymentMethod === "upi" ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-white border-slate-200 text-slate-400"
                      }`}
                    >
                      Unified UPI (Paytm/GPay)
                    </button>
                    <button
                      onClick={() => setPaymentMethod("card")}
                      className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                        paymentMethod === "card" ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-white border-slate-200 text-slate-400"
                      }`}
                    >
                      Credit/Debit Card
                    </button>
                  </div>
                )}

                {errorMsg && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-[10px] font-semibold flex items-center space-x-1 shadow-sm">
                    <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-[10px] font-semibold flex items-center space-x-1 shadow-sm">
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
              <div className="pt-2 p-3.5 rounded-xl bg-slate-50 border border-dashed border-slate-200 flex items-center justify-between">
                <div>
                  <h5 className="text-[11px] font-bold text-slate-800 uppercase">Simulate 90 Days Elapsing</h5>
                  <p className="text-[9px] text-slate-500 font-semibold">Triggers auto-return of idle escrow funds directly to donor wallets.</p>
                </div>
                <button
                  onClick={() => handleSimulateRefund(selectedCampaign.id)}
                  className="px-2.5 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 transition-all rounded-lg text-[10px] font-extrabold uppercase flex items-center space-x-1 cursor-pointer shadow-sm"
                >
                  <RotateCcw className="h-3.5 w-3.5 animate-spin-slow" />
                  <span>Elapse & Refund</span>
                </button>
              </div>
            )}

            {/* Donation Activity Log with receipts */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold text-indigo-700 uppercase tracking-wider flex items-center">
                <Receipt className="h-3.5 w-3.5 text-indigo-600 mr-1.5" /> Backer Donations & GST Receipts
              </h4>

              {selectedCampaign.donations.length === 0 ? (
                <p className="text-[10px] text-slate-400 uppercase text-center py-2">No donations yet. Be the first backer!</p>
              ) : (
                <div className="space-y-2">
                  {selectedCampaign.donations.map((donation) => (
                    <div 
                      key={donation.id}
                      className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 shadow-sm animate-fade-in"
                    >
                      <div className="flex items-center space-x-2">
                        <User className="h-3.5 w-3.5 text-indigo-600" />
                        <div>
                          <span className="font-bold">{donation.donorName}</span>
                          <span className="text-[9px] text-slate-400 font-mono block">Receipt: {donation.receiptNumber}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-emerald-600">+ ₹{donation.amount.toLocaleString()}</span>
                        <button
                          onClick={() => setSelectedReceipt(donation)}
                          className="p-1 rounded bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-100 transition-all cursor-pointer"
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
                className="group p-5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all duration-300 cursor-pointer relative shadow-sm hover:shadow-md text-left"
              >
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>ESCROW ID: #{camp.id}</span>
                  <span className="font-bold flex items-center text-amber-700">
                    <Clock className="h-3 w-3 mr-1" /> {camp.daysLeft} Days left
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-slate-800 mt-2 group-hover:text-indigo-600 transition-colors">
                  {camp.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed font-medium">
                  {camp.description}
                </p>

                {/* Progress indicators bar */}
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>₹{camp.currentAmount.toLocaleString()} locked</span>
                    <span className="text-slate-400">Goal: ₹{camp.targetAmount.toLocaleString()}</span>
                  </div>
                  
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full" 
                      style={{ width: `${Math.min(100, (camp.currentAmount / camp.targetAmount) * 100)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[9px] font-bold uppercase text-slate-400">
                    <span>{Math.floor((camp.currentAmount / camp.targetAmount) * 100)}% Funded</span>
                    <span className="text-indigo-700">{camp.status} Mode</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100 text-[10px] text-slate-500">
                  <span>Backed by {camp.donations.length} citizens</span>
                  <span className="font-extrabold text-indigo-600 group-hover:underline">VIEW & FUND CAMPAIGN →</span>
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
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer bg-transparent border-none"
            >
              <X className="h-5 w-5" />
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
    </div>
  );
}
