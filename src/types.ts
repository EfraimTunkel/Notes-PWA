export interface Note {
  id: string;
  title: string;
  content: string;
  timestamp: Date;
  isPinned: boolean;
  folder: string;
  tags: string[];
  isDeleted: boolean;
  deletedTimestamp?: Date;
}

export type ViewType = 'grid' | 'list';
export type SortType = 'most_recent' | 'oldest' | 'title_asc' | 'title_desc';
