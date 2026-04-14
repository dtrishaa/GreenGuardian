// src/contexts/FavoritesContext.js
import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { db, auth } from '../services/firebase';
import firebase from 'firebase/compat/app';

const FavoritesContext = createContext();

export const useFavorites = () => useContext(FavoritesContext);

export const FavoritesProvider = ({ children }) => {
  const [favorites, setFavorites] = useState([]);
  const [loading,   setLoading]   = useState(true);
  // Keep a ref to the Firestore unsubscribe fn so we can clean it up on auth change
  const userUnsubRef = useRef(null);

  useEffect(() => {
    // Subscribe to auth state, then subscribe to the user doc
    const authUnsub = auth.onAuthStateChanged(firebaseUser => {
      // Clean up previous user doc listener
      if (userUnsubRef.current) {
        userUnsubRef.current();
        userUnsubRef.current = null;
      }

      if (!firebaseUser) {
        setFavorites([]);
        setLoading(false);
        return;
      }

      userUnsubRef.current = db.collection('users').doc(firebaseUser.uid)
        .onSnapshot(
          doc => {
            setFavorites(doc.exists ? (doc.data().favorites || []) : []);
            setLoading(false);
          },
          () => setLoading(false)
        );
    });

    return () => {
      authUnsub();
      if (userUnsubRef.current) userUnsubRef.current();
    };
  }, []);

  const toggleFavorite = async (plantId) => {
    const user = auth.currentUser;
    if (!user) return;
    const userRef = db.collection('users').doc(user.uid);
    if (favorites.includes(plantId)) {
      await userRef.update({ favorites: firebase.firestore.FieldValue.arrayRemove(plantId) });
    } else {
      await userRef.update({ favorites: firebase.firestore.FieldValue.arrayUnion(plantId) });
    }
  };

  const isFavorite = (plantId) => favorites.includes(plantId);

  return (
    <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorite, loading }}>
      {children}
    </FavoritesContext.Provider>
  );
};