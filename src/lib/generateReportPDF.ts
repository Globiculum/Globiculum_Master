import { jsPDF } from "jspdf";
import { getSyllabusReferenceForTopic, getResourceUrlFromText } from "./syllabusReferences";

interface SubjectAnalysis {
  subject: string;
  topicsCovered: number;
  totalTopics: number;
  alignmentLevel: "strong" | "moderate" | "high_gap";
  keyGaps: string[];
}

interface TimelinePhase {
  name: string;
  duration: string;
  bullets: string[];
}

interface AnalysisData {
  overallAlignment: {
    percentage: number;
    subjectsNeedingBridge: string[];
    estimatedDuration: string;
  };
  subjectAnalysis: SubjectAnalysis[];
  criticalGaps: string[];
  bridgeTimeline: {
    phase1: TimelinePhase;
    phase2: TimelinePhase;
    phase3: TimelinePhase;
  };
  recommendations: {
    study: string[];
    skillStrategy: string[];
    resources: string[];
    culturalLanguage: string[];
  };
}

interface FormData {
  schoolStage?: string;
  snapshotGrade?: string | number;
  snapshotLocation?: string;
  usState?: string;
  currentCurriculum?: string;
  targetGoal?: string;
  academicPath?: string[];
}

// Goals that involve Indian academic readiness - show TRE for these
const INDIA_READINESS_GOALS = [
  "cbse",
  "icse",
  "state_boards",
  "indian_boards",
  "smooth_indian_school_reintegration",
  "dual_prep_excellence",
  "academic_foundations_strengthening",
  "cultural_language_immersion",
  "indian board preparation",
  "cbse preparation",
  "icse preparation",
  "state board preparation",
  "smooth reintegration into indian schools",
  "dual-prep excellence",
  "academic foundations",
  "cultural & language immersion",
];

// Check if the goal involves Indian academic readiness
const isIndiaReadinessGoal = (targetGoal?: string): boolean => {
  if (!targetGoal) return true; // Default to showing TRE if no goal specified
  const normalizedGoal = targetGoal.toLowerCase().trim();
  return INDIA_READINESS_GOALS.some(goal => 
    normalizedGoal.includes(goal.toLowerCase()) || goal.toLowerCase().includes(normalizedGoal)
  );
};

// Brand Colors (converted from HSL to RGB)
const COLORS = {
  primary: { r: 15, g: 23, b: 42 },        // Deep Navy #0F172A
  secondary: { r: 13, g: 148, b: 136 },    // Academic Teal #0D9488
  accent: { r: 245, g: 158, b: 11 },       // Warm Amber #F59E0B
  background: { r: 248, g: 250, b: 252 },  // Soft Off-White #F8FAFC
  cardBg: { r: 255, g: 255, b: 255 },      // White
  muted: { r: 100, g: 116, b: 139 },       // Slate Grey #64748B
  mutedBg: { r: 241, g: 245, b: 249 },     // Light grey bg
  success: { r: 16, g: 185, b: 129 },      // Green
  warning: { r: 245, g: 158, b: 11 },      // Amber
  danger: { r: 244, g: 63, b: 94 },        // Rose
  blue: { r: 59, g: 130, b: 246 },         // Blue
  blueBg: { r: 239, g: 246, b: 255 },      // Light blue bg
  roseBg: { r: 255, g: 241, b: 242 },      // Light rose bg
};

