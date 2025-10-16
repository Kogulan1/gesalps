// Shared demo data constants
export const DEMO_PROJECTS = [
  {
    id: "proj-1",
    name: "Clinical Trial Alpha",
    owner_id: "user-123",
    created_at: "2024-01-15T10:30:00Z",
    datasets_count: 3,
    runs_count: 5,
    last_activity: "2 hours ago",
    status: "Active"
  },
  {
    id: "proj-2",
    name: "Synthetic Data Beta",
    owner_id: "user-123",
    created_at: "2024-01-10T14:20:00Z",
    datasets_count: 1,
    runs_count: 2,
    last_activity: "1 day ago",
    status: "Ready"
  },
  {
    id: "proj-3",
    name: "Research Project Gamma",
    owner_id: "user-123",
    created_at: "2024-01-05T09:15:00Z",
    datasets_count: 0,
    runs_count: 0,
    last_activity: "No activity yet",
    status: "Ready"
  }
];

export const DEMO_DATASETS = [
  {
    id: "ds-1",
    name: "Clinical Trial Data Alpha",
    project_id: "proj-1",
    project_name: "Clinical Trial Alpha",
    file_name: "clinical_trial_alpha.csv",
    file_size: 2048576,
    rows: 1500,
    columns: 25,
    created_at: "2024-01-15T10:30:00Z",
    last_modified: "2024-01-15T10:30:00Z",
    status: "Ready",
    runs_count: 3,
    last_run: "2 hours ago",
    runs: [
      {
        id: "run-1",
        name: "High Privacy Synthesis",
        method: "DP-GAN",
        status: "completed",
        created_at: "2 hours ago",
        privacy_level: "High"
      },
      {
        id: "run-2",
        name: "Fast Generation",
        method: "TabDDPM",
        status: "running",
        created_at: "30 min ago",
        privacy_level: "Medium"
      }
    ]
  },
  {
    id: "ds-2",
    name: "Patient Records Beta",
    project_id: "proj-2",
    project_name: "Synthetic Data Beta",
    file_name: "patient_records_beta.csv",
    file_size: 1024768,
    rows: 800,
    columns: 18,
    created_at: "2024-01-10T14:20:00Z",
    last_modified: "2024-01-10T14:20:00Z",
    status: "Ready",
    runs_count: 1,
    last_run: "1 day ago",
    runs: [
      {
        id: "run-3",
        name: "Standard Synthesis",
        method: "CTGAN",
        status: "completed",
        created_at: "1 day ago",
        privacy_level: "Low"
      }
    ]
  },
  {
    id: "ds-3",
    name: "Research Data Gamma",
    project_id: "proj-3",
    project_name: "Research Project Gamma",
    file_name: "research_data_gamma.csv",
    file_size: 512384,
    rows: 400,
    columns: 12,
    created_at: "2024-01-05T09:15:00Z",
    last_modified: "2024-01-05T09:15:00Z",
    status: "Processing",
    runs_count: 0,
    last_run: "No runs yet",
    runs: []
  }
];
