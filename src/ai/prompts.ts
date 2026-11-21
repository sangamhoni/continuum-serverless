import type { LLMMessage } from './types';

export const PROMPTS = {
  classify(content: string): LLMMessage[] {
    return [
      {
        role: 'system',
        content: `You are an expert content classifier. Analyze the content and return a JSON object.

TYPE RULES (in priority order):
1. "url" - MUST contain http://, https://, or www. (actual web links)
2. "question" - ends with ? OR explicitly asks something (how, what, why, when, where, can, should, would)
3. "thought" - starts with "I think", "I believe", "I feel", "My opinion", contains personal reflection/opinion
4. "paragraph" - 3+ sentences that read like an excerpt, quote, or copied text from elsewhere
5. "note" - short factual information, reminders, bullet points, or anything else

CATEGORY (pick the BEST match):
- "technology" - programming, software, hardware, AI, web, apps
- "learning" - education, courses, skills, studying, tutorials
- "work" - job, career, business, meetings, projects
- "ideas" - creative concepts, brainstorming, plans, innovations
- "personal" - life, relationships, self-improvement, habits
- "finance" - money, investing, budgeting, economics
- "health" - fitness, medicine, mental health, nutrition
- "philosophy" - deep thoughts, meaning, ethics, existence
- "general" - if nothing else fits well

Return JSON: {"type": "...", "category": "...", "concepts": ["...", "..."], "confidence": 0.0-1.0}
Respond ONLY with valid JSON, nothing else.`,
      },
      {
        role: 'user',
        content: content,
      },
    ];
  },

  extractConcepts(content: string): LLMMessage[] {
    return [
      {
        role: 'system',
        content: `Extract key concepts, entities, and topics from the given content.
Return a JSON array of 3-7 concept strings.
Concepts should be lowercase, 1-3 words each.
Focus on: topics, technologies, people, companies, ideas, themes.

Example output: ["distributed systems", "cloudflare", "edge computing", "state management"]

Respond ONLY with the JSON array, no other text.`,
      },
      {
        role: 'user',
        content: content,
      },
    ];
  },

  summarize(content: string): LLMMessage[] {
    return [
      {
        role: 'system',
        content: `You are a summarization assistant. Provide a clear, concise summary of the following content in 1-2 sentences.

Rules:
- Be direct and factual
- Do not ask questions
- Do not use phrases like "it appears" or "could you"
- Simply state what the content is about
- If it's a URL, describe what the link is about
- If it's a thought, capture the main idea
- If it's a note, summarize the key information

Provide only the summary, nothing else.`,
      },
      {
        role: 'user',
        content: content,
      },
    ];
  },

  synthesize(
    query: string,
    memories: Array<{ id: string; content: string; date: string; context?: string }>
  ): LLMMessage[] {
    const memoriesText = memories
      .map((m, i) => `[${i + 1}] (${m.date})${m.context ? ` Context: ${m.context}` : ''}\n${m.content}`)
      .join('\n\n');

    return [
      {
        role: 'system',
        content: `You are a personal knowledge assistant. The user has saved various memories over time.
Use the provided memories to answer their question.

IMPORTANT RULES:
1. Base your answer ONLY on the provided memories
2. Cite sources using [1], [2], etc. corresponding to memory numbers
3. If memories don't contain relevant information, say so
4. Be conversational and helpful
5. Connect insights across multiple memories when relevant
6. If asked about patterns, identify recurring themes

Available memories:
${memoriesText}`,
      },
      {
        role: 'user',
        content: query,
      },
    ];
  },

  reflect(
    concepts: Array<{ name: string; frequency: number }>,
    memories: Array<{ content: string; date: string }>
  ): LLMMessage[] {
    const conceptsText = concepts
      .slice(0, 10)
      .map(c => `- "${c.name}" (appears ${c.frequency} times)`)
      .join('\n');

    const memoriesText = memories
      .slice(0, 5)
      .map(m => `[${m.date}] ${m.content.slice(0, 200)}...`)
      .join('\n\n');

    return [
      {
        role: 'system',
        content: `You are a thoughtful assistant helping someone understand their thinking patterns.

Based on the concepts and recent memories below, provide a reflection on:
1. What themes or topics they're most interested in
2. Any patterns you notice in their thinking
3. How their interests might connect

Be insightful but not presumptuous. Use a warm, conversational tone.

Top concepts:
${conceptsText}

Recent memories:
${memoriesText}`,
      },
      {
        role: 'user',
        content: 'What patterns do you notice in my interests and thinking?',
      },
    ];
  },

  suggestLinks(
    newContent: string,
    candidates: Array<{ id: string; content: string; date: string }>
  ): LLMMessage[] {
    const candidatesText = candidates
      .map((c, i) => `[${i + 1}] ID: ${c.id}\nDate: ${c.date}\nContent: ${c.content.slice(0, 200)}`)
      .join('\n\n');

    return [
      {
        role: 'system',
        content: `Given a new memory and existing memories, identify which existing memories are conceptually related.

New memory:
${newContent}

Existing memories:
${candidatesText}

Return a JSON array of memory IDs that are related to the new memory.
Only include truly related memories (shared topics, concepts, or themes).
Return empty array [] if none are related.

Respond ONLY with the JSON array of IDs.`,
      },
      {
        role: 'user',
        content: 'Which memories are related to the new one?',
      },
    ];
  },

  checkDuplicate(
    newContent: string,
    candidate: { id: string; content: string }
  ): LLMMessage[] {
    return [
      {
        role: 'system',
        content: `Determine if these two pieces of content are essentially the same information (duplicates or near-duplicates).

Content A (new):
${newContent}

Content B (existing):
${candidate.content}

Return JSON: { "isDuplicate": true/false, "reason": "brief explanation" }

Consider them duplicates if:
- They contain the same core information
- One is a subset of the other
- They're the same URL or quote

NOT duplicates if:
- They're about the same topic but different aspects
- They have different opinions or facts`,
      },
      {
        role: 'user',
        content: 'Are these duplicates?',
      },
    ];
  },
};

