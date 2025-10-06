#!/usr/bin/env node

// Check Mailgun email logs and delivery status

require('dotenv').config();

const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN;

async function checkMailgunLogs() {
  console.log('📊 Checking Mailgun Email Logs\n');

  if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN) {
    console.error('❌ Mailgun credentials not found in environment');
    return;
  }

  const auth = Buffer.from(`api:${MAILGUN_API_KEY}`).toString('base64');
  const url = `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/events?limit=10`;

  try {
    console.log('🔍 Fetching recent email events...\n');

    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    if (!response.ok) {
      console.error('❌ Failed to fetch logs:', response.statusText);
      return;
    }

    const data = await response.json();

    if (data.items && data.items.length > 0) {
      console.log(`📧 Found ${data.items.length} recent email events:\n`);

      data.items.forEach((event, index) => {
        const timestamp = new Date(event.timestamp * 1000).toLocaleString();
        const recipient =
          event.recipient || event.message?.recipients || 'Unknown';
        const subject = event.message?.headers?.subject || 'No subject';
        const eventType = event.event;

        // Determine status icon
        let icon = '📧';
        if (eventType === 'delivered') icon = '✅';
        else if (eventType === 'accepted') icon = '📤';
        else if (eventType === 'opened') icon = '👁️';
        else if (eventType === 'clicked') icon = '🔗';
        else if (eventType === 'failed' || eventType === 'bounced') icon = '❌';
        else if (eventType === 'complained') icon = '⚠️';

        console.log(`${index + 1}. ${icon} ${eventType.toUpperCase()}`);
        console.log(`   To: ${recipient}`);
        console.log(`   Subject: ${subject}`);
        console.log(`   Time: ${timestamp}`);

        if (event.delivery_status) {
          console.log(
            `   Status: ${event.delivery_status.description || event.delivery_status.message}`
          );
        }

        if (event['user-variables']) {
          const vars = event['user-variables'];
          if (vars.user_email) {
            console.log(`   User: ${vars.user_email}`);
          }
        }

        console.log('');
      });

      // Summary
      const delivered = data.items.filter(e => e.event === 'delivered').length;
      const opened = data.items.filter(e => e.event === 'opened').length;
      const clicked = data.items.filter(e => e.event === 'clicked').length;
      const failed = data.items.filter(
        e => e.event === 'failed' || e.event === 'bounced'
      ).length;

      console.log('📈 Summary:');
      console.log(`   Delivered: ${delivered}`);
      console.log(`   Opened: ${opened}`);
      console.log(`   Clicked: ${clicked}`);
      if (failed > 0) {
        console.log(`   Failed: ${failed} ⚠️`);
      }
    } else {
      console.log('📭 No email events found in the last 24 hours');
    }

    console.log('\n🔗 View full logs at:');
    console.log(
      '   https://app.mailgun.com/app/sending/domains/' +
        MAILGUN_DOMAIN +
        '/logs'
    );
  } catch (error) {
    console.error('❌ Error fetching logs:', error.message);
  }
}

// Check stats
async function checkMailgunStats() {
  const auth = Buffer.from(`api:${MAILGUN_API_KEY}`).toString('base64');
  const statsUrl = `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/stats/total?event=accepted&event=delivered&event=failed&event=opened&event=clicked&event=complained&duration=24h`;

  try {
    console.log('\n📊 24-Hour Statistics:');

    const response = await fetch(statsUrl, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    if (response.ok) {
      const data = await response.json();

      if (data.stats && data.stats.length > 0) {
        const stats = data.stats[0];
        console.log(`   Accepted: ${stats.accepted?.total || 0}`);
        console.log(`   Delivered: ${stats.delivered?.total || 0}`);
        console.log(`   Opened: ${stats.opened?.total || 0}`);
        console.log(`   Clicked: ${stats.clicked?.total || 0}`);
        console.log(`   Failed: ${stats.failed?.total || 0}`);

        if (stats.delivered?.total > 0) {
          const deliveryRate = (
            (stats.delivered.total / stats.accepted.total) *
            100
          ).toFixed(1);
          console.log(`   Delivery Rate: ${deliveryRate}%`);
        }
      }
    }
  } catch (error) {
    console.log('   Could not fetch statistics');
  }
}

// Run checks
checkMailgunLogs().then(() => checkMailgunStats());
