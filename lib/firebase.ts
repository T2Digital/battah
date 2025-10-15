// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyC2hF16IrbCGj1bV_yb5aNKxgvkOJQLC7w",
    authDomain: "battah-9cbf2.firebaseapp.com",
    projectId: "battah-9cbf2",
    storageBucket: "battah-9cbf2.appspot.com",
    messagingSenderId: "202761356063",
    appId: "1:202761356063:web:758779eadfcfd90e91262a",
    measurementId: "G-1PT1JS2CVS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
