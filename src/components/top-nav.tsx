import { NavLink } from "react-router-dom"
import { BookOpenIcon, BoxesIcon, ActivityIcon, UserRoundCogIcon } from "lucide-react"
import { DcIcon } from "@/components/icons/dc-icon"
import { DcLogotype } from "@/components/icons/dc-logotype"
import { IconMcp } from "@/components/icons/icon-mcp"
import { cn } from "@/lib/classes"
import type { LucideIcon } from "lucide-react"

type NavItem = {
  to: string
  label: string
  Icon: LucideIcon | React.ComponentType<{ className?: string }>
  external?: boolean
}

const navItemBaseClasses = [
  // layout
  "flex h-8 items-center justify-center",
  // shape
  "rounded-button px-4",
  // transitions
  "transition-all duration-150 ease-in-out",
  // states
  "hover:bg-foreground/[0.07] hover:text-foreground",
]
const navItemInactiveClasses = "bg-transparent text-muted-foreground"
const navItemActiveClasses = "bg-muted text-foreground"
const navIconClasses = "size-[18px]"

const navItems: NavItem[] = [
  {
    to: "https://docs.dataconnect.com",
    label: "Docs",
    Icon: BookOpenIcon,
    external: true,
  },
  { to: "/apps", label: "Apps", Icon: BoxesIcon },
  { to: "/mcp", label: "MCP", Icon: IconMcp },
  { to: "/activity", label: "Activity", Icon: ActivityIcon },
  { to: "/runs", label: "Account", Icon: UserRoundCogIcon },
]

export function TopNav() {
  return (
    <header
      data-tauri-drag-region
      className={cn(
        "h-header px-inset",
        "backdrop-blur-sm flex items-center justify-between"
      )}
    >
      {/* Logo/Brand */}
      <NavLink to="/" className="flex items-center gap-2" aria-label="Data Connect">
        <DcIcon height={16} aria-hidden />
        <DcLogotype height={13} aria-hidden />
      </NavLink>

      {/* Navigation Icons */}
      <nav className="flex items-center gap-1">
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
