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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md animate-fade-in">
      <div className="glass gradient-border rounded-2xl p-7 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center ring-1 ring-primary/10">
              <Settings className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-sm font-bold text-foreground font-display tracking-tight">Settings</h2>
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-all">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Email & Browser Use */}
          <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-bold">Email & Browser Use</p>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs text-muted-foreground">Gmail Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg bg-muted/15 border-border/30 focus:border-primary/40"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apiKey" className="text-xs text-muted-foreground">Browser Use API Key</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="bu_..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="rounded-lg bg-muted/15 border-border/30 focus:border-primary/40 mono"
            />
            <p className="text-[10px] text-muted-foreground/60">
              Get your key at{" "}
              <a href="https://cloud.browser-use.com/settings" target="_blank" rel="noopener noreferrer" className="text-primary underline decoration-primary/30 underline-offset-2">
                cloud.browser-use.com
              </a>
            </p>
          </div>

          {/* Canvas SSO */}
          <div className="border-t border-border/20 pt-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-bold mb-4">UCSD Canvas (SSO)</p>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="canvasUsername" className="text-xs text-muted-foreground">SSO Username</Label>
                <Input
                  id="canvasUsername"
                  type="text"
                  placeholder="your_username"
                  value={canvasUsername}
                  onChange={(e) => setCanvasUsername(e.target.value)}
                  className="rounded-lg bg-muted/15 border-border/30 focus:border-primary/40"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="canvasPassword" className="text-xs text-muted-foreground">SSO Password</Label>
                <Input
                  id="canvasPassword"
                  type="password"
                  placeholder="••••••••"
                  value={canvasPassword}
                  onChange={(e) => setCanvasPassword(e.target.value)}
                  className="rounded-lg bg-muted/15 border-border/30 focus:border-primary/40"
                />
              </div>
              <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
                Used to log into{" "}
                <a href="https://canvas.ucsd.edu" target="_blank" rel="noopener noreferrer" className="text-primary underline decoration-primary/30 underline-offset-2">
                  UCSD Canvas
                </a>{" "}
                via SSO. You'll need to approve the Duo 2FA push.
              </p>
            </div>
          </div>
        </div>

        <Button onClick={handleSave} className="w-full mt-6 rounded-xl h-10 font-semibold bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg shadow-primary/15">
          Save Settings
        </Button>
      </div>
    </div>
  );
}
