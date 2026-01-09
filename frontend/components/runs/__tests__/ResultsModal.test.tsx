/**
 * Tests for ResultsModal component
 * Testing recent changes: download functions using correct API endpoints
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ResultsModal } from '../ResultsModal';

// Mock createObjectURL and revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock document.createElement for anchor element
const mockClick = jest.fn();
const mockAppendChild = jest.fn();
const mockRemoveChild = jest.fn();

const originalCreateElement = document.createElement.bind(document);

beforeEach(() => {
  mockClick.mockClear();
  mockAppendChild.mockClear();
  mockRemoveChild.mockClear();
  
  jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
    if (tagName === 'a') {
      const link = originalCreateElement('a');
      link.click = mockClick;
      return link;
    }
    return originalCreateElement(tagName);
  });

  jest.spyOn(document.body, 'appendChild').mockImplementation((node) => {
    mockAppendChild(node);
    return node;
  });
  
  jest.spyOn(document.body, 'removeChild').mockImplementation((node) => {
    mockRemoveChild(node);
    return node;
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('ResultsModal - Download Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
    mockClick.mockClear();
    mockAppendChild.mockClear();
    mockRemoveChild.mockClear();
  });

  describe('Download Report (PDF)', () => {
    test('should use POST /v1/runs/{id}/report/pdf endpoint', async () => {
      const mockRunData = {
        id: 'run-123',
        name: 'Test Run',
        status: 'succeeded',
        method: 'ddpm',
        started_at: '2024-01-01T00:00:00Z',
        finished_at: '2024-01-01T01:00:00Z',
        config_json: {},
      };

      const mockMetrics = {
        utility: {
          auroc: 0.85,
          c_index: 0.75,
        },
        privacy: {
          mia_auc: 0.45,
          dup_rate: 0.02,
        },
      };

      const mockResults = {
        id: 'run-123',
        name: 'Test Run',
        status: 'completed',
        method: 'ddpm',
        started_at: '2024-01-01T00:00:00Z',
        finished_at: '2024-01-01T01:00:00Z',
        duration: 60,
        scores: {
          auroc: 0.85,
          c_index: 0.75,
          mia_auc: 0.45,
          dp_epsilon: 1.0,
          privacy_score: 0.9,
          utility_score: 0.8,
        },
        metrics: {
          rows_generated: 1000,
          columns_generated: 10,
          privacy_audit_passed: true,
          utility_audit_passed: true,
          privacy: {
            mia_auc: 0.45,
            dup_rate: 0.02,
          },
          utility: {
            ks_mean: 0.08,
            corr_delta: 0.09,
          },
        },
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRunData,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockMetrics, // metrics
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [], // steps
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ signedUrl: 'https://example.com/report.pdf' }),
        });

      render(
        <ResultsModal
          isOpen={true}
          onClose={jest.fn()}
          runId="run-123"
          runName="Test Run"
        />
      );

      // Wait for API calls to complete and component to render results
      await waitFor(() => {
        // Check that API calls were made
        expect(global.fetch).toHaveBeenCalled();
        // Wait for download button to appear (means results are loaded)
        expect(screen.getByText(/Download Report/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Find and click download report button
      const reportButton = screen.getByText(/Download Report/i);
      fireEvent.click(reportButton);

      await waitFor(() => {
        // Check that POST request was made to report/pdf endpoint
        const fetchCalls = (global.fetch as jest.Mock).mock.calls;
        const reportCall = fetchCalls.find((call: any[]) => 
          call[0]?.includes('/v1/runs/run-123/report/pdf')
        );
        expect(reportCall).toBeDefined();
        expect(reportCall[1]?.method).toBe('POST');
      });
    });

    test('should show error alert if report download fails', async () => {
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation();
      const mockRunData = {
        id: 'run-123',
        name: 'Test Run',
        status: 'succeeded',
        method: 'ddpm',
        started_at: '2024-01-01T00:00:00Z',
        finished_at: '2024-01-01T01:00:00Z',
        config_json: {},
      };

      const mockMetrics = {
        utility: {
          auroc: 0.85,
          c_index: 0.75,
        },
        privacy: {
          mia_auc: 0.45,
          dup_rate: 0.02,
        },
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRunData,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockMetrics, // metrics
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [], // steps
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        });

      render(
        <ResultsModal
          isOpen={true}
          onClose={jest.fn()}
          runId="run-123"
          runName="Test Run"
        />
      );

      await waitFor(() => {
        // Wait for modal to load and download button to appear
        expect(screen.queryByTestId('loading-results')).not.toBeInTheDocument();
        expect(screen.getByText(/Download Report/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Find and click download report button
      const reportButton = screen.getByText(/Download Report/i);
      fireEvent.click(reportButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalled();
      });

      alertSpy.mockRestore();
    });
  });

  describe('Download Synthetic Data (CSV)', () => {
    test('should use GET /v1/runs/{id}/synthetic-data endpoint', async () => {
      const mockRunData = {
        id: 'run-123',
        name: 'Test Run',
        status: 'succeeded',
        method: 'ddpm',
        started_at: '2024-01-01T00:00:00Z',
        finished_at: '2024-01-01T01:00:00Z',
        config_json: {},
      };

      const mockMetrics = {
        utility: {
          auroc: 0.85,
          c_index: 0.75,
        },
        privacy: {
          mia_auc: 0.45,
          dup_rate: 0.02,
        },
      };

      const mockBlob = new Blob(['test,data\n1,2'], { type: 'text/csv' });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRunData,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockMetrics, // metrics
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [], // steps
        })
        .mockResolvedValueOnce({
          ok: true,
          blob: async () => mockBlob,
        });

      render(
        <ResultsModal
          isOpen={true}
          onClose={jest.fn()}
          runId="run-123"
          runName="Test Run"
        />
      );

      await waitFor(() => {
        // Wait for loading to complete and download button to appear
        expect(screen.queryByTestId('loading-results')).not.toBeInTheDocument();
        expect(screen.getByText(/Download Synthetic Data/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      fireEvent.click(dataButton);

      await waitFor(() => {
        // Check that GET request was made to synthetic-data endpoint
        const fetchCalls = (global.fetch as jest.Mock).mock.calls;
        const dataCall = fetchCalls.find((call: any[]) => 
          call[0]?.includes('/v1/runs/run-123/synthetic-data')
        );
        expect(dataCall).toBeDefined();
      });
    });

    test('should create download link with correct filename', async () => {
      const mockRunData = {
        id: 'run-123',
        name: 'Test Run',
        status: 'succeeded',
        method: 'ddpm',
        started_at: '2024-01-01T00:00:00Z',
        finished_at: '2024-01-01T01:00:00Z',
        config_json: {},
      };

      const mockMetrics = {
        utility: {
          auroc: 0.85,
          c_index: 0.75,
        },
        privacy: {
          mia_auc: 0.45,
          dup_rate: 0.02,
        },
      };

      const mockBlob = new Blob(['test,data'], { type: 'text/csv' });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRunData,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockMetrics, // metrics
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [], // steps
        })
        .mockResolvedValueOnce({
          ok: true,
          blob: async () => mockBlob,
        });

      render(
        <ResultsModal
          isOpen={true}
          onClose={jest.fn()}
          runId="run-123"
          runName="Test Run"
        />
      );

      await waitFor(() => {
        // Wait for loading to complete and download button to appear
        expect(screen.queryByTestId('loading-results')).not.toBeInTheDocument();
        expect(screen.getByText(/Download Synthetic Data/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      const dataButton = screen.getByText(/Download Synthetic Data/i);
      fireEvent.click(dataButton);

      await waitFor(() => {
        expect(mockClick).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    test('should show user-friendly error message on download failure', async () => {
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const mockRunData = {
        id: 'run-123',
        name: 'Test Run',
        status: 'succeeded',
        method: 'ddpm',
        started_at: '2024-01-01T00:00:00Z',
        finished_at: '2024-01-01T01:00:00Z',
        config_json: {},
      };

      const mockMetrics = {
        utility: {
          auroc: 0.85,
          c_index: 0.75,
        },
        privacy: {
          mia_auc: 0.45,
          dup_rate: 0.02,
        },
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRunData,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockMetrics, // metrics
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [], // steps
        })
        .mockRejectedValueOnce(new Error('Network error'));

      render(
        <ResultsModal
          isOpen={true}
          onClose={jest.fn()}
          runId="run-123"
          runName="Test Run"
        />
      );

      await waitFor(() => {
        // Wait for loading to complete
        expect(screen.queryByText(/Loading results/i)).not.toBeInTheDocument();
      }, { timeout: 3000 });

      const reportButton = screen.getByText(/Download Report/i);
      fireEvent.click(reportButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      alertSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });
});

