
import { useContext } from 'react';
import { TeamContextType } from '../types';
import { TeamContext } from '../contexts/TeamContext';

export const useTeam = (): TeamContextType => {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
};
