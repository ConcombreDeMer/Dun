// Helper to get the correct image source based on theme
export const getImageSource = (iconName: string, theme: 'light' | 'dark') => {
  if (theme === 'dark') {
    switch (iconName) {
      case 'cancel':
        return require('../assets/images/dark/cancel.png');
      case 'settings':
        return require('../assets/images/dark/settings.png');
      case 'edit':
        return require('../assets/images/dark/edit.png');
      case 'home':
        return require('../assets/images/dark/home.png');
      default:
        return require('../assets/images/dark/cancel.png');
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
      default:
        return require('../assets/images/light/cancel.png');
    }
  }
};
