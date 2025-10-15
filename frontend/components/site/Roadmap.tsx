"use client";

import Link from "next/link";

export default function Roadmap() {
  const phases = [
    {
      id: 1,
      phase: "Foundation",
      title: "Assess data sources",
      description: "Inventory OMOP/FHIR/CSV and define cohorts.",
      status: "completed",
      duration: "2-4 weeks",
      deliverables: ["Data inventory", "Cohort definitions", "Schema mapping"]
    },
    {
      id: 2,
      phase: "Foundation",
      title: "Prepare sample cohort",
      description: "De-risk schema, units, code sets (ICD/ATC/LOINC).",
      status: "completed",
      duration: "1-2 weeks",
      deliverables: ["Validated schema", "Code set mapping", "Quality checks"]
    },
    {
      id: 3,
      phase: "Development",
      title: "Train DP engine",
      description: "Auto-select model (TabDDPM/CTGAN/TVAE) with ε/δ budget.",
      status: "in-progress",
      duration: "3-6 weeks",
      deliverables: ["Model selection", "Training pipeline", "Privacy budget"]
    },
    {
      id: 4,
      phase: "Development",
      title: "Run privacy audits",
      description: "DCR/kNN, MIA advantage, k-anon/ℓ-div; gate on pass.",
      status: "pending",
      duration: "2-3 weeks",
      deliverables: ["Privacy report", "Audit results", "Compliance docs"]
    },
    {
      id: 5,
      phase: "Validation",
      title: "Validate utility",
      description: "TSTR/RTS, AUROC/AUPRC vs real; drift (KS/AD, PSI).",
      status: "pending",
      duration: "2-4 weeks",
      deliverables: ["Utility metrics", "Drift analysis", "Validation report"]
    },
    {
      id: 6,
      phase: "Validation",
      title: "Generate dataset card",
      description: "Lineage, ε/δ, audits, hash; PDF + JSON.",
      status: "pending",
      duration: "1-2 weeks",
      deliverables: ["Dataset card", "Lineage tracking", "Documentation"]
    },
    {
      id: 7,
      phase: "Deployment",
      title: "Pilot with partners",
      description: "Hospital/CRO runs on-prem/VPC; collect feedback.",
      status: "pending",
      duration: "4-8 weeks",
      deliverables: ["Pilot results", "Partner feedback", "Performance metrics"]
    },
    {
      id: 8,
      phase: "Deployment",
      title: "Publish & monitor",
      description: "Marketplace listing, usage telemetry, retrain loop.",
      status: "pending",
      duration: "Ongoing",
      deliverables: ["Marketplace listing", "Monitoring dashboard", "Retrain pipeline"]
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800 border-green-200";
      case "in-progress": return "bg-blue-100 text-blue-800 border-blue-200";
      case "pending": return "bg-slate-100 text-slate-600 border-slate-200";
      default: return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case "Foundation": return "bg-emerald-50 border-emerald-200";
      case "Development": return "bg-blue-50 border-blue-200";
      case "Validation": return "bg-amber-50 border-amber-200";
      case "Deployment": return "bg-purple-50 border-purple-200";
      default: return "bg-slate-50 border-slate-200";
    }
  };

  return (
    <section className="w-full bg-white py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">
            Our Roadmap
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            From MVP to market-ready synthetic data platform
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Main timeline line */}
          <div className="hidden lg:block absolute top-16 left-0 right-0 h-0.5 bg-slate-200"></div>
          
          {/* Timeline steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {phases.map((step, index) => (
              <div 
                key={step.id}
                className="relative group"
              >
                {/* Timeline connector */}
                <div className="hidden lg:block absolute top-16 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full z-10"></div>
                
                {/* Card */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-all duration-200 group-hover:border-red-200">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-8 h-8 bg-red-500 text-white rounded-lg flex items-center justify-center text-sm font-bold">
                      {step.id}
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(step.status)}`}>
                      {step.status === "completed" && "✓"}
                      {step.status === "in-progress" && "⟳"}
                      {step.status === "pending" && "⏳"}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                      {step.title}
                    </h3>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      {step.description}
                    </p>
                  </div>

                  {/* Phase and Duration */}
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className={`px-2 py-1 rounded ${getPhaseColor(step.phase)}`}>
                      {step.phase}
                    </span>
                    <span>{step.duration}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-12 text-center">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/contact"
              className="inline-flex items-center px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200"
              aria-label="Book a demo to get started"
            >
              Book a Demo
            </Link>
            
            <Link
              href="/docs"
              className="inline-flex items-center px-6 py-3 text-slate-600 font-medium rounded-lg hover:text-slate-900 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-colors duration-200"
              aria-label="View documentation for more information"
            >
              View Documentation
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
