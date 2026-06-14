import { NextRequest, NextResponse } from 'next/server';
import { buildReadyToPressReport } from '@/services/reports/readyToPressReport';
import { sendAgentMail, isAgentMailConfigured } from '@/services/agentMail';
import { serverEnv } from '@/config/server-env';

export const dynamic = 'force-dynamic';

/**
 * Weekly Ready to Press mobile add-to-cart recovery report.
 *
 * Scheduled via vercel.json (Mondays). Can also be triggered manually with:
 *   curl -H "Authorization: Bearer $CRON_SECRET" \
 *        https://dtfeditor.com/api/cron/weekly-rtp-report
 *
 * Pass ?dryRun=1 to build the report without sending the email.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dryRun = request.nextUrl.searchParams.get('dryRun') === '1';

  try {
    const report = await buildReadyToPressReport();

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        subject: report.subject,
        data: report.data,
      });
    }

    if (!isAgentMailConfigured()) {
      return NextResponse.json(
        { error: 'AGENTMAIL_API_KEY is not configured' },
        { status: 500 }
      );
    }

    const recipient = serverEnv.REPORT_RECIPIENT_EMAIL;
    const sendResult = await sendAgentMail({
      to: recipient,
      subject: report.subject,
      html: report.html,
      text: report.text,
    });

    return NextResponse.json({
      success: true,
      recipient,
      inboxId: sendResult.inboxId,
      messageId: sendResult.messageId,
      data: report.data,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to build/send report';
    console.error('Weekly RTP report cron error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
