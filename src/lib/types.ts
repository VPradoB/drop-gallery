export interface Creator {
  id: string;
  collectionId: string;
  collectionName: string;
  name: string;
  slug: string;
  bio: string;
  avatar: string;
  externalUrl?: string;
  external_link?: string;
  externalLabel?: string;
  active: boolean;
  created: string;
  updated: string;
}

export interface Image {
  id: string;
  collectionId: string;
  collectionName: string;
  creator: string;
  file: string;
  alt: string;
  order: number;
  active: boolean;
  created: string;
  updated: string;
}

export interface PocketbaseListResponse<T> {
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
  items: T[];
}
