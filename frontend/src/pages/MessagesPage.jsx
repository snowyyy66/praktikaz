import { useState, useEffect, useRef, useMemo } from 'react';
import { Send, MessageCircle } from 'lucide-react';
import { api, getUserId, isAdmin } from '../api';
import './MessagesPage.css';

const POLL_MS = 2500;

/**
 * Компонент MessagesPage (Сообщения)
 * Реализует интерфейс мессенджера: список диалогов слева и окно активного чата (в реальном времени, шорт-поллинг) справа.
 */
export default function MessagesPage() {
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const realUserId = parseInt(getUserId(), 10);
  const [devUserId, setDevUserId] = useState(null);
  const userId = Number.isFinite(devUserId) ? devUserId : realUserId;
  const adminMode = isAdmin() && !Number.isFinite(devUserId);

  const activeConv = useMemo(
    () => conversations.find(c => c.id === activeConvId) || null,
    [conversations, activeConvId]
  );

  useEffect(() => {
    if (!Number.isFinite(userId)) {
      setLoading(false);
      return;
    }
    api.getConversations(userId)
      .then(data => {
        setConversations(data);
        if (data.length > 0) setActiveConvId(prev => prev && data.some(c => c.id === prev) ? prev : data[0].id);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    if (!activeConvId) return;
    api.getMessages(activeConvId, userId)
      .then(setMessages)
      .catch(err => console.error(err));
  }, [activeConvId]);

  useEffect(() => {
    if (!Number.isFinite(userId) || !activeConvId) return;
    const tick = () => {
      api.getMessages(activeConvId, userId).then(setMessages).catch(() => {});
      api.getConversations(userId).then(data => setConversations(data)).catch(() => {});
    };
    const id = setInterval(tick, POLL_MS);
    return () => clearInterval(id);
  }, [activeConvId, userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || !activeConvId) return;
    setSending(true);
    try {
      const msg = await api.sendMessage(activeConvId, userId, text);
      setMessages(prev => [...prev, msg]);
      setText('');
      setConversations(prev => prev.map(c =>
        c.id === activeConvId ? { ...c, last_message: msg.text, last_at: msg.created_at } : c
      ));
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const getOtherName = (conv) => {
    if (adminMode) return `${conv.user1_name} ↔ ${conv.user2_name}`;
    return conv.user1_id === userId ? conv.user2_name : conv.user1_name;
  };

  if (!Number.isFinite(userId)) {
    return (
      <div className="messages-page animate-fade-in">
        <div className="msg-empty" style={{ padding: 48 }}>
          Войдите в аккаунт, чтобы открыть сообщения
        </div>
      </div>
    );
  }

  return (
    <div className="messages-page animate-fade-in">
      {import.meta.env.DEV && (
        <div className="dev-user-strip" title="В каждой вкладке можно выбрать своего пользователя — переписка между окнами с разными ID">
          <span>Локально — кто вы:</span>
          <button type="button" className="dev-user-btn" onClick={() => setDevUserId(null)}>как в логине</button>
          {[1, 2, 3, 4, 5, 6].map(id => (
            <button key={id} type="button" className={`dev-user-btn${userId === id ? ' active' : ''}`} onClick={() => setDevUserId(id)}>
              {id}
            </button>
          ))}
        </div>
      )}

      <div className="messages-main">
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
                className={`conv-item${activeConvId === conv.id ? ' active' : ''}`}
                onClick={() => setActiveConvId(conv.id)}
              >
                <div className="conv-avatar">{getOtherName(conv)?.charAt(0).toUpperCase()}</div>
                <div className="conv-info">
                  <div className="conv-name-row">
                    <div className="conv-name">{getOtherName(conv)}</div>
                    {(parseInt(conv.unread_count, 10) || 0) > 0 && <span className="conv-unread">{conv.unread_count}</span>}
                  </div>
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
                  <div className="msg-sender-row">
                    <span className="msg-sender">{msg.sender_name}</span>
                    {msg.sender_is_admin ? <span className="msg-admin-tag">(АДМИНИСТРАТОР)</span> : null}
                  </div>
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
    </div>
  );
}
