// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyASxYJQju6A3PQA8f2nWrpl6SAJtXhIYFU",
  authDomain: "dvmassociation-98855.firebaseapp.com",
  projectId: "dvmassociation-98855",
  storageBucket: "dvmassociation-98855.firebasestorage.app",
  messagingSenderId: "151716602982",
  appId: "1:151716602982:web:d33e447a920b0746ec39a7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);