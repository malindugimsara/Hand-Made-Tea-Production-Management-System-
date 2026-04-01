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
  user: {
    name: 'Admin User',
    email: 'admin@teafactory.com',
    avatar: 'https://ui.shadcn.com/avatars/01.png',
  },
  factory: {
    name: 'Athukorala Tea',
    plan: 'Main Factory',
    logo: Leaf,
  },
  // Single links
  quickLinks: [
    { name: 'Dashboard Home', url: '/', icon: LayoutDashboard },
  ],
  // Nested/Collapsible links
  navMain: [
    {
      title: 'Green Leaf',
      icon: Factory,
      items: [
        { title: 'Record Entry', url: '/green-leaf-form' },
        { title: 'View Records', url: '/view-green-leaf' }, // Replaced Production with View Records
      ],
    },
    {
      title: 'Finance & Sales',
      icon: Calculator,
      items: [
        { title: 'Cost Calculations', url: '/costing' },
        { title: 'Sales Revenue', url: '/sales' },
      ],
    },
  ],
};

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  // Helper function to figure out the Breadcrumb title
  const getBreadcrumbTitle = () => {
    switch (location.pathname) {
      case '/': return 'Dashboard Overview';
      case '/green-leaf-form': return 'Green Leaf Entry';
      case '/view-green-leaf': return 'View Green Leaf Records'; // Added the new route title
      case '/costing': return 'Cost Calculations';
      case '/sales': return 'Sales Revenue';
      default: return 'System';
    }
  };

  return (
    <TooltipProvider delayDuration={0}>

    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r border-gray-200">
        
        {/* 1. SIDEBAR HEADER (Factory Info) */}
        <SidebarHeader className="pt-4 pb-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" className="hover:bg-gray-100 cursor-default">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-[#1B6A31] text-white">
                  <DATA.factory.logo className="size-5" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight ml-1">
                  <span className="truncate font-bold tracking-wider text-[#1B6A31] text-base">
                    {DATA.factory.name}
                  </span>
                  <span className="truncate text-xs text-gray-500">
                    {DATA.factory.plan}
                  </span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          
          {/* 2. QUICK LINKS (Flat Menu) */}
          <SidebarGroup>
            <SidebarGroupLabel>Overview</SidebarGroupLabel>
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
                      className={`cursor-pointer transition-colors ${isActive ? 'bg-[#8CC63F]/10 text-[#1B6A31] font-semibold' : 'text-gray-600 hover:text-[#1B6A31]'}`}
                    >
                      <div>
                        <item.icon className={isActive ? "text-[#4A9E46]" : ""} />
                        <span >{item.name}</span>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>

          {/* 3. NESTED MENU (Collapsible) */}
          <SidebarGroup>
            <SidebarGroupLabel>Management</SidebarGroupLabel>
            <SidebarMenu>
              {DATA.navMain.map((item) => {
                // Check if any sub-item is currently active to keep the folder open
                const isGroupActive = item.items.some((sub) => sub.url === location.pathname);

                return (
                  <Collapsible
                    key={item.title}
                    asChild
                    defaultOpen={isGroupActive} // Auto-open if we are on a page inside it
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={item.title} className="text-gray-600 hover:text-[#1B6A31]">
                          {item.icon && <item.icon />}
                          <span>{item.title}</span>
                          <ChevronRight className="ml-auto transition-transform duration-300 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items.map((subItem) => {
                            const isSubActive = location.pathname === subItem.url;
                            return (
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton 
                                  asChild 
                                  isActive={isSubActive}
                                  onClick={() => navigate(subItem.url)}
                                  className={`cursor-pointer ${isSubActive ? 'text-[#1B6A31] font-medium' : 'text-gray-500 hover:text-[#4A9E46]'}`}
                                >
                                  <div>
                                    <span>{subItem.title}</span>
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

        {/* 4. USER PROFILE FOOTER */}
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground hover:bg-gray-100"
                  >
                    <Avatar className="h-8 w-8 rounded-lg border border-gray-200">
                      <AvatarImage src={DATA.user.avatar} alt={DATA.user.name} />
                      <AvatarFallback className="rounded-lg bg-[#8CC63F]/20 text-[#1B6A31] font-bold">A</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold text-gray-800">{DATA.user.name}</span>
                      <span className="truncate text-xs text-gray-500">{DATA.user.email}</span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4 text-gray-500" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg bg-white border-gray-200 shadow-md"
                  side={isMobile ? 'bottom' : 'right'}
                  align="end"
                  sideOffset={4}
                >
                  <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                      <Avatar className="h-8 w-8 rounded-lg">
                        <AvatarImage src={DATA.user.avatar} alt={DATA.user.name} />
                        <AvatarFallback className="rounded-lg bg-[#8CC63F]/20 text-[#1B6A31]">A</AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold">{DATA.user.name}</span>
                        <span className="truncate text-xs text-gray-500">{DATA.user.email}</span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem className="cursor-pointer hover:bg-gray-50">
                      <BadgeCheck className="mr-2 h-4 w-4" /> Account
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer hover:bg-gray-50">
                      <Settings2 className="mr-2 h-4 w-4" /> Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer hover:bg-gray-50">
                      <Bell className="mr-2 h-4 w-4" /> Notifications
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer text-red-600 hover:bg-red-50">
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
          MAIN CONTENT AREA (Framer Motion + Frosted Header) 
          ========================================================= */}
      <SidebarInset className="bg-[#F8FAF8] relative flex flex-col h-screen overflow-hidden">
        
        {/* FROSTED GLASS HEADER WITH BREADCRUMBS */}
        <header className="flex h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 shrink-0 items-center gap-2 absolute top-0 w-full z-20 px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 w-full">
            <SidebarTrigger className="text-gray-600 hover:text-[#1B6A31] -ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            
            {/* Dynamic Breadcrumbs */}
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink className="text-gray-500 cursor-pointer" onClick={() => navigate('/')}>
                    System
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-semibold text-[#1B6A31]">
                    {getBreadcrumbTitle()}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        {/* FRAMER MOTION CONTENT */}
        <div className="flex-1 overflow-y-auto pt-16">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 15, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="h-full"
          >
            <Outlet />
          </motion.div>
        </div>

      </SidebarInset>
    </SidebarProvider>
  </TooltipProvider>
  );
}