import {
  CalendarDays,
  CircleDollarSign,
  Goal,
  LayoutDashboard,
  Landmark,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import brandLogo from "@/assets/images/brand/logo.png";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  PageHeaderControlsInline,
  PageHeaderControlsMobileToolbar,
} from "@/components/layout/PageHeaderControlsSlot";
import { LiquidGlassFilter } from "@/components/layout/LiquidGlassFilter";
import {
  PageHeaderControlsProvider,
  usePageHeaderControlsContext,
} from "@/contexts/PageHeaderControlsContext";
import {
  APP_HEADER_PRIMARY_ACTION_EVENT,
  type AppHeaderPrimaryActionDetail,
  type AppHeaderPrimaryActionKey,
} from "@/constants/headerActions";
import { ApiError, api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";
import { useUIStore } from "@/stores/useUIStore";

const navigationItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/accounts", label: "Accounts", icon: Landmark },
  { to: "/transactions", label: "Transactions", icon: Wallet },
  { to: "/budgets", label: "Budgets", icon: CircleDollarSign },
  { to: "/goals", label: "Goals", icon: Goal },
  { to: "/settings", label: "Settings", icon: Settings },
];

type HeaderContent = {
  title: string
  subtitle: string
}

type HeaderPrimaryAction = {
  label: string
  shortLabel: string
  actionKey: AppHeaderPrimaryActionKey
}

type ApiEnvelope<T> = {
  data: T
}

type UserProfileData = {
  displayName: string
  email: string
  avatarUrl: string
  username: string
  joinedDateLabel: string
}

const pageHeaderContent: Record<string, HeaderContent> = {
  "/dashboard": {
    title: "Dashboard",
    subtitle: "Here's what's happening with your finances today.",
  },
  "/accounts": {
    title: "Accounts",
    subtitle: "Track balances and keep every account in sync.",
  },
  "/transactions": {
    title: "Transactions",
    subtitle: "Review recent activity and stay on top of spending.",
  },
  "/budgets": {
    title: "Budgets",
    subtitle: "Set monthly limits and monitor category-wise progress.",
  },
  "/goals": {
    title: "Goals",
    subtitle: "Follow your savings milestones and celebrate progress.",
  },
  "/settings": {
    title: "Settings",
    subtitle: "Choose a section to manage profile, security, and app controls.",
  },
  "/settings/profile": {
    title: "Profile Settings",
    subtitle: "Manage your personal details and account preferences.",
  },
  "/settings/security": {
    title: "Security Settings",
    subtitle: "Control account protection and active session security.",
  },
  "/settings/preferences": {
    title: "Preferences",
    subtitle: "Customize application defaults and display behavior.",
  },
  "/settings/notifications": {
    title: "Notification Settings",
    subtitle: "Choose which alerts and summaries you want to receive.",
  },
  "/settings/categories": {
    title: "Category Settings",
    subtitle: "Customize categories to organize your transactions better.",
  },
  "/settings/linked-accounts": {
    title: "Linked Accounts",
    subtitle: "Manage account connections and sync status.",
  },
  "/settings/data-privacy": {
    title: "Data & Privacy",
    subtitle: "Control exports, retention, and privacy preferences.",
  },
  "/settings/import-data": {
    title: "Import Data",
    subtitle: "Upload external files to bring transactions and balances into PocketPal.",
  },
  "/settings/help": {
    title: "Help & About",
    subtitle: "Get support resources and app information.",
  },
}

const pageHeaderPrimaryAction: Record<string, HeaderPrimaryAction> = {
  "/accounts": {
    label: "Add Account",
    shortLabel: "Add",
    actionKey: "create-account",
  },
  "/transactions": {
    label: "Add Transaction",
    shortLabel: "Add",
    actionKey: "create-transaction",
  },
  "/budgets": {
    label: "Add Budget",
    shortLabel: "Add",
    actionKey: "create-budget",
  },
  "/settings/categories": {
    label: "Add Category Group",
    shortLabel: "Add",
    actionKey: "create-category-group",
  },
}

const getStringField = (user: Record<string, unknown> | null, key: string) => {
  if (!user) {
    return "";
  }

  const value = user[key];
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  return "";
};

const formatJoinedDate = (rawDate: string) => {
  if (!rawDate) return "Unknown";

  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return "Unknown";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const buildUserProfileData = (user: Record<string, unknown> | null): UserProfileData => {
  const displayName =
    getStringField(user, "fullname") ||
    getStringField(user, "fullName") ||
    getStringField(user, "name") ||
    getStringField(user, "username") ||
    "PocketPal User";

  const email = getStringField(user, "email");
  const avatarUrl = getStringField(user, "avatar");
  const username = getStringField(user, "username");
  const joinedRaw = getStringField(user, "createdAt") || getStringField(user, "created_at");

  return {
    displayName,
    email,
    avatarUrl,
    username,
    joinedDateLabel: formatJoinedDate(joinedRaw),
  };
};

const getUserDisplayName = (user: Record<string, unknown> | null) => {
  const fullname = getStringField(user, "fullname");
  if (fullname) {
    return fullname;
  }

  const fullName = getStringField(user, "fullName");
  if (fullName) {
    return fullName;
  }

  const name = getStringField(user, "name");
  if (name) {
    return name;
  }

  const username = getStringField(user, "username");
  if (username) {
    return username;
  }

  return "PocketPal User";
};

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
};

