'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { ClientOnly } from '@/components/auth/ClientOnly';
import { LoadingPage } from '@/components/ui/LoadingPage';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Wand2, 
  Scissors, 
  Zap, 
  ArrowRight, 
  Check, 
  Sparkles,
  Upload,
  Download,
  Palette,
  Users,
  Star,
  ChevronRight,
  Play,
  Layers,
  Shield,
  Clock,
  CreditCard
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { user, loading, initialize } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'upscale' | 'background' | 'vectorize'>('upscale');

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [loading, user, router]);

  if (loading) {
    return <LoadingPage message="Loading..." />;
  }

  if (user) {
    return null;
  }

  const features = [
    {
      id: 'generate',
      title: 'AI Design Generation',
      description: 'Create unique shirt designs from text prompts or reference images',
      icon: Sparkles,
      color: 'purple',
      benefits: ['Custom designs from text', 'Upload & reimagine', 'Endless creativity']
    },
    {
      id: 'upscale',
      title: 'AI Upscaling',
      description: 'Transform low-resolution images into crystal-clear, print-ready artwork',
      icon: Wand2,
      color: 'blue',
      benefits: ['4K resolution', 'Enhanced details', 'No quality loss']
    },
    {
      id: 'background',
      title: 'Background Removal',
      description: 'Perfect cutouts every time with AI-powered edge detection',
      icon: Scissors,
      color: 'green',
      benefits: ['Precise edges', 'Hair & fur detection', 'Transparent PNG']
    },
    {
      id: 'vectorize',
      title: 'Smart Vectorization',
      description: 'Convert any image to scalable vectors for unlimited sizing',
      icon: Zap,
      color: 'orange',
      benefits: ['SVG format', 'Infinite scaling', 'Perfect for vinyl']
    }
  ];

  const stats = [
    { value: '58M+', label: 'Images Processed' },
    { value: '11TB+', label: 'Data Handled' },
    { value: '142M+', label: 'Downloads' },
    { value: '5M+', label: 'Happy Printers' }
  ];

  return (
    <ClientOnly fallback={<LoadingPage message="Initializing..." />}>
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="pt-20 pb-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#E88B4B]/10 text-[#E88B4B] text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4 mr-2" />
                NEW: Create custom DTF designs with AI - from text or upload reference images!
                <a href="#generate" className="ml-2 text-[#E88B4B] font-semibold">Learn more →</a>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
                Fix Dull, Low-Res Art into
                <span className="text-[#366494]"> Transfer-Ready Files</span>
                <span className="block text-4xl md:text-5xl mt-2">In Seconds</span>
              </h1>
              
              <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
                Upscale 1–4× with AI, remove backgrounds flawlessly, and export true 300 DPI PNGs—no design skills required.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <Link href="/auth/signup">
                  <Button size="lg" className="text-lg px-8 py-6 bg-[#366494] hover:bg-[#233E5C] text-white">
                    Sign Up & Get 2 Free Credits
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link href="#pricing">
                  <Button variant="outline" size="lg" className="text-lg px-8 py-6 group">
                    See Plans & Pricing
                    <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
              
              <p className="text-sm text-gray-500">No credit card required • 2 free credits to start</p>
            </div>

            {/* Trust Indicators */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20 pb-10 border-b border-gray-100">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-sm text-gray-600 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Visual Demo Section */}
        <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                See the Magic in Action
              </h2>
              <p className="text-xl text-gray-600">
                Transform your images with one click. Perfect results, every time.
              </p>
            </div>

            {/* Interactive Feature Tabs */}
            <div className="flex justify-center mb-8">
              <div className="inline-flex bg-gray-100 rounded-lg p-1">
                {features.map((feature) => (
                  <button
                    key={feature.id}
                    onClick={() => setActiveTab(feature.id as any)}
                    className={`px-6 py-3 rounded-lg font-medium transition-all ${
                      activeTab === feature.id 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {feature.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Before/After Showcase */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="relative">
                  <div className="absolute top-4 left-4 z-10 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                    Before
                  </div>
                  <div className="bg-gray-100 rounded-lg h-96 flex items-center justify-center">
                    <span className="text-gray-400">Low Quality Image</span>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute top-4 left-4 z-10 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                    After
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg h-96 flex items-center justify-center">
                    <span className="text-gray-600 font-medium">HD Print-Ready Result</span>
                  </div>
                </div>
              </div>
              
              {/* Feature Benefits */}
              <div className="mt-8 flex flex-wrap gap-4 justify-center">
                {features.find(f => f.id === activeTab)?.benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center bg-gray-50 px-4 py-2 rounded-lg">
                    <Check className="w-5 h-5 text-green-500 mr-2" />
                    <span className="text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Why Choose DTF Editor */}
        <section id="features" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Why Choose DTF Editor?
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                The only tool built specifically for DTF printing businesses
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-2xl transition-shadow">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-6">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Instant Processing</h3>
                <p className="text-gray-600">
                  No waiting, no queues. Get your files in seconds, not hours.
                </p>
              </div>

              <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-2xl transition-shadow">
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-6">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">100% Print-Ready Guarantee</h3>
                <p className="text-gray-600">
                  Every file is optimized for DTF printing. Perfect results, every time.
                </p>
              </div>

              <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-2xl transition-shadow">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-6">
                  <CreditCard className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Save $1000s Monthly</h3>
                <p className="text-gray-600">
                  Replace expensive design software and freelancers with AI-powered tools.
                </p>
              </div>
            </div>

            {/* All Features Grid */}
            <div className="mt-16">
              <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">All Features Included</h3>
              <div className="grid md:grid-cols-4 gap-8">
                {features.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <div key={feature.id} className="group hover:scale-105 transition-transform duration-300">
                      <div className="bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-colors">
                        <div className={`w-12 h-12 bg-gradient-to-br from-${feature.color}-500 to-${feature.color}-600 rounded-lg flex items-center justify-center mb-4`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <h4 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h4>
                        <p className="text-sm text-gray-600">{feature.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-20 bg-gradient-to-b from-gray-50 to-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                How It Works
              </h2>
              <p className="text-xl text-gray-600">
                Transform your designs in 3 simple steps
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="relative">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Upload className="w-10 h-10 text-blue-600" />
                  </div>
                  <div className="absolute top-10 right-0 md:right-[-40px] hidden md:block">
                    <ChevronRight className="w-8 h-8 text-gray-300" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Step 1: Upload</h3>
                <p className="text-gray-600">
                  Upload any JPG, PNG, or SVG—even screenshots.
                </p>
              </div>

              <div className="text-center">
                <div className="relative">
                  <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Wand2 className="w-10 h-10 text-purple-600" />
                  </div>
                  <div className="absolute top-10 right-0 md:right-[-40px] hidden md:block">
                    <ChevronRight className="w-8 h-8 text-gray-300" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Step 2: Enhance</h3>
                <p className="text-gray-600">
                  Enhance with AI upscaling & background removal; optional vector clean-up.
                </p>
              </div>

              <div className="text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Download className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Step 3: Export</h3>
                <p className="text-gray-600">
                  Export a transparent, true-size 300 DPI PNG (or SVG) ready for production.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pain Points & Solutions */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                  Stop Struggling with Low-Quality Images
                </h2>
                <div className="space-y-6">
                  <div className="flex items-start">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-red-600 font-bold">✕</span>
                    </div>
                    <div className="ml-4">
                      <h4 className="font-semibold text-gray-900">Pixelated prints from small images</h4>
                      <p className="text-gray-600">Customer logos come in tiny, unusable sizes</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-red-600 font-bold">✕</span>
                    </div>
                    <div className="ml-4">
                      <h4 className="font-semibold text-gray-900">Hours wasted removing backgrounds</h4>
                      <p className="text-gray-600">Manual cutouts are tedious and imperfect</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-red-600 font-bold">✕</span>
                    </div>
                    <div className="ml-4">
                      <h4 className="font-semibold text-gray-900">Rejected orders due to poor quality</h4>
                      <p className="text-gray-600">Losing customers and reputation</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-[#366494]/10 to-[#E88B4B]/10 rounded-2xl p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">
                  DTF Editor Solves Everything
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <Check className="w-6 h-6 text-green-500 mr-3" />
                    <span className="text-gray-700">Transform any image to HD quality</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-6 h-6 text-green-500 mr-3" />
                    <span className="text-gray-700">Perfect cutouts in one click</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-6 h-6 text-green-500 mr-3" />
                    <span className="text-gray-700">Print-ready files guaranteed</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-6 h-6 text-green-500 mr-3" />
                    <span className="text-gray-700">Happy customers, 5-star reviews</span>
                  </div>
                </div>
                <Link href="/auth/signup">
                  <Button className="w-full mt-8 bg-[#366494] hover:bg-[#233E5C] text-white">
                    Fix Your Images Now
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Trusted by DTF Printing Professionals
              </h2>
              <p className="text-xl text-gray-600">
                Join thousands of print shops improving their quality
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white rounded-xl p-8 shadow-lg">
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6">
                  &quot;DTF Editor saved my business. I can now accept any logo, no matter the quality, 
                  and deliver perfect prints. My customers are amazed!&quot;
                </p>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gray-200 rounded-full mr-4"></div>
                  <div>
                    <p className="font-semibold text-gray-900">Sarah Johnson</p>
                    <p className="text-sm text-gray-600">Custom Prints Co.</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-8 shadow-lg">
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6">
                  &quot;The background removal is incredible. What used to take me 30 minutes 
                  now takes 30 seconds. I&apos;ve tripled my output!&quot;
                </p>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gray-200 rounded-full mr-4"></div>
                  <div>
                    <p className="font-semibold text-gray-900">Mike Chen</p>
                    <p className="text-sm text-gray-600">T-Shirt Empire</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-8 shadow-lg">
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6">
                  &quot;The AI upscaling is magic. I can take phone photos and turn them into 
                  billboard-quality prints. Game changer!&quot;
                </p>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gray-200 rounded-full mr-4"></div>
                  <div>
                    <p className="font-semibold text-gray-900">Lisa Martinez</p>
                    <p className="text-sm text-gray-600">Quick Print Solutions</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Choose Your Plan
              </h2>
              <p className="text-xl text-gray-600">
                Start with 2 free credits. Upgrade anytime.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {/* Free Plan */}
              <div className="bg-white rounded-xl p-8 border-2 border-gray-200">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Free Forever</h3>
                <p className="text-gray-600 mb-6">Test the waters</p>
                <div className="text-4xl font-bold text-gray-900 mb-6">
                  $0<span className="text-lg font-normal text-gray-600">/month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span className="text-gray-700">2 credits monthly</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span className="text-gray-700">All AI tools access</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span className="text-gray-700">48-hour file storage</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span className="text-gray-700">Basic support</span>
                  </li>
                </ul>
                <Link href="/auth/signup">
                  <Button variant="outline" className="w-full">Start Free</Button>
                </Link>
              </div>

              {/* Hobbyist Plan */}
              <div className="bg-white rounded-xl p-8 border-2 border-gray-200">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Hobbyist</h3>
                <p className="text-gray-600 mb-6">Side hustlers</p>
                <div className="text-4xl font-bold text-gray-900 mb-6">
                  $9.99<span className="text-lg font-normal text-gray-600">/month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span className="text-gray-700">20 credits monthly</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span className="text-gray-700">2-month credit rollover</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span className="text-gray-700">90-day file storage</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span className="text-gray-700">Email support</span>
                  </li>
                </ul>
                <Link href="/auth/signup">
                  <Button variant="outline" className="w-full">Get Started</Button>
                </Link>
              </div>

              {/* Business Plan - Most Popular */}
              <div className="bg-gradient-to-br from-[#366494]/5 to-[#E88B4B]/5 rounded-xl p-8 border-2 border-[#366494] relative">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-[#E88B4B] text-white px-4 py-1 rounded-full text-sm font-medium">
                    BEST VALUE
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Business</h3>
                <p className="text-gray-600 mb-6">Full-time printers</p>
                <div className="text-4xl font-bold text-gray-900 mb-6">
                  $24.99<span className="text-lg font-normal text-gray-600">/month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span className="text-gray-700 font-semibold">60 credits monthly</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span className="text-gray-700">2-month credit rollover</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span className="text-gray-700">Permanent file storage</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span className="text-gray-700">Priority support</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span className="text-gray-700">Batch processing</span>
                  </li>
                </ul>
                <Link href="/auth/signup">
                  <Button className="w-full bg-[#366494] hover:bg-[#233E5C] text-white">
                    Start 7-Day Trial
                  </Button>
                </Link>
              </div>
            </div>

            {/* Need More Credits */}
            <div className="mt-16 bg-gray-50 rounded-2xl p-8 text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Need More Credits?</h3>
              <p className="text-gray-600 mb-6">Buy credit packs anytime. No subscription required.</p>
              <div className="flex justify-center gap-6 mb-8">
                <div className="bg-white rounded-lg px-6 py-4 shadow-sm">
                  <span className="font-bold text-xl">10 Credits</span>
                  <span className="text-gray-600 ml-2">$7.99</span>
                  <div className="text-xs text-gray-500 mt-1">$0.80 per credit</div>
                </div>
                <div className="bg-white rounded-lg px-6 py-4 shadow-sm border-2 border-[#E88B4B]">
                  <span className="font-bold text-xl">20 Credits</span>
                  <span className="text-gray-600 ml-2">$14.99</span>
                  <div className="text-xs text-green-600 font-semibold mt-1">$0.75 per credit - Save 6%</div>
                </div>
                <div className="bg-white rounded-lg px-6 py-4 shadow-sm">
                  <span className="font-bold text-xl">50 Credits</span>
                  <span className="text-gray-600 ml-2">$29.99</span>
                  <div className="text-xs text-green-600 font-semibold mt-1">$0.60 per credit - Save 25%</div>
                </div>
              </div>
              <p className="text-sm text-gray-500">Credits never expire • Use across all tools • Instant delivery</p>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-20 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-xl text-gray-600">
                Everything you need to know about DTF Editor
              </p>
            </div>

            <div className="space-y-8">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-3">
                  What file formats can I upload?
                </h3>
                <p className="text-gray-600">
                  We accept JPG, PNG, SVG, and even screenshots. Our AI handles virtually any image format and optimizes it for DTF printing.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-3">
                  What's the difference between upscaling and vectorization?
                </h3>
                <p className="text-gray-600">
                  Upscaling uses AI to increase resolution while maintaining raster format (PNG/JPG), perfect for photos and detailed artwork. Vectorization converts to SVG format for infinite scaling, ideal for logos and simple graphics.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-3">
                  Are my processed files print-ready?
                </h3>
                <p className="text-gray-600">
                  Yes! Every file is optimized specifically for DTF printing with proper transparency, 300 DPI resolution, and correct color profiles. Just download and print.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-3">
                  How do credits work?
                </h3>
                <p className="text-gray-600">
                  Each AI processing operation uses 1 credit. Free accounts get 2 credits monthly. Paid plans include 20-60 monthly credits with 2-month rollover. Need more? Buy credit packs anytime.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-3">
                  Can I cancel my subscription anytime?
                </h3>
                <p className="text-gray-600">
                  Absolutely! Cancel anytime from your dashboard. You'll keep access until the end of your billing period, and any remaining credits stay valid for 2 months.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-3">
                  Do you offer bulk or enterprise pricing?
                </h3>
                <p className="text-gray-600">
                  Yes! For print shops processing 100+ images monthly, we offer custom plans with volume discounts, API access, and dedicated support. Contact us for details.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 bg-gradient-to-br from-[#366494] to-[#233E5C]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Stop Losing Orders to Poor Quality
            </h2>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Start delivering flawless DTF transfers that wow your customers. Try it free today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/signup">
                <Button size="lg" className="bg-[#E88B4B] text-white hover:bg-[#d67a3a] px-8 py-3 shadow-lg">
                  Start Free with 2 Credits
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="#pricing">
                <Button size="lg" variant="outline" className="text-white border-white/50 hover:bg-white/10 px-8 py-3">
                  View Pricing
                  <ChevronRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>
            <p className="text-white/70 mt-8 text-sm">
              No credit card • 2 free credits • Cancel anytime
            </p>
            
            {/* Trust badges */}
            <div className="mt-12 flex justify-center items-center gap-8 text-white/60">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                <span className="text-sm">SSL Secured</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <span className="text-sm">24/7 Support</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                <span className="text-sm">5M+ Users</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </ClientOnly>
  );
}