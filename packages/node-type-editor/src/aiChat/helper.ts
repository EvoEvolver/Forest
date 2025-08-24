

export function sanitizeHtmlForEditor(newContent: string){
    // Parse and wrap content if needed
    const parser = new DOMParser();
    const doc = parser.parseFromString(newContent, 'text/html');
    
    // Handle thead elements by merging them into tbody
    const theadElements = doc.querySelectorAll('thead');
    theadElements.forEach(thead => {
        const table = thead.closest('table');
        if (table) {
            let tbody = table.querySelector('tbody');
            if (!tbody) {
                tbody = doc.createElement('tbody');
                table.appendChild(tbody);
            }
            
            // Move thead rows to the beginning of tbody
            const theadRows = Array.from(thead.querySelectorAll('tr'));
            theadRows.forEach(row => {
                tbody.insertBefore(row, tbody.firstChild);
            });
            
            // Remove the thead element
            thead.remove();
        }
    });

    // Add colgroup if missing
    /*const tables = doc.querySelectorAll('table');
    tables.forEach(table => {
        let colgroup = table.querySelector('colgroup');
        if (!colgroup) {
            // Find the first row to count columns
            const firstRow = table.querySelector('tr');
            if (firstRow) {
                const cells = firstRow.querySelectorAll('td, th');
                const colCount = Array.from(cells).reduce((count, cell) => {
                    const colspan = parseInt(cell.getAttribute('colspan') || '1');
                    return count + colspan;
                }, 0);
                
                if (colCount > 0) {
                    colgroup = doc.createElement('colgroup');
                    for (let i = 0; i < colCount; i++) {
                        const col = doc.createElement('col');
                        colgroup.appendChild(col);
                    }
                    table.insertBefore(colgroup, table.firstChild);
                }
            }
        }
    });*/
    
    // Get the processed content
    const processedContent = doc.body.innerHTML;
    const bodyChildren = Array.from(doc.body.children);

    let wrappedContent = processedContent;
    if (bodyChildren.length === 0) {
        // No HTML elements, wrap in paragraph
        wrappedContent = `<p>${processedContent}</p>`;
    } else if (bodyChildren.length === 1 && bodyChildren[0].tagName.toLowerCase() === 'p') {
        // Already wrapped in a single paragraph
        wrappedContent = processedContent;
    } else if (bodyChildren.length > 1) {
        // Multiple elements or single inline element, wrap in paragraph
        wrappedContent = `<p>${processedContent}</p>`;
    }

    return wrappedContent;
}