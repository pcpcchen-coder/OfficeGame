// 對話與遊戲之間的膠水：純函式，方便測試。

import { getGame } from '../games/registry';
import { checkInput, safetyMessage } from './safety';
import type { Conversation } from './storage';
import { pickTitle } from './titles';
import type { Action, ChatMessage, GameId, PlayerInput, Profile, Reply, StepContext } from './types';

let counter = 0;
export function newId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function toMessages(replies: Reply[]): ChatMessage[] {
  return replies.filter((r) => r.length > 0).map((blocks) => ({ id: newId('m'), role: 'mo', blocks }));
}

export interface Outcome {
  conversation: Conversation;
  profile?: Profile;
  action?: Action;
}

export function createConversation(gameId: GameId, ctx: StepContext, existing: Conversation[], seedOverride?: string): Outcome {
  const game = getGame(gameId);
  if (!game) throw new Error(`unknown game ${gameId}`);
  const seed = seedOverride ?? game.seedFor(ctx);
  const id = newId('c');
  const res = game.init(seed, ctx);
  return {
    conversation: {
      id,
      gameId,
      seed,
      title: pickTitle(id, existing.map((c) => c.title)),
      createdAt: ctx.now.getTime(),
      messages: toMessages(res.replies),
      state: res.state,
      suggestions: res.suggestions,
    },
    profile: res.profile,
    action: res.action,
  };
}

/** 找出這個遊戲「目前這一局」的對話（例如今天的每日題目） */
export function findCurrent(gameId: GameId, ctx: StepContext, conversations: Conversation[]): Conversation | undefined {
  const game = getGame(gameId);
  if (!game) return undefined;
  const seed = game.seedFor(ctx);
  return conversations.find((c) => c.gameId === gameId && c.seed === seed);
}

export type SendResult = ({ ok: true } & Outcome) | { ok: false; notice: string };

export function sendInput(conversation: Conversation, input: PlayerInput, ctx: StepContext): SendResult {
  const game = getGame(conversation.gameId);
  if (!game) return { ok: false, notice: '這個遊戲還沒開放。' };

  let userMessage: ChatMessage | null = null;
  if (input.type === 'text') {
    const text = input.text.trim();
    if (!text) return { ok: false, notice: '' };
    const isSuggestion = conversation.suggestions.includes(text);
    if (!isSuggestion) {
      const verdict = checkInput(text);
      if (!verdict.ok) return { ok: false, notice: safetyMessage(verdict.reason) };
      const formatError = game.validate?.(text, conversation.state);
      if (formatError) return { ok: false, notice: formatError };
    }
    userMessage = { id: newId('m'), role: 'user', blocks: [{ kind: 'text', text }] };
    input = { type: 'text', text };
  }

  const res = game.step(conversation.state, input, ctx);
  const messages = [...conversation.messages];
  if (userMessage) messages.push(userMessage);
  messages.push(...toMessages(res.replies));

  // 事件沒有產生任何回覆時，保持原本的建議回覆
  const nothingHappened = input.type === 'event' && res.replies.length === 0;

  return {
    ok: true,
    conversation: {
      ...conversation,
      messages,
      state: res.state,
      suggestions: nothingHappened ? conversation.suggestions : res.suggestions,
    },
    profile: res.profile,
    action: res.action,
  };
}
