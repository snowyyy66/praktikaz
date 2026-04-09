import { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownLeft, Package } from 'lucide-react';
import { api, getUserId } from '../api';
import './OrdersPage.css';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getUserOrders(getUserId())
      .then(data => setOrders(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-state">Загрузка...</div>;

  return (
    <div className="orders-page animate-fade-in">
      <h2 className="page-title">История сделок</h2>
      <p className="page-subtitle">{orders.length} сделок</p>

      {orders.length === 0 ? (
        <div className="empty-state">История пуста</div>
      ) : (
        <div className="orders-list">
          {orders.map(order => {
            const isSale = order.seller_id == getUserId();
            return (
              <div key={order.id} className={`order-card ${isSale ? 'sale' : 'purchase'}`}>
                <div className={`order-icon ${isSale ? 'green' : 'blue'}`}>
                  {isSale ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
                </div>
                <div className="order-info">
                  <div className="order-title">{order.product_title}</div>
                  <div className="order-meta">
                    {isSale
                      ? `Продано → ${order.buyer_name}`
                      : `Куплено у ${order.seller_name}`
                    }
                  </div>
                  <div className="order-date">
                    {new Date(order.created_at).toLocaleDateString('ru-RU', {
                      day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </div>
                </div>
                <div className="order-amount-wrapper">
                  <span className={`order-amount ${isSale ? 'positive' : 'negative'}`}>
                    {isSale ? '+' : '-'}{order.total.toLocaleString('ru-RU')} ₽
                  </span>
                  <span className={`order-status ${order.status}`}>{order.status === 'completed' ? 'Завершена' : order.status}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
