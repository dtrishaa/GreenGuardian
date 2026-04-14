// src/contexts/AuthContext.js
import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { auth, db } from '../services/firebase';
import firebase from 'firebase/compat/app';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const userUnsubRef = useRef(null);
  const loadingRef = useRef(true);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loadingRef.current) {
        console.warn('Auth timeout – forcing loading to false');
        setLoading(false);
      }
    }, 8000);

    const authUnsub = auth.onAuthStateChanged((firebaseUser) => {
      clearTimeout(timeout);

      if (userUnsubRef.current) {
        userUnsubRef.current();
        userUnsubRef.current = null;
      }

      if (firebaseUser) {
        userUnsubRef.current = db.collection('users').doc(firebaseUser.uid)
          .onSnapshot(
            (doc) => {
              const userData = doc.exists ? doc.data() : {};
              setUser({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                emailVerified: firebaseUser.emailVerified,
                ...userData,
              });
              setLoading(false);
            },
            (error) => {
              console.error('Firestore user doc error:', error);
              setUser({ uid: firebaseUser.uid, email: firebaseUser.email });
              setLoading(false);
            }
          );
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(timeout);
      authUnsub();
      if (userUnsubRef.current) userUnsubRef.current();
    };
  }, []);

  const register = async (name, email, password) => {
    const credential = await auth.createUserWithEmailAndPassword(email, password);
    const { uid } = credential.user;
    // Send email verification
    await credential.user.sendEmailVerification();
    await db.collection('users').doc(uid).set({
      name,
      email,
      createdAt: new Date().toISOString(),
      favorites: [],
      darkMode: false,
      notifications: true,
    });
    return credential;
  };

  const login = async (email, password) => {
    return await auth.signInWithEmailAndPassword(email, password);
  };

  const logout = async () => {
    await auth.signOut();
  };

  /**
   * Re-authenticate the current user with their password.
   * Required before sensitive operations (email/password change, delete account).
   */
  const reauthenticate = async (password) => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Not logged in');
    const credential = firebase.auth.EmailAuthProvider.credential(
      currentUser.email,
      password
    );
    await currentUser.reauthenticateWithCredential(credential);
  };

  const updateProfile = async ({ name, email, password, currentPassword }) => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Not logged in');

    // If changing sensitive info, re-auth first
    if ((email && email !== currentUser.email) || password) {
      if (!currentPassword) throw new Error('Please enter your current password to make this change.');
      await reauthenticate(currentPassword);
    }

    const updates = {};
    if (name) updates.name = name.trim();
    if (email && email !== currentUser.email) {
      await currentUser.updateEmail(email.trim());
      updates.email = email.trim();
    }
    if (password) await currentUser.updatePassword(password);
    if (Object.keys(updates).length) {
      await db.collection('users').doc(currentUser.uid).update(updates);
    }
  };

  const deleteAccount = async (password) => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Not logged in');
    // Always re-auth before delete
    await reauthenticate(password);
    const uid = currentUser.uid;
    // Delete all user plants
    const snap = await db.collection('plants').where('userId', '==', uid).get();
    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    batch.delete(db.collection('users').doc(uid));
    await batch.commit();
    await currentUser.delete();
  };

  const resendVerificationEmail = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Not logged in');
    await currentUser.sendEmailVerification();
  };

  const updateSettings = async (settings) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    await db.collection('users').doc(currentUser.uid).update(settings);
  };

  const value = {
    user,
    loading,
    register,
    login,
    logout,
    reauthenticate,
    updateProfile,
    deleteAccount,
    resendVerificationEmail,
    updateSettings,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};