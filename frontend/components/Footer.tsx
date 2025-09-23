import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-neutral-200 dark:border-neutral-800 py-12">
      <div className="mx-auto max-w-6xl px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        <div className="col-span-2 md:col-span-1">
          <div className="text-lg font-semibold">GESALP AI</div>
          <p className="text-neutral-500 mt-2">Synthetic data for clinical trials.</p>
        </div>
        <div>
          <div className="font-medium mb-2">Product</div>
          <ul className="space-y-1 text-neutral-600 dark:text-neutral-300">
            <li><a href="#product">Overview</a></li>
            <li><a href="#pricing">Pricing</a></li>
            <li><a id="docs" href="#docs">Docs</a></li>
          </ul>
        </div>
        <div>
          <div className="font-medium mb-2">Company</div>
          <ul className="space-y-1 text-neutral-600 dark:text-neutral-300">
            <li><a href="mailto:sales@example.com">Contact</a></li>
            <li><a href="#">Blog</a></li>
          </ul>
        </div>
        <div>
          <div className="font-medium mb-2">Legal</div>
          <ul className="space-y-1 text-neutral-600 dark:text-neutral-300">
            <li><Link href="/privacy">Privacy</Link></li>
            <li><Link href="/terms">Terms</Link></li>
          </ul>
          <div className="mt-4 text-neutral-500">© {new Date().getFullYear()} GESALP AI</div>
        </div>
      </div>
    </footer>
  );
}
