import { NavLink } from "react-router-dom"
import {
  BookOpenIcon,
  BoxIcon,
  // ActivityIcon,
  UserRoundCogIcon,
  SettingsIcon,
  HomeIcon,
} from "lucide-react"
// import { DcIcon } from "@/components/icons/dc-icon"
import { DcLogotype } from "@/components/icons/dc-logotype"
import { IconMcp } from "@/components/icons/icon-mcp"
import { cn } from "@/lib/classes"
import { ROUTES } from "@/config/routes"
import type { LucideIcon } from "lucide-react"

type NavItem = {
  to: string
  label: string
  Icon: LucideIcon | React.ComponentType<{ className?: string }>
  external?: boolean
}

const navItemBaseClasses = [
  // layout & shape
  "flex h-8 items-center justify-center",
  "rounded-button px-4.5",
  // transitions
  "transition-all duration-150 ease-in-out",
  // states
  "hover:bg-foreground/[0.07] hover:text-foreground",
]
const navItemInactiveClasses = "bg-transparent text-muted-foreground"
const navItemActiveClasses = "bg-foreground/[0.07] text-foreground"
const navIconClasses = "size-[18px]"

const navItems: NavItem[] = [
  { to: ROUTES.home, label: "Home", Icon: HomeIcon },
  { to: ROUTES.apps, label: "Apps", Icon: BoxIcon },
  { to: ROUTES.mcp, label: "MCP", Icon: IconMcp },
  // {
  //   to: "https://docs.dataconnect.com",
  //   label: "Docs",
  //   Icon: BookOpenIcon,
  //   external: true,
  // },
  { to: ROUTES.docs, label: "Docs", Icon: BookOpenIcon },
  // { to: "/activity", label: "Activity", Icon: ActivityIcon },
  { to: ROUTES.settings, label: "Settings", Icon: SettingsIcon },
  { to: ROUTES.runs, label: "Account", Icon: UserRoundCogIcon },
]

export function TopNav() {
  return (
    <header
      data-tauri-drag-region
      className={cn(
        "h-[48px] px-inset",
        "backdrop-blur-sm flex items-center justify-between",
        // set the nav under the macOS traffic lights bar
        "mt-[28px]"
      )}
    >
      {/* Logo/Brand */}
      <NavLink
        to={ROUTES.home}
        className="flex items-center gap-2"
        aria-label="Data Connect"
      >
        {/* <DcIcon height={16} aria-hidden /> */}
        <DcLogotype height={13} aria-hidden />
      </NavLink>

      {/* Navigation Icons */}
      <nav className="flex items-center gap-[3px]">
        {navItems.map(({ to, label, Icon, external }) => {
          if (external) {
            return (
              <a
                key={to}
                href={to}
                target="_blank"
                rel="noopener noreferrer"
                title={label}
                aria-label={label}
                className={cn(navItemBaseClasses, navItemInactiveClasses)}
              >
                <Icon className={navIconClasses} aria-hidden />
                <span className="sr-only">{label}</span>
              </a>
            )
          }
          return (
            <NavLink
              key={to}
              to={to}
              title={label}
              aria-label={label}
              className={({ isActive }) =>
                cn(
                  navItemBaseClasses,
                  isActive ? navItemActiveClasses : navItemInactiveClasses
                )
              }
            >
              {Icon === IconMcp ? (
                <IconMcp boxSize="18px" aria-hidden />
              ) : (
                <Icon className={navIconClasses} aria-hidden />
              )}
              <span className="sr-only">{label}</span>
            </NavLink>
          )
        })}
      </nav>
    </header>
  )
}
