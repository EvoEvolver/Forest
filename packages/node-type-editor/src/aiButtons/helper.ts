/**
 * DOM-aware diff that marks insertions with <ins> and deletions with <del>.
 *
 * Updated: ensure <ins> actually appears when structure changes or when new text
 * is inserted. Fix by explicitly appending <ins> when tags differ or when
 * children mismatch, not just replacing silently.
 */

export function makeHtmlDiff(oldHTML: string, newHTML: string): string {
    const parser = new DOMParser();
    const oldDoc = parser.parseFromString(wrapAsRoot(oldHTML), "text/html");
    const newDoc = parser.parseFromString(wrapAsRoot(newHTML), "text/html");

    const oldRoot = oldDoc.body.firstElementChild as HTMLElement;
    const newRoot = newDoc.body.firstElementChild as HTMLElement;

    const outDoc = parser.parseFromString("<div></div>", "text/html");
    const outContainer = outDoc.body.firstElementChild as HTMLElement;

    const resultFrag = outDoc.createDocumentFragment();
    const diffed = diffElement(outDoc, oldRoot, newRoot);
    while (diffed.firstChild) resultFrag.appendChild(diffed.firstChild);
    outContainer.appendChild(resultFrag);
    return outContainer.innerHTML;
}

function wrapAsRoot(html: string): string {
    return `<diff-root>${html}</diff-root>`;
}

function diffElement(doc: Document, oldEl: Element | null, newEl: Element | null): Element {
    if (!newEl && !oldEl) return doc.createElement("div");

    if (!newEl && oldEl) {
        const wrapper = doc.createElement("div");
        wrapper.appendChild(wrapDeleted(doc, oldEl));
        return wrapper;
    }
    if (newEl && !oldEl) {
        const wrapper = doc.createElement("div");
        wrapper.appendChild(wrapInserted(doc, newEl));
        return wrapper;
    }

    // Tag differs: replace entirely
    if (!isSameTag(oldEl!, newEl!)) {
        const wrapper = doc.createElement("div");
        wrapper.appendChild(wrapDeleted(doc, oldEl!));
        wrapper.appendChild(wrapInserted(doc, newEl!));
        return wrapper;
    }

    // Attribute differs: replace entirely
    if (!shallowEqualAttributes(oldEl!, newEl!)) {
        const wrapper = doc.createElement("div");
        wrapper.appendChild(wrapDeleted(doc, oldEl!));
        wrapper.appendChild(wrapInserted(doc, newEl!));
        return wrapper;
    }

    // Same tag + attributes → recurse children
    const out = doc.createElement(newEl!.tagName.toLowerCase());
    for (const { name, value } of Array.from(newEl!.attributes)) {
        out.setAttribute(name, value);
    }

    const oldChildren = Array.from(oldEl!.childNodes);
    const newChildren = Array.from(newEl!.childNodes);

    // Text-only optimization
    if (isSingleTextNode(oldChildren) && isSingleTextNode(newChildren)) {
        diffTextNode(doc, oldChildren[0] as Text, newChildren[0] as Text).forEach(n => out.appendChild(n));
        return out;
    }

    // Align children with LCS
    const oldSigs = oldChildren.map(sigForNode);
    const newSigs = newChildren.map(sigForNode);
    const matches = lcsPairs(oldSigs, newSigs);

    let i = 0, j = 0;
    for (const [mi, mj] of matches) {
        while (i < mi) out.appendChild(wrapDeleted(doc, oldChildren[i++]));
        while (j < mj) out.appendChild(wrapInserted(doc, newChildren[j++]));
        const oNode = oldChildren[i++];
        const nNode = newChildren[j++];
        out.appendChild(diffNode(doc, oNode, nNode));
    }
    while (i < oldChildren.length) out.appendChild(wrapDeleted(doc, oldChildren[i++]));
    while (j < newChildren.length) out.appendChild(wrapInserted(doc, newChildren[j++]));

    return out;
}

