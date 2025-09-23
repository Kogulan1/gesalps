"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Menu, X, User, Settings, Plus, Command, Sun, Moon, Home, LogOut } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";

export function GlobalHeader() {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations('site');
  
  // Check if we're on the home page
  const isHomePage = pathname === `/${locale}` || pathname === `/${locale}/`;
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    // The auth state change listener will update the UI
  };

  const navItems = [
    { label: t('nav.products'), href: isHomePage ? '#features' : `/${locale}#features` },
    { label: t('nav.solutions'), href: isHomePage ? '#why-gesalp' : `/${locale}#why-gesalp` },
    { label: t('nav.resources'), href: isHomePage ? '#faq' : `/${locale}#faq` },
    { label: t('nav.enterprise'), href: isHomePage ? '#enterprise' : `/${locale}#enterprise` },
    { label: t('nav.docs'), href: `/${locale}/docs` },
    { label: t('nav.pricing'), href: isHomePage ? '#pricing' : `/${locale}#pricing` },
  ];

  return (
        <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href={`/${locale}`} className="flex items-center space-x-2">
          <div className="flex items-center space-x-3">
            <span className="text-xl font-bold text-black">
              GESALP
            </span>
            <div className="h-8 w-8 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 331 357" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g transform="translate(0,357) scale(0.1,-0.1)" fill="#E0342C" stroke="none">
                  <path d="M1444 2667 c-38 -33 -40 -90 -2 -121 23 -19 26 -29 30 -101 3 -77 5
                  -83 41 -125 l37 -44 0 -103 0 -104 -32 3 c-31 3 -33 5 -34 46 -1 39 -8 49 -88
                  132 l-86 89 0 75 c0 65 3 77 20 86 21 11 36 52 31 85 -3 29 -39 55 -76 55 -73
                  0 -96 -93 -33 -138 15 -11 18 -27 18 -90 l0 -78 89 -94 c97 -102 101 -112 101
                  -227 l0 -63 -59 0 -59 0 -112 120 c-92 99 -117 120 -141 120 -19 0 -38 10 -57
                  32 -53 55 -135 30 -135 -42 0 -69 84 -99 129 -47 39 46 56 37 187 -99 l120
                  -125 61 2 c59 3 61 2 64 -24 l3 -27 -138 0 -139 0 -69 70 -69 70 -93 0 c-85 0
                  -94 2 -117 25 -49 48 -126 20 -126 -45 0 -38 39 -80 75 -80 25 0 65 31 65 50
                  0 6 38 10 93 10 l93 0 69 -70 c62 -62 74 -70 108 -70 37 0 38 -1 35 -32 -3
                  -32 -5 -33 -50 -36 -40 -3 -53 2 -93 32 -26 20 -54 36 -63 36 -9 0 -25 11 -37
                  25 -33 40 -69 42 -105 7 -35 -36 -38 -60 -9 -96 28 -35 81 -36 113 -1 30 32
                  48 32 89 -4 28 -25 44 -30 93 -33 56 -3 59 -4 62 -30 l3 -28 -114 0 c-108 0
                  -115 -1 -137 -25 -31 -33 -72 -33 -104 0 -49 49 -126 17 -126 -53 0 -71 79
                  -97 130 -42 15 17 38 30 50 30 12 0 38 14 57 30 34 30 35 31 136 28 l102 -3 3
                  -32 3 -33 -65 0 -65 0 -67 -75 -67 -75 -116 0 c-111 0 -117 1 -126 22 -15 33
                  -60 46 -93 27 -36 -20 -49 -58 -33 -97 24 -58 91 -62 127 -7 16 24 19 25 132
                  25 l116 0 77 76 c77 75 78 75 126 72 43 -3 48 -6 51 -28 2 -20 -24 -52 -126
                  -157 -124 -128 -129 -133 -169 -133 -33 0 -48 6 -73 31 -26 26 -36 30 -63 25
                  -40 -8 -57 -30 -57 -75 0 -41 7 -54 35 -69 32 -16 76 -3 94 29 14 26 21 29 68
                  29 l52 0 127 130 c70 72 131 130 136 130 4 0 8 -35 8 -78 l0 -78 -75 -74 -75
                  -74 0 -91 c0 -88 -1 -91 -30 -117 -57 -49 -29 -128 45 -128 79 0 101 90 33
                  138 -15 11 -18 27 -18 94 l0 80 68 71 c37 40 70 73 75 75 4 2 7 39 7 82 0 95
                  5 110 36 110 l24 0 0 -139 0 -139 -31 -32 c-26 -26 -30 -36 -25 -63 8 -40 23
                  -55 61 -63 22 -4 38 0 58 16 38 30 37 79 -3 120 l-31 31 3 132 3 132 28 3 27
                  3 2 -73 c1 -40 2 -89 2 -108 1 -23 6 -35 16 -36 8 0 27 -2 43 -2 l27 -2 0 -96
                  0 -96 -65 -70 -65 -70 0 -78 c0 -72 -2 -80 -25 -97 -36 -26 -44 -84 -16 -112
                  42 -42 131 -15 131 40 0 26 -18 61 -42 77 -14 11 -18 27 -18 84 l0 70 65 64
                  65 64 0 57 c0 32 3 82 6 111 6 49 8 52 35 52 l29 0 0 -203 0 -203 -30 -26
                  c-75 -66 5 -180 87 -123 11 8 24 26 27 40 7 29 -15 79 -39 88 -13 6 -15 37
                  -15 217 l0 210 30 0 c28 0 30 -2 31 -42 1 -24 1 -65 0 -92 -1 -48 0 -50 79
                  -132 77 -80 80 -86 80 -130 0 -38 -6 -53 -31 -81 -24 -28 -29 -41 -24 -62 9
                  -39 39 -64 75 -63 72 2 96 80 40 132 -26 25 -30 35 -30 83 0 55 0 56 -76 137
                  l-77 81 -1 82 -1 82 30 0 c28 0 30 -3 33 -41 3 -36 12 -50 92 -129 72 -71 90
                  -85 96 -72 5 13 -15 39 -75 100 l-81 82 2 55 c2 42 7 56 20 58 10 2 56 -37
                  122 -104 l106 -108 0 -73 c0 -68 -2 -74 -30 -100 -57 -50 -30 -133 43 -133 40
                  0 77 34 77 72 0 16 -12 37 -30 55 -29 27 -30 31 -30 114 l0 86 -110 109 c-71
                  69 -120 111 -138 114 -22 4 -27 10 -27 35 l0 30 84 3 83 3 104 -101 103 -100
                  95 0 c92 0 95 -1 124 -30 34 -34 50 -36 92 -15 33 17 44 43 35 85 -8 36 -24
                  49 -67 57 -30 4 -38 1 -61 -26 -25 -31 -27 -31 -119 -31 l-93 0 -95 95 -94 94
                  -95 3 c-77 2 -96 6 -96 18 0 12 19 16 102 18 l102 3 3 37 3 37 103 3 103 3 57
                  -56 56 -55 73 0 c67 0 74 -2 90 -26 51 -79 169 -22 133 65 -23 55 -103 62
                  -130 11 -9 -17 -20 -20 -83 -20 l-73 0 -54 55 -54 54 -110 3 c-111 3 -111 3
                  -111 28 l0 25 163 3 163 2 25 -30 c31 -36 69 -39 108 -9 54 42 19 129 -52 129
                  -23 0 -37 -8 -54 -30 l-22 -31 -158 2 c-167 2 -186 7 -173 49 6 19 14 20 128
                  20 l122 1 40 39 c35 36 45 40 88 40 41 0 53 -5 77 -30 33 -35 67 -38 104 -9
                  18 14 26 30 26 53 0 78 -86 105 -142 45 -23 -25 -34 -29 -77 -29 -46 0 -55 -4
                  -93 -40 l-41 -41 -116 3 -116 3 -3 33 -3 32 56 0 57 0 83 85 84 85 87 0 c84 0
                  89 -1 113 -29 35 -39 71 -46 105 -20 55 43 23 129 -48 129 -33 0 -66 -21 -66
                  -41 0 -5 -46 -9 -102 -9 l-103 0 -85 -85 -85 -85 -153 7 -152 6 0 29 0 28 88
                  0 87 0 120 120 c131 132 158 145 191 94 14 -21 23 -25 57 -22 73 5 99 76 47
                  128 -29 29 -67 25 -100 -10 -18 -20 -38 -30 -57 -30 -23 0 -51 -23 -152 -125
                  l-124 -125 -79 0 -78 0 0 114 c0 92 3 115 15 120 8 3 21 18 27 33 7 15 26 41
                  41 57 23 24 28 35 23 60 -9 47 -42 69 -93 63 l-43 -5 0 62 c0 56 3 64 30 88
                  58 51 30 138 -44 138 -25 0 -40 -7 -55 -26 -29 -37 -26 -70 9 -106 27 -26 30
                  -36 30 -89 0 -53 -3 -63 -35 -98 l-35 -38 0 -127 0 -126 -30 0 -30 0 0 142 c0
                  140 0 143 25 163 14 11 28 34 31 52 13 65 -78 111 -126 63 -28 -28 -27 -85 4
                  -113 20 -19 24 -34 29 -117 3 -52 3 -117 0 -143 -5 -45 -7 -48 -32 -45 l-26 3
                  -3 109 c-3 109 -3 109 -37 148 -34 37 -35 41 -35 119 0 75 2 83 25 101 47 37
                  25 119 -36 133 -19 5 -34 0 -55 -18z m74 -29 c19 -19 14 -56 -9 -68 -16 -9
                  -26 -8 -45 5 -27 17 -29 27 -14 56 12 21 50 25 68 7z m340 0 c32 -32 1 -85
                  -42 -74 -31 8 -40 33 -21 62 17 26 44 31 63 12z m-540 -40 c34 -34 -6 -90 -48
                  -68 -35 19 -20 80 20 80 9 0 21 -5 28 -12z m372 -132 c28 -35 -11 -93 -47 -70
                  -36 22 -23 84 17 84 10 0 23 -7 30 -14z m238 -108 c17 -17 15 -53 -3 -68 -12
                  -10 -21 -10 -40 -2 -40 19 -29 82 15 82 9 0 21 -5 28 -12z m-72 -88 c30 -29
                  30 -37 2 -67 -15 -16 -23 -40 -26 -78 -4 -54 -6 -56 -31 -53 l-26 3 -3 114
                  c-3 113 -2 115 25 143 l28 30 3 -35 c2 -21 13 -44 28 -57z m-861 -56 c24 -24
                  16 -68 -13 -72 -13 -2 -30 2 -38 8 -19 17 -18 57 4 69 23 14 28 14 47 -5z
                  m1439 3 c26 -19 18 -71 -12 -75 -46 -7 -69 40 -36 72 19 19 25 20 48 3z m216
                  -192 c15 -18 6 -61 -16 -69 -26 -10 -54 12 -54 43 0 15 3 31 7 34 12 12 50 7
                  63 -8z m-1835 -45 c0 -33 -2 -35 -35 -35 -29 0 -36 4 -38 23 -5 32 16 54 47
                  50 22 -3 26 -8 26 -38z m1817 -146 c11 -23 10 -29 -11 -45 -39 -31 -85 6 -61
                  50 16 31 57 28 72 -5z m-1652 -9 c27 -32 -23 -82 -55 -55 -15 13 -20 51 -8 63
                  12 12 50 7 63 -8z m1550 -160 c15 -18 6 -61 -14 -68 -25 -10 -56 5 -62 29 -8
                  30 11 54 41 54 12 0 28 -7 35 -15z m-1666 -48 c38 -27 -2 -95 -41 -71 -24 15
                  -28 48 -8 68 20 19 26 20 49 3z m1792 -155 c31 -21 18 -72 -19 -72 -27 0 -47
                  17 -47 40 0 32 38 51 66 32z m-1928 -66 c5 -23 -16 -46 -42 -46 -46 0 -62 48
                  -24 74 19 13 25 14 43 2 11 -7 21 -21 23 -30z m1832 -176 c12 -22 0 -55 -22
                  -63 -39 -13 -74 37 -48 68 18 21 57 19 70 -5z m-1696 -12 c15 -24 -3 -52 -37
                  -56 -33 -4 -53 28 -37 59 14 25 58 23 74 -3z m554 -90 c34 -34 -6 -90 -48 -68
                  -35 19 -20 80 20 80 9 0 21 -5 28 -12z m-236 -233 c8 -19 8 -28 -2 -40 -25
                  -30 -80 -12 -80 25 0 44 63 55 82 15z m977 -24 c37 -37 -2 -86 -49 -61 -24 13
                  -26 37 -3 62 20 23 28 23 52 -1z m-461 -116 c6 -53 -61 -71 -74 -19 -8 32 13
                  56 45 52 20 -2 27 -9 29 -33z m250 -7 c16 -16 15 -53 -3 -68 -19 -16 -45 -10
                  -61 15 -26 39 31 86 64 53z m-472 -63 c9 -23 -15 -55 -42 -55 -17 0 -28 8 -36
                  26 -11 23 -10 29 11 45 18 15 27 16 42 8 11 -6 22 -16 25 -24z"/>
                  <path d="M2046 2559 c-36 -28 -36 -86 -1 -119 22 -21 25 -31 25 -98 l0 -74
                  -80 -87 c-73 -80 -80 -92 -80 -129 0 -43 16 -64 31 -41 5 8 9 30 9 49 0 31 10
                  46 80 115 l80 80 0 78 c0 74 2 80 30 109 39 38 40 80 4 113 -33 30 -63 32 -98
                  4z m79 -59 c0 -29 -4 -36 -23 -38 -43 -6 -69 37 -40 66 7 7 24 12 38 10 21 -3
                  25 -8 25 -38z"/>
                </g>
              </svg>
            </div>
            <span className="text-xl font-bold text-[#E0342C]">
              AI
            </span>
          </div>
        </Link>

        {/* Navigation - Desktop */}
        <nav className="hidden items-center space-x-8 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-gray-600 hover:text-black transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild className="text-gray-600 hover:text-black hover:bg-gray-100">
            <Link href="#pricing">{t('nav.contact')}</Link>
          </Button>
          
          
          {isAuthenticated ? (
            <>
              <Button variant="outline" size="sm" asChild className="border-gray-300 text-gray-600 hover:text-black hover:bg-gray-100">
                <Link href={`/${locale}/dashboard`}>{t('nav.dashboard')}</Link>
              </Button>
              
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
                    {!isHomePage && (
                      <DropdownMenuItem className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
                        <Link href={`/${locale}/dashboard`} className="w-full flex items-center">
                          <div className="flex items-center gap-3">
                            <User className="h-4 w-4" />
                            <span>Dashboard</span>
                          </div>
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
                      <Link href={`/${locale}/settings`} className="w-full flex items-center">
                        <div className="flex items-center gap-3">
                          <Settings className="h-4 w-4" />
                          <span>Account Settings</span>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
                      <Link href={`/${locale}/teams`} className="w-full flex items-center">
                        <div className="flex items-center gap-3">
                          <Plus className="h-4 w-4" />
                          <span>Create Team</span>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Command className="h-4 w-4" />
                        <span>Command Menu</span>
                        <span className="ml-auto text-xs text-gray-400">⌘K</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Sun className="h-4 w-4" />
                        <span>Theme</span>
                        <div className="flex gap-1 ml-auto">
                          <Sun className="h-3 w-3" />
                          <Moon className="h-3 w-3" />
                        </div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer" onClick={handleLogout}>
                      <div className="flex items-center gap-3">
                        <LogOut className="h-4 w-4" />
                        <span>Log Out</span>
                      </div>
                    </DropdownMenuItem>
                  </div>
                  
                  <div className="p-3 border-t border-gray-100">
                    <button className="w-full bg-black text-white text-sm font-medium py-2 px-4 rounded hover:bg-gray-800 transition-colors">
                      Upgrade to Pro
                    </button>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" asChild className="text-gray-600 hover:text-black hover:bg-gray-100">
                <Link href={`/${locale}/signin`}>{t('nav.signin')}</Link>
              </Button>
                  <Button size="sm" asChild style={{ backgroundColor: '#E0342C', color: 'white' }}>
                <Link href={`/${locale}/signup`}>{t('nav.signup')}</Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="px-4 py-2 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block px-3 py-2 text-sm font-medium text-gray-600 hover:text-black hover:bg-gray-50 rounded-md"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <Link
                    href="#pricing"
                    className="block px-3 py-2 text-sm font-medium text-gray-600 hover:text-black hover:bg-gray-50 rounded-md"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {t('nav.contact')}
                  </Link>
              {isAuthenticated ? (
                <>
                  <Link
                    href={`/${locale}/dashboard`}
                    className="block px-3 py-2 text-sm font-medium text-gray-600 hover:text-black hover:bg-gray-50 rounded-md"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {t('nav.dashboard')}
                  </Link>
                  <button
                    className="block w-full text-left px-3 py-2 text-sm font-medium text-red-600 hover:bg-gray-50 rounded-md"
                    onClick={() => {
                      console.log("Sign out");
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    {t('nav.logout')}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href={`/${locale}/signin`}
                    className="block px-3 py-2 text-sm font-medium text-gray-600 hover:text-black hover:bg-gray-50 rounded-md"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {t('nav.signin')}
                  </Link>
                  <Link
                    href={`/${locale}/signup`}
                    className="block px-3 py-2 text-sm font-medium text-white bg-[#E0342C] hover:bg-[#E0342C]/90 rounded-md"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {t('nav.signup')}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
