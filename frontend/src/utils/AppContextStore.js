import { createContext } from 'react';
// Kept outside the provider's refresh boundary so editing it cannot create two contexts.
export const AppContext = createContext(null);
