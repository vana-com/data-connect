import { useState, useEffect, useMemo, useRef } from 'react';
import type { ChatGPTExport } from './types';

export function useRickRollData() {
  const [data, setData] = useState<ChatGPTExport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Seed random conversation index once per session (not per render)
  const randomSeedRef = useRef<number>(Math.random());
  // Capture export load time once (for stable "days ago" calculation)
  const loadTimeRef = useRef<number | null>(null);

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
          // Capture load time for stable "days ago" computation
          loadTimeRef.current = Date.now();
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

  // Memoize fun facts computation to avoid recalculating on every render
  const funFacts = useMemo(() => {
    if (!data || !data.conversations) {
      return [];
    }

    const facts: string[] = [];
    const conversations = data.conversations || [];

    // Total messages (computed once per data change)
    let totalMessages = 0;
    for (const conv of conversations) {
      totalMessages += conv.messages.length;
    }
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
    for (const conv of conversations) {
      if (conv.messages.length > maxLength) {
        maxLength = conv.messages.length;
      }
    }

    if (maxLength > 10) {
      facts.push(`Your longest thread has ${maxLength} messages. That's a lot of chatting!`);
    }

    // Random message snippet (seeded once per session via ref)
    if (conversations.length > 0) {
      const randomIndex = Math.floor(randomSeedRef.current * conversations.length);
      const randomConv = conversations[randomIndex];
      if (randomConv.messages.length > 0) {
        const msg = randomConv.messages[0];
        const snippet = msg.content.slice(0, 100);
        facts.push(`A sample message: "${snippet}${msg.content.length > 100 ? '...' : ''}"`);
      }
    }

    // Time-based facts (using load time for stability)
    if (data.exportDate && loadTimeRef.current !== null) {
      const exportDate = new Date(data.exportDate);
      const daysSince = Math.floor((loadTimeRef.current - exportDate.getTime()) / (1000 * 60 * 60 * 24));
      facts.push(`You exported this data ${daysSince === 0 ? 'today' : `${daysSince} days ago`}.`);
    }

    // Word count estimate (computed once per data change)
    let totalWords = 0;
    for (const conv of conversations) {
      for (const msg of conv.messages) {
        totalWords += msg.content.split(/\s+/).length;
      }
    }
    if (totalWords > 1000) {
      facts.push(`You've written approximately ${(totalWords / 1000).toFixed(1)}k words to ChatGPT.`);
    }

    return facts;
  }, [data]);

  const hasData = useMemo(
    () => !!data && !!data.conversations && data.conversations.length > 0,
    [data]
  );

  return {
    data,
    loading,
    error,
    funFacts,
    hasData,
  };
}

// Need to import invoke from Tauri
async function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  // Dynamic import to avoid issues when not in Tauri context
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke(command, args);
}
