const latex = require('node-latex');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class LaTeXService {
  constructor() {
    this.tempDir = path.join(__dirname, '../temp');
    this.ensureTempDir();
  }

  ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  // Generate LaTeX document from content
  generateLaTeXDocument(title, content, documentType = 'general') {
    const sanitizedContent = this.sanitizeContent(content);
    const template = this.getDocumentTemplate(documentType);
    
    return template
      .replace('{{TITLE}}', this.escapeLaTeX(title))
      .replace('{{CONTENT}}', this.formatContentForLaTeX(sanitizedContent))
      .replace('{{DATE}}', new Date().toLocaleDateString('ru-RU'));
  }

  // Get appropriate template based on document type
  getDocumentTemplate(documentType) {
    const baseTemplate = `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[russian]{babel}
\\usepackage{geometry}
\\usepackage{enumitem}
\\usepackage{setspace}
\\usepackage{parskip}
\\usepackage{fancyhdr}
\\usepackage{titlesec}

\\geometry{margin=2.5cm}
\\onehalfspacing
\\setlength{\\parindent}{0pt}

% Header and footer
\\pagestyle{fancy}
\\fancyhf{}
\\fancyhead[L]{Юридический документ}
\\fancyhead[R]{{{DATE}}}
\\fancyfoot[C]{\\thepage}

% Title formatting
\\titleformat{\\section}{\\large\\bfseries}{}{0em}{}
\\titleformat{\\subsection}{\\normalsize\\bfseries}{}{0em}{}

\\begin{document}

\\begin{center}
\\Large\\textbf{{{TITLE}}}
\\end{center}

\\vspace{1cm}

{{CONTENT}}

\\vspace{2cm}

\\begin{flushright}
\\textbf{Дата:} {{DATE}}
\\end{flushright}

\\end{document}`;

    // Specialized templates for different document types
    switch (documentType.toLowerCase()) {
      case 'contract':
        return this.getContractTemplate();
      case 'complaint':
        return this.getComplaintTemplate();
      case 'application':
        return this.getApplicationTemplate();
      case 'lawsuit':
        return this.getLawsuitTemplate();
      default:
        return baseTemplate;
    }
  }

  getContractTemplate() {
    return `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[russian]{babel}
\\usepackage{geometry}
\\usepackage{enumitem}
\\usepackage{setspace}
\\usepackage{parskip}
\\usepackage{fancyhdr}

\\geometry{margin=2.5cm}
\\onehalfspacing
\\setlength{\\parindent}{0pt}

\\pagestyle{fancy}
\\fancyhf{}
\\fancyhead[L]{ДОГОВОР}
\\fancyhead[R]{{{DATE}}}
\\fancyfoot[C]{\\thepage}

\\begin{document}

\\begin{center}
\\Large\\textbf{{{TITLE}}}
\\end{center}

\\vspace{1cm}

\\textbf{Стороны договора:}

\\textbf{Исполнитель:} \\underline{\\hspace{6cm}}

\\textbf{Заказчик:} \\underline{\\hspace{6cm}}

\\vspace{1cm}

\\textbf{Предмет договора:}

{{CONTENT}}

\\vspace{1cm}

\\textbf{Условия договора:}

\\begin{enumerate}[label=\\arabic*.]
\\item Срок выполнения: \\underline{\\hspace{4cm}}
\\item Стоимость: \\underline{\\hspace{4cm}}
\\item Ответственность сторон: \\underline{\\hspace{4cm}}
\\end{enumerate}

\\vspace{2cm}

\\textbf{Подписи сторон:}

\\vspace{1cm}

\\textbf{Исполнитель:} \\underline{\\hspace{6cm}} \\hspace{2cm} \\textbf{Заказчик:} \\underline{\\hspace{6cm}}

\\vspace{0.5cm}

\\textbf{Дата:} {{DATE}}

\\end{document}`;
  }

  getComplaintTemplate() {
    return `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[russian]{babel}
\\usepackage{geometry}
\\usepackage{enumitem}
\\usepackage{setspace}
\\usepackage{parskip}
\\usepackage{fancyhdr}

\\geometry{margin=2.5cm}
\\onehalfspacing
\\setlength{\\parindent}{0pt}

\\pagestyle{fancy}
\\fancyhf{}
\\fancyhead[L]{ПРЕТЕНЗИЯ}
\\fancyhead[R]{{{DATE}}}
\\fancyfoot[C]{\\thepage}

\\begin{document}

\\begin{center}
\\Large\\textbf{{{TITLE}}}
\\end{center}

\\vspace{1cm}

\\textbf{Кому:} \\underline{\\hspace{6cm}}

\\textbf{От кого:} \\underline{\\hspace{6cm}}

\\vspace{1cm}

\\textbf{Основание претензии:}

{{CONTENT}}

\\vspace{1cm}

\\textbf{Требования:}

\\begin{enumerate}[label=\\arabic*.]
\\item \\underline{\\hspace{8cm}}
\\item \\underline{\\hspace{8cm}}
\\end{enumerate}

\\vspace{1cm}

\\textbf{Срок для ответа:} \\underline{\\hspace{4cm}}

\\vspace{2cm}

\\textbf{Заявитель:} \\underline{\\hspace{6cm}}

\\textbf{Дата:} {{DATE}}

\\end{document}`;
  }

  getApplicationTemplate() {
    return `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[russian]{babel}
\\usepackage{geometry}
\\usepackage{enumitem}
\\usepackage{setspace}
\\usepackage{parskip}
\\usepackage{fancyhdr}

\\geometry{margin=2.5cm}
\\onehalfspacing
\\setlength{\\parindent}{0pt}

\\pagestyle{fancy}
\\fancyhf{}
\\fancyhead[L]{ЗАЯВЛЕНИЕ}
\\fancyhead[R]{{{DATE}}}
\\fancyfoot[C]{\\thepage}

\\begin{document}

\\begin{center}
\\Large\\textbf{{{TITLE}}}
\\end{center}

\\vspace{1cm}

\\textbf{В} \\underline{\\hspace{6cm}}

\\textbf{От} \\underline{\\hspace{6cm}}

\\vspace{1cm}

\\textbf{ЗАЯВЛЕНИЕ}

{{CONTENT}}

\\vspace{1cm}

\\textbf{Прошу:}

\\begin{enumerate}[label=\\arabic*.]
\\item \\underline{\\hspace{8cm}}
\\item \\underline{\\hspace{8cm}}
\\end{enumerate}

\\vspace{2cm}

\\textbf{Заявитель:} \\underline{\\hspace{6cm}}

\\textbf{Дата:} {{DATE}}

\\end{document}`;
  }

  getLawsuitTemplate() {
    return `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[russian]{babel}
\\usepackage{geometry}
\\usepackage{enumitem}
\\usepackage{setspace}
\\usepackage{parskip}
\\usepackage{fancyhdr}

\\geometry{margin=2.5cm}
\\onehalfspacing
\\setlength{\\parindent}{0pt}

\\pagestyle{fancy}
\\fancyhf{}
\\fancyhead[L]{ИСКОВОЕ ЗАЯВЛЕНИЕ}
\\fancyhead[R]{{{DATE}}}
\\fancyfoot[C]{\\thepage}

\\begin{document}

\\begin{center}
\\Large\\textbf{{{TITLE}}}
\\end{center}

\\vspace{1cm}

\\textbf{В} \\underline{\\hspace{6cm}}

\\textbf{Истец:} \\underline{\\hspace{6cm}}

\\textbf{Ответчик:} \\underline{\\hspace{6cm}}

\\vspace{1cm}

\\textbf{Цена иска:} \\underline{\\hspace{4cm}}

\\vspace{1cm}

\\textbf{Обстоятельства дела:}

{{CONTENT}}

\\vspace{1cm}

\\textbf{Правовые основания:}

\\begin{enumerate}[label=\\arabic*.]
\\item \\underline{\\hspace{8cm}}
\\item \\underline{\\hspace{8cm}}
\\end{enumerate}

\\vspace{1cm}

\\textbf{Просим суд:}

\\begin{enumerate}[label=\\arabic*.]
\\item \\underline{\\hspace{8cm}}
\\item \\underline{\\hspace{8cm}}
\\end{enumerate}

\\vspace{2cm}

\\textbf{Истец:} \\underline{\\hspace{6cm}}

\\textbf{Дата:} {{DATE}}

\\end{document}`;
  }

  // Sanitize content for LaTeX
  sanitizeContent(content) {
    return content
      .replace(/\\/g, '\\textbackslash{}')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}')
      .replace(/\$/g, '\\$')
      .replace(/\&/g, '\\&')
      .replace(/%/g, '\\%')
      .replace(/\#/g, '\\#')
      .replace(/\^/g, '\\textasciicircum{}')
      .replace(/_/g, '\\_')
      .replace(/~/g, '\\textasciitilde{}');
  }

  // Escape LaTeX special characters
  escapeLaTeX(text) {
    return this.sanitizeContent(text);
  }

  // Format content for LaTeX with proper structure
  formatContentForLaTeX(content) {
    return content
      .split('\n')
      .map(line => {
        const trimmed = line.trim();
        if (!trimmed) return '';
        
        // Handle numbered lists
        if (/^\d+\.\s/.test(trimmed)) {
          return `\\item ${trimmed.replace(/^\d+\.\s/, '')}`;
        }
        
        // Handle bullet points
        if (/^[-•]\s/.test(trimmed)) {
          return `\\item ${trimmed.replace(/^[-•]\s/, '')}`;
        }
        
        // Handle bold text
        if (/^\*\*.*\*\*$/.test(trimmed)) {
          const text = trimmed.replace(/^\*\*(.*)\*\*$/, '$1');
          return `\\textbf{${text}}`;
        }
        
        // Handle section headers
        if (trimmed.endsWith(':')) {
          return `\\textbf{${trimmed}}`;
        }
        
        return trimmed;
      })
      .filter(line => line.length > 0)
      .join('\n\n');
  }

  // Generate PDF from LaTeX content
  async generatePDF(title, content, documentType = 'general') {
    try {
      const latexContent = this.generateLaTeXDocument(title, content, documentType);
      const tempFile = path.join(this.tempDir, `document_${Date.now()}.tex`);
      
      // Write LaTeX file
      fs.writeFileSync(tempFile, latexContent, 'utf8');
      
      logger.info('📄 LaTeX document generated', {
        title,
        documentType,
        contentLength: content.length,
        tempFile
      });

      // Compile LaTeX to PDF
      const pdfBuffer = await new Promise((resolve, reject) => {
        const input = fs.createReadStream(tempFile);
        const output = [];
        
        const pdf = latex(input, {
          passes: 2,
          timeout: 30000
        });
        
        pdf.on('error', (err) => {
          logger.error('LaTeX compilation error:', err);
          reject(err);
        });
        
        pdf.on('data', (chunk) => {
          output.push(chunk);
        });
        
        pdf.on('end', () => {
          resolve(Buffer.concat(output));
        });
      });

      // Clean up temp file
      try {
        fs.unlinkSync(tempFile);
      } catch (err) {
        logger.warn('Failed to delete temp LaTeX file:', err);
      }

      logger.info('✅ PDF generated successfully', {
        title,
        pdfSize: pdfBuffer.length
      });

      return pdfBuffer;

    } catch (error) {
      logger.error('❌ PDF generation failed:', error);
      throw new Error(`PDF generation failed: ${error.message}`);
    }
  }

  // Detect document type from content
  detectDocumentType(content) {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('договор') || lowerContent.includes('контракт')) {
      return 'contract';
    }
    if (lowerContent.includes('претензия') || lowerContent.includes('жалоба')) {
      return 'complaint';
    }
    if (lowerContent.includes('заявление')) {
      return 'application';
    }
    if (lowerContent.includes('иск') || lowerContent.includes('исковое')) {
      return 'lawsuit';
    }
    
    return 'general';
  }
}

module.exports = new LaTeXService();
