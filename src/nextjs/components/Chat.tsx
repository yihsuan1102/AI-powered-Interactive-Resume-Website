'use client';

import { useChat } from 'ai/react';

export function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat();

  return (
    <div className="w-full max-w-3xl mx-auto py-8 px-4">
      <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">AI Q&A</h2>
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="space-y-4 h-64 overflow-y-auto mb-4 pr-4">
          {messages.length > 0
            ? messages.map((m) => (
                <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role !== 'user' && (
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">A</span>
                  )}
                  <div
                    className={`rounded-lg px-4 py-2 max-w-xs lg:max-w-md whitespace-pre-wrap ${ 
                      m.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-800'
                    }`}>
                    {m.content}
                  </div>
                   {m.role === 'user' && (
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-white font-bold">Y</span>
                  )}
                </div>
              ))
            : (
              <div className="text-center text-gray-500">Ask me anything about this resume!</div>
            )
          }
        </div>
        <form onSubmit={handleSubmit}>
          <div className="flex items-center">
            <input
              className="flex-grow w-full px-4 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={input}
              placeholder="e.g., What projects has he worked on?"
              onChange={handleInputChange}
            />
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-r-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