export const generateReportPDF = (analysis: AnalysisData, formData: FormData): void => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let yPos = 0;

  // Helper: Check page overflow and add new page if needed
  const checkPageBreak = (requiredHeight: number = 30) => {
    if (yPos + requiredHeight > pageHeight - 25) {
      doc.addPage();
      yPos = 20;
      return true;
    }
    return false;
  };

  // Helper: Draw rounded rectangle
  const drawRoundedRect = (x: number, y: number, w: number, h: number, r: number, color: { r: number; g: number; b: number }, fill: boolean = true, stroke: boolean = false) => {
    doc.setFillColor(color.r, color.g, color.b);
    if (stroke) {
      doc.setDrawColor(color.r, color.g, color.b);
    }
    doc.roundedRect(x, y, w, h, r, r, fill ? (stroke ? 'FD' : 'F') : 'S');
  };

  // Helper: Draw section header with icon placeholder
  const drawSectionHeader = (title: string, iconColor: { r: number; g: number; b: number } = COLORS.primary) => {
    checkPageBreak(15);
    // Icon circle
    doc.setFillColor(iconColor.r, iconColor.g, iconColor.b);
    doc.circle(margin + 3, yPos + 3, 3, 'F');
    // Title
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    doc.text(title, margin + 10, yPos + 5);
    yPos += 12;
  };

  // ===== HEADER SECTION =====
  const showTRE = isIndiaReadinessGoal(formData.targetGoal);
  
  // Draw header background
  drawRoundedRect(0, 0, pageWidth, 55, 0, COLORS.primary);
  
  // Header icon circle
  doc.setFillColor(255, 255, 255);
  doc.circle(pageWidth / 2, 18, 8, 'F');
  doc.setFillColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  doc.circle(pageWidth / 2, 18, 5, 'F');
  
  // Header title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(
    showTRE ? "Your Transition Readiness Report" : "Your Curriculum Analysis Report", 
    pageWidth / 2, 
    33, 
    { align: "center" }
  );
  
  // Subtitle
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("AI-powered analysis based on your child's educational journey", pageWidth / 2, 40, { align: "center" });
  
  // TRE Explainer line (only for India readiness goals)
  if (showTRE) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.text(
      "ℹ How to read this estimate: TRE reflects curriculum comparison with Indian grade-level topics — for transition guidance, not academic judgment.",
      pageWidth / 2,
      48,
      { align: "center" }
    );
  }
  
  yPos = 65;

  // ===== STUDENT SNAPSHOT SECTION =====
  drawSectionHeader("Student Snapshot");
  
  // Create snapshot cards grid
  const snapshotItems: { label: string; value: string }[] = [];
  if (formData.schoolStage) snapshotItems.push({ label: "Stage", value: formData.schoolStage.charAt(0).toUpperCase() + formData.schoolStage.slice(1) });
  if (formData.snapshotGrade) snapshotItems.push({ label: "Grade", value: `Grade ${formData.snapshotGrade}` });
  if (formData.snapshotLocation) {
    const locationValue = formData.snapshotLocation === "us" 
      ? `US${formData.usState ? ` - ${formData.usState}` : ""}`
      : formData.snapshotLocation;
    snapshotItems.push({ label: "Location", value: locationValue.charAt(0).toUpperCase() + locationValue.slice(1) });
  }
  if (formData.currentCurriculum) snapshotItems.push({ label: "Curriculum", value: formData.currentCurriculum });

  if (snapshotItems.length > 0) {
    const cardWidth = (contentWidth - 6) / Math.min(snapshotItems.length, 4);
    snapshotItems.slice(0, 4).forEach((item, index) => {
      const x = margin + (index * (cardWidth + 2));
      drawRoundedRect(x, yPos, cardWidth - 2, 22, 3, COLORS.mutedBg);
      
      // Label
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(COLORS.muted.r, COLORS.muted.g, COLORS.muted.b);
      doc.text(item.label, x + 4, yPos + 7);
      
      // Value
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
      const truncatedValue = item.value.length > 15 ? item.value.substring(0, 14) + "..." : item.value;
      doc.text(truncatedValue, x + 4, yPos + 15);
    });
    yPos += 28;
  }

  // Academic path badges
  if (formData.academicPath && formData.academicPath.length > 0) {
    let badgeX = margin;
    formData.academicPath.forEach((subject) => {
      const textWidth = doc.getTextWidth(subject) + 8;
      if (badgeX + textWidth > pageWidth - margin) {
        yPos += 10;
        badgeX = margin;
      }
      drawRoundedRect(badgeX, yPos, textWidth, 8, 2, COLORS.mutedBg);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
      doc.text(subject, badgeX + 4, yPos + 5.5);
      badgeX += textWidth + 3;
    });
    yPos += 14;
  }

  // ===== QUICK OVERVIEW SECTION =====
  if (analysis) {
    yPos += 3;
    const boxWidth = (contentWidth - 6) / 3;
    const boxHeight = 32;

    // Three overview boxes
    const overviewData = [
      { value: `${analysis.overallAlignment.percentage}%`, label: showTRE ? "Transition Readiness Estimate" : "Coverage Score" },
      { value: `${analysis.overallAlignment.subjectsNeedingBridge.length} Subject${analysis.overallAlignment.subjectsNeedingBridge.length !== 1 ? 's' : ''}`, label: "Need Preparation" },
      { value: analysis.overallAlignment.estimatedDuration, label: "Estimated Duration" },
    ];

    overviewData.forEach((item, index) => {
      const x = margin + (index * (boxWidth + 3));
      // Blue background box
      drawRoundedRect(x, yPos, boxWidth, boxHeight, 4, COLORS.blueBg);
      // Border
      doc.setDrawColor(59, 130, 246);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, yPos, boxWidth, boxHeight, 4, 4, 'S');
      
      // Value
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 64, 175); // Darker blue
      doc.text(item.value, x + boxWidth / 2, yPos + 14, { align: "center" });
      
      // Label
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(59, 130, 246);
      doc.text(item.label, x + boxWidth / 2, yPos + 23, { align: "center" });
    });
    yPos += boxHeight + 10;
  }

  // ===== COVERAGE ANALYSIS SECTION =====
  if (analysis?.subjectAnalysis?.length > 0) {
    drawSectionHeader("Coverage Analysis");
    
    const colWidth = (contentWidth - 4) / 2;
    let col = 0;
    let rowY = yPos;

    analysis.subjectAnalysis.forEach((subject, index) => {
      const boxHeight = 35 + Math.min(subject.keyGaps.length, 3) * 6;
      checkPageBreak(boxHeight + 5);
      
      if (index > 0 && col === 0) {
        rowY = yPos;
      }

      const x = margin + (col * (colWidth + 4));
      
      // Card background
      drawRoundedRect(x, rowY, colWidth, boxHeight, 4, COLORS.mutedBg);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.roundedRect(x, rowY, colWidth, boxHeight, 4, 4, 'S');

      // Subject name and badge
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
      doc.text(subject.subject, x + 4, rowY + 8);

      // Alignment badge
      const badgeColor = subject.alignmentLevel === 'strong' ? { r: 209, g: 250, b: 229, text: { r: 4, g: 120, b: 87 } }
        : subject.alignmentLevel === 'moderate' ? { r: 254, g: 243, b: 199, text: { r: 180, g: 83, b: 9 } }
        : { r: 254, g: 226, b: 226, text: { r: 190, g: 18, b: 60 } };
      const badgeText = subject.alignmentLevel === 'strong' ? 'Strong' : subject.alignmentLevel === 'moderate' ? 'Moderate' : 'High Gap';
      const badgeWidth = doc.getTextWidth(badgeText) + 8;
      
      drawRoundedRect(x + colWidth - badgeWidth - 4, rowY + 3, badgeWidth, 8, 2, { r: badgeColor.r, g: badgeColor.g, b: badgeColor.b });
      doc.setFontSize(6);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(badgeColor.text.r, badgeColor.text.g, badgeColor.text.b);
      doc.text(badgeText, x + colWidth - badgeWidth / 2 - 4, rowY + 8);

      // Coverage info
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(COLORS.muted.r, COLORS.muted.g, COLORS.muted.b);
      doc.text(`Coverage: ${subject.topicsCovered}/${subject.totalTopics} topics`, x + 4, rowY + 16);

      // Key gaps with syllabus reference links
      if (subject.keyGaps.length > 0) {
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.text("Key Missing Topics:", x + 4, rowY + 24);
        
        doc.setFont("helvetica", "normal");
        subject.keyGaps.slice(0, 3).forEach((gap, i) => {
          const truncatedGap = gap.length > 35 ? gap.substring(0, 33) + "..." : gap;
          const gapY = rowY + 30 + (i * 5);
          doc.text(`• ${truncatedGap}`, x + 4, gapY);
          
          // Add syllabus reference link for India readiness goals
          if (showTRE) {
            const syllabusRef = getSyllabusReferenceForTopic(gap, subject.subject);
            if (syllabusRef) {
              const linkX = x + 4 + doc.getTextWidth(`• ${truncatedGap}`) + 2;
              if (linkX < x + colWidth - 8) {
                doc.setTextColor(59, 130, 246); // Blue link color
                doc.textWithLink("↗", linkX, gapY, { url: syllabusRef.url });
                doc.setTextColor(COLORS.muted.r, COLORS.muted.g, COLORS.muted.b);
              }
            }
          }
        });
      }

      col++;
      if (col >= 2) {
        col = 0;
        yPos = rowY + boxHeight + 4;
        rowY = yPos;
      }
    });

    if (col !== 0) {
      yPos = rowY + 35 + 10;
    }
    yPos += 5;
  }

  // ===== CRITICAL GAPS SECTION =====
  if (analysis?.criticalGaps?.length > 0) {
    checkPageBreak(40);
    drawSectionHeader("Critical Gaps Identified", COLORS.danger);
    
    const gapsHeight = 12 + analysis.criticalGaps.length * 7;
    drawRoundedRect(margin, yPos, contentWidth, gapsHeight, 4, COLORS.roseBg);
    doc.setDrawColor(254, 205, 211);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, yPos, contentWidth, gapsHeight, 4, 4, 'S');
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(136, 19, 55); // Rose-900
    
    let gapY = yPos + 7;
    analysis.criticalGaps.forEach((gap) => {
      const wrappedLines = doc.splitTextToSize(`• ${gap}`, contentWidth - 12);
      wrappedLines.forEach((line: string) => {
        doc.text(line, margin + 6, gapY);
        gapY += 5;
      });
    });
    yPos += gapsHeight + 10;
  }

  // ===== BRIDGE TIMELINE SECTION =====
  if (analysis?.bridgeTimeline) {
    checkPageBreak(80);
    drawSectionHeader("Bridge Timeline");
    
    const phases = [
      { data: analysis.bridgeTimeline.phase1, label: "Phase 1" },
      { data: analysis.bridgeTimeline.phase2, label: "Phase 2" },
      { data: analysis.bridgeTimeline.phase3, label: "Phase 3" },
    ];

    phases.forEach((phase) => {
      checkPageBreak(35);
      const bullets = phase.data.bullets?.slice(0, 3) || [];
      const phaseHeight = 22 + bullets.length * 5;
      
      // Phase card
      drawRoundedRect(margin, yPos, contentWidth, phaseHeight, 4, COLORS.blueBg);
      doc.setDrawColor(147, 197, 253);
      doc.setLineWidth(0.2);
      doc.roundedRect(margin, yPos, contentWidth, phaseHeight, 4, 4, 'S');
      
      // Phase badge
      const badgeWidth = 25;
      drawRoundedRect(margin + 4, yPos + 4, badgeWidth, 8, 2, { r: 219, g: 234, b: 254 });
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text(phase.label, margin + 4 + badgeWidth / 2, yPos + 9.5, { align: "center" });
      
      // Duration
      doc.setFont("helvetica", "normal");
      doc.setTextColor(COLORS.muted.r, COLORS.muted.g, COLORS.muted.b);
      doc.text(phase.data.duration, margin + badgeWidth + 10, yPos + 9);
      
      // Phase name
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
      doc.text(phase.data.name, margin + 4, yPos + 18);
      
      // Bullets
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(COLORS.muted.r, COLORS.muted.g, COLORS.muted.b);
      bullets.forEach((bullet, i) => {
        const truncated = bullet.length > 80 ? bullet.substring(0, 78) + "..." : bullet;
        doc.text(`• ${truncated}`, margin + 4, yPos + 24 + (i * 5));
      });
      
      yPos += phaseHeight + 4;
    });
    yPos += 6;
  }

  // ===== RECOMMENDATIONS SECTION =====
  if (analysis?.recommendations) {
    checkPageBreak(60);
    drawSectionHeader("Personalized Recommendations");
    
    const recSections = [
      { title: "Study Recommendations", items: analysis.recommendations.study },
      { title: "Skill & Strategy Tips", items: analysis.recommendations.skillStrategy },
      { title: "Resource Suggestions", items: analysis.recommendations.resources },
      { title: "Cultural & Language Adaptation", items: analysis.recommendations.culturalLanguage },
    ];

    const colWidth = (contentWidth - 4) / 2;
    let col = 0;
    let rowY = yPos;

    recSections.forEach((section, index) => {
      const items = section.items?.slice(0, 4) || [];
      const boxHeight = 18 + items.length * 6;
      checkPageBreak(boxHeight + 5);
      
      if (index > 0 && col === 0) {
        rowY = yPos;
      }

      const x = margin + (col * (colWidth + 4));
      
      // Card background
      drawRoundedRect(x, rowY, colWidth, boxHeight, 4, COLORS.mutedBg);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.roundedRect(x, rowY, colWidth, boxHeight, 4, 4, 'S');

      // Section title
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
      doc.text(section.title, x + 4, rowY + 9);

      // Items with resource links
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(COLORS.muted.r, COLORS.muted.g, COLORS.muted.b);
      items.forEach((item, i) => {
        const truncated = item.length > 40 ? item.substring(0, 38) + "..." : item;
        const itemY = rowY + 17 + (i * 5);
        doc.text(`• ${truncated}`, x + 4, itemY);
        
        // Check for resource URL in the recommendation text
        const resourceUrl = getResourceUrlFromText(item);
        if (resourceUrl) {
          const linkX = x + 4 + doc.getTextWidth(`• ${truncated}`) + 2;
          if (linkX < x + colWidth - 8) {
            doc.setTextColor(59, 130, 246); // Blue link color
            doc.textWithLink("↗", linkX, itemY, { url: resourceUrl.url });
            doc.setTextColor(COLORS.muted.r, COLORS.muted.g, COLORS.muted.b);
          }
        }
      });

      col++;
      if (col >= 2) {
        col = 0;
        yPos = rowY + boxHeight + 4;
        rowY = yPos;
      }
    });

    if (col !== 0) {
      yPos = rowY + 40;
    }
  }

  // ===== FOOTER ON EACH PAGE =====
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Footer line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    
    // Footer text
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(COLORS.muted.r, COLORS.muted.g, COLORS.muted.b);
    doc.text(`Page ${i} of ${pageCount}`, margin, pageHeight - 8);
    doc.text(`Globiculum - ${showTRE ? 'Transition Readiness Report' : 'Curriculum Analysis Report'} | Generated: ${new Date().toLocaleDateString()}`, pageWidth - margin, pageHeight - 8, { align: "right" });
  }

  doc.save("curriculum-alignment-report.pdf");
};
