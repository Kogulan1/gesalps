import { MappingMatrix } from "@/components/MappingMatrix";

export default function OmopDemoPage() {
  return (
    <div className="container mx-auto py-10 max-w-4xl">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Project Chimera: Visual Matrix</h1>
        <p className="text-muted-foreground">
          This is a live preview of the OMOP Semantic Mapping component using mocked production data.
        </p>
      </div>
      
      <MappingMatrix className="shadow-lg" />
      
      <div className="mt-8 p-4 bg-slate-50 border rounded-lg text-sm text-slate-600">
        <h3 className="font-semibold mb-2">Integration Note</h3>
        <p>
          This component automatically activates in the main Dashboard whenever a new dataset is uploaded 
          and the backend detects medical headers. It maps raw CSV columns to Standardized OMOP Concepts.
        </p>
      </div>
    </div>
  );
}
