import { NextRequest, NextResponse } from 'next/server';
import { EventWebhook, EventWebhookHeader } from '@sendgrid/eventwebhook';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { env } from '@/config/env';

// Email event types we care about
type EmailEventType = 'delivered' | 'open' | 'click' | 'bounce' | 'spam' | 'unsubscribe' | 'dropped' | 'deferred';

interface SendGridEvent {
  email: string;
  timestamp: number;
  event: EmailEventType;
  sg_event_id: string;
  sg_message_id: string;
  category?: string[];
  url?: string;
  reason?: string;
  status?: string;
  type?: string;
  ip?: string;
  useragent?: string;
  [key: string]: any;
}

export async function POST(request: NextRequest) {
  try {
    // Check if webhook verification is configured
    const publicKey = env.SENDGRID_WEBHOOK_PUBLIC_KEY;
    
    if (!publicKey) {
      console.warn('SendGrid webhook public key not configured. Skipping signature verification.');
    } else {
      // Verify webhook signature
      const signature = request.headers.get(EventWebhookHeader.SIGNATURE());
      const timestamp = request.headers.get(EventWebhookHeader.TIMESTAMP());
      
      if (!signature || !timestamp) {
        return NextResponse.json(
          { error: 'Missing signature or timestamp' },
          { status: 403 }
        );
      }

      // Get raw body as buffer
      const payload = Buffer.from(await request.arrayBuffer());
      
      // Verify signature
      const eventWebhook = new EventWebhook();
      const ecPublicKey = eventWebhook.convertPublicKeyToECDSA(publicKey);
      
      if (!eventWebhook.verifySignature(ecPublicKey, payload, signature, timestamp)) {
        console.error('SendGrid webhook signature verification failed');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 403 }
        );
      }
      
      // Parse events after verification
      const events: SendGridEvent[] = JSON.parse(payload.toString());
      
      // Process each event
      for (const event of events) {
        await handleEmailEvent(event);
      }
    }
    
    // If no public key, parse body directly (less secure, only for development)
    if (!publicKey) {
      const events: SendGridEvent[] = await request.json();
      for (const event of events) {
        await handleEmailEvent(event);
      }
    }
    
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('SendGrid webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleEmailEvent(event: SendGridEvent) {
  console.log(`Processing SendGrid event: ${event.event} for ${event.email}`);
  
  const supabase = await createServerSupabaseClient();
  
  try {
    // Log the event for analytics
    const { error: logError } = await supabase
      .from('email_events')
      .insert({
        email: event.email,
        event_type: event.event,
        timestamp: new Date(event.timestamp * 1000).toISOString(),
        sg_event_id: event.sg_event_id,
        sg_message_id: event.sg_message_id,
        category: event.category,
        url: event.url,
        reason: event.reason,
        status: event.status,
        metadata: event,
      });
    
    if (logError) {
      // If table doesn't exist, create it (for initial setup)
      if (logError.code === '42P01') {
        await createEmailEventsTable(supabase);
        // Retry the insert
        await supabase
          .from('email_events')
          .insert({
            email: event.email,
            event_type: event.event,
            timestamp: new Date(event.timestamp * 1000).toISOString(),
            sg_event_id: event.sg_event_id,
            sg_message_id: event.sg_message_id,
            category: event.category,
            url: event.url,
            reason: event.reason,
            status: event.status,
            metadata: event,
          });
      } else {
        console.error('Error logging email event:', logError);
      }
    }
    
    // Handle specific event types
    switch (event.event) {
      case 'bounce':
        await handleBounce(event, supabase);
        break;
        
      case 'spam':
        await handleSpamReport(event, supabase);
        break;
        
      case 'unsubscribe':
        await handleUnsubscribe(event, supabase);
        break;
        
      case 'delivered':
        console.log(`Email delivered to ${event.email}`);
        break;
        
      case 'open':
        console.log(`Email opened by ${event.email}`);
        break;
        
      case 'click':
        console.log(`Link clicked by ${event.email}: ${event.url}`);
        break;
        
      default:
        console.log(`Unhandled event type: ${event.event}`);
    }
  } catch (error) {
    console.error('Error handling email event:', error);
  }
}

async function handleBounce(event: SendGridEvent, supabase: any) {
  console.log(`Handling bounce for ${event.email}: ${event.reason}`);
  
  // Update user profile to mark email as bounced
  const { error } = await supabase
    .from('profiles')
    .update({
      email_bounced: true,
      email_bounce_reason: event.reason,
      email_verified: false,
      updated_at: new Date().toISOString(),
    })
    .eq('email', event.email);
  
  if (error) {
    console.error('Error updating bounce status:', error);
  }
}

async function handleSpamReport(event: SendGridEvent, supabase: any) {
  console.log(`Handling spam report for ${event.email}`);
  
  // Update user profile to opt out of marketing emails
  const { error } = await supabase
    .from('profiles')
    .update({
      email_marketing_opted_out: true,
      email_spam_reported: true,
      updated_at: new Date().toISOString(),
    })
    .eq('email', event.email);
  
  if (error) {
    console.error('Error updating spam report status:', error);
  }
}

async function handleUnsubscribe(event: SendGridEvent, supabase: any) {
  console.log(`Handling unsubscribe for ${event.email}`);
  
  // Update user profile to opt out of marketing emails
  const { error } = await supabase
    .from('profiles')
    .update({
      email_marketing_opted_out: true,
      email_unsubscribed: true,
      updated_at: new Date().toISOString(),
    })
    .eq('email', event.email);
  
  if (error) {
    console.error('Error updating unsubscribe status:', error);
  }
}

// Helper function to create email_events table if it doesn't exist
async function createEmailEventsTable(supabase: any) {
  console.log('Creating email_events table...');
  
  // This should ideally be in a migration, but for quick setup:
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS email_events (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        email TEXT NOT NULL,
        event_type TEXT NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL,
        sg_event_id TEXT UNIQUE,
        sg_message_id TEXT,
        category TEXT[],
        url TEXT,
        reason TEXT,
        status TEXT,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_email_events_email ON email_events(email);
      CREATE INDEX IF NOT EXISTS idx_email_events_type ON email_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_email_events_timestamp ON email_events(timestamp);
    `
  });
  
  if (error) {
    console.error('Error creating email_events table:', error);
  }
}