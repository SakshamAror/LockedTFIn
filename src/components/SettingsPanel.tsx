import { useState } from "react";
import { Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface UserSettings {
  apiKey: string;
  email: string;
  canvasUsername: string;
  canvasPassword: string;
}

export function getSettings(): UserSettings {
  return {
    apiKey: localStorage.getItem("bu_api_key") || "",
    email: localStorage.getItem("bu_email") || "",
    canvasUsername: localStorage.getItem("canvas_username") || "",
    canvasPassword: localStorage.getItem("canvas_password") || "",
  };
}

export function SettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("bu_api_key") || "");
  const [email, setEmail] = useState(() => localStorage.getItem("bu_email") || "");
  const [canvasUsername, setCanvasUsername] = useState(() => localStorage.getItem("canvas_username") || "");
  const [canvasPassword, setCanvasPassword] = useState(() => localStorage.getItem("canvas_password") || "");

  const handleSave = () => {
    localStorage.setItem("bu_api_key", apiKey);
    localStorage.setItem("bu_email", email);
    localStorage.setItem("canvas_username", canvasUsername);
    localStorage.setItem("canvas_password", canvasPassword);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="glass rounded-xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground font-display">Setup</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Email & Browser Use */}
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Email & Browser Use</p>
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

          {/* Canvas SSO */}
          <div className="border-t border-border/50 pt-4 mt-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">UCSD Canvas (SSO)</p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="canvasUsername" className="text-xs text-muted-foreground">UCSD SSO Username</Label>
                <Input
                  id="canvasUsername"
                  type="text"
                  placeholder="your_username"
                  value={canvasUsername}
                  onChange={(e) => setCanvasUsername(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="canvasPassword" className="text-xs text-muted-foreground">UCSD SSO Password</Label>
                <Input
                  id="canvasPassword"
                  type="password"
                  placeholder="••••••••"
                  value={canvasPassword}
                  onChange={(e) => setCanvasPassword(e.target.value)}
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Used to log into{" "}
                <a href="https://canvas.ucsd.edu" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  UCSD Canvas
                </a>{" "}
                via SSO. You'll need to approve the Duo 2FA push.
              </p>
            </div>
          </div>
        </div>

        <Button onClick={handleSave} className="w-full mt-5">
          Save Setup
        </Button>
      </div>
    </div>
  );
}
