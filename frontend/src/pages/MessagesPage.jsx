import { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle } from 'lucide-react';
import { api, getUserId } from '../api';
import './MessagesPage.css';

export default function MessagesPage() {
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const userId = parseInt(getUserId());

  useEffect(() => {
    api.getConversations(userId)
      .then(data => { setConversations(data); if (data.length > 0) setActiveConv(data[0]); })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activeConv) return;
    api.getMessages(activeConv.id)
      .then(setMessages)
      .catch(err => console.error(err));
  }, [activeConv]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || !activeConv) return;
    setSending(true);
    try {
      const msg = await api.sendMessage(activeConv.id, userId, text);
      setMessages(prev => [...prev, msg]);
      setText('');
      setConversations(prev => prev.map(c =>
        c.id === activeConv.id ? { ...c, last_message: msg.text, last_at: msg.created_at } : c
      ));
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const getOtherName = (conv) =>
    conv.user1_id === userId ? conv.user2_name : conv.user1_name;

  return (
    <div className="messages-page animate-fade-in">
      <div className="messages-sidebar">
        <div className="messages-sidebar-header">
          <h2>Сообщения</h2>
        </div>
        {loading ? (
          <div className="msg-empty">Загрузка...</div>
        ) : conversations.length === 0 ? (
          <div className="msg-empty">
            <MessageCircle size={32} />
            <span>У вас пока нет диалогов</span>
          </div>
        ) : (
          <div className="conv-list">
            {conversations.map(conv => (
              <div
                key={conv.id}
                className={`conv-item${activeConv?.id === conv.id ? ' active' : ''}`}
                onClick={() => setActiveConv(conv)}
              >
                <div className="conv-avatar">{getOtherName(conv)?.charAt(0).toUpperCase()}</div>
                <div className="conv-info">
                  <div className="conv-name">{getOtherName(conv)}</div>
                  {conv.product_title && <div className="conv-product">{conv.product_title}</div>}
                  <div className="conv-last">{conv.last_message || 'Нет сообщений'}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="messages-chat">
        {!activeConv ? (
          <div className="chat-empty">
            <MessageCircle size={48} />
            <span>Выберите диалог</span>
          </div>
        ) : (
          <>
            <div className="chat-header">
              <div className="chat-title">{getOtherName(activeConv)}</div>
              {activeConv.product_title && <div className="chat-subtitle">По товару: {activeConv.product_title}</div>}
            </div>
            <div className="chat-messages">
              {messages.length === 0 ? (
                <div className="chat-empty-msg">Начните диалог первым</div>
              ) : messages.map(msg => (
                <div key={msg.id} className={`msg-bubble${msg.sender_id === userId ? ' mine' : ''}`}>
                  <div className="msg-text">{msg.text}</div>
                  <div className="msg-time">{new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <form className="chat-input-row" onSubmit={handleSend}>
              <input
                type="text"
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Написать сообщение..."
                disabled={sending}
              />
              <button type="submit" disabled={sending || !text.trim()}>
                <Send size={18} />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
