export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white text-black relative">
      {/* Background gradient - subtle like hero */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-50" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#E0342C]/5 via-transparent to-transparent" />
      
      {/* Grid pattern - subtle like hero */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]" />
      
      <div className="relative mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-2xl font-semibold text-black">Privacy Policy</h1>
        <p className="mt-4 text-gray-600">
          GESALP AI respects your privacy. This placeholder outlines data handling and GDPR/FADP alignment. Replace with your policy.
        </p>
        <p className="mt-2 text-gray-600">
          We process only what is necessary to operate the service and never sell your data.
        </p>
      </div>
    </div>
  );
}
