export const lightTheme = {
  background: '#F8F9FA',
  card: '#FFFFFF',
  text: '#1C1C1E',
  textSecondary: '#8E8E93',
  border: '#E5E5EA',
  primary: '#007AFF',
  danger: '#FF3B30',
  iconBackgroundTint: 0.15, // opacity
};

export const darkTheme = {
  background: '#000000',
  card: '#1C1C1E',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  border: '#38383A',
  primary: '#0A84FF',
  danger: '#FF453A',
  iconBackgroundTint: 0.25,
};

export const getTheme = (isDarkMode: boolean) => {
  return isDarkMode ? darkTheme : lightTheme;
};
