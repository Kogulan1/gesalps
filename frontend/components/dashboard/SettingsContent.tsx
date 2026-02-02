"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  User, 
  Bell, 
  Shield, 
  Key, 
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Save,
  LogOut,
  Laptop,
  Copy
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { useToast } from "@/components/toast/Toaster";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { scorePassword } from "@/lib/password";

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  location?: string;
  company?: string;
  avatar_url?: string;
  created_at: string;
}

export function SettingsContent() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    location: "",
    company: "",
    notifications: {
      email_notifications: true,
      run_completed: true,
      marketing: false
    }
  });
  
  // API Key State
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [generatingKey, setGeneratingKey] = useState(false);
  
  // Delete Account State
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Password State
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const strength = scorePassword(password);

  // Session State
  const [signingOutAll, setSigningOutAll] = useState(false);
  
  const supabase = createSupabaseBrowserClient();
  const { toast } = useToast();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Initialize with Supabase session data first (fallback/optimistic)
      const sessionUser = session.user;
      const metadata = sessionUser.user_metadata || {};
      
      const initialData = {
        full_name: metadata.full_name || "",
        phone: metadata.phone || "",
        location: metadata.location || "",
        company: metadata.company || "",
        notifications: {
          email_notifications: metadata.notifications?.email_notifications ?? true,
          run_completed: metadata.notifications?.run_completed ?? true,
          marketing: metadata.notifications?.marketing ?? false
        }
      };

      setUser({
        id: sessionUser.id,
        email: sessionUser.email || "",
        created_at: sessionUser.created_at,
        ...initialData
      });
      setFormData(initialData);

      const token = session.access_token;
      const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_BASE || 'http://localhost:8000';
      
      // Try to fetch deeper profile data from backend, but don't block on it
      try {
        const res = await fetch(`${apiBase}/v1/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (res.ok) {
          const data = await res.json();
          setUser(prev => ({ ...prev, ...data }));
          setFormData(prev => ({
            full_name: data.full_name || prev.full_name,
            phone: data.phone || prev.phone,
            location: data.location || prev.location,
            company: data.company || prev.company,
            notifications: {
              email_notifications: data.raw_user_meta_data?.notifications?.email_notifications ?? prev.notifications.email_notifications,
              run_completed: data.raw_user_meta_data?.notifications?.run_completed ?? prev.notifications.run_completed,
              marketing: data.raw_user_meta_data?.notifications?.marketing ?? prev.notifications.marketing
            }
          }));
        }
      } catch (apiError) {
        console.warn("Backend profile fetch failed, using session defaults", apiError);
        // We suppress the toast here because we already showed the session data, 
        // causing less friction for the user.
      }

    } catch (error) {
      console.error("Error loading profile:", error);
      toast({
        title: "Error looking up session",
        description: "Please try reloading the page.",
        variant: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationChange = (key: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: checked
      }
    }));
    // Auto-save triggers on next render or we can debounce. 
    // Ideally we'd debounce, but for simplicity we'll just let the user hit Save 
    // OR we trigger a save immediately. Let's trigger save immediately for better UX.
    // However, handleSave reads from state, so we need to pass the new state or wait.
    // For this implementation, we will update the state and prompt the user to "Save Changes" 
    // effectively treating it like the profile form.
  };

  const handleRegenerateKey = async () => {
    try {
      setGeneratingKey(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const token = session.access_token;
      const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_BASE || 'http://localhost:8000';
      
      const res = await fetch(`${apiBase}/v1/auth/api-keys`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error("Failed to generate key");
      
      const data = await res.json();
      setApiKey(data.api_key);
      toast({ title: "API Key Generated", description: "Copy it now, you won't see it again!", variant: "success" });
    } catch (error) {
       toast({ title: "Failed to generate key", variant: "error" });
    } finally {
      setGeneratingKey(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you ABSOLUTELY SURE? This cannot be undone.")) return;
    
    try {
      setDeletingAccount(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const token = session.access_token;
      const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_BASE || 'http://localhost:8000';
      
      const res = await fetch(`${apiBase}/v1/auth/me`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error("Failed to delete account");
      
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (error) {
       toast({ title: "Failed to delete account", variant: "error" });
       setDeletingAccount(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Unauthorized", variant: "error" });
        return;
      }

      const token = session.access_token;
      const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_BASE || 'http://localhost:8000';
      
      const res = await fetch(`${apiBase}/v1/auth/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) throw new Error("Failed to update profile");

      toast({
        title: "Profile updated",
        description: "Your settings have been saved successfully.",
      });
      
      // Refresh local user data
      fetchProfile();
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Update failed",
        description: "Could not save your changes. Please try again.",
        variant: "error"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-gray-600">Manage your account and preferences</p>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          {/* <TabsTrigger value="api">API Keys</TabsTrigger> */}
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-black flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Profile</span>
              </CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                 <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input 
                    id="full_name" 
                    value={formData.full_name}
                    onChange={handleChange}
                    placeholder="Your Name"
                    className="border-gray-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company / Organization</Label>
                  <Input 
                    id="company" 
                    value={formData.company}
                    onChange={handleChange}
                    placeholder="Gesalp AI"
                    className="border-gray-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={user?.email || ""} 
                    className="border-gray-300 bg-gray-50"
                    disabled
                  />
                  <p className="text-xs text-gray-500">Email cannot be changed via profile settings.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input 
                    id="phone" 
                    type="tel" 
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+1 (555) 123-4567" 
                    className="border-gray-300"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="location">Location</Label>
                  <Input 
                    id="location" 
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="San Francisco, CA" 
                    className="border-gray-300"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave} disabled={saving} className="bg-black hover:bg-gray-800 text-white">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
           
          {/* Danger Zone */}
          <Card className="border-red-200 shadow-sm bg-red-50/10">
            <CardHeader>
              <CardTitle className="text-red-600 flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5" />
                <span>Danger Zone</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-red-900">Delete Account</h4>
                  <p className="text-sm text-red-700">
                    Permanently delete your account and all data.
                  </p>
                </div>
                <Button 
                   variant="outline" 
                   className="border-red-300 text-red-600 hover:bg-red-50"
                   onClick={handleDeleteAccount}
                   disabled={deletingAccount}
                >
                  {deletingAccount ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-black flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Password</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>New password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                <div className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">
                  Strength: {(["Very weak","Weak","Fair","Good","Strong"] as const)[strength.score]}
                </div>
              </div>
              <div>
                <Label>Confirm password</Label>
                <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
              <Button
                onClick={async () => {
                  if (password !== confirm) { toast({ title: "Passwords don't match", variant: "error" }); return; }
                  if (strength.score < 2) { toast({ title: "Password too weak", description: "Improve strength before saving.", variant: "error" }); return; }
                  setSavingPassword(true);
                  const { error } = await supabase.auth.updateUser({ password });
                  setSavingPassword(false);
                  if (error) toast({ title: "Couldn't update password", description: error.message, variant: "error" });
                  else toast({ title: "Password updated", variant: "success" });
                  setPassword(""); setConfirm("");
                }}
                disabled={savingPassword || !password}
              >
                {savingPassword ? "Saving…" : "Update password"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-black flex items-center space-x-2">
                 <Laptop className="h-5 w-5" />
                 <span>Sessions</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-neutral-600 dark:text-neutral-300">
                Sign out from this and all other devices.
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={signingOutAll}
                  onClick={async () => {
                    setSigningOutAll(true);
                    const { error } = await supabase.auth.signOut({ scope: "global" as any });
                    setSigningOutAll(false);
                    if (error) toast({ title: "Failed to sign out everywhere", description: error.message, variant: "error" });
                    else window.location.href = `/signin`;
                  }}
                >
                  {signingOutAll ? "Signing out…" : "Sign out everywhere"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-black flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Notifications</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-gray-500">Receive updates via email</p>
                </div>
                <Switch 
                  checked={formData.notifications.email_notifications}
                  onCheckedChange={(c) => handleNotificationChange('email_notifications', c)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Run Completed</Label>
                  <p className="text-sm text-gray-500">Notify when runs finish</p>
                </div>
                <Switch 
                  checked={formData.notifications.run_completed}
                  onCheckedChange={(c) => handleNotificationChange('run_completed', c)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Marketing</Label>
                  <p className="text-sm text-gray-500">Product updates and tips</p>
                </div>
                <Switch 
                  checked={formData.notifications.marketing}
                  onCheckedChange={(c) => handleNotificationChange('marketing', c)}
                />
              </div>
              <div className="pt-4 border-t border-gray-100">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save Preferences"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 
        <TabsContent value="api" className="space-y-4">
           <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-black flex items-center space-x-2">
                <Key className="h-5 w-5" />
                <span>API Keys</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Your API Key</Label>
                <div className="flex items-center space-x-2">
                  <Input 
                    value={apiKey || "Click regenerate to get a key"} 
                    className="border-gray-300 font-mono text-sm"
                    readOnly
                    type={apiKey ? "text" : "password"}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (!apiKey) return;
                      navigator.clipboard.writeText(apiKey);
                      toast({ title: "Copied to clipboard", variant: "success" });
                    }}
                    disabled={!apiKey}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" className="flex-1" onClick={handleRegenerateKey} disabled={generatingKey}>
                  {generatingKey ? "Generating..." : "Regenerate Key"}
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => window.open('/docs', '_blank')}>
                  View Docs
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent> 
        */}
      </Tabs>
      </div>
  );
}
