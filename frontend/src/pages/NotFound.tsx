import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="p-4 bg-muted rounded-full inline-block">
            <FileQuestion className="h-12 w-12 text-muted-foreground" />
          </div>
          <h1 className="text-5xl font-bold text-foreground">404</h1>
          <p className="text-xl text-muted-foreground">Oops! Page not found</p>
          <Button asChild>
            <a href="/">Return to Home</a>
          </Button>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default NotFound;
