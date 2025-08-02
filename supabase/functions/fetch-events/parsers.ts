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
    console.log('BookMyShow raw markdown:', markdown.substring(0, 300));
    
    // Clean the markdown content aggressively
    const cleanText = markdown
      .replace(/\[|\]|\(|\)/g, '') // Remove brackets
      .replace(/\*\*/g, '') // Remove bold
      .replace(/#{1,6}/g, '') // Remove headers
      .replace(/!\[.*?\]/g, '') // Remove image references
      .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
      .replace(/\\+/g, ' ') // Replace backslashes
      .replace(/₹\d+[^\s]*/g, '') // Remove inline prices temporarily
      .replace(/onwards/gi, '') // Remove price text
      .replace(/NCR|Delhi/g, '') // Remove location noise
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();

    // Skip if content contains obvious errors
    if (cleanText.toLowerCase().includes('privacy note') || 
        cleanText.toLowerCase().includes('page doesn\'t exist') ||
        cleanText.toLowerCase().includes('partner with us')) {
      console.log('BookMyShow: Detected error page, returning mock events');
      return generateMockBookMyShowEvents(location);
    }

    // Split and filter for meaningful content
    const potentialTitles = cleanText
      .split(/[\n,\|]/)
      .map(line => line.trim())
      .filter(line => {
        return line.length > 5 && 
               line.length < 80 &&
               !line.match(/^\d+\s*(am|pm)/i) &&
               !line.match(/^(mon|tue|wed|thu|fri|sat|sun)/i) &&
               !line.toLowerCase().includes('bookmyshow') &&
               !line.toLowerCase().includes('got a show');
      })
      .slice(0, 10); // Limit to 10 events

    console.log('BookMyShow potential titles:', potentialTitles);

    if (potentialTitles.length === 0) {
      console.log('No valid titles found, using mock data');
      return generateMockBookMyShowEvents(location);
    }

    for (let i = 0; i < potentialTitles.length; i++) {
      const title = potentialTitles[i];
      
      const event: Partial<UnifiedEvent> = {
        title: title.charAt(0).toUpperCase() + title.slice(1),
        description: `Experience this exciting entertainment event in ${location}`,
        category: extractCategory(title),
        venue: 'Popular Venue',
        price: '₹300 - ₹1500',
        source: 'bookmyshow',
        bookingUrl: 'https://in.bookmyshow.com'
      };
      
      finalizeEvent(event, events, location, i, 'bookmyshow');
    }
    
  } catch (error) {
    console.error('Error parsing BookMyShow events:', error);
    return generateMockBookMyShowEvents(location);
  }
  
  return events.length > 0 ? events : generateMockBookMyShowEvents(location);
}

