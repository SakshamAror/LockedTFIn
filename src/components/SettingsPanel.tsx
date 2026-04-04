import { useState } from "react";
import { Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface UserSettings {
  apiKey: string;
  email: string;
}

export function getSettings(): UserSettings {
  return {
    apiKey: localStorage.getItem("bu_api_key") || "",
    email: localStorage.getItem("bu_email") || "",
  };
}

export function SettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("bu_api_key") || "");
  const [email, setEmail] = useState(() => localStorage.getItem("bu_email") || "");

  const handleSave = () => {
    localStorage.setItem("bu_api_key", apiKey);
    localStorage.setItem("bu_email", email);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="glass rounded-xl p-6 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground font-display">Settings</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs text-muted-foreground">Gmail Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="apiKey" className="text-xs text-muted-foreground">Browser Use API Key</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="bu_..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">
              Get your key at{" "}
              <a href="https://cloud.browser-use.com/settings" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                cloud.browser-use.com
              </a>
            </p>
          </div>
        </div>

        <Button onClick={handleSave} className="w-full mt-5">
          Save Settings
        </Button>
      </div>
    </div>
  );
}
