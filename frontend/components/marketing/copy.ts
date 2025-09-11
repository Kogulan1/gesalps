export const copy = {
  brand: "Gesalps",
  hero: {
    title: "Clinical-grade synthetic data, on demand.",
    subtitle:
      "Generate trial-grade tabular datasets with measurable privacy and utility. Built for sponsors, CROs, and AI teams.",
    ctaPrimary: "Get started free",
    ctaSecondary: "View docs",
  },
  logos: ["Helvetia Health", "Alpine CRO", "ETH Labs", "Geneva MedAI"],
  highlights: [
    {
      title: "Trial-aware synthesis",
      desc:
        "CTGAN/TVAE/Gaussian Copula today; diffusion & transformers next. Survival/censoring aware.",
    },
    {
      title: "Privacy–Utility reports",
      desc:
        "KS, correlation Δ, AUROC/C-Index (if labels present), MIA AUC, optional DP budget and linkage risk.",
    },
    {
      title: "Agent data scientist",
      desc:
        "Default agent mode selects model, tunes hyper-params, and iterates to meet your goal (privacy-first, balanced, utility-first).",
    },
    {
      title: "Compliance by design",
      desc:
        "Exportable audit PDF with GDPR/FADP/HIPAA checklist, thresholds, and reproducible metadata.",
    },
  ],
  how: [
    { title: "Upload CSV", desc: "Securely upload or connect your source table." },
    { title: "Click Start", desc: "Agent picks method and tuning. Optional: customize." },
    { title: "Evaluate", desc: "See privacy/utility metrics in real time." },
    { title: "Download", desc: "Export synthetic CSV + audit PDF." },
  ],
  pricing: {
    tiers: [
      {
        name: "Research",
        price: "Free",
        features: [
          "1 project",
          "≤ 5k rows",
          "GC/CTGAN",
          "Basic privacy–utility report",
        ],
        cta: "Get started",
      },
      {
        name: "Starter",
        price: "$199/mo",
        features: [
          "5 projects",
          "GC/CTGAN/TVAE",
          "Full utility metrics",
          "Email support",
        ],
        cta: "Choose Plan",
      },
      {
        name: "Pharma",
        price: "$2,000/mo",
        features: [
          "Unlimited projects",
          "Diffusion + DP (when enabled)",
          "Full privacy suite + audit PDF",
          "SSO & on-prem option",
        ],
        cta: "Contact Sales",
      },
    ],
  },
  roadmap: {
    near: [
      "DP-SGD trainers (CTGAN/TVAE) or DP-capable backends",
      "Auto-benchmark + auto-select across GC/CTGAN/TVAE",
      "Agent explanations & reproducibility bundle",
    ],
    next: [
      "Diffusion & transformer tabular generators",
      "Fairness metrics & mitigation (minority coverage)",
      "Time-series & survival modeling enhancements",
    ],
    later: [
      "Federated synthesis (hospital-local training)",
      "Multimodal tabular+text+imaging",
      "Regulatory templates (FDA/EMA submissions)",
    ],
  },
  faq: [
    {
      q: "How is data privacy ensured?",
      a: "We assess MIA AUC, record linkage risk, and optional Differential Privacy ε/δ. Synthetic rows are generated from learned distributions—not copies—and exact-row duplicates are flagged.",
    },
    {
      q: "Where is the platform hosted?",
      a: "Local Docker for dev, with cloud deployment options. Storage uses private buckets; row-level security enforced in the database.",
    },
    {
      q: "Do you support Differential Privacy?",
      a: "Yes—configurable DP is on the roadmap. When DP-capable trainers are present, you can set ε and strict/fallback behavior. Audit PDF records the effective DP settings.",
    },
    {
      q: "Is there an on-prem option?",
      a: "Yes. We support air-gapped or VPC deployments with SSO, subject to enterprise plan terms.",
    },
    {
      q: "What support options are available?",
      a: "Email for Starter, dedicated Slack & DPA for Pharma. Professional services available for validation studies.",
    },
  ],
};

