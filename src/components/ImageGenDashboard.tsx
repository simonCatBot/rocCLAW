// MIT License - Copyright (c) 2026 kiritigowda
// See LICENSE file for details.

"use client";

import {
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import {
  Sparkles,
  Loader,
  Download,
  ImageIcon,
  CheckCircle,
  AlertTriangle,
  Zap,
  RefreshCw,
  Power,
  User,
  Square,
  Trash2,
} from "lucide-react";

// ─── Character and Location Templates ────────────────────────────────────────

interface CharacterTemplate {
  id: string;
  name: string;
  emoji: string;
  description: string;
  color: string;
}

interface LocationTemplate {
  id: string;
  name: string;
  emoji: string;
  description: string;
}

const CHARACTERS: CharacterTemplate[] = [
  { id: "robin-hood", name: "Robin Hood", emoji: "🏹", description: "Legendary outlaw who steals from the rich to give to the poor", color: "#22C55E" },
  { id: "medusa", name: "Medusa", emoji: "🐍", description: "Gorgon with living venomous snakes for hair", color: "#10B981" },
  { id: "dracula", name: "Dracula", emoji: "🧛", description: "Classic vampire count in dark cape and fangs", color: "#7C3AED" },
  { id: "frankenstein", name: "Frankenstein's Monster", emoji: "🧟", description: "Green stitched creature brought to life by science", color: "#65A30D" },
  { id: "sherlock", name: "Sherlock Holmes", emoji: "🕵️", description: "Brilliant detective with deerstalker hat and pipe", color: "#78350F" },
  { id: "alice", name: "Alice", emoji: "🎀", description: "Curious girl who fell down the rabbit hole", color: "#EC4899" },
  { id: "peter-pan", name: "Peter Pan", emoji: "🧚", description: "Boy who never grows up, leader of Lost Boys", color: "#06B6D4" },
  { id: "hercules", name: "Hercules", emoji: "🏛️", description: "Strongest Greek hero who completed twelve labors", color: "#D97706" },
  { id: "anubis", name: "Anubis", emoji: "🐺", description: "Egyptian god of the afterlife with jackal head", color: "#374151" },
  { id: "bigfoot", name: "Bigfoot", emoji: "🦶", description: "Elusive hairy forest creature of folklore", color: "#92400E" },
  { id: "mermaid", name: "The Little Mermaid", emoji: "🧜", description: "Half-human, half-fish creature of the sea", color: "#3B82F6" },
  { id: "dragon", name: "European Dragon", emoji: "🐉", description: "Winged fire-breathing beast of medieval legend", color: "#DC2626" },
];

const LOCATIONS: LocationTemplate[] = [
  { id: "golden-gate", name: "Golden Gate Bridge", emoji: "🌉", description: "Iconic orange suspension bridge" },
  { id: "fishermans-wharf", name: "Fisherman's Wharf", emoji: "🦭", description: "Bustling waterfront with sea lions" },
  { id: "lombard-street", name: "Lombard Street", emoji: "🌀", description: "World's crookedest street" },
  { id: "alcatraz", name: "Alcatraz Island", emoji: "🏝️", description: "Infamous former prison" },
  { id: "chinatown", name: "Chinatown", emoji: "🏮", description: "Pagoda gates and red lanterns" },
  { id: "painted-ladies", name: "Painted Ladies", emoji: "🏘️", description: "Colorful Victorian houses" },
  { id: "haight-ashbury", name: "Haight-Ashbury", emoji: "🌸", description: "Historic hippie district" },
  { id: "presidio", name: "The Presidio", emoji: "🌲", description: "Scenic military park" },
  { id: "coit-tower", name: "Coit Tower", emoji: "🗼", description: "Art deco tower on Telegraph Hill" },
  { id: "cable-cars", name: "Cable Cars", emoji: "🚃", description: "Historic moving landmarks" },
];

// ─── Job Types ────────────────────────────────────────────────────────────────

interface GenerationJob {
  id: string;
  character: string;
  location: string;
  status: "pending" | "queued" | "running" | "success" | "error";
  filename?: string;
  imageUrl?: string;
  error?: string;
}

// ─── Gallery persistence ────────────────────────────────────────────────────

interface GalleryEntry {
  id: string;
  character: string;
  location: string;
  imageUrl: string;
  filename?: string;
  timestamp: number;
}

const GALLERY_KEY = "rocclaw-imagegen-gallery";
const GALLERY_MAX = 100;

function loadGallery(): GalleryEntry[] {
  try {
    const raw = localStorage.getItem(GALLERY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveGallery(gallery: GalleryEntry[]): void {
  try {
    localStorage.setItem(GALLERY_KEY, JSON.stringify(gallery));
  } catch { /* storage full — ignore */ }
}

function generateDownloadFilename(character: string, location: string): string {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
  const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "-"); // HH-MM-SS
  const charName = character.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
  const locName = location.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
  return `${charName}_${locName}_${dateStr}_${timeStr}.png`;
}

type ComfyUIStatus = "checking" | "online" | "offline";

// ─── ComfyUI Helpers ──────────────────────────────────────────────────────────

async function checkComfyUIStatus(): Promise<ComfyUIStatus> {
  try {
    const res = await fetch("/api/photobooth", { signal: AbortSignal.timeout(5000) });
    return res.ok ? "online" : "offline";
  } catch {
    return "offline";
  }
}

async function startComfyUIServer(): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch("/api/photobooth/start", {
      method: "POST",
      signal: AbortSignal.timeout(70000),
    });
    const data = await res.json().catch(() => ({ success: false, message: "Unknown error" }));
    return data;
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Failed to start" };
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ImageGenDashboard() {
  const [comfyuiStatus, setComfyUIStatus] = useState<ComfyUIStatus>("checking");
  const [startingComfyUI, setStartingComfyUI] = useState(false);
  const [comfyuiStartError, setComfyUIStartError] = useState<string | null>(null);
  
  const [selectedCharacters, setSelectedCharacters] = useState<Set<string>>(new Set());
  const [selectedLocations, setSelectedLocations] = useState<Set<string>>(new Set());
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [processing, setProcessing] = useState(false);
  
  // Gallery persistence
  const [gallery, setGallery] = useState<GalleryEntry[]>(loadGallery);
  
  // Custom character input
  const [characterMode, setCharacterMode] = useState<"presets" | "custom">("presets");
  const [customCharacterDescription, setCustomCharacterDescription] = useState<string>("");

  // Persist gallery to localStorage
  useEffect(() => {
    saveGallery(gallery);
  }, [gallery]);

  // Check ComfyUI status on mount
  useEffect(() => {
    void checkComfyUIStatus().then(setComfyUIStatus);
    const interval = setInterval(() => { void checkComfyUIStatus().then(setComfyUIStatus); }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Start ComfyUI handler
  const startComfyUI = useCallback(async () => {
    setStartingComfyUI(true);
    setComfyUIStartError(null);
    const result = await startComfyUIServer();
    if (result.success) {
      await new Promise((r) => setTimeout(r, 2000));
      const newStatus = await checkComfyUIStatus();
      setComfyUIStatus(newStatus);
    } else {
      setComfyUIStartError(result.message);
    }
    setStartingComfyUI(false);
  }, []);

  // Stop ComfyUI handler
  const stopComfyUI = useCallback(async () => {
    // Prevent accidental double-clicks
    if (startingComfyUI) return;
    
    // Confirm before stopping
    if (!confirm("Stop ComfyUI? This will free up GPU memory.")) {
      return;
    }
    
    setStartingComfyUI(true);
    setComfyUIStartError(null);
    try {
      // Use a longer timeout and no AbortSignal to avoid issues
      const res = await fetch("/api/photobooth/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json().catch(() => ({ success: false, message: "Unknown error" }));
      if (data.success) {
        // Wait a moment then check status
        await new Promise((r) => setTimeout(r, 3000));
        const newStatus = await checkComfyUIStatus();
        setComfyUIStatus(newStatus);
      } else {
        setComfyUIStartError(data.message || "Failed to stop");
      }
    } catch (err) {
      setComfyUIStartError(err instanceof Error ? err.message : "Failed to stop");
    }
    setStartingComfyUI(false);
  }, [startingComfyUI]);

  // Character selection
  const toggleCharacter = useCallback((id: string) => {
    setSelectedCharacters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleLocation = useCallback((id: string) => {
    setSelectedLocations((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllCharacters = useCallback(() => {
    setSelectedCharacters(new Set(CHARACTERS.map((c) => c.id)));
  }, []);

  const deselectAllCharacters = useCallback(() => {
    setSelectedCharacters(new Set());
  }, []);

  const selectAllLocations = useCallback(() => {
    setSelectedLocations(new Set(LOCATIONS.map((l) => l.id)));
  }, []);

  const deselectAllLocations = useCallback(() => {
    setSelectedLocations(new Set());
  }, []);

  // Generate images
  const generateImages = useCallback(async () => {
    if (characterMode === "presets" && selectedCharacters.size === 0) return;
    if (characterMode === "custom" && !customCharacterDescription.trim()) return;
    if (selectedLocations.size === 0 || comfyuiStatus !== "online") return;

    setProcessing(true);

    // Create all combinations first and set to state
    const newJobs: GenerationJob[] = [];
    const timestamp = Date.now();
    
    const charactersToGenerate = characterMode === "custom" 
      ? ["custom-character"] 
      : Array.from(selectedCharacters);
      
    for (const charId of charactersToGenerate) {
      for (const locId of selectedLocations) {
        const character = characterMode === "custom" 
          ? { id: "custom-character", name: "Custom Character", emoji: "✨", description: customCharacterDescription }
          : CHARACTERS.find((c) => c.id === charId);
        const location = LOCATIONS.find((l) => l.id === locId);
        if (!character || !location) continue;

        newJobs.push({
          id: `job-${timestamp}-${newJobs.length}`,
          character: charId,
          location: locId,
          status: "pending",
        });
      }
    }

    // Set jobs to state so we can reference them by ID
    setJobs(newJobs);

    // Now process each job
    for (const job of newJobs) {
      const location = LOCATIONS.find((l) => l.id === job.location);
      if (!location) continue;

      // Update status to running
      setJobs((prev) => prev.map((j) => j.id === job.id ? { ...j, status: "running" } : j));

      // Queue generation
      try {
        const res = await fetch("/api/image-generation-demo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            characters: characterMode === "custom" ? ["custom-character"] : [job.character],
            locations: [job.location],
            count: 1,
            characterMode,
            customCharacterDescription: characterMode === "custom" ? customCharacterDescription : undefined,
          }),
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.jobs?.[0]) {
            const completedJob = data.jobs[0];
            setJobs((prev) => prev.map((j) => 
              j.id === job.id 
                ? { ...j, status: "success", filename: completedJob.filename, imageUrl: completedJob.imageUrl }
                : j
            ));
            // Persist to gallery
            const character = CHARACTERS.find((c) => c.id === job.character);
            const location = LOCATIONS.find((l) => l.id === job.location);
            if (completedJob.imageUrl) {
              const entry: GalleryEntry = {
                id: `gallery-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                character: character?.name ?? job.character,
                location: location?.name ?? job.location,
                imageUrl: completedJob.imageUrl,
                filename: completedJob.filename,
                timestamp: Date.now(),
              };
              setGallery((prev) => [entry, ...prev].slice(0, GALLERY_MAX));
            }
          } else {
            setJobs((prev) => prev.map((j) => j.id === job.id ? { ...j, status: "error", error: "No result" } : j));
          }
        } else {
          const errData = await res.json().catch(() => ({ error: "Request failed" }));
          setJobs((prev) => prev.map((j) => j.id === job.id ? { ...j, status: "error", error: errData.error || "Failed" } : j));
        }
      } catch (err) {
        setJobs((prev) => prev.map((j) => j.id === job.id ? { ...j, status: "error", error: err instanceof Error ? err.message : "Network error" } : j));
      }
    }

    setProcessing(false);
  }, [selectedCharacters, selectedLocations, comfyuiStatus, characterMode, customCharacterDescription]);

  // Clear results
  const clearResults = useCallback(() => {
    setJobs([]);
    setProcessing(false);
  }, []);

  // Clear gallery
  const clearGallery = useCallback(() => {
    setGallery([]);
  }, []);

  // Download image with date/time in filename
  const downloadImage = useCallback(async (imageUrl: string, character: string, location: string) => {
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = generateDownloadFilename(character, location);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(imageUrl, "_blank");
    }
  }, []);

  // Computed values
  const characterCount = characterMode === "custom" 
    ? (customCharacterDescription.trim() ? 1 : 0)
    : selectedCharacters.size;
  const totalCombinations = useMemo(() => characterCount * selectedLocations.size, [characterCount, selectedLocations]);
  const completedCount = useMemo(() => jobs.filter((j) => j.status === "success").length, [jobs]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden" aria-label="Image Generation">
      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5 shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="type-secondary-heading text-foreground">Image Gen</h2>
          <span className="font-mono text-[10px] text-muted-foreground">SDXL Character Generator</span>
          {processing && (
            <span className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              <Loader className="h-3 w-3 animate-spin" /> {completedCount}/{jobs.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {(comfyuiStatus === "offline" || comfyuiStatus === "checking") && (
            <button
              onClick={startComfyUI}
              disabled={startingComfyUI}
              className="ui-btn-primary flex items-center gap-1.5 !min-h-0 px-2.5 py-1 text-[10px] font-medium shadow-sm hover:shadow"
              style={{ backgroundColor: '#3b82f6', color: 'white' }}
            >
              {startingComfyUI ? (
                <><Loader className="h-3 w-3 animate-spin" /> Starting...</>
              ) : (
                <><Power className="h-3 w-3" /> Start ComfyUI</>
              )}
            </button>
          )}
          {comfyuiStatus === "online" && (
            <button
              onClick={stopComfyUI}
              disabled={startingComfyUI}
              className="ui-btn-primary flex items-center gap-1.5 !min-h-0 px-2.5 py-1 text-[10px] font-medium shadow-sm hover:shadow"
              style={{ backgroundColor: '#ef4444', color: 'white' }}
            >
              {startingComfyUI ? (
                <><Loader className="h-3 w-3 animate-spin" /> Stopping...</>
              ) : (
                <><Square className="h-3 w-3" /> Stop ComfyUI</>
              )}
            </button>
          )}
          <div className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-medium ${
            comfyuiStatus === "online" ? "border-green-500/30 bg-green-500/10 text-green-400"
              : comfyuiStatus === "offline" ? "border-red-500/30 bg-red-500/10 text-red-400"
                : "border-border bg-surface-2 text-muted-foreground"
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${comfyuiStatus === "online" ? "bg-green-400" : comfyuiStatus === "offline" ? "bg-red-400" : "bg-muted-foreground animate-pulse"}`} />
            ComfyUI
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {comfyuiStartError && (
        <div className="flex items-center gap-1.5 border-b border-red-500/30 bg-red-500/10 px-4 py-1.5 text-[10px] text-red-400">
          <AlertTriangle className="h-3 w-3 flex-shrink-0" />
          <span>{comfyuiStartError}</span>
          <button onClick={() => setComfyUIStartError(null)} className="ml-auto text-red-400/70 hover:text-red-400">×</button>
        </div>
      )}

      {/* ── Two Column Layout ── */}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2 overflow-hidden">
        
        {/* Left Column: Selection */}
        <div className="flex flex-col border-b lg:border-b-0 lg:border-r border-border overflow-hidden">
          
          {/* Characters Section */}
          <div className="flex-1 p-4 overflow-y-auto border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🏎️</span>
                <h3 className="type-secondary-heading text-foreground" style={{ fontSize: '13px' }}>Characters</h3>
                <span className="font-mono text-[10px] text-muted-foreground">{selectedCharacters.size}/{CHARACTERS.length}</span>
              </div>
              <div className="flex gap-1">
                <button onClick={selectAllCharacters} className="ui-btn-secondary text-[9px] px-2 py-0.5">All</button>
                <button onClick={deselectAllCharacters} className="ui-btn-secondary text-[9px] px-2 py-0.5">None</button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CHARACTERS.map((char) => {
                const isSelected = selectedCharacters.has(char.id);
                return (
                  <button
                    key={char.id}
                    onClick={() => !processing && toggleCharacter(char.id)}
                    disabled={processing}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                      isSelected ? "bg-primary/10 border-primary/30" : "bg-surface-2 border-border hover:border-primary/30"
                    } ${processing ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <span className="text-lg">{char.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium truncate">{char.name}</p>
                      <p className="text-[9px] text-muted-foreground truncate">{char.description}</p>
                    </div>
                    {isSelected && (
                      <CheckCircle className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom Character Input */}
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[11px] font-medium text-foreground">Custom Character</span>
                </div>
                <div className="flex items-center gap-0.5 rounded-md bg-surface-2 p-0.5">
                  <button
                    onClick={() => setCharacterMode("presets")}
                    className={`px-2 py-0.5 text-[9px] font-medium rounded transition-colors ${
                      characterMode === "presets" 
                        ? "bg-primary text-white" 
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Presets
                  </button>
                  <button
                    onClick={() => setCharacterMode("custom")}
                    className={`px-2 py-0.5 text-[9px] font-medium rounded transition-colors ${
                      characterMode === "custom" 
                        ? "bg-primary text-white" 
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Custom
                  </button>
                </div>
              </div>

              {characterMode === "custom" && (
                <div className="space-y-2">
                  <textarea
                    value={customCharacterDescription}
                    onChange={(e) => setCustomCharacterDescription(e.target.value)}
                    placeholder="Describe your character (e.g., 'a friendly blue robot with glowing eyes')..."
                    className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-[11px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                    rows={2}
                    disabled={processing}
                  />
                  <p className="text-[9px] text-muted-foreground">
                    This custom description will be used instead of the preset characters above.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Locations Section */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🌉</span>
                <h3 className="type-secondary-heading text-foreground" style={{ fontSize: '13px' }}>SF Locations</h3>
                <span className="font-mono text-[10px] text-muted-foreground">{selectedLocations.size}/{LOCATIONS.length}</span>
              </div>
              <div className="flex gap-1">
                <button onClick={selectAllLocations} className="ui-btn-secondary text-[9px] px-2 py-0.5">All</button>
                <button onClick={deselectAllLocations} className="ui-btn-secondary text-[9px] px-2 py-0.5">None</button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {LOCATIONS.map((loc) => {
                const isSelected = selectedLocations.has(loc.id);
                return (
                  <button
                    key={loc.id}
                    onClick={() => !processing && toggleLocation(loc.id)}
                    disabled={processing}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                      isSelected ? "bg-primary/10 border-primary/30" : "bg-surface-2 border-border hover:border-primary/30"
                    } ${processing ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <span className="text-lg">{loc.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium truncate">{loc.name}</p>
                      <p className="text-[9px] text-muted-foreground truncate">{loc.description}</p>
                    </div>
                    {isSelected && (
                      <CheckCircle className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Generate Button */}
          <div className="p-4 border-t border-border shrink-0">
            <button
              onClick={generateImages}
              disabled={(!totalCombinations) || processing || comfyuiStatus !== "online"}
              className="ui-btn-primary w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold disabled:opacity-40"
            >
              {processing ? (
                <><Loader className="h-4 w-4 animate-spin" /> Generating {totalCombinations} images...</>
              ) : (
                <><Zap className="h-4 w-4" /> Generate {totalCombinations > 0 ? totalCombinations : ""} Images</>
              )}
            </button>
            {totalCombinations > 0 && !processing && (
              <p className="text-center text-[10px] text-muted-foreground mt-2">
                {characterCount} {characterMode === "custom" ? "custom character" : "character(s)"} × {selectedLocations.size} locations = {totalCombinations} images
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Results */}
        <div className="flex flex-col overflow-hidden" aria-label="Generated images">
          <div className="p-3 border-b border-border shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
              <h3 className="type-secondary-heading text-muted-foreground" style={{ fontSize: '12px' }}>Results</h3>
              {jobs.length > 0 && (
                <span className="font-mono text-[10px] text-muted-foreground/60">
                  {completedCount}/{jobs.length}
                </span>
              )}
            </div>
            {jobs.length > 0 && (
              <button onClick={clearResults} className="ui-btn-ghost flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground">
                <RefreshCw className="h-3 w-3" /> Clear
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {jobs.length === 0 && gallery.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center p-6">
                <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-surface-2">
                  <Sparkles className="h-10 w-10 text-muted-foreground/20" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Generated images appear here</p>
                  <p className="mt-1 text-[11px] text-muted-foreground/50">Select characters and locations, then click Generate</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Current jobs */}
                {jobs.length > 0 && (
                  <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                {jobs.map((job) => {
                  const character = CHARACTERS.find((c) => c.id === job.character);
                  const location = LOCATIONS.find((l) => l.id === job.location);
                  
                  return (
                    <div
                      key={job.id}
                      className={`ui-card group relative overflow-hidden transition-all ${
                        job.status === "success" ? "border-green-500/20" : job.status === "error" ? "border-red-500/30" : "border-accent/30"
                      }`}
                    >
                      <div className="relative w-full overflow-hidden bg-surface-2" style={{ aspectRatio: '1 / 1' }}>
                        {job.status === "success" && job.imageUrl ? (
                          <>
                            <img src={job.imageUrl} alt={`${character?.name} at ${location?.name}`} className="h-full w-full object-cover" />
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent px-2 pb-1.5 pt-8">
                              <p className="text-[11px] font-bold text-white">{character?.emoji} {character?.name}</p>
                              <p className="text-[9px] text-white/70">{location?.emoji} {location?.name}</p>
                            </div>
                            <button
                              onClick={() => job.imageUrl && character && location && downloadImage(job.imageUrl, character.name, location.name)}
                              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-black/60"
                            >
                              <Download className="h-3 w-3" />
                            </button>
                          </>
                        ) : job.status === "error" ? (
                          <div className="flex h-full flex-col items-center justify-center gap-1 bg-red-500/5 p-2 text-center">
                            <AlertTriangle className="h-6 w-6 text-red-400" />
                            <p className="text-[10px] text-red-400">{character?.name}</p>
                            <p className="text-[8px] text-red-400/60">{job.error || "Failed"}</p>
                          </div>
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center gap-1 bg-surface-2/50">
                            <Loader className="h-6 w-6 animate-spin text-primary" />
                            <p className="text-[10px] text-muted-foreground">{character?.name}</p>
                            <p className="text-[8px] text-muted-foreground/50">Generating...</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
                )}

                {/* Gallery section */}
                {gallery.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2 pt-4 border-t border-border">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        <h3 className="type-secondary-heading text-muted-foreground" style={{ fontSize: '11px' }}>Gallery</h3>
                        <span className="font-mono text-[9px] text-muted-foreground/60">{gallery.length}</span>
                      </div>
                      <button onClick={clearGallery}
                        className="ui-btn-ghost flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground"
                      >
                        <Trash2 className="h-2.5 w-2.5" /> Clear
                      </button>
                    </div>
                    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                      {gallery.map((entry) => {
                        const character = CHARACTERS.find((c) => c.name === entry.character);
                        const location = LOCATIONS.find((l) => l.name === entry.location);
                        return (
                          <div
                            key={entry.id}
                            className="ui-card group relative overflow-hidden border-green-500/10 shadow-sm hover:shadow-md transition-all"
                          >
                            <div className="relative w-full overflow-hidden bg-surface-2" style={{ aspectRatio: '1 / 1' }}>
                              <img src={entry.imageUrl} alt={`${entry.character} at ${entry.location}`} className="h-full w-full object-cover" />
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent px-2 pb-1.5 pt-8">
                                <p className="text-[11px] font-bold text-white">{character?.emoji} {entry.character}</p>
                                <p className="text-[9px] text-white/70">{location?.emoji} {entry.location}</p>
                              </div>
                              <button
                                onClick={() => downloadImage(entry.imageUrl, entry.character, entry.location)}
                                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-black/60"
                              >
                                <Download className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
