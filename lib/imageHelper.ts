// Helper to get the correct image source based on theme
export const getImageSource = (iconName: string, theme: 'light' | 'dark') => {
  if (theme === 'dark') {
    switch (iconName) {
      case 'cancel':
        return require('../assets/images/dark2/cancel.png');
      case 'settings':
        return require('../assets/images/dark2/settings.png');
      case 'edit':
        return require('../assets/images/dark2/edit.png');
      case 'home':
        return require('../assets/images/dark2/home.png');
      case 'delete':
        return require('../assets/images/dark2/delete.png');
      case 'add':
        return require('../assets/images/dark2/add.png');
      case 'chevron':
        return require('../assets/images/dark2/chevron.png');
      case 'today':
        return require('../assets/images/dark2/today.png');
      case 'back':
        return require('../assets/images/dark2/back.png');
      case 'success':
        return require('../assets/images/dark2/success.png');
      case 'notification':
        return require('../assets/images/dark2/notification.png');
      case 'profile':
        return require('../assets/images/dark2/profile.png');
      case 'display':
        return require('../assets/images/dark2/display.png');
      case 'check':
        return require('../assets/images/dark2/check.png');
      case 'password':
        return require('../assets/images/dark2/password.png');
      case 'dead':
        return require('../assets/images/dark2/dead.png');
      case 'logout':
        return require('../assets/images/dark2/logout.png');
      default:
        return require('../assets/images/dark2/cancel.png');
    }
  } else {
    switch (iconName) {
      case 'cancel':
        return require('../assets/images/light/cancel.png');
      case 'settings':
        return require('../assets/images/light/settings.png');
      case 'edit':
        return require('../assets/images/light/edit.png');
      case 'home':
        return require('../assets/images/light/home.png');
      case 'delete':
        return require('../assets/images/light/delete.png');
      case 'add':
        return require('../assets/images/light/add.png');
      case 'chevron':
        return require('../assets/images/light/chevron.png');
      case 'today':
        return require('../assets/images/light/today.png');
      case 'back':
        return require('../assets/images/light/back.png');
      case 'success':
        return require('../assets/images/light/success.png');
      case 'notification':
        return require('../assets/images/light/notification.png');
      case 'profile':
        return require('../assets/images/light/profile.png');
      case 'display':
        return require('../assets/images/light/display.png');
      case 'check':
        return require('../assets/images/light/check.png');
      case 'password':
        return require('../assets/images/light/password.png');
      case 'dead':
        return require('../assets/images/light/dead.png');
      case 'logout':
        return require('../assets/images/light/logout.png');
      default:
        return require('../assets/images/light/cancel.png');
    }
  }
};

export type CharacterImageName =
  | '0'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | '11'
  | '12'
  | '13'
  | '14'
  | '15'
  | '16'
  | '17'
  | '18'
  | '19'
  | '20'
  | '21';

const lightCharacterImages = {
  '0': require('../assets/images/character/0.png'),
  '1': require('../assets/images/character/1.png'),
  '2': require('../assets/images/character/2.png'),
  '3': require('../assets/images/character/3.png'),
  '4': require('../assets/images/character/4.png'),
  '5': require('../assets/images/character/5.png'),
  '6': require('../assets/images/character/6.png'),
  '7': require('../assets/images/character/7.png'),
  '8': require('../assets/images/character/8.png'),
  '9': require('../assets/images/character/9.png'),
  '10': require('../assets/images/character/10.png'),
  '11': require('../assets/images/character/11.png'),
  '12': require('../assets/images/character/12.png'),
  '13': require('../assets/images/character/13.png'),
  '14': require('../assets/images/character/14.png'),
  '15': require('../assets/images/character/15.png'),
  '16': require('../assets/images/character/16.png'),
  '17': require('../assets/images/character/17.png'),
  '18': require('../assets/images/character/18.png'),
  '19': require('../assets/images/character/19.png'),
  '20': require('../assets/images/character/20.png'),
  '21': require('../assets/images/character/21.png'),
};

const darkCharacterImages: Partial<typeof lightCharacterImages> = {
  '1': require('../assets/images/character/darkmode/1.png'),
  '2': require('../assets/images/character/darkmode/2.png'),
  '4': require('../assets/images/character/darkmode/4.png'),
  '5': require('../assets/images/character/darkmode/5.png'),
  '6': require('../assets/images/character/darkmode/6.png'),
  '7': require('../assets/images/character/darkmode/7.png'),
  '8': require('../assets/images/character/darkmode/8.png'),
  '9': require('../assets/images/character/darkmode/9.png'),
  '10': require('../assets/images/character/darkmode/10.png'),
  '11': require('../assets/images/character/darkmode/11.png'),
  '12': require('../assets/images/character/darkmode/12.png'),
  '13': require('../assets/images/character/darkmode/13.png'),
  '14': require('../assets/images/character/darkmode/14.png'),
  '15': require('../assets/images/character/darkmode/15.png'),
  '16': require('../assets/images/character/darkmode/16.png'),
  '17': require('../assets/images/character/darkmode/17.png'),
  '18': require('../assets/images/character/darkmode/18.png'),
  '19': require('../assets/images/character/darkmode/19.png'),
  '20': require('../assets/images/character/darkmode/20.png'),
  '21': require('../assets/images/character/darkmode/21.png'),
};

export const getCharacterImageSource = (imageName: CharacterImageName, theme: 'light' | 'dark') => {
  if (theme === 'dark') {
    return darkCharacterImages[imageName] ?? lightCharacterImages[imageName];
  }

  return lightCharacterImages[imageName];
};

export type StatsImageName = 'done' | 'perfect' | 'completion' | 'charge';

const lightStatsImages = {
  done: require('../assets/images/stats/done.png'),
  perfect: require('../assets/images/stats/perfect.png'),
  completion: require('../assets/images/stats/completion.png'),
  charge: require('../assets/images/stats/charge.png'),
};

const darkStatsImages = {
  done: require('../assets/images/stats/darkmode/done.png'),
  perfect: require('../assets/images/stats/darkmode/perfect.png'),
  completion: require('../assets/images/stats/darkmode/completion.png'),
  charge: require('../assets/images/stats/darkmode/charge.png'),
};

export const getStatsImageSource = (imageName: StatsImageName, theme: 'light' | 'dark') => {
  return theme === 'dark' ? darkStatsImages[imageName] : lightStatsImages[imageName];
};
