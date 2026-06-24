'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  sender_name?: string;
}

interface TicketDetailProps {
  ticketId: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  in_progress: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  resolved: 'bg-green-500/20 text-green-300 border-green-500/30',
  closed: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-blue-300',
  normal: 'text-gray-300',
  high: 'text-orange-300',
  urgent: 'text-red-300',
};

export function TicketDetail({ ticketId }: TicketDetailProps) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTicket();
    fetchMessages();
    // Poll for new messages every 3 seconds
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [ticketId]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchTicket = async () => {
    try {
      const response = await fetch(`/api/support/tickets/${ticketId}`);
      if (!response.ok) throw new Error('Failed to fetch ticket');
      const data = await response.json();
      setTicket(data.ticket);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ticket');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/support/tickets/${ticketId}/messages`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setIsSending(true);
    try {
      const response = await fetch(`/api/support/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMessage.trim() }),
      });

      if (!response.ok) throw new Error('Failed to send message');
      
      setNewMessage('');
      await fetchMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const response = await fetch(`/api/support/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update status');
      await fetchTicket();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading ticket...</div>;
  }

  if (!ticket) {
    return <div className="text-center py-8 text-red-300">Ticket not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Ticket Header */}
      <div className="rounded-2xl border border-[rgba(247,220,120,0.16)] bg-[#14151C] p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">{ticket.title}</h1>
            <p className="mt-1 text-sm text-[#AAB3C5]">Ticket ID: {ticket.id}</p>
          </div>
          <div className="text-right">
            <div
              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[ticket.status]}`}
            >
              {ticket.status.replace('_', ' ').toUpperCase()}
            </div>
          </div>
        </div>

        <p className="text-[#AAB3C5] mb-4">{ticket.description}</p>

        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-[#AAB3C5]">Priority: </span>
            <span className={PRIORITY_COLORS[ticket.priority]}>
              {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
            </span>
          </div>
          <div>
            <span className="text-[#AAB3C5]">Created: </span>
            <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
          </div>
          <div>
            <span className="text-[#AAB3C5]">Updated: </span>
            <span>{new Date(ticket.updated_at).toLocaleDateString()}</span>
          </div>
        </div>

        {ticket.status !== 'closed' && (
          <div className="mt-4 flex gap-2">
            {ticket.status === 'pending' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleStatusChange('in_progress')}
              >
                Mark In Progress
              </Button>
            )}
            {ticket.status === 'in_progress' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleStatusChange('resolved')}
              >
                Mark Resolved
              </Button>
            )}
            {ticket.status === 'resolved' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleStatusChange('closed')}
              >
                Close Ticket
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-lg bg-[rgba(225,6,0,0.15)] border border-[rgba(225,6,0,0.35)] text-red-200">
          {error}
        </div>
      )}

      {/* Messages */}
      <div className="rounded-2xl border border-[rgba(247,220,120,0.16)] bg-[#14151C] p-6">
        <h2 className="text-lg font-semibold mb-4">Conversation</h2>
        <div className="space-y-4 max-h-96 overflow-y-auto mb-4">
          {messages.length === 0 ? (
            <p className="text-center text-[#AAB3C5]">No messages yet. Start the conversation below.</p>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="rounded-lg bg-[rgba(255,255,255,0.04)] p-3 border border-[rgba(247,220,120,0.08)]">
                <div className="flex justify-between items-start mb-1">
                  <p className="text-sm font-semibold text-[#F7DC78]">{msg.sender_name || 'Support Team'}</p>
                  <p className="text-xs text-[#AAB3C5]">{new Date(msg.created_at).toLocaleTimeString()}</p>
                </div>
                <p className="text-sm text-[#AAB3C5]">{msg.message}</p>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={isSending || ticket.status === 'closed'}
            placeholder="Type your message..."
            className="flex-1 rounded-lg border border-[rgba(247,220,120,0.16)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[#F8FAFC] placeholder-[#AAB3C5] outline-none focus:border-[rgba(212,175,55,0.5)]"
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSending || !newMessage.trim() || ticket.status === 'closed'}
          >
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}
