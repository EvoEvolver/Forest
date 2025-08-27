import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Path to templates directory
const TEMPLATES_DIR = path.join(__dirname, '../../assets');

interface ContentTransformRequest {
  template: string;
  fields: any;
}

interface TemplateFieldProcessor {
  // Pattern to find the field in the template
  findPattern: string | RegExp;
  // How to replace it - can be a string template or a function
  replacePattern?: string;
  // Custom replacement function for complex logic
  replaceFunction?: (templateContent: string, fieldValue: any, fieldName: string) => string;
  // Default value if field is missing
  defaultValue?: any;
}

interface TemplateField {
  name: string;
  type: 'string' | 'node' | 'recursive node' | 'list string' | 'list recursive node' | 'list node';
  processor: TemplateFieldProcessor;
}

interface TemplateInfo {
  name: string;
  fields: TemplateField[];
}

interface TemplateListResponse {
  templates: TemplateInfo[];
}

interface ContentTransformResponse {
  success: boolean;
  latex?: string;
  error?: string;
}

interface NodeData {
  node_id: string;
  title: string;
  content: string;
  children?: NodeData[];
}

// Template definitions with processing patterns
const TEMPLATE_DEFINITIONS: Record<string, TemplateInfo> = {
  template1: {
    name: 'template1',
    fields: [
      {
        name: 'title',
        type: 'string',
        processor: {
          findPattern: /\\title\{[^}]*\}/,
          replaceFunction: (template: string, value: string, fieldName: string) => {
            const titleValue = value || 'Untitled';
            return template.replace(/\\title\{[^}]*\}/, `\\title{${titleValue}}`);
          },
          defaultValue: 'Untitled'
        }
      },
      {
        name: 'authors',
        type: 'list string',
        processor: {
          findPattern: /\\title\{[^}]*\}([\s\S]*?)\\begin\{abstract\}/,
          replaceFunction: (template: string, authors: string[], fieldName: string) => {
            if (!Array.isArray(authors) || authors.length === 0) {
              return template.replace(
                /\\title\{[^}]*\}([\s\S]*?)\\begin\{abstract\}/,
                (match) => {
                  const titleMatch = match.match(/\\title\{[^}]*\}/);
                  const title = titleMatch ? titleMatch[0] : '\\title{Untitled}';
                  return `${title}\n\n\\begin{abstract}`;
                }
              );
            }
            
            const authorLatex = authors.map((author: string, index: number) => {
              return `\\author{${author}}
\\affiliation{%
  \\institution{Institution ${index + 1}}
  \\city{City}
  \\country{Country}
}`;
            }).join('\n\n');
            
            return template.replace(
              /\\title\{[^}]*\}([\s\S]*?)\\begin\{abstract\}/,
              (match) => {
                const titleMatch = match.match(/\\title\{[^}]*\}/);
                const title = titleMatch ? titleMatch[0] : '\\title{Untitled}';
                return `${title}\n\n${authorLatex}\n\n\\begin{abstract}`;
              }
            );
          },
          defaultValue: ['Author Name']
        }
      },
      {
        name: 'abstract',
        type: 'node',
        processor: {
          findPattern: /\\begin\{abstract\}[\s\S]*?\\end\{abstract\}/,
          replaceFunction: (template: string, nodeData: any, fieldName: string) => {
            const content = nodeData?.content ? convertHtmlToLatex(nodeData.content) : 'This paper presents research findings.';
            return template.replace(
              /\\begin\{abstract\}[\s\S]*?\\end\{abstract\}/,
              `\\begin{abstract}\n${content}\n\\end{abstract}`
            );
          },
          defaultValue: { node_id: 'default', title: 'Abstract', content: 'This paper presents research findings.' }
        }
      },
      {
        name: 'sections',
        type: 'list recursive node',
        processor: {
          findPattern: /(\\maketitle\s*)([\s\S]*?)(\\begin\{acks\}|\\bibliographystyle)/,
          replaceFunction: (template: string, sections: any[], fieldName: string) => {
            if (!Array.isArray(sections) || sections.length === 0) {
              return template.replace(
                /(\\maketitle\s*)([\s\S]*?)(\\begin\{acks\}|\\bibliographystyle)/,
                `$1\n\n\\section{Introduction}\nThis paper presents our research work.\n\n$3`
              );
            }
            
            const sectionsLatex = sections.map((section: NodeData) => 
              convertRecursiveNodeToLatex(section, 1)
            ).join('\n\n');
            
            return template.replace(
              /(\\maketitle\s*)([\s\S]*?)(\\begin\{acks\}|\\bibliographystyle)/,
              `$1\n\n${sectionsLatex}\n\n$3`
            );
          },
          defaultValue: [{ node_id: 'default', title: 'Introduction', content: 'This paper presents our research work.', children: [] }]
        }
      },
      {
        name: 'keywords',
        type: 'list string',
        processor: {
          findPattern: /\\keywords\{[^}]*\}/,
          replaceFunction: (template: string, keywords: string[], fieldName: string) => {
            if (!Array.isArray(keywords) || keywords.length === 0) {
              return template.replace(/\\keywords\{[^}]*\}/, '\\keywords{research, paper}');
            }
            const keywordString = keywords.join(', ');
            return template.replace(/\\keywords\{[^}]*\}/, `\\keywords{${keywordString}}`);
          },
          defaultValue: ['research', 'paper']
        }
      }
    ]
  }
};

/**
 * POST /api/html2latex/transform
 * Transform HTML content to LaTeX using specified template
 */
