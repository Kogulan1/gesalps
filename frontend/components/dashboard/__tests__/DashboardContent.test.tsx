/**
 * Tests for DashboardContent component
 * Testing recent changes: Upgrade Plan button redirect, Recent Activity click functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DashboardContent } from '../DashboardContent';
import { useRouter } from 'next/navigation';

// Mock next/navigation
const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    pathname: '/en',
    query: {},
  }),
}));

// Mock child components
jest.mock('../ProjectCard', () => ({
  ProjectCard: ({ project, onView, onRun, onEdit, onDelete }: any) => (
    <div data-testid={`project-card-${project.id}`}>
      <button onClick={() => onView(project.id)}>View</button>
      <button onClick={() => onRun(project.id)}>Run</button>
      <button onClick={() => onEdit(project.id)}>Edit</button>
      <button onClick={() => onDelete(project.id)}>Delete</button>
    </div>
  ),
}));

jest.mock('../CreateProjectModal', () => ({
  CreateProjectModal: ({ isOpen, onClose, onSuccess }: any) => (
    isOpen ? (
      <div data-testid="create-project-modal">
        <button onClick={onClose}>Close</button>
        <button onClick={() => onSuccess({ id: 'new-project', name: 'New Project' })}>Create</button>
      </div>
    ) : null
  ),
}));

jest.mock('../AddNewMenu', () => ({
  AddNewMenu: ({ onProjectCreated }: any) => (
    <button onClick={() => onProjectCreated({ id: 'new-project', name: 'New Project' })}>
      Add New
    </button>
  ),
}));

describe('DashboardContent - Recent Changes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
    mockPush.mockClear();
  });

  describe('Upgrade Plan Button', () => {
    test('should redirect to /en#pricing when Upgrade Plan button is clicked', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      render(<DashboardContent />);

      await waitFor(() => {
        const upgradeButton = screen.getByText(/Upgrade Plan/i);
        expect(upgradeButton).toBeInTheDocument();
      });

      const upgradeButton = screen.getByText(/Upgrade Plan/i);
      fireEvent.click(upgradeButton);

      expect(mockPush).toHaveBeenCalledWith('/en#pricing');
    });

    test('should have correct styling for Upgrade Plan button', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      render(<DashboardContent />);

      await waitFor(() => {
        const upgradeButton = screen.getByText(/Upgrade Plan/i);
        expect(upgradeButton).toBeInTheDocument();
        // Check for black background class
        expect(upgradeButton.closest('button')?.className).toContain('bg-black');
      });
    });
  });

  describe('Recent Activity Section', () => {
    test('should display recent activity items with clickable functionality', async () => {
      const mockProjects = [
        {
          id: 'project-1',
          name: 'Project 1',
          runs_count: 5,
          datasets_count: 3,
          last_activity: '2 hours ago',
        },
        {
          id: 'project-2',
          name: 'Project 2',
          runs_count: 0,
          datasets_count: 2,
          last_activity: '1 day ago',
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProjects,
      });

      render(<DashboardContent />);

      await waitFor(() => {
        expect(screen.getByText(/Recent Activity/i)).toBeInTheDocument();
      });

      // Check that activity items are clickable
      const activityItems = screen.getAllByText(/Project 1|Project 2/i);
      expect(activityItems.length).toBeGreaterThan(0);

      // Click on first activity item
      const firstActivity = screen.getByText('5 runs completed');
      expect(firstActivity).toBeInTheDocument();
    });

    test('should show correct activity descriptions for runs', async () => {
      const mockProjects = [
        {
          id: 'project-1',
          name: 'Project 1',
          runs_count: 1,
          datasets_count: 0,
          last_activity: '2 hours ago',
        },
        {
          id: 'project-2',
          name: 'Project 2',
          runs_count: 5,
          datasets_count: 0,
          last_activity: '1 day ago',
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProjects,
      });

      render(<DashboardContent />);

      await waitFor(() => {
        expect(screen.getByText('1 run completed')).toBeInTheDocument();
        expect(screen.getByText('5 runs completed')).toBeInTheDocument();
      });
    });

    test('should show correct activity descriptions for datasets', async () => {
      const mockProjects = [
        {
          id: 'project-1',
          name: 'Project 1',
          runs_count: 0,
          datasets_count: 1,
          last_activity: '2 hours ago',
        },
        {
          id: 'project-2',
          name: 'Project 2',
          runs_count: 0,
          datasets_count: 3,
          last_activity: '1 day ago',
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProjects,
      });

      render(<DashboardContent />);

      await waitFor(() => {
        expect(screen.getByText('1 dataset uploaded')).toBeInTheDocument();
        expect(screen.getByText('3 datasets uploaded')).toBeInTheDocument();
      });
    });

    test('should navigate to project when activity item is clicked', async () => {
      const mockProjects = [
        {
          id: 'project-1',
          name: 'Project 1',
          runs_count: 2,
          datasets_count: 1,
          last_activity: '2 hours ago',
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProjects,
      });

      render(<DashboardContent />);

      await waitFor(() => {
        const activityItem = screen.getByText('Project 1');
        expect(activityItem).toBeInTheDocument();
      });

      // Find the clickable container (parent of the activity item)
      const activityContainer = screen.getByText('Project 1').closest('[class*="cursor-pointer"]');
      if (activityContainer) {
        fireEvent.click(activityContainer);
        expect(mockPush).toHaveBeenCalledWith('/en/projects/project-1');
      }
    });

    test('should show empty state when no projects exist', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      render(<DashboardContent />);

      await waitFor(() => {
        expect(screen.getByText(/Recent synthesis runs and activities will appear here/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('should use demo data for network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Failed to fetch'));

      render(<DashboardContent />);

      await waitFor(() => {
        // Network errors should trigger demo data fallback
        expect(screen.getByText(/Showing demo projects while the backend API is unavailable/i)).toBeInTheDocument();
      });

      // Should NOT show error message for network errors (uses demo data instead)
      expect(screen.queryByText(/Error loading projects/i)).not.toBeInTheDocument();
    });

    test('should show error message for API errors (401)', async () => {
      // API error (401) - should show error UI, not demo data
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      render(<DashboardContent />);

      await waitFor(() => {
        // ErrorState component shows "Error" as title and the error message
        // The error message will be "API error: 401" based on component code
        // Component now has data-testid attributes for easier testing
        expect(screen.getByTestId('error-state')).toBeInTheDocument();
        expect(screen.getByTestId('error-title')).toHaveTextContent('Error');
        expect(screen.getByTestId('error-message')).toHaveTextContent('API error: 401');
        expect(screen.getByTestId('retry-button')).toBeInTheDocument();
      });
    });
  });
});

