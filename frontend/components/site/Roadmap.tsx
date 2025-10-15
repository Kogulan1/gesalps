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
    <section className="w-full bg-gradient-to-br from-slate-50 via-white to-slate-50 py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-red-50 text-red-700 text-sm font-medium rounded-full mb-6">
            <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
            Product Roadmap
          </div>
          <h2 className="text-4xl font-bold text-slate-900 mb-6">
            From MVP to Market
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            A comprehensive journey through our product development lifecycle, 
            designed to deliver clinical-grade synthetic data with enterprise-level 
            privacy and utility guarantees.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Main timeline line */}
          <div className="hidden lg:block absolute top-20 left-0 right-0 h-1 bg-gradient-to-r from-red-200 via-red-300 to-red-200 rounded-full"></div>
          
          {/* Phase indicators */}
          <div className="hidden lg:flex justify-between mb-12">
            {["Foundation", "Development", "Validation", "Deployment"].map((phase, index) => (
              <div key={phase} className="text-center">
                <div className={`w-20 h-20 rounded-2xl ${getPhaseColor(phase)} border-2 flex items-center justify-center mb-3`}>
                  <span className="text-xs font-bold text-slate-700">{phase}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Timeline steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {phases.map((step, index) => (
              <div 
                key={step.id}
                className="relative group"
              >
                {/* Timeline connector */}
                <div className="hidden lg:block absolute top-20 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white border-4 border-red-500 rounded-full z-10"></div>
                
                {/* Card */}
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 hover:shadow-2xl transition-all duration-300 group-hover:scale-105 group-hover:border-red-200">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl flex items-center justify-center text-lg font-bold shadow-lg">
                      {step.id}
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(step.status)}`}>
                      {step.status === "completed" && "✓ Completed"}
                      {step.status === "in-progress" && "⟳ In Progress"}
                      {step.status === "pending" && "⏳ Pending"}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-slate-900 mb-3">
                      {step.title}
                    </h3>
                    <p className="text-slate-600 leading-relaxed">
                      {step.description}
                    </p>
                  </div>

                  {/* Phase and Duration */}
                  <div className="flex items-center justify-between mb-4">
                    <span className={`px-3 py-1 rounded-lg text-xs font-medium ${getPhaseColor(step.phase)}`}>
                      {step.phase}
                    </span>
                    <span className="text-sm text-slate-500 font-medium">{step.duration}</span>
                  </div>

                  {/* Progress indicator */}
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${
                        step.status === "completed" ? "bg-green-500 w-full" :
                        step.status === "in-progress" ? "bg-blue-500 w-2/3" :
                        "bg-slate-300 w-0"
                      }`}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center">
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-12">
            <h3 className="text-3xl font-bold text-white mb-4">
              Ready to accelerate your synthetic data journey?
            </h3>
            <p className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto">
              Join leading healthcare organizations already using Gesalp to generate 
              privacy-safe, utility-rich synthetic datasets for research and development.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/contact"
                className="inline-flex items-center px-8 py-4 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-500/50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                aria-label="Book a demo to get started"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Schedule a Demo
              </Link>
              
              <Link
                href="/docs"
                className="inline-flex items-center px-8 py-4 text-white font-semibold rounded-xl hover:bg-white/10 focus:outline-none focus:ring-4 focus:ring-white/20 transition-all duration-200 border border-white/20 hover:border-white/40"
                aria-label="View documentation for more information"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                View Documentation
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
