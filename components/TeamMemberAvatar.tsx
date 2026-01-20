
import React from 'react';
import Avatar from './ui/Avatar';
import { UserProfile } from '../types';

interface TeamMemberAvatarProps {
  member: UserProfile;
  className?: string;
}

const TeamMemberAvatar: React.FC<TeamMemberAvatarProps> = ({ member, className }) => {
  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <Avatar
        src={member.avatarUrl}
        alt={member.displayName || member.email}
        fallbackText={member.displayName?.charAt(0) || member.email.charAt(0)}
        size="sm"
      />
      <span className="text-sm font-medium text-gray-900">{member.displayName || member.email}</span>
    </div>
  );
};

export default TeamMemberAvatar;
