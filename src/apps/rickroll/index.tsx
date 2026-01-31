import { useState, useEffect } from 'react';
import type { ChatGPTExport } from './types';

export function useRickRollData() {
  const [data, setData] = useState<ChatGPTExport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Try to read the ChatGPT export from the user's data directory
        const exportPath = await invoke<string>('get_user_data_path');
        const chatGptPath = `${exportPath}/exported_data/OpenAI/ChatGPT/`;

        // Read the latest JSON file in the ChatGPT directory
        type FileWithContent = { name: string; content: string };
        const files = await invoke<FileWithContent[]>('get_run_files', { exportPath: chatGptPath });

        if (files && files.length > 0) {
          // Sort by name descending to get the latest export file
          const sorted = [...files].sort((a, b) => b.name.localeCompare(a.name));
          const raw = JSON.parse(sorted[0].content);

          // The connector wraps data as { content: { data: { ... } } }
          const innerData = raw?.content?.data || raw;

          const exportData: ChatGPTExport = {
            memories: innerData.memories || [],
            conversations: innerData.conversations || [],
            totalConversations: innerData.totalConversations || innerData.conversations?.length || 0,
            exportDate: innerData.timestamp || raw?.timestamp,
          };
          setData(exportData);
        } else {
          setError('No ChatGPT export data found. Please export your ChatGPT data first.');
        }
      } catch (err) {
        console.error('Error loading ChatGPT data:', err);
        setError('Failed to load ChatGPT data. Make sure you have exported your ChatGPT conversations.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const getFunFacts = () => {
    if (!data) {
      return [];
    }

    const facts: string[] = [];
    const memories = data.memories || [];
    const conversations = data.conversations || [];

    // Memory count
    if (memories.length > 0) {
      facts.push(`ChatGPT has ${memories.length.toLocaleString()} ${memories.length === 1 ? 'memory' : 'memories'} about you.`);
    }

    // Random memory snippet
    if (memories.length > 0) {
      const randomMemory = memories[Math.floor(Math.random() * memories.length)];
      const snippet = randomMemory.content.slice(0, 100);
      facts.push(`One thing ChatGPT remembers: "${snippet}${randomMemory.content.length > 100 ? '...' : ''}"`);
    }

    // Conversation stats
    if (conversations.length > 0) {
      let totalMessages = 0;
      conversations.forEach((conv) => {
        totalMessages += conv.messages.length;
      });
      if (totalMessages > 0) {
        facts.push(`You've exchanged ${totalMessages.toLocaleString()} messages across ${conversations.length} conversations.`);
      }

      // Longest conversation
      let maxLength = 0;
      conversations.forEach((conv) => {
        if (conv.messages.length > maxLength) {
          maxLength = conv.messages.length;
        }
      });
      if (maxLength > 10) {
        facts.push(`Your longest thread has ${maxLength} messages.`);
      }
    }

    // Export date
    if (data.exportDate) {
      const exportDate = new Date(data.exportDate);
      const daysSince = Math.floor((Date.now() - exportDate.getTime()) / (1000 * 60 * 60 * 24));
      facts.push(`You exported this data ${daysSince === 0 ? 'today' : `${daysSince} days ago`}.`);
    }

    return facts;
  };

  const hasMemories = !!data?.memories && data.memories.length > 0;
  const hasConversations = !!data?.conversations && data.conversations.length > 0;

  return {
    data,
    loading,
    error,
    funFacts: getFunFacts(),
    hasData: hasMemories || hasConversations,
  };
}

// Need to import invoke from Tauri
async function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  // Dynamic import to avoid issues when not in Tauri context
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke(command, args);
}
