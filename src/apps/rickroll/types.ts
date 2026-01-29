export interface ChatGPTMessage {
  role: string;
  content: string;
  timestamp?: string;
}

export interface ChatGPTConversation {
  id?: string;
  title?: string;
  url?: string;
  messages: ChatGPTMessage[];
}

export interface ChatGPTExport {
  conversations?: ChatGPTConversation[];
  totalConversations?: number;
  exportDate?: string;
}
