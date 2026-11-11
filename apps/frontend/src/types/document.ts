export interface DocumentItem {
  key: string;
  filename: string;
  size: number;
  last_modified: string;
  download_url: string;
}

export interface StatusMessage {
  type: "success" | "error" | "info";
  text: string;
}

