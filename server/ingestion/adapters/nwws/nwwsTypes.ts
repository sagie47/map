export interface NWWSAlert {
  productcode: string;
  pil: string;
  wmoHeader: string;
  issueTime: number;
  nwsHeadline: string;
  body: string;
  variable: Record<string, string>;
}

export interface NWWSConfig {
  enabled?: boolean;
  username?: string;
  password?: string;
  pollingInterval?: number;
  fallbackMode?: boolean;
}

export interface NWWSCapAlertEntry {
  link: { rel: string; href: string };
  title: string;
  updated: string;
  id: string;
  content?: { type: string; value: string };
}

export interface NWWSCapAlert {
  id: string;
  author?: string;
  updated?: string;
  title?: string;
  summary?: string;
  link?: string;
  entries?: NWWSCapAlertEntry[];
}
