// Event parsing utilities for different platforms

interface UnifiedEvent {
  id: string;
  title: string;
  distance: string;
  timing: string;
  description: string;
  category: string;
  venue?: string;
  city?: string;
  price?: string;
  image?: string;
  bookingUrl?: string;
  date?: string;
  time?: string;
  source: 'bookmyshow' | 'paytm-insider' | 'district' | 'facebook' | 'meetup';
}

// Parse BookMyShow events from scraped markdown
export function parseBookMyShowEvents(markdown: string, location: string): UnifiedEvent[] {
  const events: UnifiedEvent[] = [];
  
  try {
    // Look for event patterns in markdown
    const eventRegex = /(?:#+\s*)?([^#\n]+)(?:\n.*?)?(?:₹|Rs\.?\s*)?(\d+(?:,\d+)*(?:\s*-\s*₹?\d+(?:,\d+)*)?)?/gi;
    const lines = markdown.split('\n');
    
    let currentEvent: Partial<UnifiedEvent> = {};
    let eventIndex = 0;
    
    for (let i = 0; i < lines.length && events.length < 10; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line) continue;
      
      // Check for event titles (usually in headers or bold)
      if (line.match(/^#+\s*/) || line.match(/\*\*.*?\*\*/)) {
        // Save previous event if we have one
        if (currentEvent.title) {
          finalizeEvent(currentEvent, events, location, eventIndex++);
          currentEvent = {};
        }
        
        // Extract title
        currentEvent.title = line.replace(/^#+\s*|\*\*|\*|#/g, '').trim();
      }
      
      // Look for price information
      else if (line.match(/₹|Rs\.?\s*\d+/i)) {
        const priceMatch = line.match(/(₹|Rs\.?\s*)(\d+(?:,\d+)*(?:\s*-\s*₹?\d+(?:,\d+)*)?)/i);
        if (priceMatch && currentEvent.title) {
          currentEvent.price = `₹${priceMatch[2]}`;
        }
      }
      
      // Look for venue/location information
      else if (line.match(/venue|location|at\s+/i) && line.length < 100) {
        currentEvent.venue = line.replace(/venue:?\s*|location:?\s*|at\s+/gi, '').trim();
      }
      
      // Look for category/genre information
      else if (line.match(/music|comedy|art|food|dance|theatre|workshop|concert|show/i) && line.length < 50) {
        currentEvent.category = extractCategory(line);
      }
      
      // Use remaining text as description
      else if (line.length > 20 && line.length < 200 && !currentEvent.description) {
        currentEvent.description = line;
      }
    }
    
    // Don't forget the last event
    if (currentEvent.title) {
      finalizeEvent(currentEvent, events, location, eventIndex);
    }
    
  } catch (error) {
    console.error('Error parsing BookMyShow events:', error);
  }
  
  return events;
}

// Parse Paytm Insider events from scraped markdown
export function parsePaytmInsiderEvents(markdown: string, location: string): UnifiedEvent[] {
  const events: UnifiedEvent[] = [];
  
  try {
    const lines = markdown.split('\n');
    let currentEvent: Partial<UnifiedEvent> = {};
    let eventIndex = 0;
    
    for (let i = 0; i < lines.length && events.length < 8; i++) {
      const line = lines[i].trim();
      
      if (!line) continue;
      
      // Paytm Insider event patterns
      if (line.match(/^#+\s*/) || line.includes('EVENT:') || line.match(/\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i)) {
        if (currentEvent.title) {
          finalizeEvent(currentEvent, events, location, eventIndex++, 'paytm-insider');
          currentEvent = {};
        }
        
        currentEvent.title = line.replace(/^#+\s*|EVENT:\s*/gi, '').trim();
      }
      
      // Price patterns for Paytm Insider
      else if (line.match(/starts\s+at|from\s+₹|₹\s*\d+/i)) {
        const priceMatch = line.match(/₹\s*(\d+(?:,\d+)*)/);
        if (priceMatch) {
          currentEvent.price = `From ₹${priceMatch[1]}`;
        }
      }
      
      // Venue information
      else if (line.length < 80 && line.match(/venue|at\s+[A-Z]/)) {
        currentEvent.venue = line.replace(/venue:?\s*/gi, '').trim();
      }
      
      // Category detection
      else if (line.match(/comedy|music|workshop|standup|concert|party|nightlife/i)) {
        currentEvent.category = extractCategory(line);
      }
      
      // Description
      else if (line.length > 30 && line.length < 150 && !currentEvent.description) {
        currentEvent.description = line;
      }
    }
    
    if (currentEvent.title) {
      finalizeEvent(currentEvent, events, location, eventIndex, 'paytm-insider');
    }
    
  } catch (error) {
    console.error('Error parsing Paytm Insider events:', error);
  }
  
  return events;
}

// Parse District events from scraped markdown
export function parseDistrictEvents(markdown: string, location: string): UnifiedEvent[] {
  const events: UnifiedEvent[] = [];
  
  try {
    const lines = markdown.split('\n');
    let currentEvent: Partial<UnifiedEvent> = {};
    let eventIndex = 0;
    
    for (let i = 0; i < lines.length && events.length < 6; i++) {
      const line = lines[i].trim();
      
      if (!line) continue;
      
      // District event patterns
      if (line.match(/^#+\s*/) || line.length < 100 && line.match(/\d{1,2}(st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i)) {
        if (currentEvent.title) {
          finalizeEvent(currentEvent, events, location, eventIndex++, 'district');
          currentEvent = {};
        }
        
        currentEvent.title = line.replace(/^#+\s*/g, '').trim();
      }
      
      // District price patterns
      else if (line.match(/₹|free\s+entry|passes/i)) {
        if (line.toLowerCase().includes('free')) {
          currentEvent.price = 'Free';
        } else {
          const priceMatch = line.match(/₹\s*(\d+(?:,\d+)*)/);
          if (priceMatch) {
            currentEvent.price = `₹${priceMatch[1]}`;
          }
        }
      }
      
      // Venue for District
      else if (line.length < 60 && (line.includes('Club') || line.includes('Bar') || line.includes('Lounge'))) {
        currentEvent.venue = line.trim();
      }
      
      // Category for District (usually nightlife/party)
      else if (line.match(/party|club|music|dj|dance|nightlife|drinks/i)) {
        currentEvent.category = 'Nightlife';
      }
      
      // Description
      else if (line.length > 25 && line.length < 120 && !currentEvent.description) {
        currentEvent.description = line;
      }
    }
    
    if (currentEvent.title) {
      finalizeEvent(currentEvent, events, location, eventIndex, 'district');
    }
    
  } catch (error) {
    console.error('Error parsing District events:', error);
  }
  
  return events;
}

// Helper function to finalize and add event to array
function finalizeEvent(
  event: Partial<UnifiedEvent>, 
  events: UnifiedEvent[], 
  location: string, 
  index: number,
  source: 'bookmyshow' | 'paytm-insider' | 'district' = 'bookmyshow'
) {
  if (!event.title || event.title.length < 3) return;
  
  // Generate future date
  const today = new Date();
  const eventDate = new Date(today.getTime() + (index + 1) * 24 * 60 * 60 * 1000);
  
  const finalEvent: UnifiedEvent = {
    id: `${source}_${location.replace(/\s+/g, '_')}_${index}`,
    title: event.title,
    distance: `${Math.round(Math.random() * 15 + 2)} km away`,
    timing: eventDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }),
    description: event.description || `Join this exciting ${event.category || 'event'} in ${location}`,
    category: event.category || categorizeFromTitle(event.title),
    venue: event.venue || 'TBD',
    city: location,
    price: event.price || 'Price varies',
    date: eventDate.toISOString().split('T')[0],
    time: `${18 + (index % 6)}:${30 + (index % 2) * 30}`,
    source: source
  };
  
  events.push(finalEvent);
}

// Extract category from text
function extractCategory(text: string): string {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('music') || lowerText.includes('concert')) return 'Music';
  if (lowerText.includes('comedy') || lowerText.includes('standup')) return 'Comedy';
  if (lowerText.includes('art') || lowerText.includes('exhibition')) return 'Arts';
  if (lowerText.includes('food') || lowerText.includes('culinary')) return 'Food & Drink';
  if (lowerText.includes('dance') || lowerText.includes('party')) return 'Dance';
  if (lowerText.includes('theatre') || lowerText.includes('drama')) return 'Theatre';
  if (lowerText.includes('workshop') || lowerText.includes('class')) return 'Workshop';
  if (lowerText.includes('nightlife') || lowerText.includes('club')) return 'Nightlife';
  
  return 'Entertainment';
}

// Categorize based on title
function categorizeFromTitle(title: string): string {
  return extractCategory(title);
}

// Fallback mock data generators
export function generateMockBookMyShowEvents(location: string): UnifiedEvent[] {
  const mockEvents = [
    {
      title: 'Live Music Concert',
      category: 'Music',
      description: 'Amazing live music performance',
      venue: 'City Concert Hall',
      price: '₹500 - ₹2000'
    },
    {
      title: 'Comedy Night',
      category: 'Comedy', 
      description: 'Hilarious standup comedy show',
      venue: 'Comedy Club',
      price: '₹300 - ₹800'
    }
  ];
  
  return mockEvents.map((event, index) => {
    const eventDate = new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000);
    return {
      id: `bms_mock_${index}`,
      title: event.title,
      distance: `${Math.round(Math.random() * 10 + 2)} km away`,
      timing: eventDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      }),
      description: event.description,
      category: event.category,
      venue: event.venue,
      city: location,
      price: event.price,
      date: eventDate.toISOString().split('T')[0],
      time: `${19 + index}:00`,
      source: 'bookmyshow' as const
    };
  });
}

