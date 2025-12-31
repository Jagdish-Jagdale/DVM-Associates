// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getFunctions } from "firebase/functions";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries


const firebaseConfig = {
  apiKey: "AIzaSyAuC55gJgvyOQKCgOkYEyCvTC6v6czEbCE",
  authDomain: "dvm-associate.firebaseapp.com",
  databaseURL: "https://dvm-associate-default-rtdb.firebaseio.com",
  projectId: "dvm-associate",
  storageBucket: "dvm-associate.firebasestorage.app",
  messagingSenderId: "277880252870",
  appId: "1:277880252870:web:8dc6551c2bfdce2d4beac7",
  measurementId: "G-FYHX213671"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const functions = getFunctions(app);