function diffNode(doc: Document, oldNode: Node, newNode: Node): Node {
    if (oldNode.nodeType === Node.TEXT_NODE && newNode.nodeType === Node.TEXT_NODE) {
        const frag = doc.createDocumentFragment();
        diffTextNode(doc, oldNode as Text, newNode as Text).forEach(n => frag.appendChild(n));
        return frag;
    }
    if (oldNode.nodeType === Node.ELEMENT_NODE && newNode.nodeType === Node.ELEMENT_NODE) {
        return diffElement(doc, oldNode as Element, newNode as Element);
    }
    const frag = doc.createDocumentFragment();
    frag.appendChild(wrapDeleted(doc, oldNode));
    frag.appendChild(wrapInserted(doc, newNode));
    return frag;
}

function isSameTag(a: Element, b: Element): boolean { return a.tagName === b.tagName; }

function shallowEqualAttributes(a: Element, b: Element): boolean {
    if (a.attributes.length !== b.attributes.length) return false;
    for (const { name, value } of Array.from(a.attributes)) if (b.getAttribute(name) !== value) return false;
    return true;
}

function isSingleTextNode(nodes: Node[]): boolean {
    return nodes.length === 1 && nodes[0].nodeType === Node.TEXT_NODE;
}

function diffTextNode(doc: Document, oldText: Text, newText: Text): Node[] {
    const oldStr = oldText.nodeValue ?? "";
    const newStr = newText.nodeValue ?? "";
    
    // Split by sentences (periods)
    const oldSentences = splitBySentences(oldStr);
    const newSentences = splitBySentences(newStr);
    
    // Get sentence-level diff to identify aligned sentences
    const sentenceOps = diffTokens(oldSentences, newSentences);
    const out: Node[] = [];
    
    for (const op of sentenceOps) {
        if (op.type === "equal") {
            // Unchanged sentence - add as-is
            out.push(doc.createTextNode(joinTokens(op.tokens)));
        } else if (op.type === "del") {
            // Deleted sentence - wrap in <del>
            const el = doc.createElement("del");
            el.textContent = joinTokens(op.tokens);
            out.push(el);
        } else if (op.type === "ins") {
            // Inserted sentence - wrap in <ins>
            const el = doc.createElement("ins");
            el.textContent = joinTokens(op.tokens);
            out.push(el);
        }
    }
    
    // Now process pairs of adjacent del/ins operations for word-level diff
    return processAdjacentDelIns(doc, out, sentenceOps);
}

function processAdjacentDelIns(doc: Document, nodes: Node[], ops: DiffOp[]): Node[] {
    const result: Node[] = [];
    let i = 0;
    
    for (let opIndex = 0; opIndex < ops.length; opIndex++) {
        const op = ops[opIndex];
        const nextOp = ops[opIndex + 1];
        
        if (op.type === "del" && nextOp && nextOp.type === "ins") {
            // Adjacent del/ins pair - check if word-level diff would be better
            const oldSentence = joinTokens(op.tokens);
            const newSentence = joinTokens(nextOp.tokens);
            
            const oldWords = tokenize(oldSentence);
            const newWords = tokenize(newSentence);
            const wordOps = diffTokens(oldWords, newWords);
            
            // Calculate change percentage at word level
            const totalWords = Math.max(oldWords.length, newWords.length);
            const changedWords = wordOps.filter(wordOp => wordOp.type !== "equal").reduce((sum, wordOp) => sum + wordOp.tokens.length, 0);
            const changePercentage = totalWords > 0 ? changedWords / totalWords : 1;
            
            if (changePercentage <= 0.2) {
                // Use word-level diff
                result.push(...processDiffOps(doc, wordOps));
            } else {
                // Use sentence-level diff
                result.push(nodes[i], nodes[i + 1]);
            }
            
            i += 2; // Skip next node since we processed both
            opIndex++; // Skip next op since we processed both
        } else {
            result.push(nodes[i]);
            i++;
        }
    }
    
    return result;
}

