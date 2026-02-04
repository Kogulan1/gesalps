"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Bell, BookOpen, User, ChevronDown, Settings, Plus, Command, Sun, Moon, Home, LogOut } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";

export function DashboardHeader() {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations('dashboard');
  
  // Check if we're on a dashboard page (including sub-pages)
  const isDashboardPage = pathname.includes('/dashboard') || 
                         pathname.includes('/settings') || 
                         pathname.includes('/projects') || 
                         pathname.includes('/datasets') || 
                         pathname.includes('/runs') || 
                         pathname.includes('/activity') || 
                         pathname.includes('/usage');
  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication state
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session?.user);
      setUser(session?.user || null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user);
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);


  // Handle logout
  const handleLogout = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
  };

  // Determine active tab based on pathname
  const getActiveTab = (tabPath: string) => {
    if (tabPath === '/dashboard' || tabPath === '/en/dashboard') {
      return pathname === `/${locale}/dashboard` || pathname === '/dashboard';
    }
    return pathname.startsWith(`/${locale}${tabPath}`) || pathname.startsWith(tabPath);
  };

  return (
    <div className="border-b border-gray-200 bg-white">
      {/* Top Header */}
      <div className="flex h-16 items-center justify-between px-6">
        {/* Left side - Logo and Team */}
        <div className="flex items-center space-x-4">
          <Link href={`/${locale}`} className="flex items-center space-x-2">
            <div className="h-6 w-6 bg-black rounded-sm flex items-center justify-center">
              <span className="text-white text-xs font-bold">G</span>
            </div>
            <span className="text-lg font-semibold text-black">
              {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}'s projects
            </span>
          </Link>
          
          {/* Plan Badge */}
          <div className="flex items-center space-x-1">
            <span className="text-sm font-medium text-gray-600">Hobby</span>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </div>
        </div>

        {/* Right side - Search, Feedback, Notifications, User */}
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Q Find..."
              className="pl-10 pr-4 py-2 w-64 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Feedback */}
          <Button variant="ghost" size="sm" className="text-gray-600 hover:text-black">
            Feedback
          </Button>

          {/* Notifications */}
          <Button variant="ghost" size="sm" className="text-gray-600 hover:text-black">
            <Bell className="h-4 w-4" />
          </Button>

          {/* Documentation */}
          <Button variant="ghost" size="sm" className="text-gray-600 hover:text-black">
            <BookOpen className="h-4 w-4" />
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="relative h-8 w-8 rounded-full p-0 bg-transparent hover:bg-transparent"
                style={{ background: 'transparent !important' }}
              >
                    <Avatar className="h-8 w-8">
            <AvatarFallback
              className="text-sm font-medium shadow-sm"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '50%'
              }}
            >
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
                    </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 bg-white border-gray-200 shadow-lg" align="end">
              <div className="flex items-center justify-start gap-3 p-4 border-b border-gray-100">
                <Avatar className="h-10 w-10">
            <AvatarFallback
              className="text-sm font-medium shadow-sm"
              style={{
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '50%'
              }}
            >
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
                </Avatar>
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium text-sm text-black">
                    {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {user?.email || 'user@gesalp.ai'}
                  </p>
                </div>
              </div>
              
                  <div className="py-1">
                    {!isDashboardPage && (
                      <DropdownMenuItem className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
                        <Link href={`/${locale}/dashboard`} className="w-full flex items-center">
                          <div className="flex items-center gap-3">
                            <User className="h-4 w-4" />
                            <span>Dashboard</span>
                          </div>
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link href={`/${locale}/settings`} className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          <Settings className="h-4 w-4" />
                          <span>Account Settings</span>
                        </div>
                      </Link>
                    </DropdownMenuItem>

                    {isDashboardPage && (
                      <DropdownMenuItem className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
                        <Link href={`/${locale}`} className="w-full flex items-center">
                          <div className="flex items-center gap-3">
                            <Home className="h-4 w-4" />
                            <span>Home Page</span>
                          </div>
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer" onClick={handleLogout}>
                      <div className="flex items-center gap-3">
                        <LogOut className="h-4 w-4" />
                        <span>Log Out</span>
                      </div>
                    </DropdownMenuItem>
                  </div>
              
              <div className="p-3 border-t border-gray-100">
                <Link href={`/${locale}/settings`} className="w-full bg-[#E0342C] text-white text-sm font-medium py-2 px-4 rounded hover:bg-[#E0342C]/90 transition-colors text-center block" style={{ color: 'white' }}>
                  Upgrade to Pro
                </Link>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-8 px-6 border-t border-gray-100">
        <nav className="flex space-x-8">
          <Link 
            href={`/${locale}/dashboard`} 
            className={`py-4 px-1 border-b-2 text-sm font-medium ${
              getActiveTab('/dashboard') 
                ? 'border-black text-black' 
                : 'border-transparent text-gray-500 hover:text-black'
            }`}
          >
            Overview
          </Link>
          <Link 
            href={`/${locale}/projects`} 
            className={`py-4 px-1 border-b-2 text-sm font-medium ${
              getActiveTab('/projects') 
                ? 'border-black text-black' 
                : 'border-transparent text-gray-500 hover:text-black'
            }`}
          >
            Projects
          </Link>
          <Link 
            href={`/${locale}/datasets`} 
            className={`py-4 px-1 border-b-2 text-sm font-medium ${
              getActiveTab('/datasets') 
                ? 'border-black text-black' 
                : 'border-transparent text-gray-500 hover:text-black'
            }`}
          >
            Datasets
          </Link>
          <Link 
            href={`/${locale}/runs`} 
            className={`py-4 px-1 border-b-2 text-sm font-medium ${
              getActiveTab('/runs') 
                ? 'border-black text-black' 
                : 'border-transparent text-gray-500 hover:text-black'
            }`}
          >
            Runs
          </Link>
          <Link 
            href={`/${locale}/activity`} 
            className={`py-4 px-1 border-b-2 text-sm font-medium ${
              getActiveTab('/activity') 
                ? 'border-black text-black' 
                : 'border-transparent text-gray-500 hover:text-black'
            }`}
          >
            Activity
          </Link>
          <Link 
            href={`/${locale}/usage`} 
            className={`py-4 px-1 border-b-2 text-sm font-medium ${
              getActiveTab('/usage') 
                ? 'border-black text-black' 
                : 'border-transparent text-gray-500 hover:text-black'
            }`}
          >
            Usage
          </Link>
          <Link 
            href={`/${locale}/settings`} 
            className={`py-4 px-1 border-b-2 text-sm font-medium ${
              getActiveTab('/settings') 
                ? 'border-black text-black' 
                : 'border-transparent text-gray-500 hover:text-black'
            }`}
          >
            Settings
          </Link>
          {/* <Link 
            href={`/${locale}/generate`} 
            className={`py-4 px-1 border-b-2 text-sm font-medium ${
              getActiveTab('/generate') 
                ? 'border-black text-black' 
                : 'border-transparent text-gray-500 hover:text-black'
            }`}
          >
            Generate
          </Link> */}
        </nav>
      </div>
    </div>
  );
}
