export const metadata = { title: "Documentation" };

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
      <h1 className="text-2xl font-semibold">Gesalps Docs</h1>
      <p>Welcome! This guide covers how to generate clinical-grade synthetic tabular data with measurable privacy and utility.</p>
      <h2 className="text-xl mt-6">Quick links</h2>
      <ul className="list-disc pl-6 space-y-2">
        <li><a href="./getting-started">Getting Started</a></li>
        <li><a href="./methods">Methods</a></li>
        <li><a href="./metrics">Metrics</a></li>
        <li><a href="./agent-mode">Agent Mode</a></li>
        <li><a href="./security">Security & Privacy</a></li>
        <li><a href="./api">API</a></li>
        <li><a href="./pricing-limits">Pricing & Limits</a></li>
        <li><a href="./roadmap">Roadmap</a></li>
      </ul>
    </div>
  );
}
