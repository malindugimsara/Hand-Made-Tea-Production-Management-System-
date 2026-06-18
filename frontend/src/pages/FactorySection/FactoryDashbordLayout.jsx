import * as React from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TooltipProvider } from '@/components/ui/tooltip';

// --- LUCIDE ICONS ---
import {
  LayoutDashboard,
  LineChart,
  LogOut,
  ChevronRight,
  ChevronDown,
  Sun,
  Moon,
  Store,
  Coffee,
  PackagePlus,
  Proportions, 
  Search, // <-- Search icon එක අලුතින් එකතු කර ඇත
} from 'lucide-react';

// --- SHADCN COMPONENTS ---
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarRail,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';

// --- ROLE-BASED DATA CONFIGURATION ---
const DATA = {
  factory: {
    name: 'Athukorala Group',
    plan: 'Packing Section',
    logo: () => <img src="/logo.png" alt="Logo" className="w-9 h-9 object-contain" />,
  },
  quickLinks: [
    { name: 'Dashboard Home', url: '/packing', icon: LayoutDashboard },
  ],
  navMain: [
    {
      title: 'Local Sales',
      icon: Store,
      items: [
        { title: 'Local Record Entry', url: '/packing/local-record-entry', roles: ['Admin', 'Packing Officer'] },
        { title: 'Local Record View', url: '/packing/local-record-view', roles: ['Admin', 'Packing Officer', 'Viewer'] },
      ],
    },
  ],
};

