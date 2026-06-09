// firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, doc, setDoc, getDoc, query, where, updateDoc } from "firebase/firestore";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAa1AoNBMQgl5nE9V5wtvbtoOWiWn91sJ4",
  authDomain: "campus-pickup.firebaseapp.com",
  projectId: "campus-pickup",
  storageBucket: "campus-pickup.firebasestorage.app",
  messagingSenderId: "486593230418",
  appId: "1:486593230418:web:8f12ebe4b651f17824518b"
};

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
const firebaseAuth = getAuth(app);

export const auth = {
  async register(name, email, password, role) {
    const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
    const userData = { uid: cred.user.uid, name, email, role };
    await setDoc(doc(firestore, "users", cred.user.uid), userData);
    return userData;
  },
  async login(email, password) {
    const cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
    const snap = await getDoc(doc(firestore, "users", cred.user.uid));
    if (!snap.exists()) throw new Error("User profile not found. Please register first.");
    return snap.data();
  },
};

export const db = {
  async addOrder(order) {
    await addDoc(collection(firestore, "orders"), order);
  },
  async getOrders() {
    const snap = await getDocs(collection(firestore, "orders"));
    return snap.docs.map(d => d.data());
  },
  async getOrdersByUser(uid) {
    const q = query(collection(firestore, "orders"), where("userId", "==", uid));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
  },
  async updateOrder(orderId, updates) {
    const q = query(collection(firestore, "orders"), where("orderId", "==", orderId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      await updateDoc(snap.docs[0].ref, updates);
    }
  },
};