export function generateMockPaytmEvents(location: string): UnifiedEvent[] {
  const mockEvents = [
    {
      title: 'Weekend Party',
      category: 'Nightlife',
      description: 'Epic weekend celebration',
      venue: 'Skybar Lounge',
      price: 'From ₹1500'
    }
  ];
  
  return mockEvents.map((event, index) => {
    const eventDate = new Date(Date.now() + (index + 2) * 24 * 60 * 60 * 1000);
    return {
      id: `paytm_mock_${index}`,
      title: event.title,
      distance: `${Math.round(Math.random() * 8 + 3)} km away`,
      timing: eventDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric', 
        hour: 'numeric',
        minute: '2-digit'
      }),
      description: event.description,
      category: event.category,
      venue: event.venue,
      city: location,
      price: event.price,
      date: eventDate.toISOString().split('T')[0],
      time: `${20 + index}:30`,
      source: 'paytm-insider' as const
    };
  });
}

export function generateMockDistrictEvents(location: string): UnifiedEvent[] {
  const mockEvents = [
    {
      title: 'DJ Night',
      category: 'Nightlife',
      description: 'Dance the night away',
      venue: 'District Club',
      price: '₹2000'
    }
  ];
  
  return mockEvents.map((event, index) => {
    const eventDate = new Date(Date.now() + (index + 3) * 24 * 60 * 60 * 1000);
    return {
      id: `district_mock_${index}`,
      title: event.title,
      distance: `${Math.round(Math.random() * 12 + 5)} km away`,
      timing: eventDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        hour: 'numeric', 
        minute: '2-digit'
      }),
      description: event.description,
      category: event.category,
      venue: event.venue,
      city: location,
      price: event.price,
      date: eventDate.toISOString().split('T')[0],
      time: `${21 + index}:00`,
      source: 'district' as const
    };
  });
}