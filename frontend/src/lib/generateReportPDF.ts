/**
 * Generates a PDF of the curriculum report by invoking the browser print dialog.
 *
 * Why NOT html2canvas:
 *   - html2canvas produces a rasterised image → links are dead pixels, text is
 *     not selectable, and content is sliced arbitrarily at page boundaries.
 *
 * Why window.print():
 *   - Links remain clickable in the saved PDF.
 *   - Text is fully selectable and searchable.
 *   - Browser handles page breaks with the CSS hints we provide.
 *   - Zero extra runtime dependencies.
 *
 * The print-only CSS lives in src/index.css under @media print.
 * It hides headers/footers/nav and prevents each report section from
 * being cut mid-card by the page break.
 */
export async function generateReportPDF(_element?: HTMLElement): Promise<void> {
  return new Promise<void>((resolve) => {
    document.documentElement.classList.add("printing-report");

    const cleanup = () => {
      document.documentElement.classList.remove("printing-report");
      resolve();
    };

    // afterprint fires when the print dialog is closed (save or cancel).
    window.addEventListener("afterprint", cleanup, { once: true });

    window.print();

    // Fallback: resolve after 30 s in browsers that do not fire afterprint.
    const fallback = setTimeout(cleanup, 30_000);
    window.addEventListener(
      "afterprint",
      () => clearTimeout(fallback),
      { once: true }
    );
  });
}
