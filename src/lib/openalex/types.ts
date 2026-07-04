/** Minimal OpenAlex work shape used by normalization (Group 1). */

export type OpenAlexAuthor = {
  display_name?: string;
};

export type OpenAlexAuthorship = {
  author?: OpenAlexAuthor;
  author_position?: string;
};

export type OpenAlexSource = {
  display_name?: string;
  type?: string;
};

export type OpenAlexLocation = {
  landing_page_url?: string | null;
  pdf_url?: string | null;
  source?: OpenAlexSource;
  is_oa?: boolean;
};

export type OpenAlexWorkIds = {
  openalex?: string;
  doi?: string;
  arxiv?: string;
  pmcid?: string;
  pmid?: string;
};

export type OpenAlexOpenAccess = {
  is_oa?: boolean;
  oa_status?: string;
  oa_url?: string | null;
};

export type OpenAlexWork = {
  id: string;
  title?: string;
  display_name?: string;
  publication_year?: number | null;
  publication_date?: string | null;
  cited_by_count?: number;
  type?: string;
  ids?: OpenAlexWorkIds;
  open_access?: OpenAlexOpenAccess;
  primary_location?: OpenAlexLocation | null;
  best_oa_location?: OpenAlexLocation | null;
  locations?: OpenAlexLocation[];
  authorships?: OpenAlexAuthorship[];
  abstract_inverted_index?: Record<string, number[]> | null;
};

export type OpenAlexListMeta = {
  count?: number;
  per_page?: number;
  next_cursor?: string | null;
};

export type OpenAlexWorksResponse = {
  results: OpenAlexWork[];
  meta?: OpenAlexListMeta;
};