export const AppShell = () => {
  return (
    <PageHeaderControlsProvider>
      <AppShellLayout />
    </PageHeaderControlsProvider>
  );
};

const AppShellLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { headerControls } = usePageHeaderControlsContext();
  const isSidebarOpen = useUIStore((state) => state.isSidebarOpen);
  const handleToggleSidebar = useUIStore((state) => state.toggleSidebar);
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const clearUser = useAuthStore((state) => state.clearUser);
  const [isProfilePopoverOpen, setIsProfilePopoverOpen] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [profileLoadError, setProfileLoadError] = useState("");
  const [logoutError, setLogoutError] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const userDisplayName = getUserDisplayName(user);
  const userProfile = useMemo(() => buildUserProfileData(user), [user]);
  const headerPrimaryAction = pageHeaderPrimaryAction[location.pathname] ?? null
  const routeHeaderContent = pageHeaderContent[location.pathname] ?? {
    title: "PocketPal",
    subtitle: "Manage your money with clarity and confidence.",
  }
  const title =
    location.pathname === "/dashboard"
      ? `Welcome back, ${userDisplayName} 👋`
      : routeHeaderContent.title
  const subtitle = routeHeaderContent.subtitle

  useEffect(() => {
    let isActive = true;

    const hydrateProfile = async () => {
      setIsProfileLoading(true);

      try {
        const response = await api.get<ApiEnvelope<Record<string, unknown>>>("/users/me");
        if (!isActive) return;

        if (response?.data && typeof response.data === "object") {
          setUser(response.data);
        }
        setProfileLoadError("");
      } catch {
        if (!isActive) return;
        console.warn("[app-shell] /users/me failed after route load", {
          pathname: window.location.pathname,
        });
        setProfileLoadError("Could not refresh profile");
      } finally {
        if (isActive) {
          setIsProfileLoading(false);
        }
      }
    };

    hydrateProfile();

    return () => {
      isActive = false;
    };
  }, [setUser]);

  const handleLogout = async () => {
    setLogoutError("");
    setIsLoggingOut(true);

    try {
      await api.post("/users/logout", undefined, { retryUnauthorized: false });
    } catch (error) {
      if (error instanceof ApiError && error.status !== 401) {
        setLogoutError("Could not log out. Please try again.");
        setIsLoggingOut(false);
        return;
      }
    }

    clearUser();
    navigate("/login", { replace: true });
  };

  const handleHeaderPrimaryActionClick = () => {
    if (!headerPrimaryAction) {
      return
    }

    const event = new CustomEvent<AppHeaderPrimaryActionDetail>(
      APP_HEADER_PRIMARY_ACTION_EVENT,
      { detail: { actionKey: headerPrimaryAction.actionKey } },
    )
    window.dispatchEvent(event)
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <LiquidGlassFilter />
      <aside
        className={cn(
          "liquid-glass liquid-glass-refract fixed inset-y-0 left-0 z-30 my-2 ml-2 hidden flex-col rounded-lg border-r border-sidebar-border bg-sidebar/70 text-sidebar-foreground transition-all duration-300 lg:flex",
          isSidebarOpen ? "w-64 lg:w-72" : "w-14 md:w-16",
        )}
      >
        <div className="border-b border-sidebar-border px-3 py-3 md:px-4">
          <div className="flex flex-row justify-between items-center gap-2">
            {isSidebarOpen && (
              <div className="flex items-center gap-3">
                <img
                  src={brandLogo}
                  alt="PocketPal logo"
                  className="h-8 w-8 shrink-0 rounded-lg object-cover md:h-9 md:w-9"
                />
                <span className="text-lg font-semibold">PocketPal</span>
              </div>
            )}

            <button
              type="button"
              aria-label="Toggle sidebar"
              onClick={handleToggleSidebar}
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-md border border-sidebar-border bg-sidebar/60 text-sidebar-foreground transition-colors hover:bg-sidebar-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                isSidebarOpen ? "self-start" : "self-center",
              )}
            >
              {isSidebarOpen ? (
                <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
              ) : (
                <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigationItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center rounded-md py-2 transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring md:py-2.5",
                    isSidebarOpen ? "gap-3 px-3" : "justify-center px-2",
                    isActive
                      ? "border-l-[3px] border-l-sidebar-primary bg-sidebar-accent/35 text-sidebar-foreground"
                      : "text-sidebar-foreground/75 hover:bg-sidebar-accent/20 hover:text-sidebar-foreground",
                  )
                }
              >
                <Icon
                  className="h-4 w-4 shrink-0 md:h-5 md:w-5"
                  aria-hidden="true"
                />
                {isSidebarOpen && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div
            className={cn(
              "flex items-center",
              isSidebarOpen ? "gap-3" : "justify-center",
            )}
          >
            <Avatar>
              <AvatarFallback className="bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
                {getInitials(userDisplayName)}
              </AvatarFallback>
            </Avatar>
            {isSidebarOpen && (
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-sidebar-foreground">
                  {userDisplayName}
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>

      <div
        className={cn(
          "flex min-h-screen flex-col bg-background transition-all duration-300",
          "pb-20 md:pb-24 lg:pb-0",
          isSidebarOpen ? "lg:ml-64 xl:ml-72" : "lg:ml-14 xl:ml-16",
        )}
      >
        <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <div
            className={cn(
              "app-content-frame flex items-center justify-between gap-3 md:gap-4",
              headerControls ? "h-14 sm:h-16" : "h-14 md:h-16",
            )}
          >
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-semibold text-foreground md:text-xl">
                {title}
              </h1>
              <p className="hidden truncate text-xs text-muted-foreground lg:block lg:text-sm">
                {subtitle}
              </p>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-2 md:gap-3">
              {headerControls ? (
                <PageHeaderControlsInline controls={headerControls} />
              ) : null}
              {headerPrimaryAction ? (
                <Button
                  type="button"
                  className="size-9 shrink-0 gap-0 rounded-lg px-0 sm:h-9 sm:w-auto sm:gap-1.5 sm:px-3 md:px-4"
                  onClick={handleHeaderPrimaryActionClick}
                  aria-label={headerPrimaryAction.label}
                  title={headerPrimaryAction.label}
                >
                  <Plus className="size-4" aria-hidden />
                  <span className="hidden sm:inline lg:hidden">
                    {headerPrimaryAction.shortLabel}
                  </span>
                  <span className="hidden lg:inline">
                    {headerPrimaryAction.label}
                  </span>
                </Button>
              ) : null}

              {/* <button
                type="button"
                aria-label="View notifications"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-card text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-10 md:w-10"
              >
                <Bell className="h-5 w-5" aria-hidden="true" />
              </button> */}

              <Popover
                open={isProfilePopoverOpen}
                onOpenChange={(open) => {
                  setIsProfilePopoverOpen(open);
                  if (!open) {
                    setLogoutError("");
                  }
                }}
              >
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label="Open profile menu"
                    className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Avatar size="lg">
                      {userProfile.avatarUrl ? (
                        <AvatarImage src={userProfile.avatarUrl} alt={`${userProfile.displayName} avatar`} />
                      ) : null}
                      <AvatarFallback className="bg-sidebar text-sm font-semibold text-sidebar-foreground">
                        {getInitials(userProfile.displayName)}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 bg-popover/80 p-0 liquid-glass-strong">
                  <div className="space-y-3 p-4">
                    <div className="flex items-center gap-3">
                      <Avatar size="lg">
                        {userProfile.avatarUrl ? (
                          <AvatarImage src={userProfile.avatarUrl} alt={`${userProfile.displayName} avatar`} />
                        ) : null}
                        <AvatarFallback className="bg-sidebar text-sm font-semibold text-sidebar-foreground">
                          {getInitials(userProfile.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">{userProfile.displayName}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {userProfile.email || "No email available"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p className="inline-flex items-center gap-1.5">
                        <CalendarDays className="size-3.5" aria-hidden />
                        Joined {userProfile.joinedDateLabel}
                      </p>
                      {userProfile.username ? <p>@{userProfile.username}</p> : null}
                      {isProfileLoading ? <p>Refreshing profile...</p> : null}
                      {profileLoadError ? <p className="text-destructive">{profileLoadError}</p> : null}
                      {logoutError ? <p className="text-destructive">{logoutError}</p> : null}
                    </div>

                    <div className="border-t border-border pt-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-center gap-2 text-destructive hover:bg-destructive"
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                      >
                        <LogOut className="size-4" aria-hidden />
                        {isLoggingOut ? "Logging out..." : "Log out"}
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          {headerControls ? (
            <PageHeaderControlsMobileToolbar controls={headerControls} />
          ) : null}
        </header>

        <main className="flex-1 overflow-y-auto bg-background py-4 md:py-6 xl:py-8">
          <div
            key={location.pathname}
            className="app-content-frame app-page-grid animate-in fade-in-0 slide-in-from-bottom-1 duration-standard ease-enter"
          >
            <Outlet />
          </div>
        </main>
      </div>

      <nav className="liquid-glass liquid-glass-refract fixed bottom-2 left-1/2 z-40 w-fit -translate-x-1/2 rounded-3xl border border-sidebar-border/70 bg-sidebar/70 px-2 py-2 lg:hidden">
        <ul className="grid w-fit grid-cols-6 gap-4">
          {navigationItems.map((item) => {
            const Icon = item.icon

            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "flex flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-2 text-[11px] font-medium transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                      isActive
                        ? "bg-sidebar-accent/40 text-sidebar-foreground"
                        : "text-sidebar-foreground/75 hover:bg-sidebar-accent/20 hover:text-sidebar-foreground",
                    )
                  }
                >
                  <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  {/* <span className="truncate">{item.label}</span> */}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  );
};
