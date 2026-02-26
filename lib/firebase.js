import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDlyMrsYBVIlKIQaSJFea1NclEZ7Q2vz9s",
  authDomain: "inventario-de-laboratori-11feb.firebaseapp.com",
  projectId: "inventario-de-laboratori-11feb",
  storageBucket: "inventario-de-laboratori-11feb.appspot.com",
  messagingSenderId: "135418992590",
  appId: "1:135418992590:web:cfcffc8473e353862c7d9f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };