/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ShieldAlert, 
  Layers, 
  Compass, 
  Award, 
  Clock, 
  AlertCircle, 
  MapPin, 
  Info, 
  Search, 
  Sparkles, 
  Map as MapIcon, 
  CheckCircle, 
  AlertTriangle,
  ChevronDown,
  X,
  Plus,
  Minus,
  BarChart2,
  QrCode,
  Check,
  Filter,
  Eye,
  SlidersHorizontal,
  Trash2,
  Lightbulb,
  Droplet,
  Wrench,
  ThumbsUp,
  MessageSquare,
  Send,
  Camera,
  CheckSquare,
  Activity
} from "lucide-react";
import { APIProvider, Map, AdvancedMarker, useMap } from "@vis.gl/react-google-maps";
import { Issue } from "../types";

// Setup Google Maps API key
const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  "";

const hasValidKey = Boolean(API_KEY) && API_KEY !== "YOUR_API_KEY";

// Premium Light-Cream & Peach Styled Map Theme (matching screenshots perfectly)
const LIGHT_MAP_STYLE = [
  {
    "elementType": "geometry",
    "stylers": [
      { "color": "#fbf5f0" } // Soft warm cream base
    ]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [
      { "color": "#8b2635" } // Dark burgundy labels for high legibility
    ]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [
      { "color": "#fbf5f0" },
      { "weight": 2 }
    ]
  },
  {
    "featureType": "administrative",
    "elementType": "geometry.stroke",
    "stylers": [
      { "color": "#f5cbc4" }, // Soft reddish-orange outlines
      { "weight": 1.2 }
    ]
  },
  {
    "featureType": "administrative.locality",
    "elementType": "labels.text.fill",
    "stylers": [
      { "color": "#7c1a22" },
      { "weight": 900 }
    ]
  },
  {
    "featureType": "landscape",
    "elementType": "geometry",
    "stylers": [
      { "color": "#f7ede2" } // Light peach landscape fills
    ]
  },
  {
    "featureType": "poi",
    "stylers": [
      { "visibility": "off" } // Hide POI icons to keep the layout extremely clean
    ]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [
      { "color": "#ffffff" } // Clean white roads
    ]
  },
  {
    "featureType": "road",
    "elementType": "geometry.stroke",
    "stylers": [
      { "color": "#f1e3d3" } // Subtle light brown road outlines
    ]
  },
  {
    "featureType": "transit",
    "stylers": [
      { "visibility": "off" }
    ]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [
      { "color": "#e2edf5" } // Calm pastel blue water
    ]
  }
];

// Dark Map Theme for Streetlight Overlay Mode
const DARK_MAP_STYLE = [
  {
    "elementType": "geometry",
    "stylers": [
      { "color": "#0d1321" }
    ]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [
      { "color": "#8c9fb8" }
    ]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [
      { "color": "#0d1321" },
      { "weight": 2 }
    ]
  },
  {
    "featureType": "administrative",
    "elementType": "geometry.stroke",
    "stylers": [
      { "color": "#1e293b" },
      { "weight": 1.2 }
    ]
  },
  {
    "featureType": "landscape",
    "elementType": "geometry",
    "stylers": [
      { "color": "#111827" }
    ]
  },
  {
    "featureType": "poi",
    "stylers": [
      { "visibility": "off" }
    ]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [
      { "color": "#1f2937" }
    ]
  },
  {
    "featureType": "road",
    "elementType": "geometry.stroke",
    "stylers": [
      { "color": "#111827" }
    ]
  },
  {
    "featureType": "transit",
    "stylers": [
      { "visibility": "off" }
    ]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [
      { "color": "#030712" }
    ]
  }
];

// Helper to check if issue represents a women unsafe situation
const isWomenUnsafe = (issue: any): boolean => {
  const cat = (issue.category || "").toLowerCase();
  const title = (issue.title || "").toLowerCase();
  const desc = (issue.description || "").toLowerCase();
  
  return (
    cat.includes("safety") || cat.includes("women") || cat.includes("unsafe") ||
    title.includes("safety") || title.includes("women") || title.includes("unsafe") || title.includes("harassment") || title.includes("eve teasing") || title.includes("girl") || title.includes("dark area") || title.includes("dark alley") ||
    desc.includes("safety") || desc.includes("women") || desc.includes("unsafe") || desc.includes("harassment") || desc.includes("eve teasing") || desc.includes("girl") || desc.includes("dark area") || desc.includes("dark alley")
  );
};

// Helper for Ray-Casting Point-in-Polygon check for safety heatmap zones
const isPointInPolygon = (lat: number, lng: number, polygon: { lat: number; lng: number }[]): boolean => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lat, yi = polygon[i].lng;
    const xj = polygon[j].lat, yj = polygon[j].lng;
    
    const intersect = ((yi > lng) !== (yj > lng))
        && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};


interface CityPreset {
  name: string;
  state: string;
  center: { lat: number; lng: number };
  zoom: number;
  totalActive: number;
  totalReports: number;
  sectors: Record<string, SectorData>;
  sectorsOutlines: Record<string, { lat: number; lng: number }[]>;
}

const VECTOR_MAP_LAYERS: Record<"bengaluru" | "mumbai" | "delhi", {
  waterBodies?: { name: string; points: { lat: number; lng: number }[]; color?: string; labelPosition?: { lat: number; lng: number } }[];
  parks?: { name: string; points: { lat: number; lng: number }[] }[];
  roads?: { name: string; points: { lat: number; lng: number }[]; width: number; isMain: boolean }[];
  labels?: { text: string; lat: number; lng: number; isDistrict: boolean; isPark?: boolean }[];
}> = {
  bengaluru: {
    waterBodies: [
      {
        name: "Ulsoor Lake",
        points: [
          { lat: 12.9820, lng: 77.6200 },
          { lat: 12.9850, lng: 77.6250 },
          { lat: 12.9780, lng: 77.6320 },
          { lat: 12.9740, lng: 77.6280 },
          { lat: 12.9750, lng: 77.6180 }
        ],
        color: "#E2EDF5",
        labelPosition: { lat: 12.9790, lng: 77.6240 }
      },
      {
        name: "Sankey Tank",
        points: [
          { lat: 13.0080, lng: 77.5720 },
          { lat: 13.0110, lng: 77.5750 },
          { lat: 13.0070, lng: 77.5780 },
          { lat: 13.0050, lng: 77.5740 }
        ],
        color: "#E2EDF5",
        labelPosition: { lat: 13.0075, lng: 77.5750 }
      }
    ],
    parks: [
      {
        name: "Cubbon Park",
        points: [
          { lat: 12.9720, lng: 77.5900 },
          { lat: 12.9760, lng: 77.5920 },
          { lat: 12.9780, lng: 77.6000 },
          { lat: 12.9730, lng: 77.6020 },
          { lat: 12.9690, lng: 77.5950 }
        ]
      }
    ],
    roads: [
      {
        name: "MG Road",
        points: [
          { lat: 12.9740, lng: 77.5850 },
          { lat: 12.9740, lng: 77.6450 }
        ],
        width: 12,
        isMain: true
      },
      {
        name: "100 Feet Road",
        points: [
          { lat: 12.9600, lng: 77.6400 },
          { lat: 12.9900, lng: 77.6400 }
        ],
        width: 10,
        isMain: true
      },
      {
        name: "Malleshwaram 1st Main",
        points: [
          { lat: 12.9800, lng: 77.5700 },
          { lat: 13.0100, lng: 77.5700 }
        ],
        width: 8,
        isMain: false
      },
      {
        name: "Residency Road",
        points: [
          { lat: 12.9680, lng: 77.5850 },
          { lat: 12.9680, lng: 77.6350 }
        ],
        width: 8,
        isMain: false
      },
      {
        name: "Nrupathunga Road",
        points: [
          { lat: 12.9650, lng: 77.5850 },
          { lat: 12.9750, lng: 77.5920 }
        ],
        width: 8,
        isMain: false
      }
    ],
    labels: [
      { text: "SADASHIVANAGAR", lat: 13.0050, lng: 77.5800, isDistrict: true },
      { text: "MALLESHWARAM", lat: 12.9920, lng: 77.5700, isDistrict: true },
      { text: "SHIVAJINAGAR", lat: 12.9860, lng: 77.6050, isDistrict: true },
      { text: "INDIRANAGAR", lat: 12.9740, lng: 77.6380, isDistrict: true },
      { text: "JAYANAGAR", lat: 12.9350, lng: 77.5900, isDistrict: true },
      { text: "CUBBON PARK", lat: 12.9735, lng: 77.5960, isDistrict: false, isPark: true }
    ]
  },
  mumbai: {
    waterBodies: [
      {
        name: "Arabian Sea",
        points: [
          { lat: 19.0850, lng: 72.8100 },
          { lat: 19.0850, lng: 72.7800 },
          { lat: 19.0350, lng: 72.7800 },
          { lat: 19.0350, lng: 72.8150 },
          { lat: 19.0420, lng: 72.8150 },
          { lat: 19.0550, lng: 72.8200 },
          { lat: 19.0680, lng: 72.8120 },
          { lat: 19.0780, lng: 72.8130 }
        ],
        color: "#E2EDF5",
        labelPosition: { lat: 19.0600, lng: 72.7950 }
      },
      {
        name: "Mahim Creek",
        points: [
          { lat: 19.0450, lng: 72.8380 },
          { lat: 19.0430, lng: 72.8450 },
          { lat: 19.0380, lng: 72.8550 },
          { lat: 19.0320, lng: 72.8500 },
          { lat: 19.0380, lng: 72.8400 }
        ],
        color: "#E2EDF5",
        labelPosition: { lat: 19.0400, lng: 72.8440 }
      }
    ],
    parks: [
      {
        name: "Jogger's Park",
        points: [
          { lat: 19.0610, lng: 72.8130 },
          { lat: 19.0630, lng: 72.8140 },
          { lat: 19.0620, lng: 72.8160 },
          { lat: 19.0600, lng: 72.8150 }
        ]
      }
    ],
    roads: [
      {
        name: "Linking Road",
        points: [
          { lat: 19.0800, lng: 72.8350 },
          { lat: 19.0400, lng: 72.8350 }
        ],
        width: 12,
        isMain: true
      },
      {
        name: "Carter Road",
        points: [
          { lat: 19.0750, lng: 72.8150 },
          { lat: 19.0680, lng: 72.8150 },
          { lat: 19.0550, lng: 72.8220 },
          { lat: 19.0480, lng: 72.8210 }
        ],
        width: 10,
        isMain: true
      },
      {
        name: "Hill Road",
        points: [
          { lat: 19.0620, lng: 72.8180 },
          { lat: 19.0620, lng: 72.8450 }
        ],
        width: 8,
        isMain: false
      },
      {
        name: "Turner Road",
        points: [
          { lat: 19.0680, lng: 72.8180 },
          { lat: 19.0580, lng: 72.8450 }
        ],
        width: 8,
        isMain: false
      }
    ],
    labels: [
      { text: "BANDRA WEST", lat: 19.0600, lng: 72.8300, isDistrict: true },
      { text: "PALI HILL", lat: 19.0630, lng: 72.8240, isDistrict: true },
      { text: "KHAR WEST", lat: 19.0750, lng: 72.8330, isDistrict: true },
      { text: "CARTER ROAD", lat: 19.0650, lng: 72.8170, isDistrict: true },
      { text: "JOGGER'S PARK", lat: 19.0615, lng: 72.8145, isDistrict: false, isPark: true }
    ]
  },
  delhi: {
    waterBodies: [
      {
        name: "Central Park Pool",
        points: [
          { lat: 28.6310, lng: 77.2172 },
          { lat: 28.6315, lng: 77.2177 },
          { lat: 28.6310, lng: 77.2182 },
          { lat: 28.6300, lng: 77.2182 },
          { lat: 28.6295, lng: 77.2177 },
          { lat: 28.6300, lng: 77.2172 }
        ],
        color: "#E2EDF5"
      },
      {
        name: "Yamuna River",
        points: [
          { lat: 28.6600, lng: 77.2700 },
          { lat: 28.6400, lng: 77.2650 },
          { lat: 28.6200, lng: 77.2680 },
          { lat: 28.6000, lng: 77.2750 }
        ],
        color: "#E2EDF5",
        labelPosition: { lat: 28.6300, lng: 77.2700 }
      }
    ],
    parks: [
      {
        name: "Central Park",
        points: [
          { lat: 28.6325, lng: 77.2165 },
          { lat: 28.6325, lng: 77.2189 },
          { lat: 28.6285, lng: 77.2189 },
          { lat: 28.6285, lng: 77.2165 }
        ]
      }
    ],
    roads: [
      {
        name: "Janpath Road",
        points: [
          { lat: 28.6304, lng: 77.2177 },
          { lat: 28.6150, lng: 77.2190 }
        ],
        width: 10,
        isMain: true
      },
      {
        name: "Sansad Marg",
        points: [
          { lat: 28.6304, lng: 77.2177 },
          { lat: 28.6180, lng: 77.2080 }
        ],
        width: 10,
        isMain: true
      },
      {
        name: "Barakhamba Road",
        points: [
          { lat: 28.6304, lng: 77.2177 },
          { lat: 28.6300, lng: 77.2380 }
        ],
        width: 10,
        isMain: true
      },
      {
        name: "Kasturba Gandhi Marg",
        points: [
          { lat: 28.6304, lng: 77.2177 },
          { lat: 28.6200, lng: 77.2280 }
        ],
        width: 10,
        isMain: true
      },
      {
        name: "Baba Kharak Singh Marg",
        points: [
          { lat: 28.6304, lng: 77.2177 },
          { lat: 28.6230, lng: 77.2020 }
        ],
        width: 8,
        isMain: false
      },
      {
        name: "Panchkuian Marg",
        points: [
          { lat: 28.6304, lng: 77.2177 },
          { lat: 28.6380, lng: 77.1980 }
        ],
        width: 8,
        isMain: false
      }
    ],
    labels: [
      { text: "CONNAUGHT PLACE", lat: 28.6304, lng: 77.2177, isDistrict: true },
      { text: "JANPATH", lat: 28.6240, lng: 77.2190, isDistrict: true },
      { text: "PAHARGANJ", lat: 28.6410, lng: 77.2050, isDistrict: true },
      { text: "MINTO ROAD", lat: 28.6250, lng: 77.2280, isDistrict: true },
      { text: "BARAKHAMBA", lat: 28.6320, lng: 77.2340, isDistrict: true },
      { text: "CENTRAL PARK CP", lat: 28.6300, lng: 77.2177, isDistrict: false, isPark: true }
    ]
  }
};

interface SectorData {
  id: string;
  name: string;
  score: number;
  status: "Excellent" | "Average" | "Struggling";
  resolutionSpeed: string;
  activeIssues: number;
  reopenRate: string;
  safetyScore: string;
}

interface MapsViewProps {
  issues?: Issue[];
  isMobile?: boolean;
  onSelectIssue?: (issue: Issue) => void;
  userProfile?: any;
  onRefreshData?: () => void;
  setAuthMode?: (mode: "login" | "signup" | null) => void;
  setShowAuthModal?: (show: boolean) => void;
  theme?: "light" | "dark";
  isThemeTransitioning?: boolean;
  userCoords?: { lat: number; lng: number } | null;
  onDetectLocation?: (force?: any, onSuccess?: (coords: { lat: number; lng: number }) => void) => void;
  isLocationLoading?: boolean;
}

// Unified interface for clusters
interface MapCluster {
  id: string | number;
  label: string;
  lat: number;
  lng: number;
  x: number; // for fallback canvas coordinates
  y: number; // for fallback canvas coordinates
  size: number; // diameter in pixels
  color: "burgundy" | "orange" | "red";
  locality: string;
  recentIssue: string;
  issues?: Issue[];
}

const ALL_STATES = [
  "Karnataka", "Maharashtra", "Delhi", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Kerala", "Madhya Pradesh", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Jammu & Kashmir", "Ladakh", "Puducherry"
];

const getIssueState = (iss: any): string => {
  const loc = (iss.locationName || "").toLowerCase();
  if (loc.includes("bengaluru") || loc.includes("bangalore") || loc.includes("karnataka")) {
    return "Karnataka";
  }
  if (loc.includes("mumbai") || loc.includes("bombay") || loc.includes("maharashtra") || loc.includes("bandra") || loc.includes("carter")) {
    return "Maharashtra";
  }
  if (loc.includes("delhi") || loc.includes("ncr") || loc.includes("new delhi")) {
    return "Delhi";
  }
  // Check lat/lng fallback
  const lat = Number(iss.latitude);
  const lng = Number(iss.longitude);
  if (!isNaN(lat) && !isNaN(lng)) {
    if (Math.abs(lat - 12.97) < 1.5 && Math.abs(lng - 77.59) < 1.5) return "Karnataka";
    if (Math.abs(lat - 19.07) < 1.5 && Math.abs(lng - 72.87) < 1.5) return "Maharashtra";
    if (Math.abs(lat - 28.61) < 1.5 && Math.abs(lng - 77.20) < 1.5) return "Delhi";
  }
  return "Karnataka"; // fallback
};

