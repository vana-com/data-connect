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
          // Parse the first file
          const exportData = JSON.parse(files[0].content) as ChatGPTExport;
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
    if (!data || !data.conversations) {
      return [];
    }

    const facts: string[] = [];
    const conversations = data.conversations || [];

    // Total messages
    let totalMessages = 0;
    conversations.forEach((conv) => {
      totalMessages += conv.messages.length;
    });
    if (totalMessages > 0) {
      facts.push(`You've sent ${totalMessages.toLocaleString()} messages to ChatGPT.`);
    }

    // Conversation count
    const convCount = data.totalConversations || conversations.length;
    if (convCount > 0) {
      facts.push(`You have ${convCount.toLocaleString()} conversation${convCount > 1 ? 's' : ''} in your export.`);
    }

    // Longest conversation
    let maxLength = 0;
    conversations.forEach((conv) => {
      if (conv.messages.length > maxLength) {
        maxLength = conv.messages.length;
      }
    });

    if (maxLength > 10) {
      facts.push(`Your longest thread has ${maxLength} messages. That's a lot of chatting!`);
    }

    // Random message snippet (first message from a random conversation)
    if (conversations.length > 0) {
      const randomConv = conversations[Math.floor(Math.random() * conversations.length)];
      if (randomConv.messages.length > 0) {
        const msg = randomConv.messages[0];
        const snippet = msg.content.slice(0, 100);
        facts.push(`A sample message: "${snippet}${msg.content.length > 100 ? '...' : ''}"`);
      }
    }

    // Time-based facts
    if (data.exportDate) {
      const exportDate = new Date(data.exportDate);
      const daysSince = Math.floor((Date.now() - exportDate.getTime()) / (1000 * 60 * 60 * 24));
      facts.push(`You exported this data ${daysSince === 0 ? 'today' : `${daysSince} days ago`}.`);
    }

    // Word count estimate
    let totalWords = 0;
    conversations.forEach((conv) => {
      conv.messages.forEach((msg) => {
        totalWords += msg.content.split(/\s+/).length;
      });
    });
    if (totalWords > 1000) {
      facts.push(`You've written approximately ${(totalWords / 1000).toFixed(1)}k words to ChatGPT.`);
    }

    return facts;
  };

  return {
    data,
    loading,
    error,
    funFacts: getFunFacts(),
    hasData: !!data && !!data.conversations && data.conversations.length > 0,
  };
}

// Need to import invoke from Tauri
async function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  // Dynamic import to avoid issues when not in Tauri context
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke(command, args);
}
