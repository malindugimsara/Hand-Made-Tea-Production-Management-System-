import * as React from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TooltipProvider } from '@/components/ui/tooltip';

// --- LUCIDE ICONS ---
import {
  LayoutDashboard,
  Leaf,
  Factory,
  Calculator,
  LineChart,
  ChevronsUpDown,
  LogOut,
  Settings2,
  Bell,
  BadgeCheck,
  ChevronRight,
} from 'lucide-react';

// --- SHADCN COMPONENTS ---
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  DropdownMenuGroup,
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
  SidebarFooter,
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

// --- DATA CONFIGURATION ---
const DATA = {
  factory: {
    name: 'Athukorala Factory',
    plan: 'Hand-Made Tea',
    logo: () => <img src="/logo.png" alt="Logo" className="w-9 h-9 object-contain" />,
  },
  quickLinks: [
    { name: 'Dashboard Home', url: '/', icon: LayoutDashboard },
  ],
  navMain: [
    {
      title: 'Green Leaf',
      icon: Factory,
      items: [
        { title: 'Daily Record Entry', url: '/green-leaf-form' },
        { title: 'View Daily Records', url: '/view-green-leaf' },
      ],
    },
    {
      title: 'Dehydrator Machine',
      icon: Factory,
      items: [
        { title: 'DM Record Entry', url: '/dehydrator-record-form' },
        { title: 'View DM Records', url: '/view-dehydrator-records' },
      ],
    },
    {
      title: 'Raw Material',
      icon: Calculator,
      items: [
        { title: 'RM Cost Entry', url: '/raw-material-cost' },
        { title: 'View RMC Records', url: '/view-raw-material-cost' },
      ],
    },
    {
      title: 'Summary Reports',
      icon: LineChart,
      items: [
        { title: 'Production Summary', url: '/production-summary' },
        { title: 'Selling Details', url: '/selling-details-table' },
        { title: 'Cost of Production', url: '/cost-of-production' },
      ],
    },
  ],
};

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  // --- AUTHENTICATION LOGIC ---
  // Pull the logged-in user's details from local storage
  const currentUsername = localStorage.getItem('username') || 'Unknown User';
  const currentUserRole = localStorage.getItem('userRole') || 'Viewer';

  // Logout function
  const handleLogout = () => {
    // 1. Clear the security tokens
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('username');
    
    // 2. Redirect to independent login page
    navigate('/login', { replace: true });
  };

  const getBreadcrumbTitle = () => {
    switch (location.pathname) {
      case '/': return 'Dashboard Overview';
      case '/green-leaf-form': return 'Green Leaf Entry';
      case '/view-green-leaf': return 'View Green Leaf Records';
      case '/dehydrator-record-form': return 'Dehydrator Record Entry';
      case '/selling-details-table': return 'Selling Details'; // Note: Fixed casing here
      case '/view-dehydrator-records': return 'View Dehydrator Records';
      case '/raw-material-cost': return 'Raw Material Cost Entry';
      case '/view-raw-material-cost': return 'View Raw Material Costs';
      case '/production-summary': return 'Production Summary';
      case '/view-green-leaf': return 'View Green Leaf Records';
      case '/selling-details-table': return 'Selling Details';
      case '/cost-of-production': return 'Cost of Production';
      default: return 'System';
    }
  };

  return (
    <TooltipProvider delayDuration={0}>
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-none bg-[#F4F7F5]">
        
        {/* SIDEBAR HEADER */}
        <SidebarHeader className="pt-6 pb-2 px-4">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" className="hover:bg-white/50 cursor-default rounded-2xl transition-all duration-300">
                {/* <div className="flex aspect-square size-11 items-center justify-center rounded-xl  text-white shadow-md"> */}
                  <DATA.factory.logo className="size-6" />
                {/* </div> */}
                <div className="grid flex-1 text-left text-smleading-tight ml-2">
                  <span className="truncate font-bold tracking-tight text-[#1B6A31] text-[17px]">
                    {DATA.factory.name}
                  </span>
                  <span className="truncate text-xs font-medium text-[#4A9E46]">
                    {DATA.factory.plan}
                  </span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent className="px-2 mt-4">
          
          {/* QUICK LINKS */}
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-bold text-gray-400 tracking-widest uppercase mb-2 ml-2">Overview</SidebarGroupLabel>
            <SidebarMenu>
              {DATA.quickLinks.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      tooltip={item.name}
                      onClick={() => navigate(item.url)}
                      className={`cursor-pointer transition-all duration-300 py-6 rounded-full mb-1 ${
                        isActive 
                        ? 'bg-white shadow-sm text-[#1B6A31] font-bold ring-1 ring-gray-200/50' 
                        : 'text-gray-500 hover:text-[#1B6A31] hover:bg-white/60'
                      }`}
                    >
                      <div className="flex items-center gap-3 px-2">
                        <item.icon className={isActive ? "text-[#4A9E46]" : ""} size={22} />
                        <span className="text-base">{item.name}</span>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>

          {/* NESTED MENU */}
          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="text-xs font-bold text-gray-400 tracking-widest uppercase mb-2 ml-2">Management</SidebarGroupLabel>
            <SidebarMenu>
              {DATA.navMain.map((item) => {
                const isGroupActive = item.items.some((sub) => sub.url === location.pathname);

                return (
                  <Collapsible key={item.title} asChild defaultOpen={isGroupActive} className="group/collapsible mb-1">
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={item.title} className="text-gray-500 hover:text-[#1B6A31] hover:bg-white/60 py-6 rounded-full transition-all duration-300">
                          <div className="flex items-center gap-3 px-2 w-full">
                            {item.icon && <item.icon size={22} />}
                            <span className="text-base font-medium">{item.title}</span>
                            <ChevronRight className="ml-auto transition-transform duration-300 group-data-[state=open]/collapsible:rotate-90 opacity-50" />
                          </div>
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub className="border-l-2 border-gray-200 ml-6 pl-4 mt-2 space-y-1">
                          {item.items.map((subItem) => {
                            const isSubActive = location.pathname === subItem.url;
                            return (
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton 
                                  asChild 
                                  isActive={isSubActive}
                                  onClick={() => navigate(subItem.url)}
                                  className={`cursor-pointer py-4 rounded-full transition-all duration-300 ${
                                    isSubActive 
                                    ? 'text-[#1B6A31] font-bold bg-white shadow-sm ring-1 ring-gray-200/50' 
                                    : 'text-gray-500 hover:text-[#4A9E46] hover:bg-white/40'
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

        </SidebarContent>

        {/* USER PROFILE FOOTER */}
        <SidebarFooter className="p-4">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-white data-[state=open]:shadow-sm hover:bg-white/60 rounded-2xl transition-all duration-300 p-2"
                  >
                    <Avatar className="h-10 w-10 rounded-xl border border-gray-200 shadow-sm">
                      {/* Using the first letter of the username for the avatar fallback */}
                      <AvatarFallback className="rounded-xl bg-[#8CC63F]/20 text-[#1B6A31] font-bold">
                        {currentUsername.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight ml-1">
                      <span className="truncate font-bold text-gray-800">{currentUsername}</span>
                      <span className="truncate text-xs font-medium text-gray-500">{currentUserRole}</span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4 text-gray-400" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-2xl bg-white/90 backdrop-blur-xl border-gray-100 shadow-xl p-2"
                  side={isMobile ? 'bottom' : 'right'}
                  align="end"
                  sideOffset={8}
                >
                  <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-3 px-2 py-2 text-left text-sm">
                      <Avatar className="h-10 w-10 rounded-xl">
                        <AvatarFallback className="rounded-xl bg-[#8CC63F]/20 text-[#1B6A31] font-bold">
                          {currentUsername.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-bold">{currentUsername}</span>
                        <span className="truncate text-xs font-medium text-gray-500">{currentUserRole}</span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-gray-100 my-2" />
                  <DropdownMenuGroup>
                    <DropdownMenuItem className="cursor-pointer hover:bg-gray-50 rounded-xl py-2.5">
                      <BadgeCheck className="mr-2 h-4 w-4 text-gray-500" /> Account
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer hover:bg-gray-50 rounded-xl py-2.5">
                      <Settings2 className="mr-2 h-4 w-4 text-gray-500" /> Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer hover:bg-gray-50 rounded-xl py-2.5">
                      <Bell className="mr-2 h-4 w-4 text-gray-500" /> Notifications
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator className="bg-gray-100 my-2" />
                  
                  {/* ADDED ONCLICK EVENT TO LOGOUT BUTTON */}
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    className="cursor-pointer text-red-600 hover:bg-red-50 hover:text-red-700 rounded-xl py-2.5 font-medium"
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      {/* =========================================================
          MAIN CONTENT AREA (The "Floating Island" Concept)
          ========================================================= */}
      <SidebarInset className="bg-[#F4F7F5] relative flex flex-col h-screen overflow-hidden p-2 md:p-4">
        
        {/* FLOATING GLASS PILL HEADER */}
        <header className="flex h-14 bg-white/70 backdrop-blur-2xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl shrink-0 items-center justify-between gap-2 absolute top-4 left-4 right-4 z-50 px-4 transition-all">
          <div className="flex items-center gap-2 w-full">
            <SidebarTrigger className="text-gray-400 hover:text-[#1B6A31] transition-colors" />
            <Separator orientation="vertical" className="mr-2 h-5 bg-gray-200" />
            
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink className="text-gray-400 hover:text-gray-600 font-medium cursor-pointer transition-colors" onClick={() => navigate('/')}>
                    System
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block text-gray-300" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-bold text-[#1B6A31] tracking-tight">
                    {getBreadcrumbTitle()}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        {/* FLOATING ISLAND CONTENT BOX */}
        <div className="flex-1 mt-16 bg-white rounded-[2rem] shadow-[0_0_40px_rgb(0,0,0,0.02)] border border-gray-100 overflow-hidden relative flex flex-col">
          <div className="flex-1 overflow-y-auto">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 15, scale: 0.98, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="h-full"
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