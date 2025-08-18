// Maximum number of unknown queries to store
const MAX_UNKNOWN_QUERIES = 100;

// LocalStorage key
const UNKNOWN_QUERIES_KEY = 'elite_acai_unknown_queries';

// Interface for unknown query
export interface UnknownQuery {
  query: string;
  timestamp: number;
  context?: string; // Optional context about the conversation
  tags?: string[]; // Optional tags like 'nova-pergunta'
}

// Get all unknown queries from localStorage
export const getUnknownQueries = (): UnknownQuery[] => {
  try {
    const stored = localStorage.getItem(UNKNOWN_QUERIES_KEY);
    if (!stored) return [];
    
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error retrieving unknown queries:', error);
    return [];
  }
};

// Save an unknown query to localStorage
export const saveUnknownQuery = (query: string, context?: string): void => {
  try {
    // Don't save empty queries
    if (!query.trim()) return;
    
    // Get existing queries
    const queries = getUnknownQueries();
    
    // Check if this query already exists (to avoid duplicates)
    const normalizedQuery = query.toLowerCase().trim();
    const exists = queries.some(q => q.query.toLowerCase().trim() === normalizedQuery);
    
    if (exists) return;
    
    // Add new query
    const newQuery: UnknownQuery = {
      query,
      timestamp: Date.now(),
      context,
      tags: ['nova-pergunta']
    };
    
    // Add to beginning of array (newest first)
    queries.unshift(newQuery);
    
    // Limit to max number of queries
    const limitedQueries = queries.slice(0, MAX_UNKNOWN_QUERIES);
    
    // Save back to localStorage
    localStorage.setItem(UNKNOWN_QUERIES_KEY, JSON.stringify(limitedQueries));
    
    console.log(`Unknown query saved: "${query}"`);
  } catch (error) {
    console.error('Error saving unknown query:', error);
  }
};

// Clear all unknown queries
export const clearUnknownQueries = (): void => {
  localStorage.removeItem(UNKNOWN_QUERIES_KEY);
};

// Get statistics about unknown queries
export const getUnknownQueryStats = (): { 
  total: number; 
  today: number;
  lastWeek: number;
  oldestQuery?: string;
  newestQuery?: string;
} => {
  const queries = getUnknownQueries();
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const oneWeekMs = 7 * oneDayMs;
  
  const today = queries.filter(q => (now - q.timestamp) < oneDayMs).length;
  const lastWeek = queries.filter(q => (now - q.timestamp) < oneWeekMs).length;
  
  const oldest = queries.length > 0 ? queries[queries.length - 1].query : undefined;
  const newest = queries.length > 0 ? queries[0].query : undefined;
  
  return {
    total: queries.length,
    today,
    lastWeek,
    oldestQuery: oldest,
    newestQuery: newest
  };
};

// Function to determine if a query should be saved as unknown
export const shouldSaveAsUnknown = (
  query: string, 
  matchedIntentId: string, 
  matchScore: number,
  minConfidenceThreshold: number = 0.2
): boolean => {
  // If it matched the fallback intent with a very low score, it's unknown
  return matchedIntentId === 'fallback' || matchScore < minConfidenceThreshold;
}

// Function to add a tag to an unknown query
export const addTagToQuery = (queryIndex: number, tag: string): void => {
  try {
    const queries = getUnknownQueries();
    if (queryIndex >= 0 && queryIndex < queries.length) {
      if (!queries[queryIndex].tags) {
        queries[queryIndex].tags = [];
      }
      
      if (!queries[queryIndex].tags!.includes(tag)) {
        queries[queryIndex].tags!.push(tag);
        localStorage.setItem(UNKNOWN_QUERIES_KEY, JSON.stringify(queries));
      }
    }
  } catch (error) {
    console.error('Error adding tag to query:', error);
  }
}

// Function to get queries by tag
export const getQueriesByTag = (tag: string): UnknownQuery[] => {
  const queries = getUnknownQueries();
  return queries.filter(q => q.tags && q.tags.includes(tag));
};