router.post('/transform', async (req: Request, res: Response): Promise<void> => {
  try {
    const { template, fields } = req.body as ContentTransformRequest;

    if (!template || !fields) {
      res.status(400).json({
        success: false,
        error: 'Template and fields are required'
      } as ContentTransformResponse);
      return;
    }

    // Check if template exists
    const templatePath = path.join(TEMPLATES_DIR, `${template}.tex`);
    
    if (!fs.existsSync(templatePath)) {
      res.status(400).json({
        success: false,
        error: `Template '${template}' not found`
      } as ContentTransformResponse);
      return;
    }

    let templateContent = fs.readFileSync(templatePath, 'utf-8');
    
    // Process fields based on template
    const transformedLatex = processTemplateFields(template, fields, templateContent);

    res.json({
      success: true,
      latex: transformedLatex
    } as ContentTransformResponse);

  } catch (error: any) {
    console.error('HTML to LaTeX transform error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    } as ContentTransformResponse);
  }
});

/**
 * GET /api/html2latex/templates
 * Get list of available LaTeX templates
 */
router.get('/templates', (req: Request, res: Response): void => {
  try {
    // Read templates directory
    if (!fs.existsSync(TEMPLATES_DIR)) {
      res.status(500).json({
        success: false,
        error: 'Templates directory not found'
      });
      return;
    }

    const files = fs.readdirSync(TEMPLATES_DIR);
    const availableTemplateFiles = files
      .filter(file => file.endsWith('.tex'))
      .map(file => file.replace('.tex', ''));

    // Get template definitions for available files
    const templates = availableTemplateFiles
      .filter(templateName => TEMPLATE_DEFINITIONS[templateName])
      .map(templateName => TEMPLATE_DEFINITIONS[templateName]);

    res.json({
      success: true,
      templates
    } as TemplateListResponse & { success: boolean });

  } catch (error: any) {
    console.error('Templates list error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

/**
 * Process template fields and generate LaTeX - modular approach
 */
function processTemplateFields(templateName: string, fields: any, templateContent: string): string {
  const templateDef = TEMPLATE_DEFINITIONS[templateName];
  if (!templateDef) {
    throw new Error(`Unknown template: ${templateName}`);
  }

  let result = templateContent;
  
  // Process each field based on its type
  templateDef.fields.forEach(field => {
    const fieldValue = fields[field.name];
    if (fieldValue !== undefined && fieldValue !== null) {
      result = processTemplateField(result, field, fieldValue);
    } else {
      // Set default values for missing fields
      result = setDefaultFieldValue(result, field);
    }
  });
  
  return result;
}

/**
 * Process a single template field using its processor configuration
 */
function processTemplateField(templateContent: string, field: TemplateField, fieldValue: any): string {
  const { processor } = field;
  
  // Use custom replace function if provided
  if (processor.replaceFunction) {
    return processor.replaceFunction(templateContent, fieldValue, field.name);
  }

  console.warn(`No replacement method defined for field: ${field.name}`);
  return templateContent;
}

/**
 * Set default values for missing fields using processor configuration
 */
function setDefaultFieldValue(templateContent: string, field: TemplateField): string {
  const defaultValue = field.processor.defaultValue;
  if (defaultValue !== undefined) {
    return processTemplateField(templateContent, field, defaultValue);
  }
  return templateContent;
}


/**
 * Legacy function for template1 - now calls the modular approach
 */
function processTemplate1FieldsForACMTemplate(fields: any, template: string): string {
  // Use the new modular approach
  return processTemplateFields('template1', fields, template);
}

/**
 * Convert a single node to LaTeX content
 */
function convertNodeToLatex(node: NodeData): string {
  return convertHtmlToLatex(node.content);
}

/**
 * Convert a recursive node structure to LaTeX with proper sectioning
 */
function convertRecursiveNodeToLatex(node: NodeData, level: number): string {
  let latex = '';
  
  // Add section heading based on level
  const sectionCommands = ['\\section', '\\subsection', '\\subsubsection', '\\paragraph', '\\subparagraph'];
  const sectionCommand = sectionCommands[Math.min(level - 1, sectionCommands.length - 1)];
  
  // Use the title from the node data, fallback if not provided
  const title = node.title && node.title.trim() !== '' ? node.title : `Section ${level}`;
  
  // Convert content to LaTeX for body
  const bodyContent = convertHtmlToLatex(node.content);
  
  latex += `${sectionCommand}{${title}}\n\n`;
  if (bodyContent) {
    latex += bodyContent + '\n\n';
  }
  
  // Process children recursively
  if (node.children && node.children.length > 0) {
    latex += '\n';
    latex += node.children.map(child => 
      convertRecursiveNodeToLatex(child, level + 1)
    ).join('\n\n');
  }
  
  return latex;
}

/**
 * Convert HTML content to LaTeX format
 */
function convertHtmlToLatex(html: string): string {
  if (!html) return '';
  
  let latex = html;
  
  // Basic HTML to LaTeX conversions
  latex = latex
    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '$1')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '\\textbf{$1}')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '\\textbf{$1}')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '\\textit{$1}')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '\\textit{$1}')
    .replace(/<u[^>]*>(.*?)<\/u>/gi, '\\underline{$1}')
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '\\texttt{$1}')
    .replace(/<pre[^>]*>(.*?)<\/pre>/gi, '\\begin{verbatim}\n$1\n\\end{verbatim}')
    .replace(/<ul[^>]*>/gi, '\\begin{itemize}')
    .replace(/<\/ul>/gi, '\\end{itemize}')
    .replace(/<ol[^>]*>/gi, '\\begin{enumerate}')
    .replace(/<\/ol>/gi, '\\end{enumerate}')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '\\item $1')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '\\url{$1}')
    .replace(/<br[^>]*>/gi, '\\\\')
    .replace(/<[^>]*>/g, '')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
  
  return latex;
}

// Server only generates LaTeX - client handles rendering with react-latex-next

export { router as html2latexRoutes };