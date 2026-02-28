import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, Loader2, Sparkles, Check, Wrench, MessageCircle } from 'lucide-react';
import { chatStream } from '../services/api.js';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  journeyId: string;
  touchpointSequences: number[];
  analysisDetail: string;
  journeyName: string;
  onApplyFix: (touchpointSequence: number, instruction: string) => Promise<void>;
  onClose: () => void;
}

export default function FixChatModal({ journeyId, touchpointSequences, analysisDetail, journeyName, onApplyFix, onClose }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [applyingFix, setApplyingFix] = useState<number | null>(null);
  const [appliedFixes, setAppliedFixes] = useState<Set<number>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hasAutoStarted = useRef(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, scrollToBottom]);

  const sendToApi = useCallback(async (allMessages: ChatMessage[]) => {
    setIsStreaming(true);
    setStreamingText('');

    try {
      const res = await chatStream({
        journeyId,
        touchpointSequences,
        analysisDetail,
        messages: allMessages,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const data = trimmed.slice(6);
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.error) throw new Error(parsed.error);
              if (parsed.delta) {
                accumulated += parsed.delta;
                setStreamingText(accumulated);
              }
            } catch (e) {
              if ((e as Error).message && !(e as Error).message.includes('JSON')) {
                throw e;
              }
            }
          }
        }
      }

      // Finalize: move streamed text into messages
      if (accumulated) {
        setMessages(prev => [...prev, { role: 'assistant', content: accumulated }]);
      }
    } catch (e) {
      console.error('Chat stream failed:', e);
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${(e as Error).message}. Try again.` }]);
    }

    setStreamingText('');
    setIsStreaming(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [journeyId, touchpointSequences, analysisDetail]);

  // Auto-start: send initial message on mount
  useEffect(() => {
    if (hasAutoStarted.current) return;
    hasAutoStarted.current = true;
    sendToApi([]);
  }, [sendToApi]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    sendToApi(newMessages);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleApplyFix = async (seq: number) => {
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
    if (!lastAssistant) return;
    setApplyingFix(seq);
    try {
      await onApplyFix(seq, lastAssistant.content);
      setAppliedFixes(prev => new Set(prev).add(seq));
    } catch (e) {
      console.error('Apply fix failed:', e);
    }
    setApplyingFix(null);
  };

  const hasAssistantMessage = messages.some(m => m.role === 'assistant');
  const seqLabel = touchpointSequences.map(s => `#${s}`).join(', ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-xl w-[700px] max-h-[85vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <span className="text-sm font-bold text-slate-200">Chat with Claude</span>
            <span className="text-[10px] text-slate-500 truncate">— {journeyName}</span>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 p-1 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Context banner */}
        <div className="px-5 py-2 bg-slate-800/50 border-b border-slate-800/50 flex-shrink-0">
          <div className="flex items-start gap-2">
            <MessageCircle className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2">{analysisDetail}</p>
              {touchpointSequences.length > 0 && (
                <span className="text-[9px] text-slate-500 font-mono">Touchpoints: {seqLabel}</span>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-lg px-3.5 py-2.5 ${
                msg.role === 'user'
                  ? 'bg-cyan-600/20 text-cyan-100'
                  : 'bg-slate-800 text-slate-200'
              }`}>
                <div className="text-[11px] leading-relaxed whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          ))}

          {/* Streaming indicator */}
          {isStreaming && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-lg px-3.5 py-2.5 bg-slate-800 text-slate-200">
                {streamingText ? (
                  <div className="text-[11px] leading-relaxed whitespace-pre-wrap">
                    {streamingText}
                    <span className="inline-block w-1.5 h-3.5 bg-purple-400 ml-0.5 animate-pulse" />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                    <span className="text-[11px] text-slate-400">Claude is thinking...</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Apply Fix bar */}
        {hasAssistantMessage && touchpointSequences.length > 0 && (
          <div className="px-5 py-2.5 border-t border-slate-800 bg-slate-900/80 flex items-center gap-2 flex-shrink-0 flex-wrap">
            <Wrench className="w-3 h-3 text-slate-500 flex-shrink-0" />
            <span className="text-[10px] text-slate-500 font-semibold">Apply fix:</span>
            {touchpointSequences.map(seq => (
              <button
                key={seq}
                onClick={() => handleApplyFix(seq)}
                disabled={applyingFix !== null || isStreaming}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-semibold transition-colors ${
                  appliedFixes.has(seq)
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 disabled:opacity-40'
                }`}
              >
                {applyingFix === seq ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : appliedFixes.has(seq) ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Wrench className="w-3 h-3" />
                )}
                {appliedFixes.has(seq) ? `#${seq} Applied` : `Fix #${seq}`}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="px-5 py-3 border-t border-slate-800 flex-shrink-0">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isStreaming ? 'Waiting for response...' : 'Ask Claude about this finding...'}
              disabled={isStreaming}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-[12px] text-slate-100 placeholder-slate-600 resize-none focus:outline-none focus:border-purple-600 disabled:opacity-50"
              rows={2}
            />
            <button
              onClick={handleSend}
              disabled={isStreaming || !input.trim()}
              className="self-end px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[9px] text-slate-600">Enter to send, Shift+Enter for newline, Esc to close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
