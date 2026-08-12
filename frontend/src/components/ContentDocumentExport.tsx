import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType } from "docx";
import { saveAs } from "file-saver";
import { toast } from "sonner";
import { logAuditEvent } from "@/lib/logAuditEvent";

const ContentDocumentExport = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateDocument = async () => {
    setIsGenerating(true);

    try {
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              // Title
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Globiculum Content Documentation",
                    bold: true,
                    size: 48,
                    color: "1E3A5F",
                  }),
                ],
                heading: HeadingLevel.TITLE,
                spacing: { after: 400 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Generated on: ${new Date().toLocaleDateString("en-US", { 
                      year: "numeric", 
                      month: "long", 
                      day: "numeric" 
                    })}`,
                    italics: true,
                    size: 24,
                    color: "666666",
                  }),
                ],
                spacing: { after: 600 },
              }),

              // Section 1: Brand & Taglines
              createSectionHeading("1. Brand & Taglines"),
              createSubHeading("App Name"),
              createBulletPoint("Globiculum"),
              createSubHeading("Primary Tagline"),
              createBulletPoint("Seamless Curriculum Transitions for Global Learners"),
              createSubHeading("Secondary Tagline"),
              createBulletPoint("Bridging Educational Systems, Empowering Futures"),
              createSubHeading("Footer Tagline"),
              createBulletPoint("Bridging worlds, building futures."),
              createSpacer(),

              // Section 2: Homepage Content
              createSectionHeading("2. Homepage Content"),
              
              createSubHeading("Hero Section"),
              createLabeledContent("Headline", "Bridge Your Child's Education Between Worlds"),
              createLabeledContent("Subheadline", "Moving to India or returning from abroad? Globiculum maps your child's current curriculum to Indian education systems, identifies gaps, and creates personalized learning pathways for a confident transition."),
              createLabeledContent("Primary CTA", "Get My Curriculum Gap Analysis Report"),
              createLabeledContent("Secondary CTA", "How It Works"),
              createSpacer(),

              createSubHeading("About Section Stats"),
              createBulletPoint("24/7 Expert Support"),
              createBulletPoint("100% Secure & Compliant"),
              createBulletPoint("AI-Powered Personalized Plans"),
              createBulletPoint("Global Family Community"),
              createSpacer(),

              createSubHeading("Dual Path Advantage Section"),
              createLabeledContent("Title", "The Dual Path Advantage for Global Learners"),
              createLabeledContent("Description", "Our unique approach ensures your child excels in both Indian board examinations and maintains global academic competitiveness."),
              createSpacer(),

              createSubHeading("Traditional vs Globiculum Comparison"),
              createComparisonTable(),
              createSpacer(),

              createSubHeading("CTA Section"),
              createLabeledContent("Headline", "Curious to know how your child aligns across US and Indian syllabi?"),
              createLabeledContent("Description", "Start your personalized curriculum mapping journey today and receive an AI-powered gap analysis in minutes."),
              createLabeledContent("CTA Button", "Begin My Journey"),
              createSpacer(),

              // Section 3: About Page
              createSectionHeading("3. About Page"),
              
              createSubHeading("Mission Statement"),
              createParagraphContent("At Globiculum, we understand that relocating with children means navigating unfamiliar educational landscapes. Our mission is to bridge the gap between different educational systems, ensuring every child's learning journey continues seamlessly."),
              createSpacer(),

              createSubHeading("Vision Statement"),
              createParagraphContent("We envision a world where educational transitions are opportunities for growth, not obstacles to overcome."),
              createSpacer(),

              createSubHeading("Core Values"),
              createLabeledContent("Expert Curriculum Mapping", "Our specialists analyze curriculum differences between countries, identifying gaps and overlaps in your child's education."),
              createLabeledContent("Personalized Learning Pathways", "AI-powered assessments create customized study plans that address specific gaps while building on existing strengths."),
              createLabeledContent("Cultural Integration Support", "Beyond academics, we help children adapt to new classroom cultures, teaching styles, and social expectations."),
              createSpacer(),

              // Section 4: Our Advantage Page
              createSectionHeading("4. Our Advantage Page"),

              createSubHeading("Page Title"),
              createParagraphContent("What Sets Globiculum Apart"),
              createLabeledContent("Description", "Discover why families worldwide trust Globiculum for their educational transition needs."),
              createSpacer(),

              createSubHeading("Feature Cards"),
              createLabeledContent("AI-Powered Analysis", "Advanced artificial intelligence maps curriculum differences and creates personalized learning pathways tailored to your child's specific needs."),
              createLabeledContent("Global Curriculum Expertise", "Deep expertise in educational systems across US, UK, India, Singapore, UAE and more, ensuring accurate curriculum mapping."),
              createLabeledContent("Real-Time Progress Tracking", "Monitor your child's learning journey with detailed progress reports and milestone tracking across all subjects."),
              createLabeledContent("Expert Educator Network", "Access to qualified educators who understand international curricula and can provide targeted support."),
              createLabeledContent("Cultural Integration Support", "Resources and guidance to help your child adapt to new classroom cultures, teaching styles, and social expectations."),
              createLabeledContent("Secure & Private", "Your family's educational data is protected with enterprise-grade security and strict privacy controls."),
              createSpacer(),

              // Section 5: Begin Journey Assessment
              createSectionHeading("5. Begin Journey Assessment Flow"),

              createSubHeading("Step 1: Basic Information"),
              createBulletPoint("Student's First Name"),
              createBulletPoint("Student's Age (5-18 years)"),
              createBulletPoint("Languages Spoken at Home (multi-select)"),
              createSpacer(),

              createSubHeading("Step 2: Current Schooling"),
              createBulletPoint("Current Country of Residence"),
              createBulletPoint("School Stage (Elementary 1-5, Middle 6-8, High 9-12)"),
              createBulletPoint("Current Grade (dynamic based on stage)"),
              createBulletPoint("Curriculum System (dynamic based on stage with tooltips)"),
              createSpacer(),

              createSubHeading("Elementary Curriculum Options"),
              createBulletPoint("Common Core Standards - US national academic standards"),
              createBulletPoint("State-Specific Curriculum - Individual state education standards"),
              createBulletPoint("IB PYP (International Baccalaureate – Primary Years Programme)"),
              createBulletPoint("Montessori - Child-centered educational approach"),
              createBulletPoint("Waldorf/Steiner - Arts-integrated, developmental education"),
              createBulletPoint("Homeschool - Parent-directed home education"),
              createBulletPoint("Other (free text)"),
              createSpacer(),

              createSubHeading("Middle School Curriculum Options"),
              createBulletPoint("Common Core Standards"),
              createBulletPoint("State-Specific Curriculum"),
              createBulletPoint("IB MYP (International Baccalaureate – Middle Years Programme)"),
              createBulletPoint("College Prep Track"),
              createBulletPoint("STEM-Focused Program"),
              createBulletPoint("Gifted & Talented Program"),
              createBulletPoint("Homeschool"),
              createBulletPoint("Other (free text)"),
              createSpacer(),

              createSubHeading("High School Curriculum Options"),
              createBulletPoint("Common Core with State Standards"),
              createBulletPoint("AP (Advanced Placement) Track"),
              createBulletPoint("IB Diploma Programme (IBDP)"),
              createBulletPoint("Honors/College Prep Track"),
              createBulletPoint("Career & Technical Education (CTE)"),
              createBulletPoint("Dual Enrollment"),
              createBulletPoint("Homeschool Diploma"),
              createBulletPoint("Other (free text)"),
              createSpacer(),

              createSubHeading("Step 3: Language Proficiency"),
              createBulletPoint("Foreign Languages (multi-select with individual proficiency)"),
              createBulletPoint("Proficiency Levels: Beginner, Intermediate, Fluent, Native"),
              createBulletPoint("Language Options: Spanish, French, Mandarin, German, Arabic, Hindi, Japanese, Other"),
              createSpacer(),

              createSubHeading("Step 4: Academic Profile"),
              createBulletPoint("Strongest Subjects (multi-select)"),
              createBulletPoint("Subjects Needing Improvement (multi-select)"),
              createBulletPoint("Extracurricular Activities (multi-select by category)"),
              createSpacer(),

              createSubHeading("Extracurricular Categories"),
              createBulletPoint("Academic: Debate, Math Club, Science Olympiad, Model UN"),
              createBulletPoint("STEM: Robotics, Coding, Engineering"),
              createBulletPoint("Arts: Music, Dance, Drama, Visual Arts"),
              createBulletPoint("Sports: Soccer, Basketball, Swimming, Tennis, Cricket"),
              createBulletPoint("Clubs: Student Government, Volunteer/Community Service, Environmental"),
              createBulletPoint("Other: Custom entry"),
              createSpacer(),

              createSubHeading("Step 5: Transition Goals"),
              createBulletPoint("Target Indian Board (CBSE, ICSE, State Board, IB, IGCSE)"),
              createBulletPoint("Transition Timeline (Immediate to 2+ years)"),
              createBulletPoint("Primary Concerns (multi-select)"),
              createBulletPoint("Preparation Goals (University Entrance Test, ACT, JEE, NEET, Olympiads, etc.)"),
              createSpacer(),

              // Section 6: Navigation & Footer
              createSectionHeading("6. Navigation & Footer"),

              createSubHeading("Main Navigation"),
              createBulletPoint("Home"),
              createBulletPoint("About"),
              createBulletPoint("Begin Journey"),
              createBulletPoint("Our Advantage"),
              createSpacer(),

              createSubHeading("Footer - Quick Links"),
              createBulletPoint("About Globiculum"),
              createBulletPoint("Our Advantage"),
              createBulletPoint("Begin Journey"),
              createSpacer(),

              createSubHeading("Footer - Family Support"),
              createBulletPoint("FAQs (Planned)"),
              createBulletPoint("Resource Library (Planned)"),
              createBulletPoint("Support Center (Planned)"),
              createSpacer(),

              createSubHeading("Footer - Trust & Safety"),
              createBulletPoint("Privacy Policy"),
              createBulletPoint("Terms of Service"),
              createBulletPoint("Data Security"),
              createSpacer(),

              // Section 7: Report Template
              createSectionHeading("7. Alignment Report Structure"),

              createSubHeading("Student Overview Section"),
              createBulletPoint("Student Name"),
              createBulletPoint("School Stage & Current Grade"),
              createBulletPoint("Current Location"),
              createBulletPoint("Current Curriculum System"),
              createBulletPoint("Subjects Studied"),
              createBulletPoint("Preparation Goals"),
              createSpacer(),

              createSubHeading("Coverage Analysis"),
              createBulletPoint("Subject-wise coverage percentages"),
              createBulletPoint("Topics covered vs total topics"),
              createBulletPoint("Visual progress indicators"),
              createSpacer(),

              createSubHeading("Critical Gaps Section"),
              createBulletPoint("Major conceptual gaps identified"),
              createBulletPoint("Priority areas for immediate attention"),
              createBulletPoint("Impact assessment"),
              createSpacer(),

              createSubHeading("Bridge Timeline Phases"),
              createBulletPoint("Phase 1: Foundation Gaps (Months 1-3)"),
              createBulletPoint("Phase 2: Advanced Integration (Months 4-6)"),
              createBulletPoint("Phase 3: Assessment Prep (Months 7-8)"),
              createSpacer(),

              createSubHeading("Recommendations Section"),
              createBulletPoint("Subject-wise gap mapping"),
              createBulletPoint("Personalized learning pathways"),
              createBulletPoint("Recommended resources (textbooks, online, tutoring, practice)"),
              createBulletPoint("Cultural adaptation tips"),
              createSpacer(),

              // Section 8: UI Components & Labels
              createSectionHeading("8. Common UI Labels & Messages"),

              createSubHeading("Buttons"),
              createBulletPoint("Begin My Journey"),
              createBulletPoint("Get My Curriculum Gap Analysis Report"),
              createBulletPoint("Download PDF Report"),
              createBulletPoint("Start New Assessment"),
              createBulletPoint("Sign In / Sign Up"),
              createBulletPoint("Continue / Next / Previous"),
              createSpacer(),

              createSubHeading("Form Validation Messages"),
              createBulletPoint("Please enter your child's name"),
              createBulletPoint("Please select a valid age"),
              createBulletPoint("Please select at least one option"),
              createBulletPoint("This field is required"),
              createSpacer(),

              createSubHeading("Success Messages"),
              createBulletPoint("Assessment completed successfully!"),
              createBulletPoint("Report generated successfully"),
              createBulletPoint("PDF downloaded successfully"),
              createSpacer(),

              createSubHeading("Error Messages"),
              createBulletPoint("Something went wrong. Please try again."),
              createBulletPoint("Failed to generate report. Please try again."),
              createBulletPoint("Network error. Please check your connection."),
              createSpacer(),

              // End document
              new Paragraph({
                children: [
                  new TextRun({
                    text: "— End of Document —",
                    italics: true,
                    size: 24,
                    color: "999999",
                  }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 600 },
              }),
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `Globiculum_Content_Documentation_${new Date().toISOString().split('T')[0]}.docx`);
      logAuditEvent({ action: "export_pdf", tableName: "content_documents", newData: { format: "docx" } });
      toast.success("Document generated successfully!");
    } catch (error) {
      console.error("Error generating document:", error);
      toast.error("Failed to generate document. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          Content Documentation Export
        </CardTitle>
        <CardDescription>
          Generate a comprehensive Word document containing all Globiculum static content for review and enhancement.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold mb-2">Document Contents:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Brand & taglines</li>
            <li>• Homepage content (hero, stats, CTAs)</li>
            <li>• About page content</li>
            <li>• Our Advantage features</li>
            <li>• Begin Journey assessment flow & options</li>
            <li>• Navigation & footer content</li>
            <li>• Report template structure</li>
            <li>• Common UI labels & messages</li>
          </ul>
        </div>

        <Button 
          onClick={generateDocument} 
          disabled={isGenerating}
          className="w-full"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
              Generating Document...
            </>
          ) : (
            <>
              <Download className="mr-2 h-5 w-5" aria-hidden="true" />
              Download Content Documentation (.docx)
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

// Helper functions to create document elements
function createSectionHeading(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: true,
        size: 32,
        color: "1E3A5F",
      }),
    ],
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
  });
}

function createSubHeading(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: true,
        size: 26,
        color: "2563EB",
      }),
    ],
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 100 },
  });
}

function createBulletPoint(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: `• ${text}`,
        size: 22,
      }),
    ],
    spacing: { after: 60 },
  });
}

function createLabeledContent(label: string, content: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: `${label}: `,
        bold: true,
        size: 22,
      }),
      new TextRun({
        text: content,
        size: 22,
      }),
    ],
    spacing: { after: 100 },
  });
}

function createParagraphContent(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        size: 22,
      }),
    ],
    spacing: { after: 100 },
  });
}

function createSpacer(): Paragraph {
  return new Paragraph({
    children: [],
    spacing: { after: 200 },
  });
}

function createComparisonTable(): Table {
  return new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: "Traditional Approach", bold: true, size: 22 })],
              alignment: AlignmentType.CENTER,
            })],
            width: { size: 50, type: WidthType.PERCENTAGE },
            shading: { fill: "E5E7EB" },
          }),
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: "Globiculum Advantage", bold: true, size: 22 })],
              alignment: AlignmentType.CENTER,
            })],
            width: { size: 50, type: WidthType.PERCENTAGE },
            shading: { fill: "DBEAFE" },
          }),
        ],
      }),
      createTableRow("Generic curriculum overview", "Personalized gap analysis"),
      createTableRow("One-size-fits-all approach", "AI-powered customized pathways"),
      createTableRow("Manual assessment process", "Instant digital assessment"),
      createTableRow("Limited follow-up support", "Continuous progress tracking"),
      createTableRow("Static learning materials", "Dynamic, adaptive resources"),
    ],
  });
}

function createTableRow(traditional: string, eduSetu: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({ 
          children: [new TextRun({ text: traditional, size: 20 })],
        })],
        width: { size: 50, type: WidthType.PERCENTAGE },
      }),
      new TableCell({
        children: [new Paragraph({ 
          children: [new TextRun({ text: eduSetu, size: 20 })],
        })],
        width: { size: 50, type: WidthType.PERCENTAGE },
      }),
    ],
  });
}

export default ContentDocumentExport;
