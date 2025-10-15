"use client";

import Link from "next/link";

export default function Roadmap() {
  const milestones = [
    {
      id: 1,
      title: "Assess data sources",
      description: "Inventory OMOP/FHIR/CSV and define cohorts.",
      status: "completed"
    },
    {
      id: 2,
      title: "Prepare sample cohort",
      description: "De-risk schema, units, code sets (ICD/ATC/LOINC).",
      status: "completed"
    },
    {
      id: 3,
      title: "Train DP engine",
      description: "Auto-select model (TabDDPM/CTGAN/TVAE) with ε/δ budget.",
      status: "in-progress"
    },
    {
      id: 4,
      title: "Run privacy audits",
      description: "DCR/kNN, MIA advantage, k-anon/ℓ-div; gate on pass.",
      status: "pending"
    },
    {
      id: 5,
      title: "Validate utility",
      description: "TSTR/RTS, AUROC/AUPRC vs real; drift (KS/AD, PSI).",
      status: "pending"
    },
    {
      id: 6,
      title: "Generate dataset card",
      description: "Lineage, ε/δ, audits, hash; PDF + JSON.",
      status: "pending"
    },
    {
      id: 7,
      title: "Pilot with partners",
      description: "Hospital/CRO runs on-prem/VPC; collect feedback.",
      status: "pending"
    },
    {
      id: 8,
      title: "Publish & monitor",
      description: "Marketplace listing, usage telemetry, retrain loop.",
      status: "pending"
    }
  ];

  return (
    <section className="w-full bg-white py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">
            How we'll maintain and extend our product advantage
          </h2>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Main timeline line */}
          <div className="hidden lg:block absolute top-12 left-0 right-0 h-1 bg-slate-300"></div>
          
          {/* Timeline steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {milestones.map((milestone, index) => (
              <div 
                key={milestone.id}
                className="relative group text-center"
              >
                {/* Timeline connector */}
                <div className={`hidden lg:block absolute top-12 left-1/2 transform -translate-x-1/2 w-4 h-4 rounded-full z-10 ${
                  milestone.status === "completed" ? "bg-red-500" : "bg-red-300"
                }`}></div>
                
                {/* Card */}
                <div className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-all duration-200">
                  {/* Number */}
                  <div className={`w-8 h-8 text-white rounded-full flex items-center justify-center text-sm font-bold mx-auto mb-4 ${
                    milestone.status === "completed" ? "bg-red-500" : "bg-red-300"
                  }`}>
                    {milestone.id}
                  </div>

                  {/* Content */}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                      {milestone.title}
                    </h3>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      {milestone.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/en/contact"
              className="inline-flex items-center px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200"
              aria-label="Book a demo to get started"
            >
              Book a Demo
            </Link>
            
            <Link
              href="/en/docs"
              className="inline-flex items-center px-6 py-3 text-slate-900 font-medium rounded-lg hover:text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-colors duration-200 border border-slate-300"
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
