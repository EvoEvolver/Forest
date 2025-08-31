// Print function to export linear view HTML to printer
import {NodeM} from "@forest/schema";
import { hasExportContent } from ".";
import { EditorNodeTypeM } from "@forest/node-type-editor";
import { extractExportContent } from "@forest/node-type-editor/src/editor/Extensions/exportHelpers";

export const handlePrint = (nodes: { node: NodeM; level: number; }[], title: string) => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    // Generate HTML content from nodes
    const generateNodeHtml = (node: NodeM, level: number): string => {
        const title = node.title();
        const fullContent = EditorNodeTypeM.getEditorContent(node);
        const treeM = node.treeM;
        const children = treeM.getChildren(node);
        const isTerminal = children.length === 0;

        let htmlContent = '';
        if (isTerminal) {
            // Terminal node: if has export, show only export; otherwise show everything
            if (hasExportContent(fullContent)) {
                htmlContent = extractExportContent(fullContent);
            } else {
                htmlContent = fullContent;
            }
        } else {
            // Non-terminal node: show only export content if it exists
            const exportContent = extractExportContent(fullContent);
            htmlContent = exportContent || '';
        }

        // Only render if there's content to show
        const shouldRenderContent = isTerminal || (htmlContent && htmlContent.trim().length > 0);

        if (!shouldRenderContent && !title) return '';

        // Generate heading tag based on level
        const headingTag = level <= 5 ? `h${level + 1}` : 'strong';
        const titleHtml = title ? `<${headingTag}>${title}</${headingTag}>` : '';
        const contentHtml = htmlContent && htmlContent.trim() ? `<div>${htmlContent}</div>` : '';

        return titleHtml + contentHtml;
    };

    // Generate HTML for all nodes
    const contentHtml = nodes
        .map(({node, level}) => generateNodeHtml(node, level))
        .filter(html => html.length > 0)
        .join('\n');

    // Create print-specific styles
    const printStyles = `
        <style>
            @media print {
                body { margin: 0; padding: 20px; font-family: 'Times New Roman', Times, serif; line-height: 1.6; font-size: 11pt; }
                * { color: black !important; background: white !important; }
                h1, h2, h3, h4, h5, h6 { color: black !important; margin: 1.2em 0 0.4em 0; page-break-after: avoid; }
                h1 { font-size: 1.5em; }
                h2 { font-size: 1.3em; }
                h3 { font-size: 1.15em; }
                h4 { font-size: 1.05em; }
                h5 { font-size: 1em; }
                h6 { font-size: 0.95em; }
                p { margin: 0.2em 0; orphans: 2; widows: 2; }
                a { color: #0066cc !important; text-decoration: underline; }
                code { background: #f5f5f5 !important; padding: 2px 4px; border-radius: 3px; font-family: 'Monaco', 'Consolas', monospace; }
                pre { background: #f5f5f5 !important; padding: 10px; border-radius: 5px; overflow: auto; page-break-inside: avoid; }
                ul, ol { margin: 0.5em 0; padding-left: 2em; }
                li { margin: 0.25em 0; }
                blockquote { margin: 1em 0; padding-left: 1em; border-left: 3px solid #ccc; }
                img { max-width: 100%; height: auto; }
                table { border-collapse: collapse; width: 100%; margin: 1em 0; }
                th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
                th { background: #f5f5f5 !important; font-weight: bold; }
            }
            @page { margin: 1in; size: auto; }
            @media print {
                @page { margin: 1in; }
                @page:first { margin-top: 0.5in; }
                body::before, body::after { display: none !important; }
                header, footer, .no-print { display: none !important; }
            }
        </style>
    `;

    // Write content to print window
    printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>${title}</title>
            ${printStyles}
        </head>
        <body>
            ${contentHtml}
        </body>
        </html>
    `);

    printWindow.document.close();

    // Wait for content to load, then print
    setTimeout(() => {
        printWindow.focus();
        // Try to remove browser headers/footers if possible
        try {
            printWindow.print();
        } catch (e) {
            // Fallback to regular print if advanced options fail
            printWindow.print();
        }
        printWindow.close();
    }, 500);
};