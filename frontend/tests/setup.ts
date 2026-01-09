// Test setup file
import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    pathname: '/en',
    query: {},
  }),
  useParams: () => ({ id: 'test-project-id' }),
  usePathname: () => '/en',
}));

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock Supabase client
jest.mock('@/lib/supabase/browserClient', () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      getSession: jest.fn(() => Promise.resolve({
        data: {
          session: {
            access_token: 'mock-token'
          }
        }
      })),
      signOut: jest.fn(() => Promise.resolve({})),
    },
  }),
}));

// Mock environment variables
process.env.NEXT_PUBLIC_BACKEND_API_BASE = 'http://localhost:8000';

// Global fetch mock
global.fetch = jest.fn();

// Mock window methods
Object.defineProperty(window, 'location', {
  value: {
    href: '',
    reload: jest.fn(),
  },
  writable: true,
});

