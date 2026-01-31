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

export interface ChatGPTMemory {
  id: string;
  content: string;
  created_at: string;
  updated_at?: string;
  type?: string;
}

export interface ChatGPTExport {
  conversations?: ChatGPTConversation[];
  totalConversations?: number;
  memories?: ChatGPTMemory[];
  exportDate?: string;
}
