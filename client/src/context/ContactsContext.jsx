import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../services/api.js';
import { useAuth } from './AuthContext.jsx';

const ContactsContext = createContext(null);

export function ContactsProvider({ children }) {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load contacts when user changes
  useEffect(() => {
    if (!user) {
      setContacts([]);
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const { data } = await api.get('/contacts');
        setContacts(data.contacts || []);
      } catch (err) {
        console.error('Failed to load contacts:', err);
        setContacts([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const addContact = useCallback(async (contactId, nickname) => {
    const { data } = await api.post('/contacts', { contactId, nickname });
    const newContact = data.contact;
    setContacts((prev) => [newContact, ...prev]);
    return newContact;
  }, []);

  const updateContact = useCallback(async (contactId, updates) => {
    const { data } = await api.patch(`/contacts/${contactId}`, updates);
    const updatedContact = data.contact;
    setContacts((prev) =>
      prev.map((c) => (c.id === contactId ? updatedContact : c))
    );
    return updatedContact;
  }, []);

  const removeContact = useCallback(async (contactId) => {
    await api.delete(`/contacts/${contactId}`);
    setContacts((prev) => prev.filter((c) => c.id !== contactId));
  }, []);

  const getContactByUserId = useCallback(
    (userId) => {
      return contacts.find((c) => c.user.id === userId);
    },
    [contacts]
  );

  return (
    <ContactsContext.Provider
      value={{
        contacts,
        loading,
        addContact,
        updateContact,
        removeContact,
        getContactByUserId,
      }}
    >
      {children}
    </ContactsContext.Provider>
  );
}

export function useContacts() {
  const ctx = useContext(ContactsContext);
  if (!ctx) throw new Error('useContacts must be used within ContactsProvider');
  return ctx;
}
