import { MessageSquare } from 'lucide-react';
import './MockPages.css';

export default function MessagesPage() {
  return (
    <div className="mock-page animate-fade-in">
      <div className="mock-container">
        <MessageSquare size={48} className="mock-icon" />
        <h2>Сообщения</h2>
        <p>У вас пока нет активных диалогов.</p>
        <p className="mock-sub">Вы можете написать продавцу со страницы интересующего вас товара.</p>
      </div>
    </div>
  );
}
