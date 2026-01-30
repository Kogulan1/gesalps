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
  Save
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { useToast } from "@/components/toast/Toaster";

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
    company: ""
  });
  
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

      const token = session.access_token;
      const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_BASE || 'http://localhost:8000';
      
      const res = await fetch(`${apiBase}/v1/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error("Failed to fetch profile");

      const data = await res.json();
      setUser(data);
      setFormData({
        full_name: data.full_name || "",
        phone: data.phone || "",
        location: data.location || "",
        company: data.company || ""
      });
    } catch (error) {
      console.error("Error loading profile:", error);
      toast({
        title: "Error loading profile",
        description: "Could not fetch your settings. Please try again.",
        variant: "error"
      });
    } finally {
      setLoading(false);
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

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Settings */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-black flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Profile</span>
            </CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input 
                id="location" 
                value={formData.location}
                onChange={handleChange}
                placeholder="San Francisco, CA" 
                className="border-gray-300"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleSave} disabled={saving} className="w-full bg-black hover:bg-gray-800 text-white">
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

        <div className="space-y-6">
            {/* Notification Settings */}
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
                <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                    <Label>Run Completed</Label>
                    <p className="text-sm text-gray-500">Notify when runs finish</p>
                </div>
                <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                    <Label>Marketing</Label>
                    <p className="text-sm text-gray-500">Product updates and tips</p>
                </div>
                <Switch />
                </div>
            </CardContent>
            </Card>

            {/* API Settings */}
            <Card className="border-gray-200 shadow-sm">
            <CardHeader>
                <CardTitle className="text-black flex items-center space-x-2">
                <Key className="h-5 w-5" />
                <span>API Keys</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                <Label>Current API Key</Label>
                <div className="flex items-center space-x-2">
                    <Input 
                    value="ges_sk_********************" 
                    className="border-gray-300 font-mono text-sm"
                    readOnly
                    type="password"
                    />
                    <Button variant="outline" size="sm">
                    View
                    </Button>
                </div>
                </div>
                <div className="flex space-x-2">
                <Button variant="outline" className="flex-1">
                    Regenerate Key
                </Button>
                <Button variant="outline" className="flex-1">
                    View Docs
                </Button>
                </div>
            </CardContent>
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
                    <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50">
                        Delete
                    </Button>
                </div>
            </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
