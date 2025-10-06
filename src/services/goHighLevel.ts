/**
 * GoHighLevel (GHL) API Integration Service
 * Handles contact creation and lead management
 */

interface GHLContact {
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  tags?: string[];
  customFields?: Record<string, unknown>;
  source?: string;
}

interface GHLResponse {
  success: boolean;
  contact?: unknown;
  error?: string;
}

class GoHighLevelService {
  private baseUrl: string;
  private apiKey: string;
  private locationId: string;

  constructor() {
    // These will be set via environment variables
    // Using v1 API endpoint which works with the location token
    this.baseUrl =
      process.env.NEXT_PUBLIC_GHL_API_URL || 'https://rest.gohighlevel.com/v1';
    this.apiKey =
      process.env.GOHIGHLEVEL_API_KEY || process.env.GHL_API_KEY || '';
    this.locationId =
      process.env.GOHIGHLEVEL_LOCATION_ID || process.env.GHL_LOCATION_ID || '';
  }

  /**
   * Create or update a contact in GoHighLevel
   */
  async createContact(contact: GHLContact): Promise<GHLResponse> {
    try {
      // Check if service is configured
      if (!this.apiKey || !this.locationId) {
        console.warn('GoHighLevel not configured - skipping contact creation');
        return { success: true }; // Don't block signup if GHL isn't configured
      }

      const response = await fetch(`${this.baseUrl}/contacts/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          Version: '2021-07-28',
        },
        body: JSON.stringify({
          firstName: contact.firstName,
          lastName: contact.lastName || '',
          email: contact.email,
          phone: contact.phone || '',
          locationId: this.locationId,
          tags: contact.tags || ['dpi-tool-signup', 'website-lead'],
          customFields: {
            ...contact.customFields,
            leadSource: contact.source || 'DPI Tool',
            signupDate: new Date().toISOString(),
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('GoHighLevel API error:', errorData);

        // Don't throw - we don't want to block signup if GHL fails
        return {
          success: false,
          error: `GHL API error: ${response.status}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        contact: data.contact || data,
      };
    } catch (error) {
      console.error('Error creating GoHighLevel contact:', error);
      // Don't throw - we don't want to block signup if GHL fails
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Add a tag to an existing contact
   */
  async addTagToContact(contactId: string, tag: string): Promise<GHLResponse> {
    try {
      if (!this.apiKey || !this.locationId) {
        return { success: true }; // Don't block if GHL isn't configured
      }

      const response = await fetch(
        `${this.baseUrl}/contacts/${contactId}/tags`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            Version: '2021-07-28',
          },
          body: JSON.stringify({
            tags: [tag],
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        console.error('GoHighLevel API error:', errorData);
        return {
          success: false,
          error: `GHL API error: ${response.status}`,
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error adding tag to GoHighLevel contact:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Track an event for analytics
   */
  async trackEvent(
    email: string,
    eventName: string,
    eventData?: unknown
  ): Promise<void> {
    try {
      if (!this.apiKey || !this.locationId) {
        return; // Skip if not configured
      }

      // This could be implemented as a custom field update or note
      await this.createContact({
        email,
        firstName: 'User',
        customFields: {
          lastEvent: eventName,
          lastEventDate: new Date().toISOString(),
          eventData: JSON.stringify(eventData || {}),
        },
      });
    } catch (error) {
      console.error('Error tracking event in GoHighLevel:', error);
      // Silent fail - don't disrupt user experience
    }
  }
}

// Export singleton instance
export const goHighLevelService = new GoHighLevelService();

// Export types
export type { GHLContact, GHLResponse };
