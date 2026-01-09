/**
 * Tests for ProjectDetailContent component
 * Testing recent changes: error handling improvements, network error detection, troubleshooting UI
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ProjectDetailContent } from '../ProjectDetailContent';

// Mock the child components
jest.mock('@/components/runs/ResultsModal', () => ({
  ResultsModal: ({ isOpen, onClose }: any) => (
    isOpen ? <div data-testid="results-modal">Results Modal</div> : null
  ),
}));

jest.mock('@/components/datasets/DatasetPreviewModal', () => ({
  DatasetPreviewModal: ({ isOpen, dataset }: any) => (
    isOpen ? <div data-testid="preview-modal">Preview Modal: {dataset?.name}</div> : null
  ),
}));

describe('ProjectDetailContent - Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('Network Error Handling', () => {
    test('should use mock data fallback for network errors (Failed to fetch)', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Failed to fetch'));

      render(<ProjectDetailContent />);

      await waitFor(() => {
        // Network errors should trigger mock data fallback
        expect(screen.getByText(/Clinical Trial Alpha/i)).toBeInTheDocument();
        expect(screen.getByText(/Showing demo project data/i)).toBeInTheDocument();
      });

      // Should NOT show error UI for network errors (uses mock data instead)
      expect(screen.queryByText(/Error loading project/i)).not.toBeInTheDocument();
    });

    test('should use mock data fallback for NetworkError', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('NetworkError'));

      render(<ProjectDetailContent />);

      await waitFor(() => {
        // Network errors should trigger mock data fallback
        expect(screen.getByText(/Clinical Trial Alpha/i)).toBeInTheDocument();
      });
    });

    test('should show error UI only for API errors, not network errors', async () => {
      // Network error - should use mock data
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Failed to fetch'));

      render(<ProjectDetailContent />);

      await waitFor(() => {
        // Should show mock data, not error UI
        expect(screen.getByText(/Clinical Trial Alpha/i)).toBeInTheDocument();
        expect(screen.queryByText(/Error loading project/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('API Error Handling (404)', () => {
    test('should show proper error message for 404 without using mock data', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
      });

      render(<ProjectDetailContent />);

      await waitFor(() => {
        expect(screen.getByText(/Error loading project/i)).toBeInTheDocument();
        expect(screen.getByText(/Project not found/i)).toBeInTheDocument();
      });

      // Should NOT show troubleshooting tips for 404
      expect(screen.queryByText(/Troubleshooting:/i)).not.toBeInTheDocument();
    });

    test('should not use mock data for 404 errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
      });

      render(<ProjectDetailContent />);

      await waitFor(() => {
        // Should show error, not mock data
        expect(screen.getByText(/Project not found/i)).toBeInTheDocument();
      });

      // Should not show mock project name
      expect(screen.queryByText(/Clinical Trial Alpha/i)).not.toBeInTheDocument();
    });
  });

  describe('API Error Handling (401)', () => {
    test('should show error for 401 without using mock data', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      render(<ProjectDetailContent />);

      await waitFor(() => {
        expect(screen.getByText(/Error loading project/i)).toBeInTheDocument();
      });

      // Should NOT show troubleshooting tips for 401
      expect(screen.queryByText(/Troubleshooting:/i)).not.toBeInTheDocument();
    });
  });

  describe('Error UI Components', () => {
    test('should show Retry button for API errors (404)', async () => {
      // API error (404) - should show error UI
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
      });

      render(<ProjectDetailContent />);

      await waitFor(() => {
        expect(screen.getByText(/Error loading project/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByText(/Retry/i);
      expect(retryButton).toBeInTheDocument();

      // Mock successful fetch for retry
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'test-project-id',
          name: 'Test Project',
          owner_id: 'user-123',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          status: 'Active',
          datasets_count: 0,
          runs_count: 0,
          datasets: [],
          runs: [],
        }),
      });

      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });
    });

    test('should show Go Back button for API errors', async () => {
      // API error (404) - should show error UI
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
      });

      render(<ProjectDetailContent />);

      await waitFor(() => {
        expect(screen.getByText(/Go Back/i)).toBeInTheDocument();
      });
    });
  });

  describe('Successful Data Loading', () => {
    test('should load and display project data successfully', async () => {
      const mockProject = {
        id: 'test-project-id',
        name: 'Test Project',
        description: 'Test Description',
        owner_id: 'user-123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        status: 'Active',
        datasets_count: 2,
        runs_count: 3,
        datasets: [],
        runs: [],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProject,
      });

      render(<ProjectDetailContent />);

      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });

      expect(screen.queryByText(/Error loading project/i)).not.toBeInTheDocument();
    });
  });

  describe('Error Logging', () => {
    test('should log detailed error information', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Failed to fetch'));

      render(<ProjectDetailContent />);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      // Check that error logging includes project details
      const errorCalls = consoleErrorSpy.mock.calls;
      expect(errorCalls.some(call => 
        JSON.stringify(call).includes('test-project-id') ||
        JSON.stringify(call).includes('projectId')
      )).toBe(true);

      consoleErrorSpy.mockRestore();
    });
  });
});