export default function MapsView({ 
  issues = [], 
  isMobile = false, 
  onSelectIssue,
  userProfile,
  onRefreshData,
  setAuthMode,
  setShowAuthModal,
  theme = "light",
  isThemeTransitioning = false,
  userCoords = null,
  onDetectLocation,
  isLocationLoading = false
}: MapsViewProps) {
  const [activeTab, setActiveTab] = useState<"map" | "list">("map");
  const [severityFilter, setSeverityFilter] = useState<"all" | "high" | "med" | "low">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "PENDING" | "IN_PROGRESS" | "RESOLVED">("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "garbage" | "streetlight" | "water" | "assets">("all");
  const [activeCity, setActiveCity] = useState<"bengaluru" | "mumbai" | "delhi">("bengaluru");
  const [selectedSector, setSelectedSector] = useState<string>("sector-2");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"real" | "vector">(hasValidKey ? "real" : "vector");
  
  // displayMode can be 'analytical' (prediction map and hot spot clusters) or 'reports' (live report bubbles with custom category icons & street light glows)
  const [displayMode, setDisplayMode] = useState<"analytical" | "reports">("analytical");
  const [heatmapType, setHeatmapType] = useState<"none" | "streetlight" | "womensafety" | "overall">("none");
  const [isHeatmapMenuOpen, setIsHeatmapMenuOpen] = useState(false);

  
  // State selection and search States
  const [selectedStates, setSelectedStates] = useState<string[]>(ALL_STATES);
  const [isStateDropdownOpen, setIsStateDropdownOpen] = useState(false);
  const [stateSearchQuery, setStateSearchQuery] = useState("");
  const [activeSearchedState, setActiveSearchedState] = useState("");
  const stateDropdownRef = React.useRef<HTMLDivElement>(null);

  // Click outside to close state dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (stateDropdownRef.current && !stateDropdownRef.current.contains(event.target as Node)) {
        setIsStateDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  // Scannable QR modal
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  
  const isMapDark = theme === "dark" || (displayMode === "reports" && categoryFilter === "streetlight");
  
  // Selected cluster state for popup info
  const [selectedCluster, setSelectedCluster] = useState<MapCluster | null>(null);

  // Active issue selection state for selectedCluster details
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedCluster && selectedCluster.issues && selectedCluster.issues.length > 0) {
      setActiveIssueId(selectedCluster.issues[0].id);
    } else {
      setActiveIssueId(null);
    }
  }, [selectedCluster]);

  useEffect(() => {
    setIsResolving(false);
    setResolutionPhoto(null);
    setResolutionDesc("");
    setResolutionError("");
    setResolutionSuccessMsg("");
    setCommentText("");
    setReplyText("");
    setReplyingToCommentId(null);
  }, [activeIssueId]);

  const activeIssue = useMemo(() => {
    if (!selectedCluster) return null;
    const freshIssue = issues.find(iss => iss.id === activeIssueId);
    if (freshIssue) return freshIssue;
    if (!selectedCluster.issues || selectedCluster.issues.length === 0) return null;
    return selectedCluster.issues.find(iss => iss.id === activeIssueId) || selectedCluster.issues[0];
  }, [issues, selectedCluster, activeIssueId]);

  // Local states for interactive modal actions
  const [isResolving, setIsResolving] = useState(false);
  const [resolutionPhoto, setResolutionPhoto] = useState<string | null>(null);
  const [resolutionDesc, setResolutionDesc] = useState("");
  const [resolutionLoading, setResolutionLoading] = useState(false);
  const [resolutionError, setResolutionError] = useState("");
  const [resolutionSuccessMsg, setResolutionSuccessMsg] = useState("");

  const [commentText, setCommentText] = useState("");
  const [replyText, setReplyText] = useState("");
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);

  // Local action handlers for maps details modal/panel
  const handleLocalVote = async (issueId: string) => {
    if (!userProfile || userProfile.id === "guest") {
      if (setAuthMode && setShowAuthModal) {
        setAuthMode("signup");
        setShowAuthModal(true);
      }
      return;
    }
    try {
      const response = await fetch(`/api/issues/${issueId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voteType: "UPVOTE",
          userId: userProfile.id,
          mediaBase64: undefined,
          mediaText: undefined
        })
      });
      const data = await response.json();
      if (data.success) {
        if (onRefreshData) onRefreshData();
      } else {
        alert(data.error || "Failed to submit vote.");
      }
    } catch (err) {
      console.error("Local upvote error:", err);
    }
  };

  const handleLocalResolve = async (issueId: string) => {
    if (!userProfile || userProfile.id === "guest") {
      if (setAuthMode && setShowAuthModal) {
        setAuthMode("signup");
        setShowAuthModal(true);
      }
      return;
    }
    setResolutionLoading(true);
    setResolutionError("");
    setResolutionSuccessMsg("");

    const submitResolve = async (lat?: number, lng?: number) => {
      try {
        const response = await fetch(`/api/issues/${issueId}/resolve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resolvedPhoto: resolutionPhoto,
            resolvedDescription: resolutionDesc,
            resolvedLatitude: lat,
            resolvedLongitude: lng,
            resolvedTimestamp: new Date().toISOString()
          })
        });
        const data = await response.json();
        if (response.ok && data.success) {
          setResolutionSuccessMsg("Congratulations! This issue has been verified and successfully resolved. You earned +150 XP points!");
          setResolutionPhoto(null);
          setResolutionDesc("");
          setIsResolving(false);
          if (onRefreshData) onRefreshData();
        } else {
          setResolutionError(data.error || "Failed to resolve issue.");
        }
      } catch (err: any) {
        console.error("Resolution upload error:", err);
        setResolutionError("Network error. Please try again.");
      } finally {
        setResolutionLoading(false);
      }
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        submitResolve(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        console.warn("Using fallback coordinates", err);
        submitResolve(activeIssue?.latitude, activeIssue?.longitude);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  const handleLocalAddComment = async (issueId: string, parentId?: string, customText?: string) => {
    if (!userProfile || userProfile.id === "guest") {
      if (setAuthMode && setShowAuthModal) {
        setAuthMode("signup");
        setShowAuthModal(true);
      }
      return;
    }
    const textToSend = customText !== undefined ? customText : commentText;
    if (!textToSend.trim()) return;

    setSubmittingComment(true);
    try {
      const response = await fetch(`/api/issues/${issueId}/corroborate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author: userProfile.name || "Anonymous Neighbor",
          avatar: userProfile.avatar || undefined,
          text: textToSend,
          parentId: parentId || undefined
        })
      });
      const data = await response.json();
      if (data.success) {
        if (customText === undefined) {
          setCommentText("");
        }
        setReplyText("");
        setReplyingToCommentId(null);
        if (onRefreshData) onRefreshData();
      }
    } catch (err) {
      console.error("Add comment error:", err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleLocalVoteComment = async (issueId: string, commentId: string) => {
    if (!userProfile || userProfile.id === "guest") {
      if (setAuthMode && setShowAuthModal) {
        setAuthMode("signup");
        setShowAuthModal(true);
      }
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
        if (onRefreshData) onRefreshData();
      }
    } catch (err) {
      console.error("Vote comment error:", err);
    }
  };

  // Controlled Google Maps camera state
  const [mapCenter, setMapCenter] = useState(() => {
    if (userCoords && userCoords.lat && userCoords.lng) {
      return { lat: userCoords.lat, lng: userCoords.lng };
    }
    return { lat: 12.9719, lng: 77.6112 };
  });
  const [mapZoom, setMapZoom] = useState(13);

  // Synchronize map center and active city preset when userCoords is loaded or changes
  useEffect(() => {
    if (userCoords && userCoords.lat && userCoords.lng) {
      setMapCenter({ lat: userCoords.lat, lng: userCoords.lng });
      
      const lat = userCoords.lat;
      const lng = userCoords.lng;
      let targetCity: "bengaluru" | "mumbai" | "delhi" = "bengaluru";
      
      const distBangalore = Math.pow(lat - 12.9719, 2) + Math.pow(lng - 77.6112, 2);
      const distMumbai = Math.pow(lat - 19.0760, 2) + Math.pow(lng - 72.8777, 2);
      const distDelhi = Math.pow(lat - 28.6139, 2) + Math.pow(lng - 77.2090, 2);
      
      if (distMumbai < distBangalore && distMumbai < distDelhi) {
        targetCity = "mumbai";
      } else if (distDelhi < distBangalore && distDelhi < distMumbai) {
        targetCity = "delhi";
      }
      
      setActiveCity(targetCity);
      
      // Calculate relative pan for vector fallback map
      const presetCenter = presets[targetCity].center;
      const px = 500 + (lng - presetCenter.lng) * 4000;
      const py = 500 - (lat - presetCenter.lat) * 4000;
      setVectorPan({ x: 500 - px, y: 500 - py });
      setVectorZoomLevel(4.5);
    }
  }, [userCoords]);

  // Auto-center and zoom out when multiple states are selected to show all reports combined
  useEffect(() => {
    if (selectedStates.length === 0) return;

    const centers: { lat: number; lng: number }[] = [];
    if (selectedStates.includes("Karnataka")) {
      centers.push({ lat: 12.9719, lng: 77.6112 });
    }
    if (selectedStates.includes("Maharashtra")) {
      centers.push({ lat: 19.0760, lng: 72.8777 });
    }
    if (selectedStates.includes("Delhi")) {
      centers.push({ lat: 28.6139, lng: 77.2090 });
    }

    if (centers.length === 1) {
      setMapCenter(centers[0]);
      setMapZoom(12);
    } else if (centers.length > 1) {
      const avgLat = centers.reduce((sum, c) => sum + c.lat, 0) / centers.length;
      const avgLng = centers.reduce((sum, c) => sum + c.lng, 0) / centers.length;
      setMapCenter({ lat: avgLat, lng: avgLng });
      setMapZoom(5); // Zoom out to show whole India / selected states
    }
  }, [selectedStates]);

  // Fallback Vector map pan and zoom
  const [vectorZoomLevel, setVectorZoomLevel] = useState<number>(3); 
  const [vectorPan, setVectorPan] = useState({ x: 0, y: 0 });
  const [isVectorDragging, setIsVectorDragging] = useState(false);
  const vectorDragStart = React.useRef({ x: 0, y: 0 });

  // Custom presets for the three Indian hubs (styled with custom ward details)
  const presets: Record<"bengaluru" | "mumbai" | "delhi", CityPreset> = {
    bengaluru: {
      name: "Bengaluru",
      state: "Karnataka",
      center: { lat: 12.9719, lng: 77.6112 },
      zoom: 13,
      totalActive: 6139,
      totalReports: 6388,
      sectors: {
        "sector-1": {
          id: "sector-1",
          name: "Defence Colony Ward 82",
          score: 8.9,
          status: "Excellent",
          resolutionSpeed: "14 Hrs",
          activeIssues: 22,
          reopenRate: "1.4%",
          safetyScore: "9.4/10"
        },
        "sector-2": {
          id: "sector-2",
          name: "Sadashivanagar Ward 110",
          score: 7.6,
          status: "Average",
          resolutionSpeed: "32 Hrs",
          activeIssues: 34,
          reopenRate: "5.8%",
          safetyScore: "8.6/10"
        },
        "sector-3": {
          id: "sector-3",
          name: "Malleshwaram Central Ward",
          score: 4.5,
          status: "Struggling",
          resolutionSpeed: "115 Hrs",
          activeIssues: 103,
          reopenRate: "16.8%",
          safetyScore: "4.9/10"
        },
        "sector-4": {
          id: "sector-4",
          name: "Shivajinagar Commercial Sector",
          score: 5.8,
          status: "Struggling",
          resolutionSpeed: "88 Hrs",
          activeIssues: 79,
          reopenRate: "12.2%",
          safetyScore: "6.5/10"
        }
      },
      sectorsOutlines: {
        "sector-1": [
          { lat: 12.9780, lng: 77.6150 }, { lat: 12.9840, lng: 77.6250 },
          { lat: 12.9700, lng: 77.6350 }, { lat: 12.9650, lng: 77.6200 }
        ],
        "sector-2": [
          { lat: 12.9920, lng: 77.5850 }, { lat: 13.0020, lng: 77.5980 },
          { lat: 12.9850, lng: 77.6100 }, { lat: 12.9780, lng: 77.5900 }
        ],
        "sector-3": [
          { lat: 12.9850, lng: 77.5650 }, { lat: 12.9980, lng: 77.5750 },
          { lat: 12.9900, lng: 77.5850 }, { lat: 12.9750, lng: 77.5750 }
        ],
        "sector-4": [
          { lat: 12.9750, lng: 77.5950 }, { lat: 12.9850, lng: 77.6100 },
          { lat: 12.9700, lng: 77.6150 }, { lat: 12.9620, lng: 77.6000 }
        ]
      }
    },
    mumbai: {
      name: "Mumbai",
      state: "Maharashtra",
      center: { lat: 19.0596, lng: 72.8295 },
      zoom: 13,
      totalActive: 12450,
      totalReports: 12988,
      sectors: {
        "sector-1": {
          id: "sector-1",
          name: "Carter Road Promenade",
          score: 9.1,
          status: "Excellent",
          resolutionSpeed: "12 Hrs",
          activeIssues: 16,
          reopenRate: "1.1%",
          safetyScore: "9.6/10"
        },
        "sector-2": {
          id: "sector-2",
          name: "Linking Road Commercial",
          score: 6.8,
          status: "Average",
          resolutionSpeed: "44 Hrs",
          activeIssues: 112,
          reopenRate: "8.2%",
          safetyScore: "7.9/10"
        },
        "sector-3": {
          id: "sector-3",
          name: "Khar Danda Fisherman Colony",
          score: 3.9,
          status: "Struggling",
          resolutionSpeed: "130 Hrs",
          activeIssues: 185,
          reopenRate: "22.5%",
          safetyScore: "4.2/10"
        },
        "sector-4": {
          id: "sector-4",
          name: "Pali Hill Residential",
          score: 8.5,
          status: "Excellent",
          resolutionSpeed: "16 Hrs",
          activeIssues: 25,
          reopenRate: "2.4%",
          safetyScore: "9.1/10"
        }
      },
      sectorsOutlines: {
        "sector-1": [
          { lat: 19.0650, lng: 72.8200 }, { lat: 19.0700, lng: 72.8250 },
          { lat: 19.0550, lng: 72.8300 }, { lat: 19.0500, lng: 72.8220 }
        ],
        "sector-2": [
          { lat: 19.0700, lng: 72.8300 }, { lat: 19.0750, lng: 72.8400 },
          { lat: 19.0600, lng: 72.8450 }, { lat: 19.0550, lng: 72.8320 }
        ],
        "sector-3": [
          { lat: 19.0550, lng: 72.8150 }, { lat: 19.0600, lng: 72.8200 },
          { lat: 19.0450, lng: 72.8220 }, { lat: 19.0400, lng: 72.8180 }
        ],
        "sector-4": [
          { lat: 19.0550, lng: 72.8320 }, { lat: 19.0600, lng: 72.8450 },
          { lat: 19.0450, lng: 72.8400 }, { lat: 19.0420, lng: 72.8300 }
        ]
      }
    },
    delhi: {
      name: "New Delhi",
      state: "Delhi NCR",
      center: { lat: 28.6304, lng: 77.2177 },
      zoom: 13,
      totalActive: 9840,
      totalReports: 10450,
      sectors: {
        "sector-1": {
          id: "sector-1",
          name: "Connaught Place Radial",
          score: 8.7,
          status: "Excellent",
          resolutionSpeed: "15 Hrs",
          activeIssues: 38,
          reopenRate: "2.5%",
          safetyScore: "9.2/10"
        },
        "sector-2": {
          id: "sector-2",
          name: "Janpath Market Block",
          score: 7.1,
          status: "Average",
          resolutionSpeed: "38 Hrs",
          activeIssues: 55,
          reopenRate: "6.4%",
          safetyScore: "8.3/10"
        },
        "sector-3": {
          id: "sector-3",
          name: "Pahar Ganj Back-Alleys",
          score: 3.5,
          status: "Struggling",
          resolutionSpeed: "140 Hrs",
          activeIssues: 210,
          reopenRate: "24.5%",
          safetyScore: "3.8/10"
        },
        "sector-4": {
          id: "sector-4",
          name: "Minto Bridge Underpass Area",
          score: 5.2,
          status: "Struggling",
          resolutionSpeed: "98 Hrs",
          activeIssues: 92,
          reopenRate: "15.4%",
          safetyScore: "5.8/10"
        }
      },
      sectorsOutlines: {
        "sector-1": [
          { lat: 28.6350, lng: 77.2100 }, { lat: 28.6400, lng: 77.2250 },
          { lat: 28.6250, lng: 77.2250 }, { lat: 28.6200, lng: 77.2120 }
        ],
        "sector-2": [
          { lat: 28.6300, lng: 77.2250 }, { lat: 28.6350, lng: 77.2350 },
          { lat: 28.6200, lng: 77.2400 }, { lat: 28.6150, lng: 77.2280 }
        ],
        "sector-3": [
          { lat: 28.6400, lng: 77.1950 }, { lat: 28.6450, lng: 77.2100 },
          { lat: 28.6300, lng: 77.2100 }, { lat: 28.6280, lng: 77.1980 }
        ],
        "sector-4": [
          { lat: 28.6250, lng: 77.2120 }, { lat: 28.6300, lng: 77.2250 },
          { lat: 28.6150, lng: 77.2280 }, { lat: 28.6120, lng: 77.2150 }
        ]
      }
    }
  };

  const currentPreset = presets[activeCity];

  // Base list of cluster bubbles placed carefully according to the screenshot positions
  const BASE_CLUSTERS: Record<"bengaluru" | "mumbai" | "delhi", MapCluster[]> = {
    bengaluru: [
      { id: 1, label: "22", lat: 12.9950, lng: 77.5850, x: 230, y: 150, size: 48, color: "burgundy", locality: "Malleshwaram North", recentIssue: "Debris blocking service road near metro station" },
      { id: 2, label: "58", lat: 12.9980, lng: 77.6250, x: 620, y: 130, size: 68, color: "burgundy", locality: "Sancharnagar Ward", recentIssue: "Sewer blockages spilling onto main crossroads" },
      { id: 3, label: "16", lat: 12.9840, lng: 77.6150, x: 580, y: 260, size: 54, color: "burgundy", locality: "Sadashivanagar East", recentIssue: "Open high-voltage junctionbox without safety grill" },
      { id: 4, label: "15", lat: 12.9780, lng: 77.5680, x: 180, y: 310, size: 56, color: "orange", locality: "Malleshwaram West", recentIssue: "Damaged water hydrant causing extensive loss" },
      { id: 5, label: "34", lat: 12.9690, lng: 77.5800, x: 280, y: 380, size: 70, color: "burgundy", locality: "Sadashivanagar Main Ward", recentIssue: "Continuous burning of plastic trash on street side" },
      { id: 6, label: "6", lat: 12.9680, lng: 77.5520, x: 120, y: 380, size: 42, color: "burgundy", locality: "West Corridor Road", recentIssue: "Pothole sequence disrupting outer-lane speed" },
      { id: 7, label: "27", lat: 12.9550, lng: 77.5850, x: 300, y: 500, size: 60, color: "burgundy", locality: "Vasanthnagar Extension", recentIssue: "Non-functional halogen street lamp over dark curve" },
      { id: 8, label: "27", lat: 12.9420, lng: 77.5880, x: 320, y: 600, size: 60, color: "burgundy", locality: "Vasanthnagar Ward-HQ", recentIssue: "Stray dog pack causing hazard near playground" },
      { id: 9, label: "11", lat: 12.9520, lng: 77.6250, x: 630, y: 510, size: 48, color: "burgundy", locality: "Shivajinagar Road Block", recentIssue: "Unauthorized sidewalk storage of commercial goods" },
      { id: 10, label: "19", lat: 12.9320, lng: 77.6000, x: 400, y: 670, size: 58, color: "burgundy", locality: "Defence Colony Ward Edge", recentIssue: "Deep trench left unpaved post utility laying" },
      { id: 11, label: "13", lat: 12.9280, lng: 77.6180, x: 550, y: 700, size: 50, color: "burgundy", locality: "Halasuru Slum Block A", recentIssue: "Untreated drainage sludge overflow entering lanes" },
      { id: 12, label: "3", lat: 12.9250, lng: 77.6320, x: 670, y: 720, size: 40, color: "burgundy", locality: "Halasuru Slum Block B", recentIssue: "Dead animal body uncollected since 48 hours" },
      { id: 13, label: "30", lat: 12.9450, lng: 77.6420, x: 780, y: 580, size: 68, color: "red", locality: "Indiranagar Ward 88 Main", recentIssue: "Waterlogging at major junction during mild showers" },
      { id: 14, label: "31", lat: 12.9380, lng: 77.6580, x: 880, y: 630, size: 68, color: "burgundy", locality: "Indiranagar South", recentIssue: "Overhanging tree branch ready to fall onto power lines" },
      { id: 15, label: "55", lat: 12.9200, lng: 77.6300, x: 670, y: 800, size: 68, color: "burgundy", locality: "Halasuru Lake Road", recentIssue: "Commercial waste dumping at scenic lake entry gate" },
      { id: 16, label: "4", lat: 12.9920, lng: 77.6400, x: 780, y: 200, size: 40, color: "burgundy", locality: "Kalyan Nagar Crossing", recentIssue: "Pedestrian signal cycle stuck in flashing amber" },
      { id: 17, label: "14", lat: 12.9960, lng: 77.6620, x: 920, y: 160, size: 48, color: "burgundy", locality: "Banaswadi Lane", recentIssue: "Frequent night safety hazard due to absolute darkness" },
      { id: 18, label: "103", lat: 12.9150, lng: 77.5680, x: 180, y: 810, size: 80, color: "burgundy", locality: "Jayanagar Block 3", recentIssue: "Major sewer pipeline burst flooding market lanes" },
      { id: 19, label: "137", lat: 12.9120, lng: 77.5880, x: 320, y: 840, size: 85, color: "burgundy", locality: "Jayanagar Central", recentIssue: "Illegal commercial hoarding blocking main street camera" },
      { id: 20, label: "79", lat: 12.9100, lng: 77.6080, x: 460, y: 850, size: 80, color: "burgundy", locality: "JP Nagar Main Gate", recentIssue: "Broken concrete sidewalk slabs causing severe trips" },
      { id: 21, label: "53", lat: 12.9300, lng: 77.5550, x: 120, y: 730, size: 76, color: "burgundy", locality: "Banashankari Ward", recentIssue: "Accumulated construction debris blocking bus shelter" },
      { id: 22, label: "39", lat: 12.9280, lng: 77.5880, x: 320, y: 740, size: 75, color: "burgundy", locality: "Jayanagar North Lane", recentIssue: "High density of open pothole craters near hospital entrance" }
    ],
    mumbai: [
      { id: 1, label: "42", lat: 19.0680, lng: 72.8220, x: 230, y: 150, size: 55, color: "burgundy", locality: "Carter Road Promenade", recentIssue: "Damaged sea-wall railing near public viewing spot" },
      { id: 2, label: "88", lat: 19.0720, lng: 72.8350, x: 620, y: 130, size: 72, color: "burgundy", locality: "Linking Road Market", recentIssue: "Heavy garbage blockage near high-end fashion stores" },
      { id: 3, label: "31", lat: 19.0600, lng: 72.8310, x: 580, y: 260, size: 58, color: "burgundy", locality: "Pali Hill Residential Area", recentIssue: "Unauthorized tree cutting and leaf burning at midnight" },
      { id: 4, label: "12", lat: 19.0550, lng: 72.8120, x: 180, y: 310, size: 52, color: "orange", locality: "Bandra Fort Lane", recentIssue: "Defunct street lamps causing pitch darkness after 7 PM" },
      { id: 5, label: "94", lat: 19.0490, lng: 72.8250, x: 280, y: 380, size: 75, color: "burgundy", locality: "Khar Danda East", recentIssue: "Raw sewage outlet directly discharging on public beach" },
      { id: 6, label: "15", lat: 19.0450, lng: 72.8320, x: 630, y: 510, size: 55, color: "burgundy", locality: "Bandra Railway Stn Road", recentIssue: "Enormous debris pile blocking pedestrian exit steps" }
    ],
    delhi: [
      { id: 1, label: "55", lat: 28.6350, lng: 77.2150, x: 230, y: 150, size: 62, color: "burgundy", locality: "Connaught Place Inner Circle", recentIssue: "Loose electrical wiring dangling from heritage pillars" },
      { id: 2, label: "115", lat: 28.6380, lng: 77.2280, x: 620, y: 130, size: 78, color: "burgundy", locality: "Janpath Market Crossing", recentIssue: "Blocked storm drain causing massive puddle across zebra line" },
      { id: 3, label: "44", lat: 28.6250, lng: 77.2220, x: 580, y: 260, size: 60, color: "burgundy", locality: "Pahar Ganj Back Lane", recentIssue: "Accumulated commercial packaging waste blocking alley entry" },
      { id: 4, label: "19", lat: 28.6180, lng: 77.2080, x: 180, y: 310, size: 54, color: "orange", locality: "Minto Road Underpass", recentIssue: "Water level indicator gauge broken; critical safety risk" },
      { id: 5, label: "150", lat: 28.6120, lng: 77.2200, x: 280, y: 380, size: 82, color: "burgundy", locality: "New Delhi Railway Stn Gate 2", recentIssue: "Enormous illegal dumping ground creating foul odor across platforms" }
    ]
  };

  // Dynamic clustering distance threshold in degrees
  const getThreshold = (zoom: number) => {
    return 0.05 / Math.pow(1.8, zoom - 10);
  };

  // Compute dynamic projection parameters (center and scale) shared between all vector layers
  const projectionParams = useMemo(() => {
    const cityCenter = currentPreset.center;
    const cityIssues = issues.filter(iss => {
      const lat = Number(iss.latitude);
      const lng = Number(iss.longitude);
      if (isNaN(lat) || isNaN(lng)) return false;
      const issueState = getIssueState(iss);
      if (!selectedStates.includes(issueState)) return false;
      return true;
    });

    let filteredCityIssues = [...cityIssues];
    if (severityFilter !== "all") {
      const targetSev = severityFilter === "high" ? [4, 5] : severityFilter === "med" ? [3] : [1, 2];
      filteredCityIssues = filteredCityIssues.filter(iss => targetSev.includes(iss.severity));
    }
    if (statusFilter !== "all") {
      filteredCityIssues = filteredCityIssues.filter(iss => iss.status === statusFilter);
    }
    if (categoryFilter !== "all") {
      filteredCityIssues = filteredCityIssues.filter(iss => {
        const cat = (iss.category || "").toLowerCase();
        if (categoryFilter === "garbage") return cat.includes("waste") || cat.includes("garbage") || cat.includes("litter") || cat.includes("trash");
        if (categoryFilter === "streetlight") return cat.includes("light") || cat.includes("electricity") || cat.includes("power") || cat.includes("streetlight");
        if (categoryFilter === "water") return cat.includes("water") || cat.includes("drainage") || cat.includes("sewage") || cat.includes("waterlogging");
        if (categoryFilter === "assets") return cat.includes("asset") || cat.includes("road") || cat.includes("pothole") || cat.includes("footpath");
        return cat.includes(categoryFilter.toLowerCase());
      });
    }

    let centerLat = cityCenter.lat;
    let centerLng = cityCenter.lng;
    let scaleMultiplier = 5000; // Base scale for elegant detailed rendering

    if (filteredCityIssues.length > 0) {
      const lats = filteredCityIssues.map(i => Number(i.latitude)).filter(n => !isNaN(n));
      const lngs = filteredCityIssues.map(i => Number(i.longitude)).filter(n => !isNaN(n));
      if (lats.length > 0) {
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);

        const dLatSpan = maxLat - minLat;
        const dLngSpan = maxLng - minLng;
        const maxSpan = Math.max(dLatSpan, dLngSpan);

        centerLat = (minLat + maxLat) / 2;
        centerLng = (minLng + maxLng) / 2;

        if (maxSpan > 0.05) {
          // Scale down multiplier proportionally to the coordinates span
          scaleMultiplier = Math.min(5000, 350 / maxSpan);
        }
      }
    }

    return { centerLat, centerLng, scaleMultiplier };
  }, [issues, currentPreset, severityFilter, statusFilter, categoryFilter, selectedStates]);

  const currentClusters = useMemo(() => {
    const zoom = viewMode === "real" ? mapZoom : (11 + vectorZoomLevel);
    const threshold = getThreshold(zoom);
    const resultClusters: MapCluster[] = [];

    // Filter by state selection, ignoring proximity constraints to show all reports in selected states combined
    const cityIssues = issues.filter(iss => {
      const lat = Number(iss.latitude);
      const lng = Number(iss.longitude);
      if (isNaN(lat) || isNaN(lng)) return false;

      // Filter by state selection
      const issueState = getIssueState(iss);
      if (!selectedStates.includes(issueState)) return false;

      return true;
    });

    // Apply filtering by severity, status, and category as well
    let filteredCityIssues = [...cityIssues];
    if (severityFilter !== "all") {
      const targetSev = severityFilter === "high" ? [4, 5] : severityFilter === "med" ? [3] : [1, 2];
      filteredCityIssues = filteredCityIssues.filter(iss => targetSev.includes(iss.severity));
    }
    if (statusFilter !== "all") {
      filteredCityIssues = filteredCityIssues.filter(iss => iss.status === statusFilter);
    }
    if (categoryFilter !== "all") {
      filteredCityIssues = filteredCityIssues.filter(iss => {
        const cat = (iss.category || "").toLowerCase();
        if (categoryFilter === "garbage") {
          return cat.includes("waste") || cat.includes("garbage") || cat.includes("litter") || cat.includes("trash");
        }
        if (categoryFilter === "streetlight") {
          return cat.includes("light") || cat.includes("electricity") || cat.includes("power") || cat.includes("streetlight");
        }
        if (categoryFilter === "water") {
          return cat.includes("water") || cat.includes("drainage") || cat.includes("sewage") || cat.includes("waterlogging");
        }
        if (categoryFilter === "assets") {
          return cat.includes("asset") || cat.includes("road") || cat.includes("pothole") || cat.includes("footpath");
        }
        return cat.includes(categoryFilter.toLowerCase());
      });
    }

    // Perform clustering
    for (const issue of filteredCityIssues) {
      let merged = false;
      const issueLat = Number(issue.latitude);
      const issueLng = Number(issue.longitude);

      for (const cluster of resultClusters) {
        const dLat = issueLat - cluster.lat;
        const dLng = issueLng - cluster.lng;
        const dist = Math.sqrt(dLat * dLat + dLng * dLng);
        if (dist < threshold) {
          cluster.issues.push(issue);
          // Re-calculate center of gravity
          cluster.lat = cluster.issues.reduce((sum, i) => sum + Number(i.latitude), 0) / cluster.issues.length;
          cluster.lng = cluster.issues.reduce((sum, i) => sum + Number(i.longitude), 0) / cluster.issues.length;
          merged = true;
          break;
        }
      }

      if (!merged) {
        resultClusters.push({
          id: `cluster-${issue.id}`,
          label: "1",
          lat: issueLat,
          lng: issueLng,
          x: 0,
          y: 0,
          size: 42,
          color: "orange",
          locality: issue.locationName || "Reported Location",
          recentIssue: issue.title,
          issues: [issue]
        });
      }
    }

    const { centerLat, centerLng, scaleMultiplier } = projectionParams;

    // Post-process the clusters to define size, color, label, locality, and vector coordinates
    return resultClusters.map((cluster) => {
      const count = cluster.issues.length;
      cluster.label = String(count);

      const maxSeverity = Math.max(...cluster.issues.map(i => i.severity));
      if (maxSeverity >= 4) {
        cluster.color = "red";
      } else if (maxSeverity === 3) {
        cluster.color = "orange";
      } else {
        cluster.color = "burgundy";
      }

      // Check for safety issues / women unsafe
      const hasWomenUnsafe = cluster.issues.some(iss => isWomenUnsafe(iss));
      
      // Determine dominant category of this cluster
      const categoriesList = cluster.issues.map(iss => {
        if (isWomenUnsafe(iss)) return "women_unsafe";
        const cat = (iss.category || "").toLowerCase();
        if (cat.includes("waste") || cat.includes("garbage") || cat.includes("litter") || cat.includes("trash")) return "garbage";
        if (cat.includes("light") || cat.includes("electricity") || cat.includes("power") || cat.includes("streetlight")) return "streetlight";
        if (cat.includes("water") || cat.includes("drainage") || cat.includes("sewage") || cat.includes("waterlogging")) return "water";
        if (cat.includes("asset") || cat.includes("road") || cat.includes("pothole") || cat.includes("footpath")) return "assets";
        return "other";
      });

      let dominantCategory = "other";
      if (categoriesList.includes("women_unsafe")) {
        dominantCategory = "women_unsafe";
      } else if (categoriesList.includes("water")) {
        dominantCategory = "water";
      } else if (categoriesList.includes("streetlight")) {
        dominantCategory = "streetlight";
      } else if (categoriesList.includes("garbage")) {
        dominantCategory = "garbage";
      } else if (categoriesList.includes("assets")) {
        dominantCategory = "assets";
      } else if (cluster.issues.length > 0) {
        // Fallback to first issue category if any
        const firstCat = (cluster.issues[0].category || "").toLowerCase();
        if (firstCat.includes("waste") || firstCat.includes("garbage") || firstCat.includes("litter") || firstCat.includes("trash")) dominantCategory = "garbage";
        else if (firstCat.includes("light") || firstCat.includes("electricity") || firstCat.includes("power") || firstCat.includes("streetlight")) dominantCategory = "streetlight";
        else if (firstCat.includes("water") || firstCat.includes("drainage") || firstCat.includes("sewage") || firstCat.includes("waterlogging")) dominantCategory = "water";
        else if (firstCat.includes("asset") || firstCat.includes("road") || firstCat.includes("pothole") || firstCat.includes("footpath")) dominantCategory = "assets";
      }

      (cluster as any).dominantCategory = dominantCategory;
      (cluster as any).hasWomenUnsafe = hasWomenUnsafe;

      // Dynamic size from 42px to 80px based on report intensity
      cluster.size = Math.min(80, 42 + (count - 1) * 6);

      if (count === 1) {
        cluster.locality = cluster.issues[0].locationName;
        cluster.recentIssue = cluster.issues[0].title;
      } else {
        const locationCounts: Record<string, number> = {};
        cluster.issues.forEach(i => {
          const loc = i.locationName || "Reported Location";
          locationCounts[loc] = (locationCounts[loc] || 0) + 1;
        });
        const sortedLocs = Object.entries(locationCounts).sort((a, b) => b[1] - a[1]);
        cluster.locality = `${sortedLocs[0][0]} (${count} Reports)`;

        const sortedIssues = [...cluster.issues].sort((a, b) => {
          if (b.severity !== a.severity) return b.severity - a.severity;
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });
        cluster.recentIssue = sortedIssues[0].title;
      }

      // Project coordinates to 1000x1000 fallback Vector Canvas
      cluster.x = 500 + (cluster.lng - centerLng) * scaleMultiplier;
      cluster.y = 500 - (cluster.lat - centerLat) * scaleMultiplier;

      return cluster;
    });
  }, [issues, viewMode, mapZoom, vectorZoomLevel, currentPreset, severityFilter, statusFilter, categoryFilter, selectedStates, projectionParams]);

  // Dynamic calculations of active and total reports from the actual database for selected states
  const activeCount = useMemo(() => {
    const validIssues = issues.filter(iss => {
      const lat = Number(iss.latitude);
      const lng = Number(iss.longitude);
      if (isNaN(lat) || isNaN(lng)) return false;

      // Filter by state selection
      const issueState = getIssueState(iss);
      if (!selectedStates.includes(issueState)) return false;

      return true;
    });
    return validIssues.filter(iss => iss.status !== "RESOLVED").length;
  }, [issues, selectedStates]);

  const totalReportsCount = useMemo(() => {
    const validIssues = issues.filter(iss => {
      const lat = Number(iss.latitude);
      const lng = Number(iss.longitude);
      if (isNaN(lat) || isNaN(lng)) return false;

      // Filter by state selection
      const issueState = getIssueState(iss);
      if (!selectedStates.includes(issueState)) return false;

      return true;
    });
    return validIssues.length;
  }, [issues, selectedStates]);

  // Handle Preset drop down selection
  const handleCityChange = (cityKey: "bengaluru" | "mumbai" | "delhi") => {
    setActiveCity(cityKey);
    setMapCenter(presets[cityKey].center);
    setMapZoom(presets[cityKey].zoom);
    setSelectedSector("sector-2");
    setSelectedCluster(null);
  };

  const handleStateSearch = () => {
    setActiveSearchedState(stateSearchQuery);
  };

  const handleToggleState = (stateName: string) => {
    let nextStates: string[];
    if (selectedStates.includes(stateName)) {
      nextStates = selectedStates.filter(s => s !== stateName);
    } else {
      nextStates = [...selectedStates, stateName];
      // Proactively switch city map center to matching hub to show data
      if (stateName === "Karnataka") {
        handleCityChange("bengaluru");
      } else if (stateName === "Maharashtra") {
        handleCityChange("mumbai");
      } else if (stateName === "Delhi") {
        handleCityChange("delhi");
      }
    }
    setSelectedStates(nextStates);
  };

  const handleToggleAllStates = () => {
    if (selectedStates.length === ALL_STATES.length) {
      setSelectedStates([]);
    } else {
      setSelectedStates(ALL_STATES);
    }
  };

  const orderedStates = useMemo(() => {
    const list = [...ALL_STATES];
    if (!activeSearchedState) {
      return list;
    }
    const term = activeSearchedState.toLowerCase().trim();
    const matches = list.filter(s => s.toLowerCase().includes(term));
    const nonMatches = list.filter(s => !s.toLowerCase().includes(term));
    return [...matches, ...nonMatches];
  }, [activeSearchedState]);

  // Perform a local query check over major Indian cities
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim().toLowerCase();
    if (query.includes("mumb") || query.includes("mahar") || query.includes("bomb")) {
      handleCityChange("mumbai");
    } else if (query.includes("delh") || query.includes("ncr") || query.includes("cp") || query.includes("new")) {
      handleCityChange("delhi");
    } else {
      handleCityChange("bengaluru");
    }
    setSearchQuery("");
  };

  // GPS tracking locator function (centers map back to default preset or user's exact coordinates)
  const handleLocateMe = () => {
    const handleCoordsFound = (coords: { lat: number; lng: number }) => {
      const lat = coords.lat;
      const lng = coords.lng;
      let targetCity: "bengaluru" | "mumbai" | "delhi" = "bengaluru";
      
      const distBangalore = Math.pow(lat - 12.9719, 2) + Math.pow(lng - 77.6112, 2);
      const distMumbai = Math.pow(lat - 19.0760, 2) + Math.pow(lng - 72.8777, 2);
      const distDelhi = Math.pow(lat - 28.6139, 2) + Math.pow(lng - 77.2090, 2);
      
      if (distMumbai < distBangalore && distMumbai < distDelhi) {
        targetCity = "mumbai";
      } else if (distDelhi < distBangalore && distDelhi < distMumbai) {
        targetCity = "delhi";
      }
      
      setActiveCity(targetCity);
      
      // Center the map
      setMapCenter({ lat, lng });
      setMapZoom(15);
      
      // Calculate relative pan for vector fallback map
      const presetCenter = presets[targetCity].center;
      const px = 500 + (lng - presetCenter.lng) * 4000;
      const py = 500 - (lat - presetCenter.lat) * 4000;
      setVectorPan({ x: 500 - px, y: 500 - py });
      setVectorZoomLevel(4.5);
    };

    if (onDetectLocation) {
      onDetectLocation(true, handleCoordsFound);
    } else if (userCoords && userCoords.lat && userCoords.lng) {
      handleCoordsFound(userCoords);
    } else {
      setMapCenter(currentPreset.center);
      setMapZoom(currentPreset.zoom);
      setVectorPan({ x: 0, y: 0 });
      setVectorZoomLevel(3);
    }
  };

  // Drag pan handlers for vector fallback map
  const handleVectorMouseDown = (e: React.MouseEvent) => {
    setIsVectorDragging(true);
    vectorDragStart.current = { x: e.clientX - vectorPan.x, y: e.clientY - vectorPan.y };
  };

  const handleVectorMouseMove = (e: React.MouseEvent) => {
    if (!isVectorDragging) return;
    setVectorPan({
      x: e.clientX - vectorDragStart.current.x,
      y: e.clientY - vectorDragStart.current.y
    });
  };

  const handleVectorMouseUp = () => {
    setIsVectorDragging(false);
  };

  // Touch handlers for mobile vector map
  const handleVectorTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsVectorDragging(true);
      vectorDragStart.current = { x: e.touches[0].clientX - vectorPan.x, y: e.touches[0].clientY - vectorPan.y };
    }
  };

  const handleVectorTouchMove = (e: React.TouchEvent) => {
    if (!isVectorDragging || e.touches.length !== 1) return;
    setVectorPan({
      x: e.touches[0].clientX - vectorDragStart.current.x,
      y: e.touches[0].clientY - vectorDragStart.current.y
    });
  };

  // Gentle fade anim utility
  const getClusterColorClass = (color: "burgundy" | "orange" | "red") => {
    if (color === "burgundy") return "bg-[#801D26] hover:bg-[#96222C] text-white ring-4 ring-[#801D26]/20";
    if (color === "red") return "bg-[#E13838] hover:bg-[#F04A4A] text-white ring-4 ring-[#E13838]/20";
    return "bg-[#F57C1F] hover:bg-[#FF8D36] text-white ring-4 ring-[#F57C1F]/20";
  };

  const getClusterBubbleContent = (cluster: any, currentDisplayMode: "analytical" | "reports") => {
    const isUnsafe = cluster.hasWomenUnsafe || cluster.issues?.some((iss: any) => isWomenUnsafe(iss));
    const dominantCat = cluster.dominantCategory || "other";
    const label = cluster.label;

    // If women unsafe, we ALWAYS show the triangle warning symbol to distinguish easily
    if (isUnsafe) {
      return (
        <div className="relative flex items-center justify-center select-none group">
          {/* Glow effect */}
          <div className="absolute rounded-full bg-rose-500/20 blur-md animate-pulse" style={{ width: '48px', height: '48px' }} />
          <div className="relative w-10 h-10 bg-amber-400 hover:bg-amber-500 border-2 border-rose-600 rounded-full flex items-center justify-center shadow-xl transition-all duration-150 transform hover:scale-110 active:scale-95 cursor-pointer text-rose-950">
            <AlertTriangle className="h-5 w-5 text-rose-700 stroke-[3.5]" />
            {/* Small count badge if > 1 */}
            {parseInt(label) > 1 && (
              <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-[9px] font-black h-4.5 w-4.5 rounded-full flex items-center justify-center border border-white">
                {label}
              </span>
            )}
          </div>
        </div>
      );
    }

    // Under analytical mode, we default to the gorgeous original count bubbles
    if (currentDisplayMode === "analytical") {
      return (
        <div 
          style={{
            width: `${cluster.size}px`,
            height: `${cluster.size}px`
          }}
          className={`${getClusterColorClass(cluster.color)} border-2 border-white shadow-xl rounded-full flex items-center justify-center font-extrabold text-xs cursor-pointer transform hover:scale-110 active:scale-95 transition-all duration-150`}
        >
          {cluster.label}
        </div>
      );
    }

    // Under reports mode, we show custom category icons
    let bgClass = "bg-[#801D26]"; // Burgundy default
    let iconEl = <Layers className="h-4.5 w-4.5 text-white" />;

    if (dominantCat === "garbage") {
      bgClass = "bg-[#10B981] hover:bg-[#059669] border-[#047857]"; // Emerald
      iconEl = <Trash2 className="h-4.5 w-4.5 text-white" />;
    } else if (dominantCat === "streetlight") {
      bgClass = "bg-[#FBBF24] hover:bg-[#F59E0B] border-[#D97706]"; // Golden/Yellow
      iconEl = <Lightbulb className="h-4.5 w-4.5 text-amber-950 fill-amber-300/30" />;
    } else if (dominantCat === "water") {
      bgClass = "bg-[#06B6D4] hover:bg-[#0891B2] border-[#0E7490]"; // Cyan/Blue
      iconEl = (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5 text-white">
          <path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-13-7-13S5 10.7 5 15a7 7 0 0 0 7 7z" />
          <line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" strokeWidth="2.5" />
        </svg>
      );
    } else if (dominantCat === "assets") {
      bgClass = "bg-[#4F46E5] hover:bg-[#4338CA] border-[#3730A3]"; // Indigo
      iconEl = <Wrench className="h-4.5 w-4.5 text-white" />;
    }

    return (
      <div className="relative flex items-center justify-center group select-none">
        {/* If category is streetlight, we display dynamic glowing ambient shadows representing report counts */}
        {dominantCat === "streetlight" && (
          <>
            <div 
              className="absolute rounded-full bg-amber-400/20 blur-md animate-pulse" 
              style={{ 
                width: `${Math.max(60, 48 + parseInt(label) * 8)}px`, 
                height: `${Math.max(60, 48 + parseInt(label) * 8)}px` 
              }} 
            />
            <div 
              className="absolute rounded-full bg-amber-300/10 blur-xl" 
              style={{ 
                width: `${Math.max(120, 80 + parseInt(label) * 15)}px`, 
                height: `${Math.max(120, 80 + parseInt(label) * 15)}px` 
              }} 
            />
          </>
        )}

        {/* Actual Icon Bubble */}
        <div 
          style={{ width: '40px', height: '40px' }}
          className={`${bgClass} border-2 border-white shadow-xl rounded-full flex items-center justify-center cursor-pointer transform hover:scale-115 active:scale-95 transition-all duration-150`}
        >
          {iconEl}
          
          {/* Count Badge on the side for merged reports */}
          {parseInt(label) > 1 && (
            <span className="absolute -top-1.5 -right-1.5 bg-slate-900 text-white text-[8px] font-black h-4.5 w-4.5 rounded-full flex items-center justify-center border border-white">
              {label}
            </span>
          )}
        </div>
      </div>
    );
  };

  // Filter issues list if they toggle to "List" mode
  const filteredIssuesList = useMemo(() => {
    let result = [...issues];
    
    // Filter out issues with invalid coordinates and filter strictly by state selection
    result = result.filter(iss => {
      const lat = Number(iss.latitude);
      const lng = Number(iss.longitude);
      if (isNaN(lat) || isNaN(lng)) return false;

      // Filter by state selection
      const issueState = getIssueState(iss);
      if (!selectedStates.includes(issueState)) return false;

      return true;
    });

    if (severityFilter !== "all") {
      const targetSev = severityFilter === "high" ? [4, 5] : severityFilter === "med" ? [3] : [1, 2];
      result = result.filter(iss => targetSev.includes(iss.severity));
    }

    if (statusFilter !== "all") {
      result = result.filter(iss => iss.status === statusFilter);
    }

    if (categoryFilter !== "all") {
      result = result.filter(iss => {
        const cat = (iss.category || "").toLowerCase();
        if (categoryFilter === "garbage") {
          return cat.includes("waste") || cat.includes("garbage") || cat.includes("litter") || cat.includes("trash");
        }
        if (categoryFilter === "streetlight") {
          return cat.includes("light") || cat.includes("electricity") || cat.includes("power") || cat.includes("streetlight");
        }
        if (categoryFilter === "water") {
          return cat.includes("water") || cat.includes("drainage") || cat.includes("sewage") || cat.includes("waterlogging");
        }
        if (categoryFilter === "assets") {
          return cat.includes("asset") || cat.includes("road") || cat.includes("pothole") || cat.includes("footpath");
        }
        return cat.includes(categoryFilter.toLowerCase());
      });
    }

    return result;
  }, [issues, currentPreset, severityFilter, statusFilter, categoryFilter, selectedStates]);

  // The list view items are exactly the filtered database issues, with no mock/static reports added
  const listFeedItems = filteredIssuesList;

  return (
    <div className={`relative w-full h-full overflow-hidden flex flex-col font-sans select-none transition-colors duration-500 ${
      theme === "dark" ? "bg-[#0b0f19] text-slate-100" : "bg-[#FAF2EB] text-[#1e293b]"
    }`}>
      
      {/* 2. FILTER & SECTOR SELECTORS BAR (Strictly matching the layout of the screenshots) */}
      <div className={`p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 z-40 shadow-sm relative border-b transition-all duration-500 ${
        theme === "dark" 
          ? "bg-[#0f172a] border-slate-800 text-slate-100" 
          : "bg-white border-slate-150 text-[#1e293b]"
      }`}>
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {/* Severity Dropdown */}
          <div className="relative flex-1 sm:flex-initial min-w-0 w-full">
            <select 
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as any)}
              className={`appearance-none pl-2 pr-6 sm:pl-3 sm:pr-8 py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold focus:outline-none cursor-pointer shadow-sm w-full sm:min-w-[120px] transition-all duration-300 ${
                theme === "dark"
                  ? "bg-[#1e293b] border-slate-700 text-slate-200 focus:border-slate-500"
                  : "bg-white border-slate-200 text-slate-700 focus:border-slate-400"
              }`}
            >
              <option value="all">All Severity</option>
              <option value="high">High (4-5)</option>
              <option value="med">Medium (3)</option>
              <option value="low">Low (1-2)</option>
            </select>
            <ChevronDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-400 absolute right-1.5 sm:right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Status Dropdown */}
          <div className="relative flex-1 sm:flex-initial min-w-0 w-full">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className={`appearance-none pl-2 pr-6 sm:pl-3 sm:pr-8 py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold focus:outline-none cursor-pointer shadow-sm w-full sm:min-w-[120px] transition-all duration-300 ${
                theme === "dark"
                  ? "bg-[#1e293b] border-slate-700 text-slate-200 focus:border-slate-500"
                  : "bg-white border-slate-200 text-slate-700 focus:border-slate-400"
              }`}
            >
              <option value="all">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
            </select>
            <ChevronDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-400 absolute right-1.5 sm:right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* States Dropdown Filter */}
          <div className="relative flex-1 sm:flex-initial min-w-0 w-full" ref={stateDropdownRef}>
            <button
              type="button"
              onClick={() => setIsStateDropdownOpen(!isStateDropdownOpen)}
              className={`appearance-none pl-2 pr-6 sm:pl-3 sm:pr-8 py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold focus:outline-none cursor-pointer shadow-sm w-full sm:min-w-[140px] flex items-center justify-between gap-1 text-left relative transition-all duration-300 ${
                theme === "dark"
                  ? "bg-[#1e293b] border-slate-700 text-slate-200 focus:border-slate-500"
                  : "bg-white border-slate-200 text-slate-700 focus:border-slate-400"
              }`}
            >
              <span className="truncate max-w-[80px] xs:max-w-[105px]">
                {selectedStates.length === ALL_STATES.length
                  ? "All States"
                  : selectedStates.length === 0
                  ? "No States"
                  : selectedStates.length === 1
                  ? selectedStates[0]
                  : `${selectedStates.length} Selected`}
              </span>
              <ChevronDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-400 absolute right-1.5 sm:right-2.5 top-2.5 pointer-events-none" />
            </button>

            {isStateDropdownOpen && (
              <div className={`absolute right-0 mt-1.5 w-64 max-w-[calc(100vw-32px)] rounded-xl shadow-xl z-50 p-2.5 flex flex-col space-y-2 text-left origin-top-right border transition-all duration-300 ${
                theme === "dark"
                  ? "bg-[#0f172a] border-slate-800 text-slate-200"
                  : "bg-white border-slate-200 text-slate-800"
              }`}>
                {/* State Search Bar */}
                <div className={`flex items-center gap-1 rounded-lg p-1 border transition-all duration-300 ${
                  theme === "dark"
                    ? "bg-[#1d2432] border-slate-700 text-slate-200"
                    : "bg-slate-50 border-slate-200 text-slate-700"
                }`}>
                  <input
                    type="text"
                    placeholder="Search state..."
                    value={stateSearchQuery}
                    onChange={(e) => setStateSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleStateSearch();
                      }
                    }}
                    className={`bg-transparent border-none text-xs placeholder:text-slate-400 focus:outline-none px-1.5 py-1 w-full font-medium ${
                      theme === "dark" ? "text-slate-200" : "text-slate-700"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleStateSearch}
                    className="p-1 bg-slate-800 text-white rounded-md hover:bg-slate-900 transition-colors shrink-0 cursor-pointer border-none flex items-center justify-center h-6 w-6"
                    title="Search"
                  >
                    <Search className="h-3 w-3" />
                  </button>
                </div>

                {/* Clear Search Indicator if searched */}
                {activeSearchedState && (
                  <div className={`flex items-center justify-between text-[10px] px-2 py-1 rounded-md font-semibold ${
                    theme === "dark" ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"
                  }`}>
                    <span>Result: "{activeSearchedState}"</span>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSearchedState("");
                        setStateSearchQuery("");
                      }}
                      className="text-slate-500 hover:text-slate-800 font-extrabold cursor-pointer border-none bg-transparent"
                    >
                      Clear
                    </button>
                  </div>
                )}

                {/* States List with Scrollbar */}
                <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                  {/* Primary Checkbox: All */}
                  <label className={`flex items-center space-x-2 px-2 py-1 rounded-lg cursor-pointer transition-colors text-left w-full select-none ${
                    theme === "dark" ? "hover:bg-slate-800" : "hover:bg-slate-50"
                  }`}>
                    <input
                      type="checkbox"
                      checked={selectedStates.length === ALL_STATES.length}
                      onChange={handleToggleAllStates}
                      className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer accent-indigo-600"
                    />
                    <span className={`text-xs font-bold ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>All States</span>
                  </label>

                  <div className={`border-t my-1 ${theme === "dark" ? "border-slate-800" : "border-slate-100"}`} />

                  {/* Individual States */}
                  {orderedStates.map((state) => (
                    <label
                      key={state}
                      className={`flex items-center space-x-2 px-2 py-1 rounded-lg cursor-pointer transition-colors text-left w-full select-none ${
                        activeSearchedState && state.toLowerCase().includes(activeSearchedState.toLowerCase())
                          ? theme === "dark"
                            ? "bg-amber-950/40 border border-amber-800"
                            : "bg-amber-50/70 border border-amber-150"
                          : theme === "dark"
                          ? "hover:bg-slate-800"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedStates.includes(state)}
                        onChange={() => handleToggleState(state)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer accent-indigo-600"
                      />
                      <span className={`text-xs font-semibold flex-1 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>{state}</span>
                      {activeSearchedState && state.toLowerCase().includes(activeSearchedState.toLowerCase()) && (
                        <span className="text-[8px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider scale-90">
                          Match
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>


        </div>

        {/* Tab Selector Segment Control (Map | List) */}
        <div className={`flex p-1 rounded-lg border self-stretch sm:self-auto shrink-0 shadow-inner transition-all duration-300 ${
          theme === "dark"
            ? "bg-[#131b2d] border-slate-800"
            : "bg-slate-100 border-slate-200"
        }`}>
          <button
            onClick={() => setActiveTab("map")}
            className={`flex-1 sm:flex-none px-4 py-1 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "map"
                ? theme === "dark"
                  ? "bg-[#1e293b] text-white border border-slate-700 shadow-sm"
                  : "bg-white text-slate-900 border border-slate-200 shadow-sm"
                : theme === "dark"
                  ? "text-slate-400 hover:text-slate-200"
                  : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Map
          </button>
          <button
            onClick={() => setActiveTab("list")}
            className={`flex-1 sm:flex-none px-4 py-1 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "list"
                ? theme === "dark"
                  ? "bg-[#1e293b] text-white border border-slate-700 shadow-sm"
                  : "bg-white text-slate-900 border border-slate-200 shadow-sm"
                : theme === "dark"
                  ? "text-slate-400 hover:text-slate-200"
                  : "text-slate-500 hover:text-slate-800"
            }`}
          >
            List ({listFeedItems.length})
          </button>
        </div>
      </div>

      {/* 3. MAP HUD OVERLAYS */}
      <div className="absolute top-2.5 right-2.5 z-30 flex items-center pointer-events-auto gap-2">
        <div className="bg-white/95 dark:bg-[#131b2d]/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800/80 p-1 rounded-2xl shadow-xl flex items-center space-x-1">
          <button
            onClick={() => setDisplayMode("analytical")}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center space-x-1.5 transition-all duration-200 cursor-pointer ${
              displayMode === "analytical"
                ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-md"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            <Layers className="h-3 w-3 shrink-0" />
            <span className="whitespace-nowrap">Analytical View</span>
          </button>
          <button
            onClick={() => setDisplayMode("reports")}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center space-x-1.5 transition-all duration-200 cursor-pointer ${
              displayMode === "reports"
                ? "bg-indigo-600 dark:bg-indigo-500 text-white shadow-md"
                : "text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-[#1e293b]/40"
            }`}
          >
            <Activity className="h-3 w-3 shrink-0" />
            <span className="whitespace-nowrap">Report Bubbles</span>
          </button>
        </div>
      </div>

      {/* 4. MAIN MAP / LIST WRAPPER STAGE */}
      <div className={`flex-1 w-full relative overflow-hidden ${isThemeTransitioning ? "z-[10000]" : ""}`}>
        
        {activeTab === "map" ? (
          <>
            {/* FLOATING ACTIVE STATE COUNTERS OVERLAY CARD (Pill style exactly as screenshot) */}
            <div className="absolute top-4 left-3 z-30 pointer-events-auto">
              <div className={`rounded-2xl border px-4 py-2 flex items-center space-x-4 shadow-lg transition-colors duration-500 ${
                theme === "dark"
                  ? "bg-[#131b2d]/95 border-slate-800/80 text-slate-100"
                  : "bg-white border-slate-200/80 text-slate-500"
              }`}>
                <div className="flex flex-col text-left">
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-lg font-black text-[#DC2626] dark:text-[#ff4b4b] tracking-tight">{activeCount}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>Active</span>
                  </div>
                </div>
                
                <div className={`h-8 w-[1px] transition-colors duration-500 ${theme === "dark" ? "bg-slate-800" : "bg-slate-200"}`} />

                <div className="flex flex-col text-left">
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-lg font-black text-[#F57C1F] dark:text-[#fbbf24] tracking-tight">{totalReportsCount}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>Reports</span>
                  </div>
                </div>
              </div>
            </div>

            {/* FLOATING SAFETY HEATMAP RISK LEGEND CARD */}
            {heatmapType !== "none" && (
              <div className="absolute top-4 right-3 z-30 pointer-events-auto flex flex-col items-end space-y-2 max-w-[280px]">
                <div className="bg-white/95 dark:bg-[#131b2d]/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800/80 p-3 rounded-2xl shadow-xl flex flex-col text-left w-full">
                  <div className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 border-b border-slate-100 dark:border-slate-800/80 pb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1">🛡️ Zone Threat Density</span>
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 uppercase tracking-widest font-black">
                      {heatmapType === "streetlight" ? "Lighting" : heatmapType === "womensafety" ? "Safety" : "Combined"}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-[#EF4444] border border-red-600 shadow-sm" />
                      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">🔴 High Risk (5+ Active Reports)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-[#F59E0B] border border-amber-600 shadow-sm" />
                      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">🟡 Moderate (2-4 Reports)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-[#3B82F6] border border-blue-600 shadow-sm" />
                      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">🔵 Minor Hazards (1 Report)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-[#10B981] border border-emerald-600 shadow-sm" />
                      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">🟢 Secured / Safe (0 Reports)</span>
                    </div>
                  </div>
                  <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80 text-[8px] text-slate-400 dark:text-slate-500 font-semibold leading-normal">
                    ℹ️ Click on sector polygons to inspect detailed reports.
                  </div>
                </div>
              </div>
            )}

            {/* RENDER VIEWPORT */}
            {viewMode === "real" && hasValidKey ? (
              <div className="w-full h-full relative">
                <APIProvider apiKey={API_KEY} version="weekly">
                  <Map
                    center={mapCenter}
                    zoom={mapZoom}
                    mapId="DEMO_MAP_ID"
                    onCameraChanged={(ev) => {
                      setMapZoom(ev.detail.zoom);
                      setMapCenter(ev.detail.center);
                    }}
                    style={{ width: "100%", height: "100%" }}
                    internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
                    gestureHandling="greedy"
                    disableDefaultUI={true}
                    styles={isMapDark ? DARK_MAP_STYLE : LIGHT_MAP_STYLE}
                    colorScheme={isMapDark ? "DARK" : "LIGHT"}
                  >
                    {/* Render standard ward boundaries if zoom <= 13 and in analytical mode */}
                    {displayMode === "analytical" && heatmapType === "none" && (
                      <GoogleMapsSectorsOutline preset={currentPreset} mapZoom={mapZoom} />
                    )}

                    {heatmapType !== "none" && (
                      <GoogleMapsSafetyHeatmap 
                        preset={currentPreset} 
                        heatmapType={heatmapType} 
                        issues={issues} 
                      />
                    )}

                    {/* Rendering the cluster nodes with dynamic contents */}
                    {currentClusters.map((cluster) => (
                      <AdvancedMarker 
                        key={cluster.id} 
                        position={{ lat: cluster.lat, lng: cluster.lng }}
                        onClick={() => setSelectedCluster(cluster)}
                      >
                        {getClusterBubbleContent(cluster, displayMode)}
                      </AdvancedMarker>
                    ))}

                    {/* Rendering user's current location as a glowing pulsing blue dot */}
                    {userCoords && (
                      <AdvancedMarker 
                        position={{ lat: userCoords.lat, lng: userCoords.lng }}
                        zIndex={999}
                      >
                        <div className="relative flex h-6 w-6 items-center justify-center pointer-events-none">
                          {/* Pulsing ring */}
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                          {/* Inner glow */}
                          <span className="absolute inline-flex rounded-full h-4 w-4 bg-blue-500 opacity-30"></span>
                          {/* Solid inner blue circle with white border */}
                          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-blue-600 border-2 border-white shadow-md"></span>
                        </div>
                      </AdvancedMarker>
                    )}




                  </Map>
                </APIProvider>
              </div>
            ) : (
              
              /* RENDER MODE 2: THE DETAILED VECTOR CANVASES (Styled light-peach cream exactly like screenshots) */
              <div 
                onMouseDown={handleVectorMouseDown}
                onMouseMove={handleVectorMouseMove}
                onMouseUp={handleVectorMouseUp}
                onMouseLeave={handleVectorMouseUp}
                onTouchStart={handleVectorTouchStart}
                onTouchMove={handleVectorTouchMove}
                onTouchEnd={handleVectorMouseUp}
                className={`w-full h-full flex items-center justify-center relative cursor-grab select-none transition-colors duration-500 ${
                  isMapDark ? "bg-[#0d1321]" : "bg-[#FAF2EB]"
                } ${isVectorDragging ? "cursor-grabbing" : ""}`}
              >
                {/* SVG Transform Container */}
                <div 
                  className="absolute w-[1000px] h-[1000px] pointer-events-none transition-all duration-75 origin-center select-none"
                  style={{
                    transform: `translate(${vectorPan.x}px, ${vectorPan.y}px) scale(${1 + (vectorZoomLevel - 3) * 0.2})`,
                  }}
                >
                  <svg className="w-full h-full select-none" viewBox="0 0 1000 1000">
                    <defs>
                      <pattern id="diagonal-stripe" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                        <line x1="0" y1="0" x2="0" y2="10" stroke="#fce7f3" strokeWidth="2" />
                      </pattern>
                    </defs>

                    {/* Background Soft Cream Base Grid / Dark Space Grid */}
                    <rect 
                      width="1000" 
                      height="1000" 
                      fill={isMapDark ? "#0d1321" : "#FCF6F0"} 
                      className="transition-colors duration-500"
                    />

                    {/* WATER BODIES (e.g. Halasuru Lake or coastal outlines) */}
                    <path 
                      d="M 500,450 Q 560,420 620,480 T 700,430 L 750,550 Q 640,600 520,550 Z" 
                      fill={isMapDark ? "#030712" : "#E2EDF5"} 
                      stroke={isMapDark ? "#111827" : "#C1D9EB"} 
                      strokeWidth="2" 
                      className="transition-colors duration-500"
                    />
                    <text 
                      x="590" 
                      y="510" 
                      fill={isMapDark ? "#475569" : "#71A0C2"} 
                      fontSize="10" 
                      fontWeight="bold" 
                      className="font-sans italic transition-colors duration-500"
                    >
                      Lake Sanctuary
                    </text>

                    {/* MULTIPLE SECTOR/WARD BOUNDARY OUTLINES (Only in analytical mode to prevent report clutter) */}
                    {displayMode === "analytical" && heatmapType === "none" && Object.entries(currentPreset.sectorsOutlines).map(([secKey, points]) => {
                      // Project coordinates to 1000x1000 box centered on (500,500)
                      const pointsStr = (points as { lat: number; lng: number }[]).map(p => {
                        const px = 500 + (p.lng - currentPreset.center.lng) * 4000;
                        const py = 500 - (p.lat - currentPreset.center.lat) * 4000;
                        return `${px},${py}`;
                      }).join(" ");

                      return (
                        <polygon 
                          key={secKey}
                          points={pointsStr}
                          fill="rgba(244, 63, 94, 0.03)"
                          stroke="#F43F5E"
                          strokeWidth="2"
                          strokeDasharray="4 4"
                          className="transition-all"
                        />
                      );
                    })}

                    {/* HEATMAP SECTOR/ZONE COLOR OVERLAYS FOR FALLBACK VECTOR MAP */}
                    {heatmapType !== "none" && Object.entries(currentPreset.sectorsOutlines).map(([secKey, points]) => {
                      const pointsStr = (points as { lat: number; lng: number }[]).map(p => {
                        const px = 500 + (p.lng - currentPreset.center.lng) * 4000;
                        const py = 500 - (p.lat - currentPreset.center.lat) * 4000;
                        return `${px},${py}`;
                      }).join(" ");

                      // Find issues belonging to this sector
                      const sectorIssues = issues.filter(issue => {
                        const lat = Number(issue.latitude);
                        const lng = Number(issue.longitude);
                        if (isNaN(lat) || isNaN(lng)) return false;
                        return isPointInPolygon(lat, lng, points as { lat: number; lng: number }[]);
                      });

                      // Filter issues based on heatmapType
                      let relevantIssues = [...sectorIssues];
                      if (heatmapType === "streetlight") {
                        relevantIssues = relevantIssues.filter(iss => {
                          const cat = (iss.category || "").toLowerCase();
                          return cat.includes("light") || cat.includes("electricity") || cat.includes("power") || cat.includes("streetlight");
                        });
                      } else if (heatmapType === "womensafety") {
                        relevantIssues = relevantIssues.filter(iss => isWomenUnsafe(iss));
                      } else if (heatmapType === "overall") {
                        relevantIssues = relevantIssues.filter(iss => {
                          const cat = (iss.category || "").toLowerCase();
                          const isLight = cat.includes("light") || cat.includes("electricity") || cat.includes("power") || cat.includes("streetlight");
                          return isLight || isWomenUnsafe(iss);
                        });
                      }

                      // Count unresolved issues
                      const unresolvedCount = relevantIssues.filter(iss => iss.status !== "RESOLVED").length;

                      // Determine color and opacity based on risk
                      let fillColor = "rgba(16, 185, 129, 0.25)"; // Green
                      let strokeColor = "#10B981";
                      let riskLabel = "Low Risk";

                      if (unresolvedCount >= 5) {
                        fillColor = "rgba(239, 68, 68, 0.45)"; // Red
                        strokeColor = "#EF4444";
                        riskLabel = "High Risk";
                      } else if (unresolvedCount >= 2) {
                        fillColor = "rgba(245, 158, 11, 0.35)"; // Orange/Yellow
                        strokeColor = "#F59E0B";
                        riskLabel = "Medium Risk";
                      } else if (unresolvedCount >= 1) {
                        fillColor = "rgba(59, 130, 246, 0.25)"; // Blue
                        strokeColor = "#3B82F6";
                        riskLabel = "Minor Hazards";
                      }

                      const sectorName = currentPreset.sectors[secKey]?.name || secKey;

                      return (
                        <g key={`vector-heatmap-${secKey}`} className="cursor-pointer">
                          <polygon 
                            points={pointsStr}
                            fill={fillColor}
                            stroke={strokeColor}
                            strokeWidth="2.5"
                            className="transition-all duration-300 hover:fill-opacity-60"
                            onClick={() => {
                              setSelectedCluster({
                                id: `heatmap-sec-${secKey}`,
                                label: `${unresolvedCount}`,
                                lat: points[0].lat,
                                lng: points[0].lng,
                                x: 500,
                                y: 500,
                                size: 50,
                                color: unresolvedCount >= 5 ? "red" : unresolvedCount >= 2 ? "orange" : "burgundy",
                                locality: sectorName,
                                recentIssue: `Zone safety risk: ${unresolvedCount} active reports.`,
                                issues: relevantIssues
                              });
                            }}
                          />
                          <title>{`${sectorName}: ${riskLabel} (${unresolvedCount} Active Reports)`}</title>
                        </g>
                      );
                    })}

                    {/* ROAD NETWORK LINES (White roads in light mode, deep gray in dark streetlight mode) */}
                    <g opacity="0.8">
                      {/* Main Highway 1 */}
                      <line 
                        x1="100" y1="350" x2="900" y2="350" 
                        stroke={isMapDark ? "#111827" : "#FAF2EB"} 
                        strokeWidth="16" strokeLinecap="round" 
                        className="transition-colors duration-500"
                      />
                      <line 
                        x1="100" y1="350" x2="900" y2="350" 
                        stroke={isMapDark ? "#1f2937" : "#FFFFFF"} 
                        strokeWidth="12" strokeLinecap="round" 
                        className="transition-colors duration-500"
                      />
                      
                      {/* Diagonal Ring Road */}
                      <line 
                        x1="200" y1="150" x2="800" y2="750" 
                        stroke={isMapDark ? "#111827" : "#FAF2EB"} 
                        strokeWidth="14" strokeLinecap="round" 
                        className="transition-colors duration-500"
                      />
                      <line 
                        x1="200" y1="150" x2="800" y2="750" 
                        stroke={isMapDark ? "#1f2937" : "#FFFFFF"} 
                        strokeWidth="10" strokeLinecap="round" 
                        className="transition-colors duration-500"
                      />

                      {/* Secondary Radial Roads */}
                      <line 
                        x1="480" y1="100" x2="480" y2="900" 
                        stroke={isMapDark ? "#111827" : "#FAF2EB"} 
                        strokeWidth="12" strokeLinecap="round" 
                        className="transition-colors duration-500"
                      />
                      <line 
                        x1="480" y1="100" x2="480" y2="900" 
                        stroke={isMapDark ? "#1f2937" : "#FFFFFF"} 
                        strokeWidth="8" strokeLinecap="round" 
                        className="transition-colors duration-500"
                      />

                      <line 
                        x1="100" y1="650" x2="900" y2="650" 
                        stroke={isMapDark ? "#111827" : "#FAF2EB"} 
                        strokeWidth="12" strokeLinecap="round" 
                        className="transition-colors duration-500"
                      />
                      <line 
                        x1="100" y1="650" x2="900" y2="650" 
                        stroke={isMapDark ? "#1f2937" : "#FFFFFF"} 
                        strokeWidth="8" strokeLinecap="round" 
                        className="transition-colors duration-500"
                      />
                    </g>

                    {/* CITY DISTRICT LABELS (Adaptive color based on dark mode) */}
                    <g 
                      fill={isMapDark ? "#64748b" : "#7C1A22"} 
                      fontWeight="bold" fontSize="11" letterSpacing="1.5"
                      className="transition-colors duration-500"
                    >
                      <text x="250" y="280" textAnchor="middle">SADASHIVANAGAR</text>
                      <text x="180" y="440" textAnchor="middle">MALLESHWARAM</text>
                      <text 
                        x="500" y="380" textAnchor="middle" fontSize="16" fontWeight="900" 
                        fill={isMapDark ? "#f59e0b" : "#801D26"}
                        className="transition-colors duration-500"
                      >
                        {currentPreset.name.toUpperCase()}
                      </text>
                      <text x="730" y="480" textAnchor="middle">SHIVAJINAGAR</text>
                      <text x="800" y="610" textAnchor="middle">INDIRANAGAR</text>
                      <text x="320" y="780" textAnchor="middle">JAYANAGAR</text>
                    </g>

                    {/* RENDER FALLBACK CLUSTERS ON THE VECTOR CANVAS WITH CUSTOM REACT BUBBLE ICONS */}
                    {currentClusters.map((cluster) => {
                      return (
                        <g 
                          key={cluster.id} 
                          className="cursor-pointer pointer-events-auto transform hover:scale-110 transition-all duration-200"
                          onClick={() => setSelectedCluster(cluster)}
                        >
                          <foreignObject
                            x={cluster.x - 40}
                            y={cluster.y - 40}
                            width="80"
                            height="80"
                            className="overflow-visible"
                          >
                            <div className="w-full h-full flex items-center justify-center">
                              {getClusterBubbleContent(cluster, displayMode)}
                            </div>
                          </foreignObject>
                        </g>
                      );
                    })}

                    {/* Rendering user's current location on vector canvas */}
                    {userCoords && (
                      (() => {
                        const userPx = 500 + (userCoords.lng - currentPreset.center.lng) * 4000;
                        const userPy = 500 - (userCoords.lat - currentPreset.center.lat) * 4000;
                        return (
                          <g className="pointer-events-none">
                            {/* Outer pulsing ring in SVG */}
                            <circle
                              cx={userPx}
                              cy={userPy}
                              r="15"
                              fill="#3b82f6"
                              fillOpacity="0.35"
                              className="animate-pulse"
                            />
                            {/* Middle glow */}
                            <circle
                              cx={userPx}
                              cy={userPy}
                              r="8"
                              fill="#2563eb"
                              fillOpacity="0.5"
                            />
                            {/* Inner white-bordered blue dot */}
                            <circle
                              cx={userPx}
                              cy={userPy}
                              r="4"
                              fill="#3b82f6"
                              stroke="#ffffff"
                              strokeWidth="1.5"
                            />
                          </g>
                        );
                      })()
                    )}




                  </svg>
                </div>

                {/* VECTOR ZOOM CONTROLLERS */}
                <div className="absolute bottom-28 right-3.5 z-30 flex flex-col space-y-1.5 pointer-events-auto">
                  <button
                    onClick={() => setVectorZoomLevel(prev => Math.min(prev + 1, 5))}
                    className="h-10 w-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer active:scale-95 transition-all"
                  >
                    <Plus className="h-4.5 w-4.5 font-bold" />
                  </button>
                  <button
                    onClick={() => setVectorZoomLevel(prev => Math.max(prev - 1, 1))}
                    className="h-10 w-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer active:scale-95 transition-all"
                  >
                    <Minus className="h-4.5 w-4.5 font-bold" />
                  </button>

                  {/* COLLAPSIBLE HEATMAP CONTROL */}
                  <div className="relative">
                    <button
                      onClick={() => setIsHeatmapMenuOpen(!isHeatmapMenuOpen)}
                      className={`h-10 w-10 border rounded-xl shadow-lg flex items-center justify-center cursor-pointer active:scale-95 transition-all duration-200 ${
                        isHeatmapMenuOpen || heatmapType !== "none"
                          ? "bg-[#801D26] border-[#801D26] text-white shadow-md shadow-rose-950/20"
                          : "bg-white dark:bg-[#131b2d] border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                      }`}
                      title="Toggle Safety Heatmap Layer"
                    >
                      {heatmapType === "none" ? (
                        <Layers className="h-4.5 w-4.5" />
                      ) : heatmapType === "streetlight" ? (
                        <Lightbulb className="h-4.5 w-4.5 text-amber-300 fill-amber-300/25" />
                      ) : heatmapType === "womensafety" ? (
                        <ShieldAlert className="h-4.5 w-4.5 text-rose-300" />
                      ) : (
                        <AlertTriangle className="h-4.5 w-4.5 text-indigo-300" />
                      )}
                    </button>

                    <AnimatePresence>
                      {isHeatmapMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, x: 20, scale: 0.95 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          exit={{ opacity: 0, x: 20, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-[52px] bottom-0 z-40 bg-white/95 dark:bg-[#131b2d]/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800/80 p-1.5 rounded-2xl shadow-2xl flex items-center space-x-1.5 min-w-[310px]"
                        >
                          <div className="flex items-center space-x-1 px-1.5 py-0.5 border-r border-slate-100 dark:border-slate-800/80 shrink-0">
                            <Sparkles className="h-3.5 w-3.5 text-rose-500 fill-rose-100 dark:fill-rose-950/30" />
                            <span className="text-[9px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Safety Layer</span>
                          </div>

                          <div className="flex items-center space-x-1 flex-1 justify-end">
                            <button
                              onClick={() => {
                                setHeatmapType("none");
                                setIsHeatmapMenuOpen(false);
                              }}
                              className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider flex items-center space-x-0.5 transition-all cursor-pointer border ${
                                heatmapType === "none"
                                  ? theme === "dark"
                                    ? "bg-slate-100 text-slate-900 shadow-sm border-transparent"
                                    : "bg-slate-950 text-white shadow-sm border-transparent"
                                  : theme === "dark"
                                    ? "text-slate-300 hover:text-white hover:bg-slate-800/80 border-transparent"
                                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-transparent"
                              }`}
                            >
                              <span>Off</span>
                            </button>

                            <button
                              onClick={() => {
                                setHeatmapType("streetlight");
                                setIsHeatmapMenuOpen(false);
                              }}
                              className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider flex items-center space-x-1 transition-all cursor-pointer border ${
                                heatmapType === "streetlight"
                                  ? "bg-amber-500 text-white shadow-sm border-transparent"
                                  : theme === "dark"
                                    ? "text-slate-300 hover:text-amber-400 hover:bg-amber-950/40 border-transparent"
                                    : "text-slate-600 hover:text-amber-600 hover:bg-amber-50/50 border-transparent"
                              }`}
                            >
                              <Lightbulb className="h-2.5 w-2.5" />
                              <span>Lighting</span>
                            </button>

                            <button
                              onClick={() => {
                                setHeatmapType("womensafety");
                                setIsHeatmapMenuOpen(false);
                              }}
                              className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider flex items-center space-x-1 transition-all cursor-pointer border ${
                                heatmapType === "womensafety"
                                  ? "bg-[#DC2626] text-white shadow-sm border-transparent"
                                  : theme === "dark"
                                    ? "text-slate-300 hover:text-[#DC2626] hover:bg-rose-950/40 border-transparent"
                                    : "text-slate-600 hover:text-[#DC2626] hover:bg-rose-50/50 border-transparent"
                              }`}
                            >
                              <ShieldAlert className="h-2.5 w-2.5" />
                              <span>Safety</span>
                            </button>

                            <button
                              onClick={() => {
                                setHeatmapType("overall");
                                setIsHeatmapMenuOpen(false);
                              }}
                              className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider flex items-center space-x-1 transition-all cursor-pointer border ${
                                heatmapType === "overall"
                                  ? "bg-indigo-600 text-white shadow-sm border-transparent"
                                  : theme === "dark"
                                    ? "text-slate-300 hover:text-indigo-400 hover:bg-indigo-950/40 border-transparent"
                                    : "text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 border-transparent"
                              }`}
                            >
                              <AlertTriangle className="h-2.5 w-2.5" />
                              <span>Combined</span>
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* LOCATE CURRENT POSITION HUD (COMPASS ICON) */}
                <div className="absolute bottom-40 right-3.5 z-30 pointer-events-auto">
                  <button
                    onClick={handleLocateMe}
                    disabled={isLocationLoading}
                    className={`h-10 w-10 border rounded-xl shadow-lg flex items-center justify-center cursor-pointer active:scale-95 transition-all transition-colors duration-500 disabled:opacity-60 ${
                      theme === "dark"
                        ? "bg-slate-900 border-slate-800 text-slate-300 hover:text-white"
                        : "bg-white border-slate-200 text-slate-700 hover:text-indigo-600"
                    }`}
                    title="Recalibrate GPS & Center Map"
                  >
                    <Compass className={`h-4.5 w-4.5 ${isLocationLoading ? 'animate-spin text-indigo-600 dark:text-indigo-400' : ''}`} />
                  </button>
                </div>

              </div>
            )}

            {/* REAL MAP COMPASS & ZOOM CONTROLS (IF GOOGLE MAPS ACTIVE) */}
            {viewMode === "real" && hasValidKey && (
              <>
                <div className="absolute bottom-28 right-3.5 z-30 flex flex-col space-y-1.5 pointer-events-auto">
                  <button
                    onClick={() => setMapZoom(prev => Math.min(prev + 1, 18))}
                    className="h-10 w-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer active:scale-95 transition-all"
                  >
                    <Plus className="h-4.5 w-4.5" />
                  </button>
                  <button
                    onClick={() => setMapZoom(prev => Math.max(prev - 1, 5))}
                    className="h-10 w-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer active:scale-95 transition-all"
                  >
                    <Minus className="h-4.5 w-4.5" />
                  </button>

                  {/* COLLAPSIBLE HEATMAP CONTROL */}
                  <div className="relative">
                    <button
                      onClick={() => setIsHeatmapMenuOpen(!isHeatmapMenuOpen)}
                      className={`h-10 w-10 border rounded-xl shadow-lg flex items-center justify-center cursor-pointer active:scale-95 transition-all duration-200 ${
                        isHeatmapMenuOpen || heatmapType !== "none"
                          ? "bg-[#801D26] border-[#801D26] text-white shadow-md shadow-rose-950/20"
                          : "bg-white dark:bg-[#131b2d] border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                      }`}
                      title="Toggle Safety Heatmap Layer"
                    >
                      {heatmapType === "none" ? (
                        <Layers className="h-4.5 w-4.5" />
                      ) : heatmapType === "streetlight" ? (
                        <Lightbulb className="h-4.5 w-4.5 text-amber-300 fill-amber-300/25 animate-pulse" />
                      ) : heatmapType === "womensafety" ? (
                        <ShieldAlert className="h-4.5 w-4.5 text-rose-300" />
                      ) : (
                        <AlertTriangle className="h-4.5 w-4.5 text-indigo-300" />
                      )}
                    </button>

                    <AnimatePresence>
                      {isHeatmapMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, x: 20, scale: 0.95 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          exit={{ opacity: 0, x: 20, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-[52px] bottom-0 z-40 bg-white/95 dark:bg-[#131b2d]/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800/80 p-1.5 rounded-2xl shadow-2xl flex items-center space-x-1.5 min-w-[310px]"
                        >
                          <div className="flex items-center space-x-1 px-1.5 py-0.5 border-r border-slate-100 dark:border-slate-800/80 shrink-0">
                            <Sparkles className="h-3.5 w-3.5 text-rose-500 fill-rose-100 dark:fill-rose-950/30" />
                            <span className="text-[9px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Safety Layer</span>
                          </div>

                          <div className="flex items-center space-x-1 flex-1 justify-end">
                            <button
                              onClick={() => {
                                setHeatmapType("none");
                                setIsHeatmapMenuOpen(false);
                              }}
                              className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider flex items-center space-x-0.5 transition-all cursor-pointer border ${
                                heatmapType === "none"
                                  ? theme === "dark"
                                    ? "bg-slate-100 text-slate-900 shadow-sm border-transparent"
                                    : "bg-slate-950 text-white shadow-sm border-transparent"
                                  : theme === "dark"
                                    ? "text-slate-300 hover:text-white hover:bg-slate-800/80 border-transparent"
                                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-transparent"
                              }`}
                            >
                              <span>Off</span>
                            </button>

                            <button
                              onClick={() => {
                                setHeatmapType("streetlight");
                                setIsHeatmapMenuOpen(false);
                              }}
                              className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider flex items-center space-x-1 transition-all cursor-pointer border ${
                                heatmapType === "streetlight"
                                  ? "bg-amber-500 text-white shadow-sm border-transparent"
                                  : theme === "dark"
                                    ? "text-slate-300 hover:text-amber-400 hover:bg-amber-950/40 border-transparent"
                                    : "text-slate-600 hover:text-amber-600 hover:bg-amber-50/50 border-transparent"
                              }`}
                            >
                              <Lightbulb className="h-2.5 w-2.5" />
                              <span>Lighting</span>
                            </button>

                            <button
                              onClick={() => {
                                setHeatmapType("womensafety");
                                setIsHeatmapMenuOpen(false);
                              }}
                              className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider flex items-center space-x-1 transition-all cursor-pointer border ${
                                heatmapType === "womensafety"
                                  ? "bg-[#DC2626] text-white shadow-sm border-transparent"
                                  : theme === "dark"
                                    ? "text-slate-300 hover:text-[#DC2626] hover:bg-rose-950/40 border-transparent"
                                    : "text-slate-600 hover:text-[#DC2626] hover:bg-rose-50/50 border-transparent"
                              }`}
                            >
                              <ShieldAlert className="h-2.5 w-2.5" />
                              <span>Safety</span>
                            </button>

                            <button
                              onClick={() => {
                                setHeatmapType("overall");
                                setIsHeatmapMenuOpen(false);
                              }}
                              className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider flex items-center space-x-1 transition-all cursor-pointer border ${
                                heatmapType === "overall"
                                  ? "bg-indigo-600 text-white shadow-sm border-transparent"
                                  : theme === "dark"
                                    ? "text-slate-300 hover:text-indigo-400 hover:bg-indigo-950/40 border-transparent"
                                    : "text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 border-transparent"
                              }`}
                            >
                              <AlertTriangle className="h-2.5 w-2.5" />
                              <span>Combined</span>
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="absolute bottom-40 right-3.5 z-30 pointer-events-auto">
                  <button
                    onClick={handleLocateMe}
                    disabled={isLocationLoading}
                    className={`h-10 w-10 border rounded-xl shadow-lg flex items-center justify-center cursor-pointer active:scale-95 transition-all transition-colors duration-500 disabled:opacity-60 ${
                      theme === "dark"
                        ? "bg-slate-900 border-slate-800 text-slate-300 hover:text-white"
                        : "bg-white border-slate-200 text-slate-700 hover:text-indigo-600"
                    }`}
                    title="Recalibrate GPS & Center Map"
                  >
                    <Compass className={`h-4.5 w-4.5 ${isLocationLoading ? 'animate-spin text-indigo-600 dark:text-indigo-400' : ''}`} />
                  </button>
                </div>
              </>
            )}

            {/* HYPERLOCAL DRAWER Popover on cluster Click */}
            <AnimatePresence>
              {selectedCluster && activeIssue && (
                <motion.div
                  initial={{ opacity: 0, y: 150 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 150 }}
                  className="fixed inset-x-0 bottom-0 top-16 md:absolute md:top-4 md:left-4 md:bottom-4 md:right-auto md:w-[460px] md:h-auto z-40 bg-white md:rounded-2xl border border-slate-200 shadow-2xl flex flex-col pointer-events-auto overflow-hidden text-slate-800"
                >
                  {/* Mobile Grab Handle */}
                  <div className="flex justify-center py-2 md:hidden shrink-0 bg-slate-50 border-b border-slate-100">
                    <div className="w-12 h-1 bg-slate-300 rounded-full" />
                  </div>

                  {/* Drawer Header (Fixed) */}
                  <div className="flex justify-between items-start p-4 bg-slate-50 border-b border-slate-100 shrink-0 text-left">
                    <div className="flex-1 text-left">
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center flex-wrap gap-1.5 text-left">
                        <MapPin className="h-4 w-4 text-rose-500 shrink-0" />
                        <span>{selectedCluster.locality}</span>
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-wider text-left">
                        Civic Hotspot • {(selectedCluster.issues || []).length} {(selectedCluster.issues || []).length === 1 ? "Report" : "Merged Reports"} in area
                      </p>
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedCluster(null);
                        setIsResolving(false);
                      }}
                      className="p-1.5 hover:bg-slate-200 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-full transition-colors shrink-0 ml-2 cursor-pointer bg-transparent border-none flex items-center justify-center"
                    >
                      <X className="h-4 w-4" style={{ color: "#334155" }} />
                    </button>
                  </div>

                  {/* Body - Fully Scrollable */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin text-left">
                    {/* Horizontal Scrollable Thumbnails for Multiple Issues in Cluster */}
                    {(selectedCluster.issues || []).length > 1 && (
                      <div className="bg-slate-50 border border-slate-200/60 p-2.5 rounded-xl space-y-2 text-left">
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider text-left">
                          Merged Reports in Hotspot ({(selectedCluster.issues || []).length}):
                        </div>
                        <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-thin">
                          {(selectedCluster.issues || []).map((iss) => (
                            <button
                              key={iss.id}
                              onClick={() => setActiveIssueId(iss.id)}
                              className={`flex items-center space-x-2 p-1.5 rounded-lg border text-left cursor-pointer shrink-0 transition-all ${
                                activeIssueId === iss.id
                                  ? "bg-white border-indigo-300 ring-2 ring-indigo-500/10 shadow-sm"
                                  : "bg-transparent border-slate-200/80 hover:bg-slate-100"
                              }`}
                            >
                              <div className="h-8 w-8 rounded-md overflow-hidden shrink-0 bg-slate-200">
                                {iss.imageUrl ? (
                                  <img 
                                    src={iss.imageUrl} 
                                    alt={iss.title} 
                                    className="h-full w-full object-cover" 
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="h-full w-full bg-slate-100 flex items-center justify-center text-slate-400 text-[8px] font-black">
                                    N/A
                                  </div>
                                )}
                              </div>
                              <div className="max-w-[120px] pr-1 text-left">
                                <div className="text-[9px] font-bold text-slate-800 truncate leading-tight text-left">
                                  {iss.title}
                                </div>
                                <div className="text-[8px] text-slate-400 font-semibold truncate uppercase mt-0.5 text-left">
                                  Sev {iss.severity} • {iss.category}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Active Issue Card */}
                    <div className="bg-white border border-slate-150 rounded-xl overflow-hidden shadow-sm text-left">
                      {/* Image Preview Section */}
                      <div className="relative h-44 bg-slate-100 border-b border-slate-100 flex items-center justify-center">
                        {activeIssue.imageUrl ? (
                          <img 
                            src={activeIssue.imageUrl} 
                            alt={activeIssue.title} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center p-4 text-center space-y-1 text-slate-400 w-full h-full bg-slate-50">
                            <AlertCircle className="h-8 w-8 text-slate-300" />
                            <span className="text-xs font-bold">No Image Provided</span>
                          </div>
                        )}
                        
                        {/* Floating status pill */}
                        <span className={`absolute top-2 left-2 text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-sm text-white ${
                          activeIssue.status === "RESOLVED"
                            ? "bg-emerald-600"
                            : activeIssue.status === "IN_PROGRESS"
                            ? "bg-sky-600"
                            : "bg-rose-600 animate-pulse"
                        }`}>
                          {activeIssue.status}
                        </span>
                      </div>

                      {/* Info Metadata */}
                      <div className="p-3.5 space-y-3 text-left">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="bg-slate-100 text-slate-700 text-[8px] font-extrabold uppercase px-2 py-0.5 rounded tracking-wide border border-slate-200">
                            {activeIssue.category}
                          </span>
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                            activeIssue.severity >= 4
                              ? "bg-rose-50 text-rose-700 border border-rose-100"
                              : activeIssue.severity === 3
                              ? "bg-amber-50 text-amber-700 border border-amber-100"
                              : "bg-slate-50 text-slate-700 border border-slate-100"
                          }`}>
                            Severity: {activeIssue.severity}/5
                          </span>
                        </div>

                        <div className="text-left">
                          <h5 className="text-sm font-extrabold text-slate-900 leading-snug text-left">
                            {activeIssue.title}
                          </h5>
                          <p className="text-xs text-slate-600 font-medium leading-relaxed mt-1.5 text-left">
                            {activeIssue.description}
                          </p>
                        </div>

                        {/* Extra tracking meta */}
                        <div className="bg-slate-50/50 p-2.5 rounded-lg border border-slate-100 space-y-1 text-[10px] text-left">
                          <div className="flex justify-between">
                            <span className="text-slate-400 font-bold uppercase tracking-wide">Tracking ID</span>
                            <span className="font-mono font-bold text-indigo-600">{activeIssue.trackingId}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400 font-bold uppercase tracking-wide">Division</span>
                            <span className="font-semibold text-slate-700 truncate max-w-[180px]">{activeIssue.department}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400 font-bold uppercase tracking-wide">Ward</span>
                            <span className="font-semibold text-slate-700">{activeIssue.ward}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                          <span>
                            By: <b className="text-slate-600 font-bold">{activeIssue.isAnonymous ? "Anonymous Citizen" : (activeIssue.reporterName || "Concerned Citizen")}</b>
                          </span>
                          <span className="font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                            ▲ {activeIssue.upvotes || 0} Upvotes
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions Panel */}
                    <div className="space-y-2 text-left pt-1 border-t border-slate-100">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        Issue Actions
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {/* Option 1: Upvote / Agree */}
                        <button
                          onClick={() => handleLocalVote(activeIssue.id)}
                          className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-bold cursor-pointer transition-colors"
                        >
                          <ThumbsUp className="h-3.5 w-3.5" />
                          <span>Upvote ({activeIssue.upvotes || 0})</span>
                        </button>

                        {/* Option 2: Fix & Verify */}
                        <button
                          onClick={() => {
                            if (activeIssue.status === "RESOLVED") {
                              alert("This issue is already resolved!");
                              return;
                            }
                            setIsResolving(!isResolving);
                          }}
                          className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${
                            isResolving
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700"
                              : "bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700"
                          }`}
                        >
                          <CheckSquare className="h-3.5 w-3.5" />
                          <span>{isResolving ? "Close Panel" : "Fix & Verify"}</span>
                        </button>
                      </div>

                      {/* Option 3: Discussion & Update - Full-width Slate layout */}
                      <button
                        onClick={() => {
                          setTimeout(() => {
                            const inputEl = document.getElementById("maps-comment-input");
                            if (inputEl) {
                              inputEl.scrollIntoView({ behavior: "smooth", block: "center" });
                              inputEl.focus();
                            }
                          }, 100);
                        }}
                        className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-colors"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>Discuss & Update ({(activeIssue.corroborations || []).length})</span>
                      </button>
                    </div>

                    {/* Option 1: Fix & Verify (Resolve Form Overlay/Box) */}
                    {isResolving && (
                      <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-3 shadow-inner text-left">
                        <div className="flex items-start space-x-2 text-left">
                          <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div className="text-left">
                            <span className="text-[10px] font-black text-emerald-900 uppercase block tracking-wider text-left">Resolve Issue</span>
                            <p className="text-[9px] text-emerald-700 font-semibold leading-normal mt-0.5 text-left">
                              Verify that the issue is resolved by uploading or capturing a photo of the location.
                            </p>
                          </div>
                        </div>

                        {resolutionError && (
                          <div className="p-2 bg-rose-50 border border-rose-150 text-rose-600 text-[10px] font-semibold rounded">
                            {resolutionError}
                          </div>
                        )}

                        {resolutionSuccessMsg && (
                          <div className="p-2 bg-emerald-100 border border-emerald-200 text-emerald-800 text-[10px] font-bold rounded">
                            {resolutionSuccessMsg}
                          </div>
                        )}

                        <div className="space-y-1">
                          {resolutionPhoto ? (
                            <div className="relative rounded-lg overflow-hidden h-36 border border-slate-200 shadow-sm bg-white">
                              <img src={resolutionPhoto} className="w-full h-full object-cover" />
                              <button 
                                onClick={() => setResolutionPhoto(null)}
                                className="absolute top-2 right-2 p-1 bg-slate-900/85 hover:bg-slate-900 text-white rounded-full cursor-pointer border-none flex items-center justify-center"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="border-2 border-dashed border-slate-200 rounded-lg p-5 flex flex-col items-center justify-center bg-white shadow-xs text-center">
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
                              <span className="text-[8px] text-slate-400 font-medium font-mono mt-2">Upload or capture photo showing the resolved site</span>
                            </div>
                          )}
                        </div>

                        {resolutionPhoto && (
                          <div className="space-y-1 text-left">
                            <label className="text-[9px] font-black text-slate-400 uppercase block text-left">Describe Action Taken</label>
                            <textarea
                              placeholder="Describe what was done to fix it clearly..."
                              value={resolutionDesc}
                              onChange={(e) => setResolutionDesc(e.target.value)}
                              rows={2}
                              className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                        )}

                        <div className="flex items-center space-x-1 text-[9px] text-slate-400 font-mono text-left">
                          <MapPin className="h-3.5 w-3.5 text-indigo-500" />
                          <span>Auto-records GPS & timestamp</span>
                        </div>

                        <div className="flex space-x-1.5 pt-1">
                          <button
                            onClick={() => handleLocalResolve(activeIssue.id)}
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

                    {/* Discussion & Updates Board (Threaded, Upvotable comments) */}
                    <div className="border-t border-slate-100 pt-4 space-y-3.5 text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider text-left">
                          Citizen Discussion Thread ({(activeIssue.corroborations || []).length})
                        </span>
                      </div>

                      {/* Comment list */}
                      <div className="space-y-4">
                        {(() => {
                          const comments = activeIssue.corroborations || [];
                          const topLevel = comments.filter(c => !c.parentId);

                          if (topLevel.length === 0) {
                            return (
                              <p className="text-[10px] text-slate-400 italic font-medium py-2 bg-slate-50 border border-dashed border-slate-200/80 rounded-lg text-center">
                                No comments or corroborations yet. Be the first to start the discussion!
                              </p>
                            );
                          }

                          return topLevel.map(comment => {
                            const replies = comments.filter(r => r.parentId === comment.id);
                            
                            return (
                              <div key={comment.id} className="space-y-2 text-xs text-left bg-slate-50/55 p-3 rounded-xl border border-slate-200/50">
                                {/* Top-level comment */}
                                <div className="flex items-start space-x-2.5 text-left">
                                  {/* Avatar or custom letters */}
                                  {comment.avatar ? (
                                    <img src={comment.avatar} className="h-7 w-7 rounded-full object-cover shrink-0" />
                                  ) : (
                                    <div className="h-7 w-7 rounded-full bg-slate-200 text-slate-600 font-extrabold flex items-center justify-center uppercase shrink-0 text-[10px]">
                                      {comment.author.substring(0, 2)}
                                    </div>
                                  )}

                                  <div className="flex-1 space-y-0.5 text-left">
                                    <div className="flex items-baseline justify-between">
                                      <span className="font-extrabold text-slate-800 text-[11px]">{comment.author}</span>
                                      <span className="text-[9px] text-slate-400 font-mono font-medium">
                                        {new Date(comment.timestamp).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <p className="text-slate-600 text-xs leading-normal font-medium text-left">
                                      {comment.text}
                                    </p>

                                    {/* Action row (Upvote & Reply) */}
                                    <div className="flex items-center space-x-4 pt-1.5 text-[10px] text-left">
                                      <button
                                        onClick={() => handleLocalVoteComment(activeIssue.id, comment.id)}
                                        className="text-slate-400 hover:text-blue-600 flex items-center space-x-1 cursor-pointer bg-transparent border-none font-bold"
                                      >
                                        <ThumbsUp className="h-3 w-3" />
                                        <span>{comment.upvotes || 0} Upvotes</span>
                                      </button>
                                      
                                      <button
                                        onClick={() => {
                                          if (replyingToCommentId === comment.id) {
                                            setReplyingToCommentId(null);
                                          } else {
                                            setReplyingToCommentId(comment.id);
                                            setReplyText("");
                                          }
                                        }}
                                        className="text-slate-400 hover:text-indigo-600 flex items-center space-x-1 cursor-pointer bg-transparent border-none font-bold"
                                      >
                                        <MessageSquare className="h-3 w-3" />
                                        <span>Reply</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {/* Inline reply input box */}
                                {replyingToCommentId === comment.id && (
                                  <div className="pl-9 pt-2 flex items-center space-x-1.5 text-left">
                                    <input 
                                      type="text"
                                      placeholder={`Reply to ${comment.author}...`}
                                      value={replyText}
                                      onChange={(e) => setReplyText(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          handleLocalAddComment(activeIssue.id, comment.id, replyText);
                                        }
                                      }}
                                      className="flex-1 bg-white border border-slate-200 text-xs text-slate-700 px-3 py-1.5 rounded-lg focus:outline-none focus:border-indigo-400 font-medium"
                                    />
                                    <button
                                      onClick={() => handleLocalAddComment(activeIssue.id, comment.id, replyText)}
                                      disabled={submittingComment || !replyText.trim()}
                                      className="p-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg cursor-pointer border-none flex items-center justify-center"
                                    >
                                      <Send className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => setReplyingToCommentId(null)}
                                      className="px-2 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg text-[9px] font-bold uppercase cursor-pointer border-none"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                )}

                                {/* Threaded Nested Replies */}
                                {replies.length > 0 && (
                                  <div className="pl-7 ml-3.5 border-l-2 border-slate-150 space-y-2.5 pt-1.5 text-left">
                                    {replies.map(reply => (
                                      <div key={reply.id} className="flex items-start space-x-2 text-xs text-left">
                                        {reply.avatar ? (
                                          <img src={reply.avatar} className="h-5.5 w-5.5 rounded-full object-cover shrink-0" />
                                        ) : (
                                          <div className="h-5.5 w-5.5 rounded-full bg-slate-200 text-slate-600 font-extrabold flex items-center justify-center uppercase shrink-0 text-[8px]">
                                            {reply.author.substring(0, 2)}
                                          </div>
                                        )}

                                        <div className="flex-1 space-y-0.5 text-left">
                                          <div className="flex items-baseline justify-between">
                                            <span className="font-extrabold text-slate-800 text-[10.5px]">{reply.author}</span>
                                            <span className="text-[8px] text-slate-400 font-mono font-medium">
                                              {new Date(reply.timestamp).toLocaleDateString()}
                                            </span>
                                          </div>
                                          <p className="text-slate-600 text-xs leading-normal font-medium text-left">
                                            {reply.text}
                                          </p>

                                          <div className="flex items-center space-x-3 pt-1 text-[9px] text-left">
                                            <button
                                              onClick={() => handleLocalVoteComment(activeIssue.id, reply.id)}
                                              className="text-slate-400 hover:text-blue-600 flex items-center space-x-1 cursor-pointer bg-transparent border-none font-bold"
                                            >
                                              <ThumbsUp className="h-2.5 w-2.5" />
                                              <span>{reply.upvotes || 0} Upvotes</span>
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          });
                        })()}
                      </div>

                      {/* Main Bottom Comment Input field (Focus anchor) */}
                      <div className="pt-2 text-left">
                        <div className="flex items-start space-x-2.5 text-left">
                          <textarea
                            id="maps-comment-input"
                            rows={2}
                            placeholder="Add your public complaint comment or updates here..."
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            className="flex-1 bg-white border border-slate-250 text-xs text-slate-700 p-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium placeholder:text-slate-400"
                          />
                          <button
                            onClick={() => handleLocalAddComment(activeIssue.id)}
                            disabled={submittingComment || !commentText.trim()}
                            className="h-9 w-9 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl cursor-pointer border-none flex items-center justify-center shadow-md shrink-0 transition-all active:scale-95"
                            title="Post comment"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 3.5 FLOATING CATEGORY SELECTOR ON BOTTOM LEFT OF MAP */}
            {!selectedCluster && (
              <div className={`absolute bottom-4 left-3.5 z-30 pointer-events-auto flex items-center space-x-1 backdrop-blur-md border p-1 rounded-2xl shadow-lg max-w-[calc(100%-80px)] overflow-x-auto scrollbar-none transition-colors duration-500 ${
                theme === "dark"
                  ? "bg-[#131b2d]/95 border-slate-800/80"
                  : "bg-white/95 border-slate-200/80"
              }`}>
                <button
                  onClick={() => setCategoryFilter("all")}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center space-x-1.5 transition-all duration-150 cursor-pointer ${
                    categoryFilter === "all"
                      ? theme === "dark"
                        ? "bg-slate-100 text-slate-950 shadow-sm"
                        : "bg-slate-900 text-white shadow-sm"
                      : theme === "dark"
                        ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Layers className="h-3.5 w-3.5 shrink-0" />
                  <span className="whitespace-nowrap">All</span>
                </button>
                <button
                  onClick={() => setCategoryFilter("garbage")}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center space-x-1.5 transition-all duration-150 cursor-pointer ${
                    categoryFilter === "garbage"
                      ? "bg-[#D97706] text-white shadow-sm"
                      : theme === "dark"
                        ? "text-slate-400 hover:text-[#fbbf24] hover:bg-amber-950/30"
                        : "text-slate-600 hover:text-[#D97706] hover:bg-amber-50/50"
                  }`}
                >
                  <Trash2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="whitespace-nowrap">Garbage</span>
                </button>
                <button
                  onClick={() => setCategoryFilter("streetlight")}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center space-x-1.5 transition-all duration-150 cursor-pointer ${
                    categoryFilter === "streetlight"
                      ? "bg-[#2563EB] text-white shadow-sm"
                      : theme === "dark"
                        ? "text-slate-400 hover:text-[#60a5fa] hover:bg-blue-950/30"
                        : "text-slate-600 hover:text-[#2563EB] hover:bg-blue-50/50"
                  }`}
                >
                  <Lightbulb className="h-3.5 w-3.5 shrink-0" />
                  <span className="whitespace-nowrap">Street Light</span>
                </button>
                <button
                  onClick={() => setCategoryFilter("water")}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center space-x-1.5 transition-all duration-150 cursor-pointer ${
                    categoryFilter === "water"
                      ? "bg-[#0891B2] text-white shadow-sm"
                      : theme === "dark"
                        ? "text-slate-400 hover:text-[#22d3ee] hover:bg-cyan-950/30"
                        : "text-slate-600 hover:text-[#0891B2] hover:bg-cyan-50/50"
                  }`}
                >
                  <Droplet className="h-3.5 w-3.5 shrink-0" />
                  <span className="whitespace-nowrap">Water Supply</span>
                </button>
                <button
                  onClick={() => setCategoryFilter("assets")}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center space-x-1.5 transition-all duration-150 cursor-pointer ${
                    categoryFilter === "assets"
                      ? "bg-[#DC2626] text-white shadow-sm"
                      : theme === "dark"
                        ? "text-slate-400 hover:text-[#f87171] hover:bg-rose-950/30"
                        : "text-slate-600 hover:text-[#DC2626] hover:bg-rose-50/50"
                  }`}
                >
                  <Wrench className="h-3.5 w-3.5 shrink-0" />
                  <span className="whitespace-nowrap">Assets</span>
                </button>
              </div>
            )}

          </>
        ) : (
          
          /* RENDER LIST VIEW: GORGEOUS FEED OF ISSUES IN THE CITY (Matches List mode toggle) */
          <div className={`w-full h-full overflow-y-auto px-4 py-4 space-y-3 flex flex-col text-left transition-colors duration-500 ${
            theme === "dark" ? "bg-[#0b0f19]" : "bg-white"
          }`}>
            <div className={`flex items-center justify-between border-b pb-2 ${
              theme === "dark" ? "border-slate-800/80" : "border-slate-100"
            }`}>
              <h3 className={`text-xs font-black uppercase tracking-wider ${
                theme === "dark" ? "text-slate-100" : "text-slate-900"
              }`}>Active Civic Grievances ({listFeedItems.length})</h3>
              <p className="text-[10px] text-slate-400 font-semibold">{currentPreset.name}, {currentPreset.state}</p>
            </div>

            {listFeedItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-2">
                <Filter className="h-10 w-10 text-slate-300 dark:text-slate-700" />
                <p className="text-xs font-bold">No active reports match the selected filters.</p>
                <button 
                  onClick={() => { setSeverityFilter("all"); setStatusFilter("all"); setCategoryFilter("all"); }}
                  className="text-xs font-extrabold text-indigo-500 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="space-y-3 flex-1">
                {listFeedItems.map((item, index) => {
                  const getSeverityBadgeClasses = (severity: number, isDark: boolean) => {
                    const lightColors = [
                      "text-blue-500 bg-blue-50", 
                      "text-blue-600 bg-blue-50", 
                      "text-emerald-600 bg-emerald-50", 
                      "text-amber-600 bg-amber-50", 
                      "text-orange-600 bg-orange-50", 
                      "text-rose-600 bg-rose-50"
                    ];
                    const darkColors = [
                      "text-blue-400 bg-blue-950/40 border border-blue-900/50", 
                      "text-blue-400 bg-blue-950/40 border border-blue-900/50", 
                      "text-emerald-400 bg-emerald-950/40 border border-emerald-900/50", 
                      "text-amber-400 bg-amber-950/40 border border-amber-900/50", 
                      "text-orange-400 bg-orange-950/40 border border-orange-900/50", 
                      "text-rose-400 bg-rose-950/40 border border-rose-900/50"
                    ];
                    return isDark ? darkColors[severity] || "bg-slate-900 text-slate-400" : lightColors[severity] || "bg-slate-50 text-slate-600";
                  };

                  const getStatusBadgeClasses = (status: string, isDark: boolean) => {
                    if (isDark) {
                      if (status === "RESOLVED") return "bg-emerald-950/40 text-emerald-400 border border-emerald-900/50";
                      if (status === "IN_PROGRESS") return "bg-sky-950/40 text-sky-400 border border-sky-900/50";
                      return "bg-amber-950/40 text-amber-400 border border-amber-900/50";
                    } else {
                      if (status === "RESOLVED") return "bg-emerald-50 text-emerald-600";
                      if (status === "IN_PROGRESS") return "bg-sky-50 text-sky-600";
                      return "bg-amber-50 text-amber-600";
                    }
                  };

                  const isDark = theme === "dark";

                  return (
                    <div 
                      key={item.id}
                      onClick={() => {
                        if (onSelectIssue) onSelectIssue(item);
                      }}
                      className={`border rounded-xl p-3.5 shadow-sm transition-all flex flex-col space-y-2 cursor-pointer duration-300 ${
                        isDark 
                          ? "border-slate-800/80 bg-[#131b2d]/80 hover:border-slate-700 hover:bg-[#131b2d] text-slate-200 hover:shadow-lg hover:shadow-black/10" 
                          : "border-slate-150 bg-white hover:border-indigo-300 hover:shadow-md text-slate-800"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className={`text-xs font-extrabold leading-snug ${isDark ? "text-slate-100" : "text-slate-800"}`}>{item.title}</span>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full whitespace-nowrap uppercase ${getSeverityBadgeClasses(item.severity, isDark)}`}>
                          Sev {item.severity}
                        </span>
                      </div>

                      <div className="flex items-center text-[10px] text-slate-400 space-x-2">
                        <span className="flex items-center">
                          <MapPin className="h-3 w-3 text-rose-500 mr-0.5" />
                          {item.locationName}
                        </span>
                        <span>•</span>
                        <span>{item.timestamp}</span>
                      </div>

                      <div className={`flex justify-between items-center pt-1 border-t text-[10px] ${isDark ? "border-slate-800/60" : "border-slate-50"}`}>
                        <span className="text-slate-400">Reporter: <b className={`font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>{item.reporterName}</b></span>
                        <span className={`font-black uppercase tracking-wide px-1.5 py-0.5 rounded text-[8px] ${getStatusBadgeClasses(item.status, isDark)}`}>
                          {item.status.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        )}

      </div>

      {/* 5. BOTTOM COMMAND & BAR (Dark-navy full action bar styled matching screenshots) */}
      {!isMobile && (
        <div className={`p-3 shrink-0 z-40 flex items-center justify-between gap-3 relative border-t transition-colors duration-500 ${
          theme === "dark"
            ? "bg-[#0f172a] border-slate-800"
            : "bg-white border-slate-100"
        }`}>
          {/* Large Dark Navy Scan Button */}
          <button
            onClick={() => setIsQRModalOpen(true)}
            className={`flex-1 active:scale-98 text-white py-3 px-5 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center justify-center space-x-2.5 transition-all shadow-md cursor-pointer border-none ${
              theme === "dark"
                ? "bg-indigo-600 hover:bg-indigo-700"
                : "bg-[#0F172A] hover:bg-[#1E293B]"
            }`}
          >
            <QrCode className="h-4.5 w-4.5" />
            <span>Scan QR to Report</span>
          </button>

          {/* Small White Statistics badge button on the right */}
          <button
            onClick={() => {
              setActiveTab(prev => prev === "list" ? "map" : "list");
            }}
            className={`p-2 rounded-2xl flex flex-col items-center justify-center h-[46px] w-[50px] shrink-0 transition-all shadow-sm cursor-pointer border ${
              theme === "dark"
                ? "bg-[#1e293b] border-slate-700 text-slate-100 hover:bg-[#2e3b4e]"
                : "bg-white border-slate-200 text-slate-800 hover:bg-slate-50"
            }`}
          >
            <BarChart2 className={`h-4 w-4 ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`} />
            <span className={`text-[8px] font-black font-mono mt-0.5 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>{activeCount}</span>
          </button>
        </div>
      )}

      {/* INTERACTIVE QR REPORTING MODAL */}
      <AnimatePresence>
        {isQRModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsQRModalOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="bg-white rounded-3xl border border-slate-200 max-w-[320px] w-full p-6 text-center space-y-4 shadow-2xl relative z-10"
            >
              <button 
                onClick={() => setIsQRModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-full transition-colors cursor-pointer bg-transparent border-none flex items-center justify-center"
              >
                <X className="h-4.5 w-4.5" />
              </button>

              <div className="space-y-1 text-left">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Citizen QR Portal</h3>
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Scan to report a new civic issue instantly</p>
              </div>

              {/* Styled Vector QR Code matching the platform colors */}
              <a 
                href="https://indiacivic-811492221296.asia-south1.run.app/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="block hover:scale-102 transition-transform cursor-pointer"
              >
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-3xl inline-block shadow-inner hover:border-indigo-200 transition-colors">
                  <img 
                    src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&color=0f172a&format=svg&data=https://indiacivic-811492221296.asia-south1.run.app/" 
                    alt="Citizen QR Portal Link" 
                    className="h-40 w-40 mx-auto object-contain bg-white p-2 rounded-2xl"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </a>

              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-800">Scan on WhatsApp or Web Browser</p>
                <p className="text-[10px] text-slate-500 leading-normal">Allows civic watchers to upload geotagged images, report waste piles or street defects, and file auto-verified petitions directly.</p>
              </div>

              <button
                onClick={() => setIsQRModalOpen(false)}
                className="w-full bg-[#0F172A] hover:bg-[#1E293B] text-white py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Close Portal
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// ==========================================
// GOOGLE MAPS DETAILED OVERLAYS COMPONENTS
// ==========================================

function GoogleMapsSectorsOutline({ 
  preset, 
  mapZoom 
}: { 
  preset: CityPreset; 
  mapZoom: number;
}) {
  const map = useMap();
  const visible = mapZoom > 10;

  useEffect(() => {
    if (!map || !visible) return;

    const polygons = Object.entries(preset.sectorsOutlines).map(([secId, path]) => {
      const poly = new google.maps.Polygon({
        paths: path,
        map,
        strokeColor: "#F43F5E",
        strokeOpacity: 0.8,
        strokeWeight: 1.5,
        fillColor: "rgba(244, 63, 94, 0.03)",
        fillOpacity: 0.03,
      });

      return poly;
    });

    return () => {
      polygons.forEach(p => p.setMap(null));
    };
  }, [map, visible, preset]);

  return null;
}

interface GoogleMapsSafetyHeatmapProps {
  preset: CityPreset;
  heatmapType: "none" | "streetlight" | "womensafety" | "overall";
  issues: Issue[];
}

function GoogleMapsSafetyHeatmap({ 
  preset, 
  heatmapType,
  issues
}: GoogleMapsSafetyHeatmapProps) {
  const map = useMap();

  useEffect(() => {
    if (!map || heatmapType === "none" || typeof google === "undefined") return;

    const polygons = Object.entries(preset.sectorsOutlines).map(([secId, path]) => {
      // 1. Find issues belonging to this sector
      const sectorIssues = issues.filter(issue => {
        const lat = Number(issue.latitude);
        const lng = Number(issue.longitude);
        if (isNaN(lat) || isNaN(lng)) return false;
        return isPointInPolygon(lat, lng, path);
      });

      // 2. Filter issues based on heatmapType
      let relevantIssues = [...sectorIssues];
      if (heatmapType === "streetlight") {
        relevantIssues = relevantIssues.filter(iss => {
          const cat = (iss.category || "").toLowerCase();
          return cat.includes("light") || cat.includes("electricity") || cat.includes("power") || cat.includes("streetlight");
        });
      } else if (heatmapType === "womensafety") {
        relevantIssues = relevantIssues.filter(iss => isWomenUnsafe(iss));
      } else if (heatmapType === "overall") {
        relevantIssues = relevantIssues.filter(iss => {
          const cat = (iss.category || "").toLowerCase();
          const isLight = cat.includes("light") || cat.includes("electricity") || cat.includes("power") || cat.includes("streetlight");
          return isLight || isWomenUnsafe(iss);
        });
      }

      // 3. Count unresolved issues
      const unresolvedCount = relevantIssues.filter(iss => iss.status !== "RESOLVED").length;

      // 4. Determine color and opacity based on risk
      let fillColor = "#10B981"; // Green (Safe)
      let fillOpacity = 0.25;
      let strokeColor = "#059669";
      let riskLevel = "Low Risk / Secured";

      if (unresolvedCount >= 5) {
        fillColor = "#EF4444"; // Red (High Risk)
        fillOpacity = 0.45;
        strokeColor = "#DC2626";
        riskLevel = "High Risk / Danger";
      } else if (unresolvedCount >= 2) {
        fillColor = "#F59E0B"; // Orange/Yellow (Medium Risk)
        fillOpacity = 0.35;
        strokeColor = "#D97706";
        riskLevel = "Moderate Risk / Caution";
      } else if (unresolvedCount >= 1) {
        fillColor = "#3B82F6"; // Blue/Amber (Low-Medium Risk or Caution)
        fillOpacity = 0.25;
        strokeColor = "#2563EB";
        riskLevel = "Minor Hazards / Alert";
      }

      const poly = new google.maps.Polygon({
        paths: path,
        map,
        strokeColor,
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor,
        fillOpacity,
      });

      const sectorName = preset.sectors[secId]?.name || secId;

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 10px; font-family: system-ui, -apple-system, sans-serif; color: #1e293b; min-width: 200px;">
            <h4 style="margin: 0 0 4px 0; font-size: 13px; font-weight: 800; text-transform: uppercase; color: #0f172a; letter-spacing: 0.05em;">
              ${sectorName}
            </h4>
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
              <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${fillColor};"></span>
              <span style="font-size: 10px; font-weight: 800; color: ${strokeColor}; text-transform: uppercase; letter-spacing: 0.02em;">
                ${riskLevel}
              </span>
            </div>
            <div style="font-size: 11px; color: #475569; border-top: 1px solid #f1f5f9; padding-top: 6px; margin-top: 4px;">
              Active reports inside zone: <b>${unresolvedCount}</b>
            </div>
            <p style="margin: 4px 0 0 0; font-size: 10px; color: #94a3b8; line-height: 1.4;">
              ${
                heatmapType === "streetlight"
                  ? "💡 Tracks street lamp failures and dark patches."
                  : heatmapType === "womensafety"
                  ? "🛡️ Tracks eve-teasing, harassment & unsafe alleys."
                  : "🔥 Combined real-time civic & safety threats."
              }
            </p>
          </div>
        `,
      });

      google.maps.event.addListener(poly, "click", (event: any) => {
        infoWindow.setPosition(event.latLng);
        infoWindow.open(map);
      });

      return poly;
    });

    return () => {
      polygons.forEach(p => p.setMap(null));
    };
  }, [map, preset, heatmapType, issues]);

  return null;
}