function processDiffOps(doc: Document, ops: DiffOp[]): Node[] {
    const out: Node[] = [];
    for (const op of ops) {
        if (op.type === "equal") out.push(doc.createTextNode(joinTokens(op.tokens)));
        if (op.type === "ins") {
            const el = doc.createElement("ins");
            el.textContent = joinTokens(op.tokens);
            out.push(el);
        }
        if (op.type === "del") {
            const el = doc.createElement("del");
            el.textContent = joinTokens(op.tokens);
            out.push(el);
        }
    }
    return out;
}

function splitBySentences(text: string): string[] {
    if (!text.trim()) return [];
    const sentences = text.split(/(?<=\.)\s+/);
    return sentences.filter(s => s.trim().length > 0);
}

type Token = string;
type DiffOp = { type: "equal"|"ins"|"del"; tokens: Token[] };

function tokenize(s: string): Token[] {
    const tokens: string[] = [];
    const re = /\w+|\s+|[^\w\s]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(s)) !== null) tokens.push(m[0]);
    if (!tokens.length && s.length) tokens.push(s);
    return tokens;
}
function joinTokens(ts: Token[]): string { return ts.join(""); }

function diffTokens(a: Token[], b: Token[]): DiffOp[] {
    if (!a.length && b.length) return [{ type: "ins", tokens: b }];
    if (!b.length && a.length) return [{ type: "del", tokens: a }];
    if (a.join("") === b.join("")) return [{ type: "equal", tokens: a }];
    
    const matches = lcsPairs(a, b);
    const ops: DiffOp[] = [];
    
    let i = 0, j = 0;
    for (const [mi, mj] of matches) {
        if (i < mi) ops.push({ type: "del", tokens: a.slice(i, mi) });
        if (j < mj) ops.push({ type: "ins", tokens: b.slice(j, mj) });
        ops.push({ type: "equal", tokens: [a[mi]] });
        i = mi + 1;
        j = mj + 1;
    }
    if (i < a.length) ops.push({ type: "del", tokens: a.slice(i) });
    if (j < b.length) ops.push({ type: "ins", tokens: b.slice(j) });
    
    return ops;
}

function sigForNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return `#text:${(node.nodeValue ?? "").trim()}`;
    const el = node as Element;
    return `${el.tagName}:${el.getAttribute("id") ?? el.getAttribute("class") ?? ""}`;
}

function lcsPairs(a: string[], b: string[]): Array<[number, number]> {
    const n = a.length, m = b.length;
    const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--)
        for (let j = m - 1; j >= 0; j--)
            dp[i][j] = a[i] === b[j] ? dp[i+1][j+1] + 1 : Math.max(dp[i+1][j], dp[i][j+1]);
    const pairs: Array<[number, number]> = [];
    let i = 0, j = 0;
    while (i < n && j < m) {
        if (a[i] === b[j]) { pairs.push([i++, j++]); }
        else if (dp[i+1][j] >= dp[i][j+1]) i++; else j++;
    }
    return pairs;
}

function wrapInserted(doc: Document, node: Node): Node {
    if (node.nodeType === Node.ELEMENT_NODE) {
        // For element nodes, use div with insert class
        const div = doc.createElement("div");
        div.className = "insert";
        div.appendChild(node.cloneNode(true));
        return div;
    } else {
        // For text nodes, use ins tag
        const ins = doc.createElement("ins");
        ins.appendChild(node.cloneNode(true));
        return ins;
    }
}
function wrapDeleted(doc: Document, node: Node): Node {
    if (node.nodeType === Node.ELEMENT_NODE) {
        // For element nodes, use div with delete class
        const div = doc.createElement("div");
        div.className = "delete";
        div.appendChild(node.cloneNode(true));
        return div;
    } else {
        // For text nodes, use del tag
        const del = doc.createElement("del");
        del.appendChild(node.cloneNode(true));
        return del;
    }
}
