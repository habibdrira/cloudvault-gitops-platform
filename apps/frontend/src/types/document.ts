export interface DocumentItem {
  key: string;
  filename: string;
  size: number;
  last_modified: string;
  download_url: string;
  preview_url?: string;
  version_id?: string;
  is_latest?: boolean;
}

export interface StatusMessage {
  type: "success" | "error" | "info";
  text: string;
}

export interface ShareResponse {
  share_url: string;
  key: string;
  expires_in_seconds: number;
}
