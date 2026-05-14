"use client";

// MIT License - Copyright (c) 2026 kiritigowda
// See LICENSE file for details.

import { useState, useCallback, useEffect } from "react";
import { Sparkles, Loader, Play, Download, CheckCircle, AlertTriangle } from "lucide-react";

interface Character {
  id: string;
  name: string;
  color: string;
}

interface Location {
  id: string;
  name: string;
}

interface GeneratedImage {
  character: string;
  location: string;
  prompt: string;
  status: "pending" | "queued" | "running" | "success" | "error";
  filename?: string;
  imageUrl?: string;
  error?: string;
}

export function ImageGenerationDemo() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [comfyOnline, setComfyOnline] = useState<boolean | null>(null);
  const [selectedCharacters, setSelectedCharacters] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<GeneratedImage[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load available options on mount
  useEffect(() => {
    fetch("/api/image-generation-demo")
      .then((res) => res.json())
      .then((data) => {
        setCharacters(data.characters);
        setLocations(data.locations);
        setComfyOnline(data.comfyui.online);
      })
      .catch(() => setComfyOnline(false));
  }, []);

  const toggleCharacter = useCallback((id: string) => {
    setSelectedCharacters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedCharacters(new Set(characters.map((c) => c.id)));
  }, [characters]);

  const deselectAll = useCallback(() => {
    setSelectedCharacters(new Set());
  }, []);

  const startGeneration = useCallback(async () => {
    if (selectedCharacters.size === 0) return;

    setGenerating(true);
    setError(null);
    setResults([]);

    try {
      const res = await fetch("/api/image-generation-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characters: Array.from(selectedCharacters),
          count: selectedCharacters.size,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setResults(data.jobs);
      } else {
        setError(data.error || "Generation failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start generation");
    } finally {
      setGenerating(false);
    }
  }, [selectedCharacters]);

  const startComfyUI = useCallback(async () => {
    try {
      const res = await fetch("/api/image-generation-demo", { method: "PUT" });
      const data = await res.json();
      if (data.success) {
        setComfyOnline(true);
      }
    } catch {
      // Ignore
    }
  }, []);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Image Generation Demo
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Generate Disney Cars characters in San Francisco locations
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!comfyOnline && (
            <button
              onClick={startComfyUI}
              className="ui-btn-primary flex items-center gap-2 text-sm"
            >
              <Play className="h-4 w-4" />
              Start ComfyUI
            </button>
          )}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium ${
              comfyOnline
                ? "bg-green-500/10 text-green-400 border border-green-500/30"
                : "bg-red-500/10 text-red-400 border border-red-500/30"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                comfyOnline ? "bg-green-400" : "bg-red-400"
              }`}
            />
            ComfyUI {comfyOnline ? "Online" : "Offline"}
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-md bg-red-500/10 border border-red-500/30 text-red-400">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400/70 hover:text-red-400"
          >
            ×
          </button>
        </div>
      )}

      {/* Character Selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Select Characters</h3>
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Select All
            </button>
            <span className="text-muted-foreground">·</span>
            <button
              onClick={deselectAll}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {characters.map((char) => {
            const selected = selectedCharacters.has(char.id);
            return (
              <button
                key={char.id}
                onClick={() => toggleCharacter(char.id)}
                disabled={generating}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                  selected
                    ? "bg-primary/10 border-primary/30 text-foreground"
                    : "bg-surface-2 border-border text-muted-foreground hover:border-primary/30"
                }`}
              >
                <span
                  className="h-3 w-3 rounded-full"
                  style={{
                    backgroundColor:
                      char.color === "multicolor"
                        ? "linear-gradient(45deg, #ff0000, #00ff00, #0000ff)"
                        : char.color,
                  }}
                />
                <span className="truncate">{char.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Generate Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={startGeneration}
          disabled={generating || selectedCharacters.size === 0 || !comfyOnline}
          className="ui-btn-primary flex items-center gap-2 px-6 py-3 text-base"
        >
          {generating ? (
            <>
              <Loader className="h-5 w-5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              Generate {selectedCharacters.size > 0 && selectedCharacters.size} Images
            </>
          )}
        </button>
        <span className="text-sm text-muted-foreground">
          {selectedCharacters.size} selected
        </span>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-medium flex items-center gap-2">
            Generated Images
            <span className="text-sm text-muted-foreground font-normal">
              ({results.filter((r) => r.status === "success").length} /
              {results.length})
            </span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {results.map((result, index) => {
              const char = characters.find((c) => c.id === result.character);
              const loc = locations.find((l) => l.id === result.location);

              return (
                <div
                  key={index}
                  className="relative aspect-square rounded-lg overflow-hidden border border-border bg-surface-2 group"
                >
                  {result.status === "success" && result.imageUrl ? (
                    <>
                      <img
                        src={result.imageUrl}
                        alt={`${char?.name} at ${loc?.name}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3">
                        <p className="text-white font-medium text-sm">
                          {char?.name}
                        </p>
                        <p className="text-white/70 text-xs">{loc?.name}</p>
                      </div>
                      <a
                        href={result.imageUrl}
                        download
                        className="absolute top-2 right-2 p-2 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                      <div className="absolute top-2 left-2">
                        <CheckCircle className="h-5 w-5 text-green-400" />
                      </div>
                    </>
                  ) : result.status === "error" ? (
                    <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                      <AlertTriangle className="h-10 w-10 text-red-400 mb-2" />
                      <p className="text-red-400 font-medium text-sm">
                        {char?.name}
                      </p>
                      <p className="text-red-400/60 text-xs mt-1">
                        {result.error || "Failed"}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full p-4">
                      <Loader className="h-8 w-8 text-primary animate-spin mb-2" />
                      <p className="text-muted-foreground text-sm">{char?.name}</p>
                      <p className="text-muted-foreground/50 text-xs">Generating...</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