export default function FactoryDashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  // --- SEARCH BAR STATE ---
  const [searchQuery, setSearchQuery] = React.useState('');

  // --- SIDEBAR HOVER & DELAY LOGIC ---
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const sidebarTimeoutRef = React.useRef(null);

  // Close sidebar by default on mobile load
  React.useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [isMobile]);

  const handleSidebarMouseEnter = () => {
    if (isMobile) return; 
    if (sidebarTimeoutRef.current) {
      clearTimeout(sidebarTimeoutRef.current);
    }
    setIsSidebarOpen(true);
  };

  const handleSidebarMouseLeave = () => {
    if (isMobile) return; 
    sidebarTimeoutRef.current = setTimeout(() => {
      setIsSidebarOpen(false);
    }, 100); 
  };

  React.useEffect(() => {
    return () => {
      if (sidebarTimeoutRef.current) clearTimeout(sidebarTimeoutRef.current);
    };
  }, []);

  // --- THEME STATE LOGIC ---
  const [isDark, setIsDark] = React.useState(false);

  React.useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    }
  }, []);

  const toggleTheme = () => {
    const root = window.document.documentElement;
    if (isDark) {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
    setIsDark(!isDark);
  };

  // --- AUTHENTICATION LOGIC ---
  const currentUsername = localStorage.getItem('username') || 'Unknown User';
  const currentUserRole = localStorage.getItem('userRole') || localStorage.getItem('role') || 'Viewer'; 

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole'); 
    localStorage.removeItem('username');
    localStorage.removeItem('role'); 
    navigate('/', { replace: true });
  };

  const getBreadcrumbTitle = () => {
    switch (location.pathname) {
      
      
      default: return 'System';
    }
  };

  const todayDateObj = new Date();
  const today = todayDateObj.toLocaleDateString('en-US', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });

  // --- SEARCH FILTERING LOGIC ---
  const filteredQuickLinks = DATA.quickLinks.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredNavMain = DATA.navMain.map(group => {
    // 1. Role එකට ගැලපෙන items විතරක් වෙන් කරගන්නවා
    const roleFilteredItems = group.items.filter(subItem => 
        subItem.roles.includes(currentUserRole)
    );

    // 2. Group title එක search එකට match වෙනවද බලනවා
    const matchesGroupTitle = group.title.toLowerCase().includes(searchQuery.toLowerCase());

    // 3. Sub-item titles search එකට match වෙනවද බලනවා (title එක match වුනොත් ඔක්කොම පෙන්නනවා)
    const searchFilteredItems = roleFilteredItems.filter(subItem => 
        matchesGroupTitle || subItem.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return {
        ...group,
        items: searchFilteredItems,
        isSearchMatch: matchesGroupTitle || searchFilteredItems.length > 0
    };
  }).filter(group => group.isSearchMatch && group.items.length > 0); // අදාළ items මොකුත් නැත්නම් ඒ group එක අයින් කරනවා

  return (
    <TooltipProvider delayDuration={0}>
    <SidebarProvider open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
      <Sidebar 
        collapsible="icon" 
        className="border-none bg-[#F4F7F5] dark:bg-zinc-950 transition-[width] duration-300 ease-in-out z-50"
        onMouseEnter={handleSidebarMouseEnter}
        onMouseLeave={handleSidebarMouseLeave}
      >
        
        <SidebarHeader className="pt-6 pb-2 px-4">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" className="hover:bg-white/50 dark:hover:bg-zinc-900 cursor-default rounded-2xl transition-all duration-300">
                  <DATA.factory.logo className="size-6" />
                <div className="grid flex-1 text-left text-sm leading-tight ml-2">
                  <span className="truncate font-bold tracking-tight text-[#1B6A31] dark:text-green-500 text-[15px] md:text-[17px]">
                    {DATA.factory.name}
                  </span>
                  <span className="truncate text-xs font-medium text-[#4A9E46] dark:text-green-600">
                    {DATA.factory.plan}
                  </span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent className="px-2 mt-4">
          
          {/* --- SEARCH BAR --- */}
          <div className="px-2 mb-2 relative z-50">
            <div className={`relative flex items-center transition-opacity duration-300 ${!isSidebarOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
              <Search className="absolute left-3 text-gray-400 dark:text-gray-500" size={16} />
              <input 
                type="text" 
                placeholder="Search pages..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 focus:border-[#1B6A31] dark:focus:border-green-600 rounded-xl py-2 pl-9 pr-4 text-sm outline-none transition-all dark:text-white shadow-sm"
              />
            </div>
          </div>

          
          
          {filteredQuickLinks.length > 0 && (
            <SidebarGroup>
                <SidebarGroupLabel className="text-xs font-bold text-gray-400 dark:text-gray-500 tracking-widest uppercase mb-2 ml-2">Overview</SidebarGroupLabel>
                <SidebarMenu>
                {filteredQuickLinks.map((item) => {
                    const isActive = location.pathname === item.url;
                    return (
                    <SidebarMenuItem key={item.name}>
                        <SidebarMenuButton 
                        asChild 
                        isActive={isActive}
                        tooltip={item.name}
                        onClick={() => {
                            navigate(item.url);
                            if (isMobile) setIsSidebarOpen(false); 
                        }}
                        className={`cursor-pointer transition-all duration-300 py-6 rounded-full mb-1 ${
                            isActive 
                            ? 'bg-white dark:bg-zinc-900 shadow-sm text-[#1B6A31] dark:text-green-500 font-bold ring-1 ring-gray-200/50 dark:ring-zinc-800' 
                            : 'text-gray-500 dark:text-gray-400 hover:text-[#1B6A31] dark:hover:text-green-500 hover:bg-white/60 dark:hover:bg-zinc-900/50'
                        }`}
                        >
                        <div className="flex items-center gap-3 px-2">
                            <item.icon className={isActive ? "text-[#4A9E46] dark:text-green-500" : ""} size={22} />
                            <span className="text-base">{item.name}</span>
                        </div>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    );
                })}
                </SidebarMenu>
            </SidebarGroup>
          )}

          {filteredNavMain.length > 0 && (
            <SidebarGroup className={filteredQuickLinks.length > 0 ? "mt-2" : ""}>
                <SidebarGroupLabel className="text-xs font-bold text-gray-400 dark:text-gray-500 tracking-widest uppercase mb-2 ml-2">Management</SidebarGroupLabel>
                <SidebarMenu>
                {filteredNavMain.map((item) => {
                    
                    const isGroupActive = item.items.some((sub) => sub.url === location.pathname);
                    // Search කරන විටදී menu එක ඉබේම expand වීමට
                    const isOpen = searchQuery.length > 0 ? true : isGroupActive;

                    return (
                    <Collapsible key={item.title + (searchQuery ? '-open' : '')} asChild defaultOpen={isOpen} className="group/collapsible mb-1">
                        <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                            <SidebarMenuButton tooltip={item.title} className="text-gray-500 dark:text-gray-400 hover:text-[#1B6A31] dark:hover:text-green-500 hover:bg-white/60 dark:hover:bg-zinc-900/50 py-6 rounded-full transition-all duration-300">
                            <div className="flex items-center gap-3 px-2 w-full">
                                {item.icon && <item.icon size={22} />}
                                <span className="text-base font-medium">{item.title}</span>
                                <ChevronRight className="ml-auto transition-transform duration-300 group-data-[state=open]/collapsible:rotate-90 opacity-50" />
                            </div>
                            </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <SidebarMenuSub className="border-l-2 border-gray-200 dark:border-zinc-800 ml-6 pl-4 mt-2 space-y-1">
                            {item.items.map((subItem) => {
                                const isSubActive = location.pathname === subItem.url;
                                return (
                                <SidebarMenuSubItem key={subItem.title}>
                                    <SidebarMenuSubButton 
                                    asChild 
                                    isActive={isSubActive}
                                    onClick={() => {
                                        navigate(subItem.url);
                                        if (isMobile) setIsSidebarOpen(false); 
                                    }}
                                    className={`cursor-pointer py-4 rounded-full transition-all duration-300 ${
                                        isSubActive 
                                        ? 'text-[#1B6A31] dark:text-green-500 font-bold bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-gray-200/50 dark:ring-zinc-800' 
                                        : 'text-gray-500 dark:text-gray-400 hover:text-[#4A9E46] dark:hover:text-green-400 hover:bg-white/40 dark:hover:bg-zinc-900/40'
                                    }`}
                                    >
                                    <div className="px-2">
                                        <span className="text-sm">{subItem.title}</span>
                                    </div>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                                );
                            })}
                            </SidebarMenuSub>
                        </CollapsibleContent>
                        </SidebarMenuItem>
                    </Collapsible>
                    );
                })}
                </SidebarMenu>
            </SidebarGroup>
          )}

        </SidebarContent>

        <SidebarRail />
      </Sidebar>

      <SidebarInset className="bg-[#F4F7F5] dark:bg-zinc-950 relative flex flex-col h-screen overflow-hidden p-2 md:p-4 w-full">
        
        {/* Adjusted top position and padding for mobile */}
        <header className="flex h-14 bg-white dark:bg-zinc-900/95 backdrop-blur-2xl border border-white dark:border-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl shrink-0 items-center justify-between gap-2 absolute top-2 left-2 right-2 md:top-4 md:left-4 md:right-4 z-40 px-3 md:px-4 transition-all">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="text-gray-400 hover:text-[#1B6A31] dark:hover:text-green-500 transition-colors" />
            <Separator orientation="vertical" className="mr-1 md:mr-2 h-5 bg-gray-200 dark:bg-zinc-700" />
            
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden lg:block">
                  <BreadcrumbLink className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 font-medium cursor-pointer transition-colors" onClick={() => navigate('/')}>
                    System
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden lg:block text-gray-300 dark:text-gray-600" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-bold text-[#1B6A31] dark:text-green-500 tracking-tight text-sm md:text-base line-clamp-1 max-w-[150px] sm:max-w-xs md:max-w-none">
                    {getBreadcrumbTitle()}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* --- TOP RIGHT CONTROLS --- */}
          <div className="flex items-center gap-2 sm:gap-4 md:mr-2">

            {/* Time - Hidden on small screens to save space */}
            <p className="hidden md:block text-sm font-medium p-4 dark:text-white">{today}</p>
            
            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme}
              title="Toggle Dark Mode"
              className="p-2 flex-shrink-0 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors text-gray-600 dark:text-gray-400 focus:outline-none"
            >
              {isDark ? <Sun size={18} className="text-yellow-500" /> : <Moon size={18} />}
            </button>

            <Separator orientation="vertical" className="h-6 bg-gray-200 dark:bg-zinc-700 hidden sm:block" />

            {/* User Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 focus:outline-none group">
                <Avatar className="h-8 w-8 md:h-9 md:w-9 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm transition-transform group-hover:scale-105">
                  <AvatarFallback className="rounded-xl bg-[#8CC63F]/20 text-[#1B6A31] dark:text-green-400 font-bold text-xs md:text-sm">
                    {currentUsername.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {/* Hide text on small screens */}
                <div className="hidden lg:grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-bold text-gray-800 dark:text-gray-200 mb-0.5">{currentUsername}</span>
                  <span className="truncate text-[10px] font-bold tracking-wider text-gray-500 dark:text-gray-400 uppercase leading-none">{currentUserRole}</span>
                </div>
                <ChevronDown className="size-4 text-gray-400 hidden lg:block transition-transform group-data-[state=open]:rotate-180" />
              </DropdownMenuTrigger>
              
              <DropdownMenuContent
                className="w-56 rounded-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-gray-100 dark:border-zinc-800 shadow-xl p-2 mt-2"
                align="end"
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-3 px-2 py-3 text-left text-sm">
                    <Avatar className="h-10 w-10 rounded-xl">
                      <AvatarFallback className="rounded-xl bg-[#8CC63F]/20 text-[#1B6A31] dark:text-green-400 font-bold">
                        {currentUsername.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-bold text-gray-900 dark:text-gray-100">{currentUsername}</span>
                      <span className="truncate text-[10px] font-bold tracking-wider uppercase text-gray-500 dark:text-gray-400 mt-0.5">{currentUserRole}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-100 dark:bg-zinc-800 my-1" />
                
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="cursor-pointer text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-700 dark:hover:text-red-300 rounded-xl py-3 font-medium flex items-center mt-1 focus:bg-red-50 dark:focus:bg-red-900/20 focus:text-red-700 dark:focus:text-red-300"
                >
                  <LogOut className="mr-3 h-4 w-4" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

          </div>
        </header>

        {/* Adjusted top margin to fit under mobile header */}
        <div className="flex-1 mt-[4.5rem] md:mt-20 bg-white dark:bg-zinc-900 rounded-[1.5rem] md:rounded-[2rem] shadow-[0_0_40px_rgb(0,0,0,0.02)] border border-gray-100 dark:border-zinc-800 overflow-hidden relative flex flex-col transition-colors duration-300">
          <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-zinc-700 hover:scrollbar-thumb-gray-300 dark:hover:scrollbar-thumb-zinc-600">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 15, scale: 0.98, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="h-full w-full"
            >
              <Outlet />
            </motion.div>
          </div>
        </div>

      </SidebarInset>
    </SidebarProvider>
    </TooltipProvider>
  );
}