import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import { doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { auth, firestore, googleProvider } from '../lib/firebase'
import type { UserProfile } from '../types'

interface AuthValue {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signup: (email: string, password: string, username: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  loginGoogle: () => Promise<void>
  ensureGuest: () => Promise<User>
  claimUsername: (username: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

function normalizeUsername(value: string) {
  return value.trim().toLowerCase()
}

function validateUsername(username: string) {
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    throw new Error('Username must be 3–20 characters using letters, numbers or underscores.')
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = async (current: User | null) => {
    if (!current || current.isAnonymous) {
      setProfile(null)
      return
    }
    const snap = await getDoc(doc(firestore, 'users', current.uid))
    setProfile(snap.exists() ? (snap.data() as UserProfile) : null)
  }

  useEffect(() => onAuthStateChanged(auth, async (next) => {
    setUser(next)
    try { await loadProfile(next) } finally { setLoading(false) }
  }), [])

  const claimUsername = async (username: string) => {
    const current = auth.currentUser
    if (!current || current.isAnonymous) throw new Error('Create or sign in to an account first.')
    validateUsername(username)
    const clean = username.trim()
    const lower = normalizeUsername(clean)
    const indexRef = doc(firestore, 'usernames', lower)
    const userRef = doc(firestore, 'users', current.uid)

    await runTransaction(firestore, async (tx) => {
      const [indexSnap, userSnap] = await Promise.all([tx.get(indexRef), tx.get(userRef)])
      if (indexSnap.exists() && indexSnap.data().uid !== current.uid) throw new Error('That username is already taken.')
      if (userSnap.exists() && userSnap.data().usernameLower && userSnap.data().usernameLower !== lower) {
        throw new Error('Username changes are disabled in this MVP.')
      }
      tx.set(indexRef, { uid: current.uid, username: clean, createdAt: serverTimestamp() })
      tx.set(userRef, {
        uid: current.uid,
        username: clean,
        usernameLower: lower,
        createdAt: userSnap.exists() ? userSnap.data().createdAt : Date.now(),
      }, { merge: true })
    })
    await loadProfile(current)
  }

  const signup = async (email: string, password: string, username: string) => {
    validateUsername(username)
    if (auth.currentUser?.isAnonymous) await firebaseSignOut(auth)
    await createUserWithEmailAndPassword(auth, email, password)
    await claimUsername(username)
  }

  const login = async (email: string, password: string) => {
    if (auth.currentUser?.isAnonymous) await firebaseSignOut(auth)
    await signInWithEmailAndPassword(auth, email, password)
    await loadProfile(auth.currentUser)
  }

  const loginGoogle = async () => {
    if (auth.currentUser?.isAnonymous) await firebaseSignOut(auth)
    await signInWithPopup(auth, googleProvider)
    await loadProfile(auth.currentUser)
  }

  const ensureGuest = async () => {
    if (auth.currentUser) return auth.currentUser
    const result = await signInAnonymously(auth)
    return result.user
  }

  const value = useMemo<AuthValue>(() => ({
    user, profile, loading, signup, login, loginGoogle, ensureGuest, claimUsername,
    signOut: () => firebaseSignOut(auth),
    refreshProfile: () => loadProfile(auth.currentUser),
  }), [user, profile, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be inside AuthProvider')
  return value
}
