"use client";

import Link from "next/link";

export default function Roadmap() {
  const steps = [
    {
      id: 1,
      title: "Assess data sources",
      description: "Inventory OMOP/FHIR/CSV and define cohorts."
    },
    {
      id: 2,
      title: "Prepare sample cohort",
      description: "De-risk schema, units, code sets (ICD/ATC/LOINC)."
    },
    {
      id: 3,
      title: "Train DP engine",
      description: "Auto-select model (TabDDPM/CTGAN/TVAE) with ε/δ budget."
    },
    {
      id: 4,
      title: "Run privacy audits",
      description: "DCR/kNN, MIA advantage, k-anon/ℓ-div; gate on pass."
    },
    {
      id: 5,
      title: "Validate utility",
      description: "TSTR/RTS, AUROC/AUPRC vs real; drift (KS/AD, PSI)."
    },
    {
      id: 6,
      title: "Generate dataset card",
      description: "Lineage, ε/δ, audits, hash; PDF + JSON."
    },
    {
      id: 7,
      title: "Pilot with partners",
      description: "Hospital/CRO runs on-prem/VPC; collect feedback."
    },
    {
      id: 8,
      title: "Publish & monitor",
      description: "Marketplace listing, usage telemetry, retrain loop."
    }
  ];

  return (
    <section className="w-full bg-white py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            Roadmap
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            How we go from MVP to market.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Desktop connecting line */}
          <div 
            className="hidden lg:block absolute top-8 left-0 right-0 h-0.5 bg-slate-200"
            aria-hidden="true"
          />
          
          {/* Timeline steps */}
          <ol 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4"
            role="list"
            aria-label="Product development roadmap"
          >
            {steps.map((step, index) => (
              <li 
                key={step.id}
                className="relative"
                role="listitem"
              >
                {/* Mobile dotted separator */}
                {index < steps.length - 1 && (
                  <div 
                    className="md:hidden absolute top-8 left-8 w-full h-px border-t-2 border-dotted border-slate-300"
                    aria-hidden="true"
                  />
                )}
                
                {/* Tablet dotted separator */}
                {index < steps.length - 1 && index % 2 === 1 && (
                  <div 
                    className="hidden md:block lg:hidden absolute top-8 left-8 w-full h-px border-t-2 border-dotted border-slate-300"
                    aria-hidden="true"
                  />
                )}

                <div className="flex items-start space-x-4">
                  {/* Numbered badge */}
                  <div 
                    className="flex-shrink-0 w-16 h-16 bg-red-600 text-white rounded-full flex items-center justify-center text-lg font-bold shadow-sm"
                    aria-label={`Step ${step.id}`}
                  >
                    {step.id}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-2">
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                      {step.title}
                    </h3>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* CTA Section */}
        <div className="mt-16 pt-8 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <p className="text-lg text-slate-900 font-medium">
                Ready to run a pilot?
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link
                href="/contact"
                className="inline-flex items-center px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200 min-h-[44px] justify-center"
                aria-label="Book a demo to get started"
              >
                Book a demo
              </Link>
              
              <Link
                href="/docs"
                className="inline-flex items-center px-6 py-3 text-slate-600 font-medium rounded-lg hover:text-slate-900 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-colors duration-200 min-h-[44px] justify-center"
                aria-label="View documentation for more information"
              >
                View documentation
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
