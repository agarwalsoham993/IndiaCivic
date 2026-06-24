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
  Wrench
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

export default function MapsView({ issues = [], isMobile = false }: MapsViewProps) {
  const [activeTab, setActiveTab] = useState<"map" | "list">("map");
  const [severityFilter, setSeverityFilter] = useState<"all" | "high" | "med" | "low">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "PENDING" | "IN_PROGRESS" | "RESOLVED">("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "garbage" | "streetlight" | "water" | "assets">("all");
  const [activeCity, setActiveCity] = useState<"bengaluru" | "mumbai" | "delhi">("bengaluru");
  const [selectedSector, setSelectedSector] = useState<string>("sector-2");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"real" | "vector">(hasValidKey ? "real" : "vector");
  
  // Scannable QR modal
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  
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

  const activeIssue = useMemo(() => {
    if (!selectedCluster || !selectedCluster.issues || selectedCluster.issues.length === 0) return null;
    return selectedCluster.issues.find(iss => iss.id === activeIssueId) || selectedCluster.issues[0];
  }, [selectedCluster, activeIssueId]);

  // Controlled Google Maps camera state
  const [mapCenter, setMapCenter] = useState({ lat: 12.9719, lng: 77.6112 });
  const [mapZoom, setMapZoom] = useState(13);

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

  const currentClusters = useMemo(() => {
    const zoom = viewMode === "real" ? mapZoom : (11 + vectorZoomLevel);
    const threshold = getThreshold(zoom);
    const resultClusters: MapCluster[] = [];

    // Filter out issues with invalid coordinates
    const cityCenter = currentPreset.center;
    const cityIssues = issues.filter(iss => {
      const lat = Number(iss.latitude);
      const lng = Number(iss.longitude);
      return !isNaN(lat) && !isNaN(lng);
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
      cluster.x = 500 + (cluster.lng - cityCenter.lng) * 4000;
      cluster.y = 500 - (cluster.lat - cityCenter.lat) * 4000;

      return cluster;
    });
  }, [issues, viewMode, mapZoom, vectorZoomLevel, currentPreset, severityFilter, statusFilter, categoryFilter]);

  // Dynamic calculations of active and total reports from the actual database
  const activeCount = useMemo(() => {
    const validIssues = issues.filter(iss => {
      const lat = Number(iss.latitude);
      const lng = Number(iss.longitude);
      return !isNaN(lat) && !isNaN(lng);
    });
    return validIssues.filter(iss => iss.status !== "RESOLVED").length;
  }, [issues]);

  const totalReportsCount = useMemo(() => {
    const validIssues = issues.filter(iss => {
      const lat = Number(iss.latitude);
      const lng = Number(iss.longitude);
      return !isNaN(lat) && !isNaN(lng);
    });
    return validIssues.length;
  }, [issues]);

  // Handle Preset drop down selection
  const handleCityChange = (cityKey: "bengaluru" | "mumbai" | "delhi") => {
    setActiveCity(cityKey);
    setMapCenter(presets[cityKey].center);
    setMapZoom(presets[cityKey].zoom);
    setSelectedSector("sector-2");
    setSelectedCluster(null);
  };

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

  // GPS tracking locator function (centers map back to default preset)
  const handleLocateMe = () => {
    setMapCenter(currentPreset.center);
    setMapZoom(currentPreset.zoom);
    setVectorPan({ x: 0, y: 0 });
    setVectorZoomLevel(3);
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

  // Filter issues list if they toggle to "List" mode
  const filteredIssuesList = useMemo(() => {
    let result = [...issues];
    
    // Filter out issues with invalid coordinates
    result = result.filter(iss => {
      const lat = Number(iss.latitude);
      const lng = Number(iss.longitude);
      return !isNaN(lat) && !isNaN(lng);
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
  }, [issues, currentPreset, severityFilter, statusFilter, categoryFilter]);

  // The list view items are exactly the filtered database issues, with no mock/static reports added
  const listFeedItems = filteredIssuesList;

  return (
    <div className="relative w-full h-[712px] bg-[#FAF2EB] overflow-hidden flex flex-col font-sans select-none text-[#1e293b]">
      
      {/* 2. FILTER & SECTOR SELECTORS BAR (Strictly matching the layout of the screenshots) */}
      <div className="bg-white border-b border-slate-100 p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 z-40 shadow-sm relative">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Severity Dropdown */}
          <div className="relative">
            <select 
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as any)}
              className="appearance-none bg-white border border-slate-200 pl-3 pr-8 py-1.5 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:border-slate-400 cursor-pointer shadow-sm min-w-[120px]"
            >
              <option value="all">All Severity</option>
              <option value="high">High (4-5)</option>
              <option value="med">Medium (3)</option>
              <option value="low">Low (1-2)</option>
            </select>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Status Dropdown */}
          <div className="relative">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="appearance-none bg-white border border-slate-200 pl-3 pr-8 py-1.5 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:border-slate-400 cursor-pointer shadow-sm min-w-[120px]"
            >
              <option value="all">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
            </select>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>


        </div>

        {/* Tab Selector Segment Control (Map | List) */}
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 self-stretch sm:self-auto shrink-0 shadow-inner">
          <button
            onClick={() => setActiveTab("map")}
            className={`flex-1 sm:flex-none px-4 py-1 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "map"
                ? "bg-white text-slate-900 border border-slate-200 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Map
          </button>
          <button
            onClick={() => setActiveTab("list")}
            className={`flex-1 sm:flex-none px-4 py-1 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "list"
                ? "bg-white text-slate-900 border border-slate-200 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            List ({listFeedItems.length})
          </button>
        </div>
      </div>

      {/* 3. SEARCH HUD FLOATING BAR (Allows typing a city to navigate automatically) */}
      <div className="absolute top-26 inset-x-3 z-30 flex items-center justify-between pointer-events-none gap-2">
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-[280px] flex items-center bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl px-3 py-1.5 shadow-md pointer-events-auto">
          <Search className="h-4 w-4 text-slate-400 shrink-0 mr-2" />
          <input 
            type="text"
            placeholder="Search Indian Hub (Mumbai, Delhi, Blr)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none text-[11px] text-slate-800 placeholder:text-slate-400 focus:outline-none w-full font-bold"
          />
        </form>

        {/* Real / Vector Toggle (If Google Key Available) */}
        {hasValidKey && (
          <button
            onClick={() => setViewMode(prev => prev === "real" ? "vector" : "real")}
            className="px-2.5 py-1.5 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl text-[9px] font-black uppercase shadow-md pointer-events-auto text-slate-700 hover:text-slate-900 flex items-center space-x-1"
          >
            <MapIcon className="h-3.5 w-3.5 text-rose-500" />
            <span>{viewMode === "real" ? "GOOGLE" : "VECTOR"}</span>
          </button>
        )}
      </div>

      {/* 4. MAIN MAP / LIST WRAPPER STAGE */}
      <div className="flex-1 w-full relative overflow-hidden">
        
        {activeTab === "map" ? (
          <>
            {/* FLOATING ACTIVE STATE COUNTERS OVERLAY CARD (Pill style exactly as screenshot) */}
            <div className="absolute top-4 left-3 z-30 pointer-events-auto">
              <div className="bg-white rounded-2xl border border-slate-200/80 px-4 py-2 flex items-center space-x-4 shadow-lg">
                <div className="flex flex-col text-left">
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-lg font-black text-[#DC2626] tracking-tight">{activeCount}</span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Active</span>
                  </div>
                </div>
                
                <div className="h-8 w-[1px] bg-slate-200" />

                <div className="flex flex-col text-left">
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-lg font-black text-[#F57C1F] tracking-tight">{totalReportsCount}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Reports</span>
                  </div>
                </div>
              </div>
            </div>

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
                    styles={LIGHT_MAP_STYLE}
                  >
                    {/* Render standard ward boundaries if zoom <= 13 */}
                    <GoogleMapsSectorsOutline preset={currentPreset} mapZoom={mapZoom} />

                    {/* Rendering the cluster nodes exactly matching screenshot positions */}
                    {currentClusters.map((cluster) => (
                      <AdvancedMarker 
                        key={cluster.id} 
                        position={{ lat: cluster.lat, lng: cluster.lng }}
                        onClick={() => setSelectedCluster(cluster)}
                      >
                        <div 
                          style={{
                            width: `${cluster.size}px`,
                            height: `${cluster.size}px`
                          }}
                          className={`${getClusterColorClass(cluster.color)} border-2 border-white shadow-xl rounded-full flex items-center justify-center font-extrabold text-xs cursor-pointer transform hover:scale-110 active:scale-95 transition-all duration-150`}
                        >
                          {cluster.label}
                        </div>
                      </AdvancedMarker>
                    ))}



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
                className={`w-full h-full flex items-center justify-center relative cursor-grab bg-[#FAF2EB] select-none ${
                  isVectorDragging ? "cursor-grabbing" : ""
                }`}
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

                    {/* Background Soft Cream Base Grid */}
                    <rect width="1000" height="1000" fill="#FCF6F0" />

                    {/* WATER BODIES (e.g. Halasuru Lake or coastal outlines) */}
                    <path 
                      d="M 500,450 Q 560,420 620,480 T 700,430 L 750,550 Q 640,600 520,550 Z" 
                      fill="#E2EDF5" 
                      stroke="#C1D9EB" 
                      strokeWidth="2" 
                    />
                    <text x="590" y="510" fill="#71A0C2" fontSize="10" fontWeight="bold" className="font-sans italic">Lake Sanctuary</text>

                    {/* MULTIPLE SECTOR/WARD BOUNDARY OUTLINES (Styled exactly like the red dashed borders in screenshots) */}
                    {Object.entries(currentPreset.sectorsOutlines).map(([secKey, points]) => {
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

                    {/* ROAD NETWORK LINES (White roads with slight beige borders) */}
                    <g opacity="0.8">
                      {/* Main Highway 1 */}
                      <line x1="100" y1="350" x2="900" y2="350" stroke="#FAF2EB" strokeWidth="16" strokeLinecap="round" />
                      <line x1="100" y1="350" x2="900" y2="350" stroke="#FFFFFF" strokeWidth="12" strokeLinecap="round" />
                      
                      {/* Diagonal Ring Road */}
                      <line x1="200" y1="150" x2="800" y2="750" stroke="#FAF2EB" strokeWidth="14" strokeLinecap="round" />
                      <line x1="200" y1="150" x2="800" y2="750" stroke="#FFFFFF" strokeWidth="10" strokeLinecap="round" />

                      {/* Secondary Radial Roads */}
                      <line x1="480" y1="100" x2="480" y2="900" stroke="#FAF2EB" strokeWidth="12" strokeLinecap="round" />
                      <line x1="480" y1="100" x2="480" y2="900" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" />

                      <line x1="100" y1="650" x2="900" y2="650" stroke="#FAF2EB" strokeWidth="12" strokeLinecap="round" />
                      <line x1="100" y1="650" x2="900" y2="650" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" />
                    </g>

                    {/* CITY DISTRICT LABELS IN BURGUNDY (Zoom dependent) */}
                    <g fill="#7C1A22" fontWeight="bold" fontSize="11" letterSpacing="1.5">
                      <text x="250" y="280" textAnchor="middle">SADASHIVANAGAR</text>
                      <text x="180" y="440" textAnchor="middle">MALLESHWARAM</text>
                      <text x="500" y="380" textAnchor="middle" fontSize="16" fontWeight="900" fill="#801D26">{currentPreset.name.toUpperCase()}</text>
                      <text x="730" y="480" textAnchor="middle">SHIVAJINAGAR</text>
                      <text x="800" y="610" textAnchor="middle">INDIRANAGAR</text>
                      <text x="320" y="780" textAnchor="middle">JAYANAGAR</text>
                    </g>

                    {/* RENDER FALLBACK CLUSTERS ON THE VECTOR CANVAS */}
                    {currentClusters.map((cluster) => {
                      const size = cluster.size * 1.1;
                      return (
                        <g 
                          key={cluster.id} 
                          className="cursor-pointer pointer-events-auto transform hover:scale-110 transition-all duration-200"
                          onClick={() => setSelectedCluster(cluster)}
                        >
                          {/* Inner Circle Marker */}
                          <circle 
                            cx={cluster.x} 
                            cy={cluster.y} 
                            r={size / 2} 
                            fill={cluster.color === "burgundy" ? "#801D26" : cluster.color === "red" ? "#E13838" : "#F57C1F"} 
                            stroke="#FFFFFF" 
                            strokeWidth="2.5" 
                            className="shadow-xl"
                          />
                          {/* Label Count */}
                          <text 
                            x={cluster.x} 
                            y={cluster.y + 4} 
                            textAnchor="middle" 
                            fill="#FFFFFF" 
                            fontSize="11.5" 
                            fontWeight="900"
                            fontFamily="sans-serif"
                          >
                            {cluster.label}
                          </text>
                        </g>
                      );
                    })}



                  </svg>
                </div>

                {/* VECTOR ZOOM CONTROLLERS */}
                <div className="absolute bottom-28 right-3.5 z-30 flex flex-col space-y-1.5 pointer-events-auto">
                  <button
                    onClick={() => setVectorZoomLevel(prev => Math.min(prev + 1, 5))}
                    className="h-10 w-10 bg-white border border-slate-200 rounded-xl shadow-lg flex items-center justify-center text-slate-700 hover:text-slate-900 cursor-pointer active:scale-95 transition-all"
                  >
                    <Plus className="h-4.5 w-4.5 font-bold" />
                  </button>
                  <button
                    onClick={() => setVectorZoomLevel(prev => Math.max(prev - 1, 1))}
                    className="h-10 w-10 bg-white border border-slate-200 rounded-xl shadow-lg flex items-center justify-center text-slate-700 hover:text-slate-900 cursor-pointer active:scale-95 transition-all"
                  >
                    <Minus className="h-4.5 w-4.5 font-bold" />
                  </button>
                </div>

                {/* LOCATE CURRENT POSITION HUD (COMPASS ICON) */}
                <div className="absolute bottom-40 right-3.5 z-30 pointer-events-auto">
                  <button
                    onClick={handleLocateMe}
                    className="h-10 w-10 bg-white border border-slate-200 rounded-xl shadow-lg flex items-center justify-center text-slate-700 hover:text-indigo-600 cursor-pointer active:scale-95 transition-all"
                  >
                    <Compass className="h-4.5 w-4.5" />
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
                    className="h-10 w-10 bg-white border border-slate-200 rounded-xl shadow-lg flex items-center justify-center text-slate-700 hover:text-slate-900 cursor-pointer"
                  >
                    <Plus className="h-4.5 w-4.5" />
                  </button>
                  <button
                    onClick={() => setMapZoom(prev => Math.max(prev - 1, 5))}
                    className="h-10 w-10 bg-white border border-slate-200 rounded-xl shadow-lg flex items-center justify-center text-slate-700 hover:text-slate-900 cursor-pointer"
                  >
                    <Minus className="h-4.5 w-4.5" />
                  </button>
                </div>

                <div className="absolute bottom-40 right-3.5 z-30 pointer-events-auto">
                  <button
                    onClick={handleLocateMe}
                    className="h-10 w-10 bg-white border border-slate-200 rounded-xl shadow-lg flex items-center justify-center text-slate-700 hover:text-indigo-600 cursor-pointer"
                  >
                    <Compass className="h-4.5 w-4.5" />
                  </button>
                </div>
              </>
            )}

            {/* HYPERLOCAL DRAWER Popover on cluster Click */}
            <AnimatePresence>
              {selectedCluster && activeIssue && (
                <motion.div
                  initial={{ opacity: 0, y: 80 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 80 }}
                  className="absolute bottom-3 inset-x-3 z-40 bg-white rounded-2xl border border-slate-200 shadow-xl p-4 text-left pointer-events-auto flex flex-col space-y-3 max-h-[380px] overflow-y-auto"
                >
                  {/* Drawer Header */}
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center flex-wrap gap-1">
                        <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                        <span>{selectedCluster.locality}</span>
                      </h4>
                      <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5 tracking-wider">
                        Civic Hotspot • {(selectedCluster.issues || []).length} {(selectedCluster.issues || []).length === 1 ? "Report" : "Merged Reports"} in area
                      </p>
                    </div>
                    <button 
                      onClick={() => setSelectedCluster(null)}
                      className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition shrink-0 ml-2"
                    >
                      <X className="h-4.5 w-4.5" />
                    </button>
                  </div>

                  {/* Main Content: Split layout with Image and Issue Details */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-stretch">
                    {/* Left/Top: Image Preview Section */}
                    <div className="md:col-span-4 relative h-36 bg-slate-100 rounded-xl overflow-hidden border border-slate-100 flex items-center justify-center shrink-0">
                      {activeIssue.imageUrl ? (
                        <img 
                          src={activeIssue.imageUrl} 
                          alt={activeIssue.title} 
                          className="w-full h-full object-cover rounded-xl"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center p-4 text-center space-y-1 text-slate-400 w-full h-full bg-slate-50">
                          <AlertCircle className="h-7 w-7 text-slate-300" />
                          <span className="text-[10px] font-bold">No Image Provided</span>
                        </div>
                      )}
                      
                      {/* Floating status pill */}
                      <span className={`absolute top-2 left-2 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm text-white ${
                        activeIssue.status === "RESOLVED"
                          ? "bg-emerald-600"
                          : activeIssue.status === "IN_PROGRESS"
                          ? "bg-sky-600"
                          : "bg-rose-600 animate-pulse"
                      }`}>
                        {activeIssue.status}
                      </span>
                    </div>

                    {/* Right/Bottom: Active Issue Information */}
                    <div className="md:col-span-8 flex flex-col justify-between space-y-2">
                      <div className="space-y-1">
                        {/* Upper row: Category & Severity */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="bg-slate-100 text-slate-700 text-[8px] font-extrabold uppercase px-2 py-0.5 rounded tracking-wide">
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

                        {/* Issue Title */}
                        <h5 className="text-xs font-bold text-slate-900 leading-snug">
                          {activeIssue.title}
                        </h5>

                        {/* Issue Description */}
                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed max-h-12 overflow-y-auto pr-1">
                          {activeIssue.description}
                        </p>
                      </div>

                      {/* Reporter & Upvote counts */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[9px] text-slate-400">
                        <span>
                          By: <b className="text-slate-600 font-semibold">{activeIssue.isAnonymous ? "Anonymous Citizen" : (activeIssue.reporterName || "Concerned Citizen")}</b>
                        </span>
                        <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                          ▲ {activeIssue.upvotes || 0} Upvotes
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Horizontal Scrollable Thumbnails for Multiple Issues in Cluster */}
                  {(selectedCluster.issues || []).length > 1 && (
                    <div className="border-t border-slate-100 pt-2 space-y-1.5">
                      <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
                        Merged Reports in this Bubble ({(selectedCluster.issues || []).length}):
                      </div>
                      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-thin">
                        {(selectedCluster.issues || []).map((iss) => (
                          <button
                            key={iss.id}
                            onClick={() => setActiveIssueId(iss.id)}
                            className={`flex items-center space-x-2 p-1.5 rounded-xl border text-left cursor-pointer shrink-0 transition-all ${
                              activeIssueId === iss.id
                                ? "bg-indigo-50/50 border-indigo-200 ring-2 ring-indigo-500/10"
                                : "bg-slate-50/50 border-slate-200 hover:bg-slate-100/70"
                            }`}
                          >
                            <div className="h-8 w-8 rounded-lg overflow-hidden shrink-0 bg-slate-200">
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
                            <div className="max-w-[120px] pr-1">
                              <div className="text-[9px] font-bold text-slate-800 truncate leading-tight">
                                {iss.title}
                              </div>
                              <div className="text-[8px] text-slate-400 font-semibold truncate uppercase mt-0.5">
                                Sev {iss.severity} • {iss.category}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* 3.5 FLOATING CATEGORY SELECTOR ON BOTTOM LEFT OF MAP */}
            {!selectedCluster && (
              <div className="absolute bottom-4 left-3.5 z-30 pointer-events-auto flex items-center space-x-1 bg-white/95 backdrop-blur-md border border-slate-200/80 p-1 rounded-2xl shadow-lg max-w-[calc(100%-80px)] overflow-x-auto scrollbar-none">
                <button
                  onClick={() => setCategoryFilter("all")}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center space-x-1.5 transition-all duration-150 cursor-pointer ${
                    categoryFilter === "all"
                      ? "bg-slate-900 text-white shadow-sm"
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
          <div className="w-full h-full bg-white overflow-y-auto px-4 py-4 space-y-3 flex flex-col text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Active Civic Grievances ({listFeedItems.length})</h3>
              <p className="text-[10px] text-slate-400 font-semibold">{currentPreset.name}, {currentPreset.state}</p>
            </div>

            {listFeedItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-2">
                <Filter className="h-10 w-10 text-slate-300" />
                <p className="text-xs font-bold">No active reports match the selected filters.</p>
                <button 
                  onClick={() => { setSeverityFilter("all"); setStatusFilter("all"); setCategoryFilter("all"); }}
                  className="text-xs font-extrabold text-indigo-500 hover:underline cursor-pointer"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="space-y-3 flex-1">
                {listFeedItems.map((item, index) => {
                  const severityColors = ["text-blue-500", "text-blue-600 bg-blue-50", "text-emerald-600 bg-emerald-50", "text-amber-600 bg-amber-50", "text-orange-600 bg-orange-50", "text-rose-600 bg-rose-50"];
                  return (
                    <div 
                      key={item.id}
                      className="border border-slate-100 rounded-xl p-3 shadow-sm hover:border-slate-200 transition-all flex flex-col space-y-2 bg-white"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-xs font-extrabold text-slate-800 leading-snug">{item.title}</span>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full whitespace-nowrap uppercase ${severityColors[item.severity] || "bg-slate-50 text-slate-600"}`}>
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

                      <div className="flex justify-between items-center pt-1 border-t border-slate-50 text-[10px]">
                        <span className="text-slate-400">Reporter: <b className="text-slate-700 font-semibold">{item.reporterName}</b></span>
                        <span className={`font-black uppercase tracking-wide px-1.5 py-0.5 rounded text-[8px] ${
                          item.status === "RESOLVED" 
                            ? "bg-emerald-50 text-emerald-600" 
                            : item.status === "IN_PROGRESS"
                            ? "bg-sky-50 text-sky-600"
                            : "bg-amber-50 text-amber-600"
                        }`}>
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
        <div className="bg-white border-t border-slate-100 p-3 shrink-0 z-40 flex items-center justify-between gap-3 relative">
          {/* Large Dark Navy Scan Button */}
          <button
            onClick={() => setIsQRModalOpen(true)}
            className="flex-1 bg-[#0F172A] hover:bg-[#1E293B] active:scale-98 text-white py-3 px-5 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center justify-center space-x-2.5 transition-all shadow-md cursor-pointer"
          >
            <QrCode className="h-4.5 w-4.5" />
            <span>Scan QR to Report</span>
          </button>

          {/* Small White Statistics badge button on the right */}
          <button
            onClick={() => {
              setActiveTab(prev => prev === "list" ? "map" : "list");
            }}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 p-2 rounded-2xl flex flex-col items-center justify-center h-[46px] w-[50px] shrink-0 transition-all shadow-sm cursor-pointer"
          >
            <BarChart2 className="h-4 w-4 text-slate-600" />
            <span className="text-[8px] font-black text-slate-500 font-mono mt-0.5">{activeCount}</span>
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
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="space-y-1 text-left">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Citizen QR Portal</h3>
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Scan to report a new civic issue instantly</p>
              </div>

              {/* Styled Vector QR Code matching the platform colors */}
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl inline-block shadow-inner">
                <svg className="h-40 w-40 mx-auto" viewBox="0 0 100 100" fill="none">
                  {/* Background */}
                  <rect width="100" height="100" rx="10" fill="#FFFFFF" />
                  
                  {/* Position detection patterns (Three corners) */}
                  <rect x="5" y="5" width="24" height="24" rx="3" fill="#0F172A" />
                  <rect x="9" y="9" width="16" height="16" rx="2" fill="#FFFFFF" />
                  <rect x="13" y="13" width="8" height="8" rx="1" fill="#801D26" />

                  <rect x="71" y="5" width="24" height="24" rx="3" fill="#0F172A" />
                  <rect x="75" y="9" width="16" height="16" rx="2" fill="#FFFFFF" />
                  <rect x="79" y="13" width="8" height="8" rx="1" fill="#801D26" />

                  <rect x="5" y="71" width="24" height="24" rx="3" fill="#0F172A" />
                  <rect x="9" y="75" width="16" height="16" rx="2" fill="#FFFFFF" />
                  <rect x="13" y="79" width="8" height="8" rx="1" fill="#801D26" />

                  {/* QR random grid patterns */}
                  <g fill="#0F172A">
                    <rect x="35" y="5" width="4" height="8" />
                    <rect x="43" y="9" width="8" height="4" />
                    <rect x="55" y="5" width="4" height="4" />
                    <rect x="63" y="13" width="4" height="8" />
                    
                    <rect x="35" y="21" width="12" height="4" />
                    <rect x="51" y="17" width="8" height="8" />
                    <rect x="63" y="25" width="4" height="4" />
                    
                    <rect x="5" y="35" width="8" height="4" />
                    <rect x="17" y="39" width="4" height="12" />
                    <rect x="25" y="35" width="12" height="4" />
                    
                    <rect x="5" y="51" width="4" height="8" />
                    <rect x="13" y="55" width="8" height="4" />
                    <rect x="25" y="47" width="8" height="8" />
                    <rect x="37" y="55" width="12" height="4" />

                    <rect x="51" y="35" width="16" height="4" />
                    <rect x="71" y="35" width="4" height="16" />
                    <rect x="79" y="43" width="12" height="4" />
                    <rect x="83" y="51" width="4" height="8" />

                    <rect x="55" y="47" width="8" height="8" />
                    <rect x="67" y="55" width="16" height="4" />
                    
                    <rect x="35" y="71" width="4" height="8" />
                    <rect x="43" y="79" width="8" height="4" />
                    <rect x="55" y="71" width="12" height="4" />
                    <rect x="71" y="71" width="4" height="4" />
                    <rect x="79" y="75" width="8" height="8" />

                    <rect x="35" y="87" width="16" height="4" />
                    <rect x="55" y="83" width="8" height="8" />
                    <rect x="67" y="87" width="12" height="4" />
                    <rect x="83" y="83" width="4" height="12" />
                  </g>
                </svg>
              </div>

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
