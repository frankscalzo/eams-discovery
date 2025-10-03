// Clear Authentication Data Script
// Run this in the browser console to clear all authentication data

console.log('Clearing all authentication data...');

// Clear all EAMS-related localStorage items
const keysToRemove = [];
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key && (key.startsWith('eams_') || key.startsWith('cognito_') || key.includes('auth'))) {
    keysToRemove.push(key);
  }
}

keysToRemove.forEach(key => {
  localStorage.removeItem(key);
  console.log(`Removed: ${key}`);
});

// Clear sessionStorage as well
const sessionKeysToRemove = [];
for (let i = 0; i < sessionStorage.length; i++) {
  const key = sessionStorage.key(i);
  if (key && (key.startsWith('eams_') || key.startsWith('cognito_') || key.includes('auth'))) {
    sessionKeysToRemove.push(key);
  }
}

sessionKeysToRemove.forEach(key => {
  sessionStorage.removeItem(key);
  console.log(`Removed from sessionStorage: ${key}`);
});

console.log('Authentication data cleared. Please refresh the page.');
console.log('You should now be redirected to the login page.');

// Optional: Reload the page
// window.location.reload();
