interface PaginationResult<T> {
  data: T[];
  nextCursor?: string;
  hasMore: boolean;
}

interface PaginationOptions {
  cursor?: string;
  limit?: number;
}

export async function paginate<T extends { id: string }>(
  items: T[],
  options: PaginationOptions = {}
): Promise<PaginationResult<T>> {
  const limit = options.limit || 20;
  
  let startIndex = 0;
  if (options.cursor) {
    try {
      const decodedCursor = Buffer.from(options.cursor, 'base64').toString('utf-8');
      startIndex = items.findIndex(item => item.id === decodedCursor) + 1;
      if (startIndex === 0) {
        startIndex = 0; // Cursor not found, start from beginning
      }
    } catch {
      startIndex = 0; // Invalid cursor, start from beginning
    }
  }

  const paginatedItems = items.slice(startIndex, startIndex + limit + 1);
  const hasMore = paginatedItems.length > limit;
  const data = paginatedItems.slice(0, limit);
  
  const nextCursor = hasMore && data.length > 0
    ? Buffer.from(data[data.length - 1].id).toString('base64')
    : undefined;

  return {
    data,
    nextCursor,
    hasMore,
  };
}

// Helper to create pagination query parameters
export function getPaginationParams(query: any): PaginationOptions {
  return {
    cursor: query.cursor as string | undefined,
    limit: query.limit ? parseInt(query.limit as string, 10) : undefined,
  };
}
