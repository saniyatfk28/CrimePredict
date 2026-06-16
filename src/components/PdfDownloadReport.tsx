import React, { useCallback, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export type PdfExportSection = {
  title: string;
  elementId: string;
};

type PdfDownloadReportProps = {
  fileName: string;
  sections: PdfExportSection[];
  reportPrefix?: string;
  className?: string;
};

const PdfDownloadReport: React.FC<PdfDownloadReportProps> = ({
  fileName,
  sections,
  className,
}) => {
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  const downloadPdf = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;

    try {
      setBusy(true);

      const doc = new jsPDF({
        orientation: 'p',
        unit: 'pt',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const marginX = 24;
      const marginTop = 24;
      const availableWidth = pageWidth - marginX * 2;

      let isFirstPage = true;

      for (const section of sections) {
        const el = document.getElementById(section.elementId);
        if (!el) continue;

        // html2canvas: allow CORS if images exist
        const canvas = await html2canvas(el as HTMLElement, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          scrollX: 0,
          scrollY: 0,
          onclone: (clonedDoc) => {
            const clonedEl = clonedDoc.getElementById(section.elementId);
            if (clonedEl) {
              clonedEl.style.display = 'block';
              clonedEl.style.visibility = 'visible';
              clonedEl.style.position = 'static';
              
              // Convert SVGs to Images to fix html2canvas SVG rendering issues
              const svgs = clonedEl.querySelectorAll('svg');
              svgs.forEach((svg) => {
                try {
                  const xml = new XMLSerializer().serializeToString(svg);
                  const svg64 = btoa(unescape(encodeURIComponent(xml)));
                  const img = clonedDoc.createElement('img');
                  img.src = 'data:image/svg+xml;base64,' + svg64;
                  
                  // Get width/height from the SVG attributes
                  const width = svg.getAttribute('width');
                  const height = svg.getAttribute('height');
                  if (width) img.width = parseInt(width, 10);
                  if (height) img.height = parseInt(height, 10);
                  
                  svg.parentNode?.replaceChild(img, svg);
                } catch (e) {
                  console.error('Failed to convert SVG to Image:', e);
                }
              });
            }
          }
        });

        const imgData = canvas.toDataURL('image/png');

        const imgWidth = availableWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        if (!isFirstPage) {
          doc.addPage();
        }
        isFirstPage = false;

        let y = marginTop;

        // Section title
        doc.setFontSize(14);
        doc.setTextColor(30, 30, 30);
        doc.text(section.title, marginX, y);
        y += 18;

        // If image is taller than page, we scale down to fit.
        const maxHeight = pageHeight - y - 18;
        let finalImgHeight = imgHeight;
        if (imgHeight > maxHeight) {
          const scale = maxHeight / imgHeight;
          finalImgHeight = imgHeight * scale;
        }

        doc.addImage(imgData, 'PNG', marginX, y, imgWidth, finalImgHeight);
      }

      doc.save(fileName);
    } finally {
      setBusy(false);
      busyRef.current = false;
    }
  }, [fileName, sections]);

  return (
    <button
      type="button"
      className={className ?? 'btn btn-danger shadow-sm fw-bold'}
      disabled={busy}
      onClick={downloadPdf}
    >
      <i className="fas fa-file-pdf me-2" />
      {busy ? 'Generating PDF...' : 'Download Report (PDF)'}
    </button>
  );
};

export default PdfDownloadReport;

