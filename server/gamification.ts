import { dbStore, Attendance, Event } from './store';

export interface BadgeInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedAt?: string;
}

export interface GamificationState {
  totalPoints: number;
  level: string;
  stars: number;
  currentStreak: number;
  highestStreak: number;
  eventsAttended: number;
  volunteerActivities: number;
  badges: BadgeInfo[];
}

/**
 * Computes gamification statistics, levels, badges, streaks, and ratings dynamically
 * based on actual attendance log data to ensure absolute data validity.
 */
export function getUserGamification(userId: string, dateLimitMs?: number): GamificationState {
  let rawAttendances = dbStore.getAttendance().filter(a => a.userId === userId && a.status === 'Present');
  
  if (dateLimitMs !== undefined) {
    const now = Date.now();
    rawAttendances = rawAttendances.filter(a => {
      const time = new Date(a.date).getTime();
      return (now - time) <= dateLimitMs;
    });
  }

  const attendances = rawAttendances;
  const eventsAttended = attendances.length;

  // 1. Calculate points from contributions
  let basePoints = 0;
  let volunteerActivities = 0;

  attendances.forEach(att => {
    const type = att.contributionType || 'Attendance';
    if (type === 'Attendance') {
      basePoints += 10;
    } else if (type === 'Volunteer') {
      basePoints += 20;
      volunteerActivities += 1;
    } else if (type === 'Contribution') {
      basePoints += 15;
    } else if (type === 'Organizer') {
      basePoints += 30;
    } else {
      basePoints += 10;
    }
  });

  // 2. Streak Calculation (Consecutive Events within 14 days)
  const dates = attendances
    .map(a => new Date(a.date).getTime())
    .sort((a, b) => a - b);

  let currentStreak = 0;
  let highestStreak = 0;

  if (dates.length > 0) {
    currentStreak = 1;
    highestStreak = 1;
    for (let i = 1; i < dates.length; i++) {
      const diffMs = dates[i] - dates[i - 1];
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (diffDays <= 14) {
        currentStreak++;
      } else {
        if (currentStreak > highestStreak) {
          highestStreak = currentStreak;
        }
        currentStreak = 1;
      }
    }
    if (currentStreak > highestStreak) {
      highestStreak = currentStreak;
    }
  }

  // 3. Streak and Badge Bonus Points
  let bonusPoints = 0;
  if (highestStreak >= 3) {
    bonusPoints += 15; // Bonus for 3-event streak
  }
  if (highestStreak >= 5) {
    bonusPoints += 30; // Double bonus for 5-event streak
  }

  const totalPoints = basePoints + bonusPoints;

  // 4. Community Levels
  let level = 'Level 1 Explorer';
  if (totalPoints > 250) {
    level = 'Level 4 Champion';
  } else if (totalPoints > 100) {
    level = 'Level 3 Influencer';
  } else if (totalPoints > 50) {
    level = 'Level 2 Contributor';
  }

  // 5. Star Rating System
  let stars = 0;
  if (eventsAttended >= 20) {
    stars = 5;
  } else if (eventsAttended >= 11) {
    stars = 4;
  } else if (eventsAttended >= 6) {
    stars = 3;
  } else if (eventsAttended >= 3) {
    stars = 2;
  } else if (eventsAttended >= 1) {
    stars = 1;
  }

  // 6. Badges Showcase (Earned vs Locked)
  const availableBadges = [
    {
      id: 'badge_first_event',
      name: 'First Event',
      description: 'Awarded for attending your very first community event.',
      icon: 'Compass',
      earned: eventsAttended >= 1,
      earnedAt: eventsAttended >= 1 ? attendances[0]?.date : undefined
    },
    {
      id: 'badge_active_member',
      name: 'Active Member',
      description: 'Awarded for participating in 5 or more events.',
      icon: 'Award',
      earned: eventsAttended >= 5,
      earnedAt: eventsAttended >= 5 ? attendances[4]?.date : undefined
    },
    {
      id: 'badge_champion',
      name: 'Community Champion',
      description: 'Awarded for participating in 15 or more events.',
      icon: 'Shield',
      earned: eventsAttended >= 15,
      earnedAt: eventsAttended >= 15 ? attendances[14]?.date : undefined
    },
    {
      id: 'badge_volunteer',
      name: 'Volunteer',
      description: 'Awarded for volunteering in 3 or more events.',
      icon: 'Heart',
      earned: volunteerActivities >= 3,
      earnedAt: volunteerActivities >= 3 ? attendances.filter(a => a.contributionType === 'Volunteer')[2]?.date : undefined
    },
    {
      id: 'badge_streak_master',
      name: 'Streak Master',
      description: 'Awarded for attending 3 consecutive events within 14 days of each other.',
      icon: 'Flame',
      earned: highestStreak >= 3,
      earnedAt: highestStreak >= 3 ? new Date(dates[2] || Date.now()).toISOString() : undefined
    }
  ];

  return {
    totalPoints,
    level,
    stars,
    currentStreak,
    highestStreak,
    eventsAttended,
    volunteerActivities,
    badges: availableBadges
  };
}
