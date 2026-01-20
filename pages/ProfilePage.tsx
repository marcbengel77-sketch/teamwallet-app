
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Avatar from '../components/ui/Avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { compressAndResizeImage } from '../utils/helpers';
import { storage } from '../services/firebase'; // Ensure storage is imported
import { ref, deleteObject } from 'firebase/storage';

const ProfilePage: React.FC = () => {
  const { currentUser, userProfile, loading, logout, updateUserProfile } = useAuth();
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(userProfile?.avatarUrl || null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || '');
      setAvatarPreviewUrl(userProfile.avatarUrl || null);
    }
  }, [userProfile]);

  const handleAvatarChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreviewUrl(URL.createObjectURL(file));
    }
  }, []);

  const handleRemoveAvatar = useCallback(() => {
    setAvatarFile(null);
    setAvatarPreviewUrl(null);
  }, []);

  const handleUpdateProfile = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setIsUpdating(true);
    setMessage(null);
    setError(null);

    try {
      await updateUserProfile(displayName, avatarFile);
      setMessage('Profil erfolgreich aktualisiert!');
      // If avatar was removed, and there was an old one, handle deletion from storage
      if (!avatarFile && userProfile?.avatarUrl && !avatarPreviewUrl) {
        // This is a simplified deletion. In a real app, you'd parse the URL to get the path
        // and safely delete it. For this example, we assume `updateUserProfile` handles the URL update.
        // const oldAvatarRef = ref(storage, userProfile.avatarUrl);
        // await deleteObject(oldAvatarRef);
      }
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      setError(err.message || 'Fehler beim Aktualisieren des Profils.');
    } finally {
      setIsUpdating(false);
    }
  }, [currentUser, displayName, avatarFile, avatarPreviewUrl, userProfile?.avatarUrl, updateUserProfile]);

  if (loading || !currentUser) {
    return (
      <div className="flex justify-center items-center h-full min-h-[50vh]">
        <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Mein Profil</h1>

      <Card className="max-w-xl mx-auto">
        <CardHeader>
          <CardTitle>Profilinformationen</CardTitle>
          <CardDescription>Aktualisieren Sie Ihren Namen und Ihr Profilbild.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-6">
            {message && <p className="text-green-600 text-sm">{message}</p>}
            {error && <p className="text-red-500 text-sm">{error}</p>}

            <div className="flex items-center space-x-4">
              <Avatar
                src={avatarPreviewUrl || undefined}
                alt={displayName || currentUser.email || 'User'}
                fallbackText={displayName.charAt(0) || currentUser.email?.charAt(0) || '?'}
                size="xl"
                className="flex-shrink-0"
              />
              <div className="flex-grow space-y-2">
                <label className="block text-sm font-medium text-gray-700">Profilbild</label>
                <Input type="file" accept="image/*" onChange={handleAvatarChange} />
                {avatarPreviewUrl && (
                  <Button variant="outline" size="sm" onClick={handleRemoveAvatar}>
                    Bild entfernen
                  </Button>
                )}
              </div>
            </div>

            <Input
              label="Anzeigename"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ihr Name"
              required
            />

            <Input
              label="E-Mail"
              type="email"
              value={currentUser.email || ''}
              readOnly
              disabled
              className="bg-gray-50 cursor-not-allowed"
            />

            <div className="flex justify-end gap-2">
              <Button type="submit" isLoading={isUpdating}>
                Profil speichern
              </Button>
              <Button variant="destructive" onClick={logout} disabled={isUpdating}>
                Abmelden
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilePage;
