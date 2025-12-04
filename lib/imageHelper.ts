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
