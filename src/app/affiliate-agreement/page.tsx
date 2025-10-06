import { Card } from '@/components/ui/Card';
import fs from 'fs';
import path from 'path';
import { marked } from 'marked';

export default async function AffiliateAgreementPage() {
  // Read the affiliate agreement markdown
  const agreementPath = path.join(process.cwd(), 'AFFILIATE_AGREEMENT.md');
  const agreementContent = fs.readFileSync(agreementPath, 'utf8');

  // Convert markdown to HTML
  const htmlContent = marked(agreementContent);

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
