/**
 * Utility for client-side chat analysis
 */

export interface AnalysisResult {
  summary: string;
  tasks: string[];
  keyPoints: string[];
}

/**
 * Extracts tasks from text used patterns like:
 * - [ ] Task
 * - TODO: Task
 * - Task: Task
 * - * Task
 */
function extractTasks(text: string): string[] {
  const tasks: string[] = [];
  const lines = text.split('\n');

  const taskPatterns = [
    /^\s*-\s+\[ \]\s+(.+)/,      // - [ ] Task
    /^\s*[-*]\s+(TODO:?|Task:?)\s+(.+)/i, // - TODO: Task
    /^\s*(TODO:?|Task:?)\s+(.+)/i,        // TODO: Task
  ];

  lines.forEach(line => {
    for (const pattern of taskPatterns) {
      const match = line.match(pattern);
      if (match) {
        // Use the last capture group as the task text
        tasks.push(match[match.length - 1].trim());
        break;
      }
    }
  });

  return tasks;
}

/**
 * Extracts key points (bullets) from text
 */
function extractKeyPoints(text: string, limit = 5): string[] {
  const points: string[] = [];
  const lines = text.split('\n');
  
  // Look for lines starting with bullet points but not looking like tasks
  const bulletPattern = /^\s*[-*•]\s+(?!\[ \])(.+)/;

  lines.forEach(line => {
    const match = line.match(bulletPattern);
    if (match && points.length < limit) {
      const content = match[1].trim();
      // Filter out very short lines or likely code block markers
      if (content.length > 5 && !content.startsWith('```')) {
        points.push(content);
      }
    }
  });

  return points;
}

/**
 * Generates a simple summary by taking the first few non-header sentences
 */
function generateSummary(text: string): string {
  // Remove markdown headers, code blocks, and links
  const cleanText = text
    .replace(/^#+\s+.+$/gm, '')           // Remove headers
    .replace(/```[\s\S]*?```/g, '')       // Remove code blocks
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Replace links with text
    .replace(/[-*•]\s+/g, '')             // Remove bullets
    .trim();

  // Split into sentences
  const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [];
  
  // Take first 2-3 sentences
  return sentences.slice(0, 3).join(' ').trim() || cleanText.slice(0, 200);
}

export function analyzeChatContent(messages: { role: string; content: string }[]): AnalysisResult {
  // Combine all assistant messages for analysis
  const assistantMessages = messages
    .filter(m => m.role !== 'user')
    .map(m => m.content)
    .join('\n\n');

  // If no assistant messages, use user messages
  const fullText = assistantMessages || messages.map(m => m.content).join('\n\n');

  return {
    summary: generateSummary(fullText),
    tasks: extractTasks(fullText),
    keyPoints: extractKeyPoints(fullText)
  };
}
