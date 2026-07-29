"use client";

import { useState, useRef, useEffect } from "react";
import { Send, CheckCircle2 } from "lucide-react";

type Message = {
  id: number;
  sender: "tenant" | "assistant";
  content: string;
};

type Draft = {
  category: string;
  urgency: string;
  unitNumber: string;
  description: string;
  readyToSubmit: boolean;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, sender: "assistant", content: "Hi! How can I help you with your property today?" }
  ]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(false);
  const [submittedWO, setSubmittedWO] = useState<string | null>(null);
  
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, draft]);

  const sendMessage = async () => {
    if (!input.trim() || loading || submittedWO) return;
    
    const userMsg: Message = { id: Date.now(), sender: "tenant", content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, message: userMsg.content }),
      });
      
      if (!res.ok) throw new Error("Failed to send message");
      
      const data = await res.json();
      
      if (data.conversationId) setConversationId(data.conversationId);
      if (data.workOrderDraft) setDraft(data.workOrderDraft);
      
      setMessages(prev => [...prev, { id: Date.now() + 1, sender: "assistant", content: data.reply }]);
      
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { id: Date.now() + 1, sender: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const confirmWorkOrder = async () => {
    if (!draft || !conversationId) return;
    
    setLoading(true);
    try {
      const res = await fetch("/api/chat/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, draft }),
      });
      
      const data = await res.json();
      if (data.workOrder) {
        setSubmittedWO(data.message);
        setDraft(null);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto p-4 bg-gray-50">
      <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-4 mb-4 text-center">
        <h1 className="text-xl font-semibold text-gray-800">Evercrest Support</h1>
        <p className="text-sm text-gray-500">Describe your maintenance issue below.</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-2">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === "tenant" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl p-3 ${msg.sender === "tenant" ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-800"}`}>
              {msg.content}
            </div>
          </div>
        ))}
        
        {loading && !draft && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl p-3 text-gray-500 italic">Typing...</div>
          </div>
        )}

        {draft && draft.readyToSubmit && !submittedWO && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4">
            <h3 className="font-semibold text-blue-900 mb-2">Ready to submit Work Order?</h3>
            <ul className="text-sm text-blue-800 mb-4 space-y-1">
              <li><strong>Category:</strong> {draft.category}</li>
              <li><strong>Urgency:</strong> {draft.urgency}</li>
              <li><strong>Unit:</strong> {draft.unitNumber || "Not specified"}</li>
              <li><strong>Description:</strong> {draft.description}</li>
            </ul>
            <button 
              onClick={confirmWorkOrder}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition-colors flex justify-center items-center gap-2"
            >
              <CheckCircle2 size={18} />
              Confirm & Submit
            </button>
          </div>
        )}

        {submittedWO && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mt-4 text-center">
            <CheckCircle2 className="mx-auto text-green-600 mb-2" size={32} />
            <p className="text-green-800 font-medium">{submittedWO}</p>
          </div>
        )}
        
        <div ref={bottomRef} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-2 flex items-center gap-2">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type your message..."
          disabled={loading || !!submittedWO}
          className="flex-1 bg-transparent px-3 py-2 outline-none text-gray-800 disabled:opacity-50"
        />
        <button 
          onClick={sendMessage}
          disabled={!input.trim() || loading || !!submittedWO}
          className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}
