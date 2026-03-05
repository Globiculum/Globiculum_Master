import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ContentDocumentExport from "@/components/ContentDocumentExport";

const ContentExport = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Content Export</h1>
          <p className="text-muted-foreground">
            Export all EduSetu content for documentation and review purposes.
          </p>
        </div>
        <ContentDocumentExport />
      </main>
      <Footer />
    </div>
  );
};

export default ContentExport;
