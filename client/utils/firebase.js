import {getAuth, GoogleAuthProvider} from 'firebase/auth'

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_GOOGLE_AUTH_API_KEY,
  authDomain: "loginskiilio.firebaseapp.com",
  projectId: "loginskiilio",
  storageBucket: "loginskiilio.firebasestorage.app",
  messagingSenderId: "137340351535",
  appId: "1:137340351535:web:b7e33cfe71b35961a342da"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const provider = new GoogleAuthProvider()

export {auth,provider} 