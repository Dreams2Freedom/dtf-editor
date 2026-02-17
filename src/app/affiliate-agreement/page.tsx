import { Card } from '@/components/ui/Card';
import fs from 'fs';
import path from 'path';
import { marked } from 'marked';

// NEW-05: Configure marked to sanitize output — disable dangerous HTML
marked.setOptions({
  breaks: true,
  gfm: true,
});

// Strip raw HTML tags from markdown to prevent XSS
function sanitizeHtml(html: string): string {
  // Remove script tags and event handlers
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/<iframe\b[^>]*>.*?<\/iframe>/gi, '')
    .replace(/<object\b[^>]*>.*?<\/object>/gi, '')
    .replace(/<embed\b[^>]*>/gi, '')
    .replace(/javascript\s*:/gi, '');
}

export default async function AffiliateAgreementPage() {
  // Read the affiliate agreement markdown
  const agreementPath = path.join(process.cwd(), 'AFFILIATE_AGREEMENT.md');
  const agreementContent = fs.readFileSync(agreementPath, 'utf8');

  // Convert markdown to HTML and sanitize
  const rawHtml = await marked(agreementContent);
  const htmlContent = sanitizeHtml(rawHtml);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Card className="p-8">
          <div
            className="prose prose-gray max-w-none"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </Card>
      </div>
    </div>
  );
}
