/**
 * GoHighLevel API v2 Integration Service
 * Uses the new v2 API endpoints and authentication
 * Documentation: https://highlevel.stoplight.io/docs/integrations/
 */

interface GHLContact {
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  tags?: string[];
  customFields?: Record<string, any>;
  source?: string;
}

interface GHLResponse {
  success: boolean;
  contact?: any;
  error?: string;
}

class GoHighLevelV2Service {
  private baseUrl: string;
  private apiKey: string;
  private locationId: string;

  constructor() {
    // V2 API uses a different base URL
    this.baseUrl = process.env.NEXT_PUBLIC_GHL_API_URL || 'https://services.leadconnectorhq.com';
    this.apiKey = process.env.GOHIGHLEVEL_API_KEY || process.env.GHL_API_KEY || '';
    this.locationId = process.env.GOHIGHLEVEL_LOCATION_ID || process.env.GHL_LOCATION_ID || '';
  }

  /**
   * Create or update a contact in GoHighLevel v2
   * POST /contacts/
   */
  async createContact(contact: GHLContact): Promise<GHLResponse> {
    try {
      // Check if service is configured
      if (!this.apiKey || !this.locationId) {
        console.warn('GoHighLevel not configured - skipping contact creation');
        return { success: true }; // Don't block signup if GHL isn't configured
      }

      // V2 API endpoint for creating contacts
      const response = await fetch(`${this.baseUrl}/contacts/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28', // V2 API version header
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          firstName: contact.firstName,
          lastName: contact.lastName || '',
          email: contact.email,
          phone: contact.phone || '',
          locationId: this.locationId,
          tags: contact.tags || ['dtf-tool-signup', 'website-lead'],
          customField: contact.customFields || {},
          source: contact.source || 'DTF Editor Website'
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('GoHighLevel API v2 error:', response.status, errorData);
        
        // Parse error if JSON
        try {
          const errorJson = JSON.parse(errorData);
          console.error('Error details:', errorJson);
        } catch (e) {
          // Not JSON, use raw text
        }
        
        // Don't throw - we don't want to block signup if GHL fails
        return { 
          success: false, 
          error: `GHL API error: ${response.status}` 
        };
      }

      const data = await response.json();
      console.log('GoHighLevel contact created:', data.contact?.id || data.id);
      
      return { 
        success: true, 
        contact: data.contact || data 
      };

    } catch (error) {
      console.error('Error creating GoHighLevel contact:', error);
      // Don't throw - we don't want to block signup if GHL fails
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get a contact by email
   */
  async getContactByEmail(email: string): Promise<GHLResponse> {
    try {
      if (!this.apiKey || !this.locationId) {
        return { success: false, error: 'GoHighLevel not configured' };
      }

      // V2 API - search contacts by email
      const response = await fetch(
        `${this.baseUrl}/contacts/lookup?email=${encodeURIComponent(email)}&locationId=${this.locationId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Version': '2021-07-28',
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        console.error('GoHighLevel lookup error:', errorData);
        return { 
          success: false, 
          error: `Failed to lookup contact: ${response.status}` 
        };
      }

      const data = await response.json();
      return { 
        success: true, 
        contact: data.contacts?.[0] || data.contact || null 
      };

    } catch (error) {
      console.error('Error looking up contact:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Update an existing contact
   */
  async updateContact(contactId: string, updates: Partial<GHLContact>): Promise<GHLResponse> {
    try {
      if (!this.apiKey || !this.locationId) {
        return { success: false, error: 'GoHighLevel not configured' };
      }

      // V2 API - update contact
      const response = await fetch(`${this.baseUrl}/contacts/${contactId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          ...updates,
          locationId: this.locationId
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('GoHighLevel update error:', errorData);
        return { 
          success: false, 
          error: `Failed to update contact: ${response.status}` 
        };
      }

      const data = await response.json();
      return { 
        success: true, 
        contact: data.contact || data 
      };

    } catch (error) {
      console.error('Error updating contact:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Add tags to a contact
   */
  async addTagsToContact(contactId: string, tags: string[]): Promise<GHLResponse> {
    try {
      if (!this.apiKey || !this.locationId) {
        return { success: true }; // Don't block if GHL isn't configured
      }

      // V2 API - add tags to contact
      const response = await fetch(`${this.baseUrl}/contacts/${contactId}/tags`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ tags })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('GoHighLevel add tags error:', errorData);
        return { 
          success: false, 
          error: `Failed to add tags: ${response.status}` 
        };
      }

      return { success: true };

    } catch (error) {
      console.error('Error adding tags to contact:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Create or update a contact (upsert)
   * First tries to find by email, then updates or creates
   */
  async upsertContact(contact: GHLContact): Promise<GHLResponse> {
    try {
      // First, try to find the contact by email
      const lookupResult = await this.getContactByEmail(contact.email);
      
      if (lookupResult.success && lookupResult.contact) {
        // Contact exists, update it
        const contactId = lookupResult.contact.id || lookupResult.contact._id;
        console.log(`Updating existing contact: ${contactId}`);
        
        const updateResult = await this.updateContact(contactId, contact);
        
        // Add new tags if provided
        if (updateResult.success && contact.tags?.length) {
          await this.addTagsToContact(contactId, contact.tags);
        }
        
        return updateResult;
      } else {
        // Contact doesn't exist, create it
        console.log('Creating new contact');
        return await this.createContact(contact);
      }
    } catch (error) {
      console.error('Error upserting contact:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Track an event for a contact
   */
  async trackEvent(email: string, eventName: string, eventData?: any): Promise<void> {
    try {
      if (!this.apiKey || !this.locationId) {
        return; // Skip if not configured
      }

      // Find the contact
      const lookupResult = await this.getContactByEmail(email);
      
      if (lookupResult.success && lookupResult.contact) {
        const contactId = lookupResult.contact.id || lookupResult.contact._id;
        
        // Add event as a tag and custom field
        await this.addTagsToContact(contactId, [`event:${eventName}`]);
        
        // Update custom fields with event data
        await this.updateContact(contactId, {
          customFields: {
            lastEvent: eventName,
            lastEventDate: new Date().toISOString(),
            [`event_${eventName}_data`]: JSON.stringify(eventData || {})
          }
        });
      }
    } catch (error) {
      console.error('Error tracking event in GoHighLevel:', error);
      // Silent fail - don't disrupt user experience
    }
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    return !!(this.apiKey && this.locationId);
  }

  /**
   * Test the API connection
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.isConfigured()) {
        return { 
          success: false, 
          message: 'GoHighLevel API key or Location ID not configured' 
        };
      }

      // Try to fetch location details as a connection test
      const response = await fetch(`${this.baseUrl}/locations/${this.locationId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Version': '2021-07-28',
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return { 
          success: true, 
          message: `Connected to location: ${data.name || data.companyName || this.locationId}` 
        };
      } else {
        const errorText = await response.text();
        return { 
          success: false, 
          message: `API test failed: ${response.status} - ${errorText.substring(0, 100)}` 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Connection test failed' 
      };
    }
  }
}

// Export singleton instance
export const goHighLevelV2Service = new GoHighLevelV2Service();

// Export types
export type { GHLContact, GHLResponse };