// Parse Paytm Insider events from scraped markdown
export function parsePaytmInsiderEvents(markdown: string, location: string): UnifiedEvent[] {
  const events: UnifiedEvent[] = [];
  
  try {
    console.log('Paytm Insider raw markdown:', markdown.substring(0, 300));
    
    // Clean the content
    const cleanText = markdown
      .replace(/\[|\]|\(|\)/g, '') // Remove brackets
      .replace(/\*\*/g, '') // Remove bold
      .replace(/#{1,6}/g, '') // Remove headers
      .replace(/!\[.*?\]/g, '') // Remove image references
      .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
      .replace(/\\+/g, ' ') // Replace backslashes
      .replace(/₹\d+[^\s]*/g, '') // Remove inline prices
      .replace(/onwards/gi, '') // Remove price text
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();

    // Check for error content
    if (cleanText.toLowerCase().includes('select location') || 
        cleanText.toLowerCase().includes('all cities') ||
        cleanText.toLowerCase().includes('app-store') ||
        cleanText.length < 50) {
      console.log('Paytm Insider: Detected navigation page, using mock events');
      return generateMockPaytmEvents(location);
    }

    // Extract potential event titles
    const potentialTitles = cleanText
      .split(/[\n,\|]/)
      .map(line => line.trim())
      .filter(line => {
        return line.length > 8 && 
               line.length < 100 &&
               !line.match(/^\d+\s*(am|pm)/i) &&
               !line.toLowerCase().includes('district.in') &&
               !line.toLowerCase().includes('insider.in') &&
               !line.toLowerCase().includes('select location');
      })
      .slice(0, 8);

    console.log('Paytm Insider potential titles:', potentialTitles);

    if (potentialTitles.length === 0) {
      return generateMockPaytmEvents(location);
    }

    for (let i = 0; i < potentialTitles.length; i++) {
      const title = potentialTitles[i];
      
      // Determine category and details
      let category = 'Entertainment';
      let venue = 'Premium Venue';
      let price = 'From ₹500';
      
      if (title.toLowerCase().includes('music') || title.toLowerCase().includes('concert')) {
        category = 'Music';
        venue = 'Concert Hall';
        price = 'From ₹800';
      } else if (title.toLowerCase().includes('comedy')) {
        category = 'Comedy';
        venue = 'Comedy Club';
        price = 'From ₹400';
      } else if (title.toLowerCase().includes('party') || title.toLowerCase().includes('night')) {
        category = 'Nightlife';
        venue = 'Rooftop Lounge';
        price = 'From ₹1200';
      }

      const event: Partial<UnifiedEvent> = {
        title: title.charAt(0).toUpperCase() + title.slice(1),
        description: `Join this exciting ${category.toLowerCase()} event in ${location}`,
        category,
        venue,
        price,
        source: 'paytm-insider',
        bookingUrl: 'https://insider.in'
      };
      
      finalizeEvent(event, events, location, i, 'paytm-insider');
    }
    
  } catch (error) {
    console.error('Error parsing Paytm Insider events:', error);
    return generateMockPaytmEvents(location);
  }
  
  return events.length > 0 ? events : generateMockPaytmEvents(location);
}

// Parse District events from scraped markdown
export function parseDistrictEvents(markdown: string, location: string): UnifiedEvent[] {
  const events: UnifiedEvent[] = [];
  
  try {
    console.log('District raw markdown:', markdown.substring(0, 300));
    
    // Clean the content
    const cleanText = markdown
      .replace(/\[|\]/g, '') // Remove square brackets
      .replace(/\*\*/g, '') // Remove bold
      .replace(/\\+/g, ' ') // Replace backslashes
      .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
      .replace(/₹\d+[^\s]*/g, '') // Remove inline prices for now
      .replace(/Delhi\/NCR/g, '') // Remove location suffix
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();

    // Extract potential event titles
    const potentialTitles = cleanText
      .split(/[\n,\|]/)
      .map(line => line.trim())
      .filter(line => {
        return line.length > 10 && 
               line.length < 100 &&
               !line.toLowerCase().includes('district.in') &&
               !line.match(/^\d+\s*(am|pm)/i) &&
               !line.match(/^(mon|tue|wed|thu|fri|sat|sun)/i);
      })
      .slice(0, 6);

    console.log('District potential titles:', potentialTitles);

    if (potentialTitles.length === 0) {
      return generateMockDistrictEvents(location);
    }

    for (let i = 0; i < potentialTitles.length; i++) {
      const title = potentialTitles[i];
      
      // Determine category and details based on title
      let category = 'Nightlife';
      let venue = 'Trendy Club';
      let price = '₹1500';
      
      if (title.toLowerCase().includes('comedy')) {
        category = 'Comedy';
        venue = 'Comedy Venue';
        price = '₹800';
      } else if (title.toLowerCase().includes('music') || title.toLowerCase().includes('concert')) {
        category = 'Music';
        venue = 'Music Venue';
        price = '₹1200';
      } else if (title.toLowerCase().includes('art') || title.toLowerCase().includes('gallery')) {
        category = 'Arts';
        venue = 'Art Gallery';
        price = '₹600';
      }

      const event: Partial<UnifiedEvent> = {
        title: title.charAt(0).toUpperCase() + title.slice(1),
        description: `Experience this amazing ${category.toLowerCase()} event at ${venue}`,
        category,
        venue,
        price,
        source: 'district',
        bookingUrl: 'https://district.in'
      };
      
      finalizeEvent(event, events, location, i, 'district');
    }
    
  } catch (error) {
    console.error('Error parsing District events:', error);
    return generateMockDistrictEvents(location);
  }
  
  return events.length > 0 ? events : generateMockDistrictEvents(location);
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