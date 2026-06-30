/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";
import { X, Bell, Check, Sparkles, AlertTriangle, HelpCircle } from "lucide-react";
import { Notification } from "../types";

interface NotificationDrawerProps {
  notifications: Notification[];
  onClose: () => void;
  onMarkAllRead: () => void;
  onNavigate: (notif: Notification) => void;
}

function getRelativeTime(timestamp: string): string {
  try {
    const ms = Date.now() - new Date(timestamp).getTime();
    const sec = Math.floor(ms / 1000);
    if (sec < 10) return "Just now";
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  } catch (err) {
    return "recently";
  }
}

export default function NotificationDrawer({
  notifications,
  onClose,
  onMarkAllRead,
  onNavigate
}: NotificationDrawerProps) {
  return (
    <>
      {/* Backdrop overlay */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/20 backdrop-blur-xs z-50 transition-opacity"
      />

      <motion.div
        initial={{ opacity: 0, x: 280 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 280 }}
        transition={{ type: "spring", damping: 25, stiffness: 350 }}
        className="fixed right-0 top-0 h-full w-[340px] sm:w-[380px] bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 z-50 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
              Notifications
            </h3>
          </div>
          <div className="flex items-center gap-3">
            {notifications.some(n => !n.read) && (
              <button 
                onClick={onMarkAllRead} 
                className="text-[10px] text-indigo-600 dark:text-indigo-400 font-extrabold uppercase hover:underline cursor-pointer"
              >
                Mark all read
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* List Body */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
          {notifications.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center h-48 text-slate-400 dark:text-slate-500">
              <Bell className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-3 stroke-[1.5]" />
              <p className="text-xs font-bold uppercase tracking-wider">No notifications yet</p>
              <p className="text-[11px] mt-1 text-slate-400 dark:text-slate-500 max-w-[200px]">
                We'll notify you here when your reports change status or milestone campaigns verify!
              </p>
            </div>
          ) : (
            notifications.map((n) => {
              // Context icons based on notification type
              let Icon = Bell;
              let iconColor = "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40";
              if (n.type === "STATUS_CHANGE") {
                Icon = AlertTriangle;
                iconColor = "text-amber-500 bg-amber-50 dark:bg-amber-950/40";
              } else if (n.type === "RESOLUTION") {
                Icon = Check;
                iconColor = "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40";
              } else if (n.type === "CAMPAIGN_UPDATE") {
                Icon = Sparkles;
                iconColor = "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40";
              }

              return (
                <div
                  key={n.id}
                  onClick={() => {
                    onNavigate(n);
                    onClose();
                  }}
                  className={`p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex gap-3 relative ${
                    !n.read ? "bg-indigo-50/25 dark:bg-indigo-950/10" : ""
                  }`}
                >
                  {/* Unread marker bar */}
                  {!n.read && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600 dark:bg-indigo-500" />
                  )}

                  <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${iconColor}`}>
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100 leading-snug">
                      {n.title}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {n.body}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 font-mono">
                      {getRelativeTime(n.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </>
  );
}
