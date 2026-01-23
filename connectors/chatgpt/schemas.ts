/**
 * ChatGPT data schemas
 */

export interface Conversation {
  id: string;
  title: string;
  create_time: number;
  update_time: number;
  mapping?: Record<string, ConversationNode>;
}

export interface ConversationNode {
  id: string;
  message?: {
    id: string;
    author: {
      role: 'user' | 'assistant' | 'system';
    };
    content: {
      content_type: string;
      parts?: string[];
    };
    create_time?: number;
  };
  parent?: string;
  children?: string[];
}

export interface ConversationListItem {
  id: string;
  title: string;
  create_time: string;
  update_time: string;
}

export interface ConversationsResult {
  conversations: ConversationListItem[];
  total: number;
}

export interface Memory {
  id: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  type?: string;
}

export interface MemoriesResult {
  memories: Memory[];
  total: number;
}

export interface ChatGPTUserInfo {
  email?: string;
  accessToken?: string;
  deviceId?: string;
}
