import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Menu, LogOut, User, LayoutDashboard, Bell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useAlerts } from "@/hooks/useAlerts";
import globiculumLogo from "@/assets/globiculum-logo.png";

interface HeaderProps {
  children?: React.ReactNode;
}

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/begin-journey", label: "Begin Journey" },
  { href: "/reports", label: "My Reports" },
  { href: "/our-advantage", label: "Our Advantage" },
];

const Header = ({ children }: HeaderProps = {}) => {
  const { user, loading, signOut } = useAuth();
  const { toast } = useToast();
  const { unreadCount } = useAlerts();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  let navigate: ReturnType<typeof useNavigate>;

  try {
    navigate = useNavigate();
  } catch {
    navigate = (() => {}) as any;
  }

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to sign out",
      });
    } else {
      navigate("/");
    }
  };

  const getUserDisplayName = () => {
    if (!user) return "";
    return user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
  };

  const getUserInitials = () => {
    const name = getUserDisplayName();
    return name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const renderAuthSection = () => {
    if (children) return children;
    if (loading) return null;

    if (user) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-9 px-2 text-primary-foreground hover:bg-primary-foreground/10 hover:text-secondary focus-visible:ring-0 focus-visible:ring-offset-0"
            >
              <Avatar className="h-7 w-7 mr-2">
                <AvatarFallback className="bg-secondary text-secondary-foreground text-xs font-semibold">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline text-sm font-medium truncate max-w-[120px]">
                {getUserDisplayName()}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 bg-popover border border-border shadow-lg z-[60]"
          >
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {getUserDisplayName()}
                </p>
                {user.email && (
                  <p className="text-xs leading-none text-muted-foreground truncate">
                    {user.email}
                  </p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => navigate("/dashboard")}
              className="cursor-pointer"
            >
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigate("/reports")}
              className="cursor-pointer"
            >
              <User className="mr-2 h-4 w-4" />
              My Reports
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    return (
      <>
        <Button
          variant="ghost"
          className="hidden md:inline-flex text-primary-foreground hover:text-secondary hover:bg-primary-foreground/10"
          asChild
        >
          <a href="/auth">Sign In</a>
        </Button>
        <Button
          className="hidden md:inline-flex bg-accent text-accent-foreground hover:bg-accent/90 transition-all duration-300 font-semibold"
          asChild
        >
          <a href="/auth">Get Started</a>
        </Button>
      </>
    );
  };

  return (
    <header className="bg-primary border-b border-primary-glow sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center space-x-2">
          <img
            src={globiculumLogo}
            alt="Globiculum"
            className="h-10 w-auto"
          />
        </a>

        <nav className="hidden md:flex items-center space-x-6">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-primary-foreground/80 hover:text-secondary transition-colors font-medium"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center space-x-3">
          {user && (
            <Button
              variant="ghost"
              size="icon"
              className="relative text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => navigate("/dashboard")}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground px-1">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Button>
          )}
          {renderAuthSection()}

          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] bg-primary border-l-primary-glow">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2 text-primary-foreground">
                  <img src={globiculumLogo} alt="Globiculum" className="h-8 w-auto" />
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 mt-6">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-3 rounded-md text-primary-foreground/80 hover:text-secondary hover:bg-primary-foreground/10 transition-colors font-medium"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
              <div className="mt-6 px-3 space-y-3">
                {!children && !loading && user && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleSignOut();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                )}
                {!children && !loading && !user && (
                  <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" asChild>
                    <a href="/auth" onClick={() => setMobileMenuOpen(false)}>Get Started</a>
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Header;
