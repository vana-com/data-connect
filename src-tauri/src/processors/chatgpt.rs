use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;

#[derive(Debug, Serialize, Deserialize)]
struct Message {
    text: String,
    #[serde(rename = "type")]
    message_type: String,
    timestamp: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
struct Conversation {
    title: String,
    messages: Vec<Message>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ExportData {
    company: String,
    name: String,
    #[serde(rename = "runID")]
    run_id: String,
    timestamp: u128,
    content: Vec<Conversation>,
}

#[derive(Debug, Deserialize)]
struct RawConversation {
    title: String,
    mapping: HashMap<String, RawNode>,
}

#[derive(Debug, Deserialize)]
struct RawNode {
    message: Option<RawMessage>,
}

#[derive(Debug, Deserialize)]
struct RawMessage {
    author: Author,
    content: Option<Content>,
    create_time: Option<f64>,
}

#[derive(Debug, Deserialize)]
struct Author {
    role: String,
}

#[derive(Debug, Deserialize)]
struct Content {
    parts: Option<Vec<serde_json::Value>>,
}

/// Parse ChatGPT conversations from the extracted export
pub fn parse_conversations(
    extract_path: &Path,
    platform_id: &str,
    timestamp: u128,
) -> Result<String, String> {
    let conversations_path = extract_path.join("conversations.json");

    if !conversations_path.exists() {
        return Err("conversations.json not found".to_string());
    }

    let raw_data =
        fs::read_to_string(&conversations_path).map_err(|e| format!("Failed to read file: {}", e))?;

    let raw_conversations: Vec<RawConversation> =
        serde_json::from_str(&raw_data).map_err(|e| format!("Failed to parse JSON: {}", e))?;

    let mut parsed_conversations: Vec<Conversation> = Vec::new();

    for conv in raw_conversations {
        let mut messages: Vec<Message> = Vec::new();

        // Collect nodes with messages
        let mut nodes: Vec<(&String, &RawNode)> = conv
            .mapping
            .iter()
            .filter(|(_, node)| {
                node.message.is_some()
                    && node.message.as_ref().unwrap().content.is_some()
                    && node
                        .message
                        .as_ref()
                        .unwrap()
                        .content
                        .as_ref()
                        .unwrap()
                        .parts
                        .is_some()
            })
            .collect();

        // Sort by create_time
        nodes.sort_by(|a, b| {
            let time_a = a
                .1
                .message
                .as_ref()
                .and_then(|m| m.create_time)
                .unwrap_or(0.0);
            let time_b = b
                .1
                .message
                .as_ref()
                .and_then(|m| m.create_time)
                .unwrap_or(0.0);
            time_a.partial_cmp(&time_b).unwrap_or(std::cmp::Ordering::Equal)
        });

        for (_, node) in nodes {
            if let Some(ref message) = node.message {
                if let Some(ref content) = message.content {
                    if let Some(ref parts) = content.parts {
                        for part in parts {
                            if let Some(text) = part.as_str() {
                                if !text.is_empty() {
                                    messages.push(Message {
                                        text: text.to_string(),
                                        message_type: if message.author.role == "assistant" {
                                            "ai".to_string()
                                        } else {
                                            "human".to_string()
                                        },
                                        timestamp: message.create_time,
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }

        if !messages.is_empty() {
            parsed_conversations.push(Conversation {
                title: conv.title,
                messages,
            });
        }
    }

    let export_data = ExportData {
        company: "OpenAI".to_string(),
        name: "ChatGPT".to_string(),
        run_id: platform_id.to_string(),
        timestamp,
        content: parsed_conversations,
    };

    let output_path = extract_path.join("1_parsed_conversations.json");
    let json = serde_json::to_string_pretty(&export_data)
        .map_err(|e| format!("Failed to serialize: {}", e))?;

    fs::write(&output_path, json).map_err(|e| format!("Failed to write output: {}", e))?;

    Ok(output_path.to_string_lossy().to_string())
}
