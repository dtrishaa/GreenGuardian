import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCaoiWiZF6DD-aEsb8gThQWkB-PNnz9UU0",
  authDomain: "greenguardianapp.firebaseapp.com",
  projectId: "greenguardianapp",
  storageBucket: "greenguardianapp.firebasestorage.app",
  messagingSenderId: "165941963604",
  appId: "1:165941963604:web:a440d1ad7938c5fef576c1"
};

const app = firebase.initializeApp(firebaseConfig);
export const auth = app.auth();
export const db = app.firestore();
export const storage = app.storage();
export default app;