import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAIWlQukqBMlAFrl2iTOhitGgN7knW3SR8",
  authDomain: "gen-lang-client-0565114419.firebaseapp.com",
  projectId: "gen-lang-client-0565114419",
  storageBucket: "gen-lang-client-0565114419.firebasestorage.app",
  messagingSenderId: "811492221296",
  appId: "1:811492221296:web:a37636d87820368ec06fb5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firestore (with the explicit database ID provided in config)
export const db = getFirestore(app, "ai-studio-84612a05-8b9c-463f-8c53-e514de638c29");

export default app;
