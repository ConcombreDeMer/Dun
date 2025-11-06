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
      default:
        return require('../assets/images/light/cancel.png');
    }
  }
};
