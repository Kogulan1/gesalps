import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us - Gesalp AI',
  description: 'Get in touch with our team to learn more about synthetic data solutions for healthcare.',
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-slate-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-slate-900 mb-4">
              Contact Us
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Ready to transform your healthcare data with privacy-safe synthetic datasets? 
              Let's discuss how Gesalp can accelerate your research and development.
            </p>
          </div>
        </div>
      </div>

      {/* Contact Form */}
      <div className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Information */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">
                Get in Touch
              </h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    General Inquiries
                  </h3>
                  <p className="text-slate-600">
                    hello@gesalp.ai
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    Sales & Partnerships
                  </h3>
                  <p className="text-slate-600">
                    sales@gesalp.ai
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    Technical Support
                  </h3>
                  <p className="text-slate-600">
                    support@gesalp.ai
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    Office
                  </h3>
                  <p className="text-slate-600">
                    San Francisco, CA<br />
                    United States
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">
                Send us a Message
              </h2>
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="Doe"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="john.doe@company.com"
                  />
                </div>
                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-slate-700 mb-2">
                    Company
                  </label>
                  <input
                    type="text"
                    id="company"
                    name="company"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Your Company"
                  />
                </div>
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-slate-700 mb-2">
                    Subject
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="">Select a subject</option>
                    <option value="demo">Request a Demo</option>
                    <option value="pricing">Pricing Inquiry</option>
                    <option value="partnership">Partnership Opportunity</option>
                    <option value="support">Technical Support</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-2">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Tell us about your synthetic data needs..."
                  ></textarea>
                </div>
                <button
                  type="submit"
                  className="w-full bg-red-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200"
                >
                  Send Message
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-slate-900 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Join leading healthcare organizations using Gesalp to generate 
            privacy-safe synthetic datasets for research and development.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/en/signup"
              className="inline-flex items-center px-8 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200"
            >
              Start Free Trial
            </a>
            <a
              href="/en/docs"
              className="inline-flex items-center px-8 py-3 text-white font-semibold rounded-lg hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20 transition-colors duration-200 border border-white/30 hover:border-white/50"
            >
              View Documentation
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
