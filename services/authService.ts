
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  User as FirebaseAuthUser
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, firestore, storage } from './firebase';
import { UserProfile } from '../types';
import { compressAndResizeImage } from '../utils/helpers';

export const registerUser = async (email: string, password: string, displayName: string): Promise<FirebaseAuthUser> => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  if (user) {
    // Send email verification
    await sendEmailVerification(user);

    // Create user profile in Firestore
    const userProfileRef = doc(firestore, 'users', user.uid);
    await setDoc(userProfileRef, {
      id: user.uid,
      email: user.email,
      displayName: displayName,
      avatarUrl: null,
      createdAt: serverTimestamp(),
    });

    // Update Firebase Auth profile
    await updateProfile(user, { displayName: displayName });
  }
  return user;
};

export const loginUser = async (email: string, password: string): Promise<FirebaseAuthUser> => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

export const logoutUser = async (): Promise<void> => {
  await signOut(auth);
};

export const resetPassword = async (email: string): Promise<void> => {
  await sendPasswordResetEmail(auth, email);
};

export const getCurrentUserProfile = async (userId: string): Promise<UserProfile | null> => {
  const userProfileRef = doc(firestore, 'users', userId);
  const docSnap = await getDoc(userProfileRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as UserProfile;
  }
  return null;
};

export const updateUserProfileData = async (userId: string, displayName: string, avatarFile: File | null): Promise<UserProfile> => {
  const userProfileRef = doc(firestore, 'users', userId);
  const updates: Partial<UserProfile> = { displayName };
  let newAvatarUrl: string | null = null;

  if (avatarFile) {
    const compressedFile = await compressAndResizeImage(avatarFile);
    const storageRef = ref(storage, `avatars/${userId}/${Date.now()}-${compressedFile.name}`);
    const uploadResult = await uploadBytes(storageRef, compressedFile);
    newAvatarUrl = await getDownloadURL(uploadResult.ref);
    updates.avatarUrl = newAvatarUrl;
  }

  await updateDoc(userProfileRef, updates);

  // Update Auth profile as well
  if (auth.currentUser) {
    await updateProfile(auth.currentUser, {
      displayName: displayName,
      photoURL: newAvatarUrl || auth.currentUser.photoURL,
    });
  }

  // Fetch and return the updated profile
  const updatedUserProfile = await getCurrentUserProfile(userId);
  if (!updatedUserProfile) throw new Error("Failed to fetch updated user profile.");
  return updatedUserProfile;
};
