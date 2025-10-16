'use client';

import { useState } from 'react';
import { Metadata } from 'next';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [generatedEmail, setGeneratedEmail] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const subject = `Contact Form: ${formData.subject || 'General Inquiry'}`;
      const body = `
Name: ${formData.firstName} ${formData.lastName}
Email: ${formData.email}
Company: ${formData.company}
Subject: ${formData.subject}

Message:
${formData.message}
      `;

      // Generate the email content for display
      const emailContent = `To: info@gesalpai.ch
Subject: ${subject}

${body}`;
      
      setGeneratedEmail(emailContent);
      setSubmitStatus('success');
      
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        company: '',
        subject: '',
        message: '',
      });
    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedEmail);
      alert('Email content copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };
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
                    Contact Email
                  </h3>
                  <p className="text-slate-600">
                    info@gesalpai.ch
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    Business Address
                  </h3>
                  <p className="text-slate-600">
                    Kogulan Natarajan<br />
                    Business Domiciliation<br />
                    6 rue d'Armaillé, 75017 Paris<br />
                    France
                  </p>
                  <p className="text-sm text-slate-500 mt-2">
                    Registered business address via Les Tricolores
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">
                Send us a Message
              </h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                {submitStatus === 'success' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <p className="text-green-800 text-sm mb-3 font-medium">
                      ✅ Thank you! Your message has been prepared. Please copy the email below and send it to info@gesalpai.ch
                    </p>
                    
                    <div className="bg-white border border-green-200 rounded-lg p-3 mb-3">
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                        {generatedEmail}
                      </pre>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={copyToClipboard}
                        className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 transition-colors"
                      >
                        📋 Copy Email
                      </button>
                      <a 
                        href="mailto:info@gesalpai.ch" 
                        className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition-colors inline-block"
                      >
                        📧 Open Email Client
                      </a>
                    </div>
                  </div>
                )}
                
                {submitStatus === 'error' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <p className="text-red-800 text-sm">
                      There was an error preparing your message. Please try again.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="Doe"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
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
                    value={formData.company}
                    onChange={handleChange}
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
                    value={formData.subject}
                    onChange={handleChange}
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
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={4}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Tell us about your synthetic data needs..."
                  ></textarea>
                </div>
                <div className="space-y-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-red-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ color: 'white' }}
                  >
                    {isSubmitting ? 'Preparing Message...' : 'Send Message'}
                  </button>
                  
                  <div className="text-center">
                    <p className="text-sm text-slate-500 mb-2">Or send directly to:</p>
                    <a 
                      href="mailto:info@gesalpai.ch" 
                      className="text-red-600 hover:text-red-700 font-medium text-sm underline"
                    >
                      info@gesalpai.ch
                    </a>
                  </div>
                </div>
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
              style={{ color: 'white' }}
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
