export const metadata = { title: "Agent Mode" };

export default function AgentMode() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-4">
      <h1 className="text-2xl">Agent Mode</h1>
      <p>Agent Mode acts as a data scientist:</p>
      <ul className="list-disc pl-6 space-y-2">
        <li>Profiles your dataset and goal (privacy-first, balanced, utility-first).</li>
        <li>Picks GC/CTGAN/TVAE and tunes hyper-parameters.</li>
        <li>Iterates until metrics improve or converge.</li>
        <li>Produces an <strong>explainable plan</strong> in the run steps.</li>
      </ul>
      <p>You can override with <strong>Customize</strong> to pick method, sampling, and DP flags.</p>
    </div>
  );
}

