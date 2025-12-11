// src/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyBPuiG26N4bqZv-AJbutAJMR28SqvN1GAI",
    authDomain: "ecommerce-2e588.firebaseapp.com",
    projectId: "ecommerce-2e588",
    storageBucket: "ecommerce-2e588.firebasestorage.app",
    messagingSenderId: "653047320132",
    appId: "1:653047320132:web:2d11719d2badbe4046f611",
    measurementId: "G-2JH4D9CJQC"
  };

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
