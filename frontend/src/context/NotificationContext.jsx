import { createContext, useState, useContext, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

export const NotificationProvider = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const lastEventIdRef = useRef(null);

  const fetchNotifications = async (isInitial = false) => {
    if (!token || !isAuthenticated) return;

    try {
      const response = await axios.get(`${API_URL}/eventos?limit=10`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const events = response.data;

      if (events.length > 0) {
        const latestEventId = events[0].id;


        if (isInitial) {
          lastEventIdRef.current = latestEventId;
        } else if (latestEventId !== lastEventIdRef.current) {
          let newEventsCount = 0;
          for (const event of events) {
            if (event.id === lastEventIdRef.current) break;
            newEventsCount++;
          }

          if (newEventsCount > 0) {
            setUnreadCount(prev => prev + newEventsCount);
            lastEventIdRef.current = latestEventId;
          }
        }
        
        setNotifications(events);
      }
    } catch (error) {
      console.error("Erro ao buscar notificações:", error);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications(true);
      const interval = setInterval(() => fetchNotifications(), 5000);
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
      setUnreadCount(0);
      lastEventIdRef.current = null;
    }
  }, [isAuthenticated, token]);

  const clearUnread = () => {
    setUnreadCount(0);
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, clearUnread }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
