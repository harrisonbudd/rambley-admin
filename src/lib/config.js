// Configuration system for data source switching

// Environment variables
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
export const DATA_SOURCE = import.meta.env.VITE_DATA_SOURCE || 'static';

// Data source modes
export const DATA_SOURCES = {
  STATIC: 'static',
  API: 'api'
};

// Check if we should use API data
export const useApiData = () => {
  return DATA_SOURCE === DATA_SOURCES.API;
};

// Check if we should use static data  
export const useStaticData = () => {
  return DATA_SOURCE === DATA_SOURCES.STATIC;
};

// Get current data source
export const getCurrentDataSource = () => {
  return DATA_SOURCE;
};

// Configuration object
export const config = {
  apiUrl: API_URL,
  dataSource: DATA_SOURCE,
  useApi: useApiData(),
  useStatic: useStaticData(),
  
  // Helper methods
  isApiMode: () => useApiData(),
  isStaticMode: () => useStaticData(),
  
  // Debug info
  getDebugInfo: () => ({
    apiUrl: API_URL,
    dataSource: DATA_SOURCE,
    useApi: useApiData(),
    useStatic: useStaticData(),
    environment: import.meta.env.MODE
  })
};

// Log configuration in development
if (import.meta.env.DEV) {
  console.log('🔧 App Configuration:', config.getDebugInfo());
}

export default config; 