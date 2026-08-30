import React from 'react';
import { motion } from 'framer-motion';
import { Bot, RefreshCw, Send } from 'lucide-react';

export default function GeminiChatTab({
  chatHistory,
  chatInput,
  setChatInput,
  chatSending,
  onSendChat,
  onRefresh,
  chatBottomRef
}) {
  return (
    <motion.div
      key="gemini"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex flex-col h-[calc(100vh-140px)]"
    >
      <div className="flex justify-between items-center mb-2 pb-2 border-b">
        <h2 className="font-bold text-slate-700 text-sm flex items-center gap-2">
          <Bot className="w-4 h-4 text-emerald-600"/> 家族共有 Gemini チャット
        </h2>
        <button
          onClick={onRefresh}
          className="text-xs text-emerald-600 font-bold flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm"
        >
          <RefreshCw className="w-3 h-3"/> 更新
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 p-2 bg-slate-100 rounded-2xl border border-slate-200">
        {chatHistory.length === 0 ? (
          <div className="text-center py-12 text-slate-400 space-y-2">
            <Bot className="w-10 h-10 mx-auto text-slate-300"/>
            <p className="text-xs">Geminiへの質問内容がここに共有されます</p>
          </div>
        ) : (
          chatHistory.map((msg, idx) => {
            const isModel = msg.role === 'model';
            return (
              <div
                key={idx}
                className={`flex flex-col ${isModel ? 'items-start' : 'items-end'}`}
              >
                <span className="text-[10px] text-slate-400 px-1 mb-0.5">
                  {isModel ? '🤖 Gemini' : `👤 ${msg.user || '家族'}`} • {msg.timestamp}
                </span>
                <div
                  className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                    isModel
                      ? 'bg-white text-slate-800 border border-slate-200 rounded-tl-none shadow-sm'
                      : 'bg-emerald-600 text-white rounded-tr-none shadow-sm'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        {chatSending && (
          <div className="flex flex-col items-start">
            <span className="text-[10px] text-slate-400 px-1 mb-0.5">🤖 Gemini</span>
            <div className="bg-white text-slate-400 p-3 rounded-2xl text-xs border border-slate-200 rounded-tl-none animate-pulse">
              Geminiが回答を考え中...
            </div>
          </div>
        )}
        <div ref={chatBottomRef} />
      </div>

      <form onSubmit={onSendChat} className="mt-3 flex gap-2">
        <input
          type="text"
          placeholder="Geminiに質問する..."
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
          disabled={chatSending}
        />
        <button
          type="submit"
          disabled={chatSending || !chatInput.trim()}
          className="bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-xl shadow-md transition disabled:opacity-40"
        >
          <Send className="w-4 h-4"/>
        </button>
      </form>
    </motion.div>
  );
}