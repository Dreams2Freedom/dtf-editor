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
      color: 'purple',
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
        {/* Navigation */}
        <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-lg border-b border-gray-100 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-8">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg"></div>
                  <span className="font-bold text-xl">DTF Editor</span>
                </div>
                <div className="hidden md:flex space-x-6">
                  <a href="#features" className="text-gray-600 hover:text-gray-900 text-sm font-medium">Features</a>
                  <a href="#how-it-works" className="text-gray-600 hover:text-gray-900 text-sm font-medium">How it Works</a>
                  <a href="#pricing" className="text-gray-600 hover:text-gray-900 text-sm font-medium">Pricing</a>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Link href="/auth/login">
                  <Button variant="ghost" size="sm">Login</Button>
                </Link>
                <Link href="/auth/signup">
                  <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                    Start Free Trial
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4 mr-2" />
                New Launch: AI Editor - Edit your images with AI magic by simply typing a prompt!
                <a href="#" className="ml-2 text-purple-600 font-semibold">Try it now →</a>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
                AI Studio for 
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600"> DTF Printing</span>
              </h1>
              
              <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
                Transform any image into print-ready DTF transfers in seconds. 
                Professional-grade AI tools that ensure perfect prints every time - 
                no design experience needed.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <Link href="/auth/signup">
                  <Button size="lg" className="text-lg px-8 py-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                    Start Creating Now
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Button variant="outline" size="lg" className="text-lg px-8 py-6 group">
                  <Play className="mr-2 w-5 h-5 group-hover:text-blue-600" />
                  Watch Demo
                </Button>
              </div>
              
              <p className="text-sm text-gray-500">No credit card required • 2 free credits monthly</p>
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

        {/* Features Grid */}
        <section id="features" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Everything You Need for Perfect DTF Transfers
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Professional tools designed specifically for DTF printing businesses
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.id} className="group hover:scale-105 transition-transform duration-300">
                    <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-2xl transition-shadow">
                      <div className={`w-14 h-14 bg-gradient-to-br from-${feature.color}-500 to-${feature.color}-600 rounded-xl flex items-center justify-center mb-6`}>
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                      <p className="text-gray-600 mb-6">{feature.description}</p>
                      <ul className="space-y-2">
                        {feature.benefits.map((benefit, idx) => (
                          <li key={idx} className="flex items-center text-gray-700">
                            <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-20 bg-gradient-to-b from-gray-50 to-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Start Printing in 3 Simple Steps
              </h2>
              <p className="text-xl text-gray-600">
                No learning curve. Just upload, process, and print.
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
                <h3 className="text-xl font-bold text-gray-900 mb-3">1. Upload Your Image</h3>
                <p className="text-gray-600">
                  Drag and drop any image format. Our AI handles PNG, JPG, SVG, and more.
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
                <h3 className="text-xl font-bold text-gray-900 mb-3">2. AI Processing</h3>
                <p className="text-gray-600">
                  Choose your tool and watch AI transform your image in seconds.
                </p>
              </div>

              <div className="text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Download className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">3. Download & Print</h3>
                <p className="text-gray-600">
                  Get your print-ready file instantly. Perfect for DTF printing every time.
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

              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8">
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
                  <Button className="w-full mt-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
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
                  "DTF Editor saved my business. I can now accept any logo, no matter the quality, 
                  and deliver perfect prints. My customers are amazed!"
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
                  "The background removal is incredible. What used to take me 30 minutes 
                  now takes 30 seconds. I've tripled my output!"
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
                  "The AI upscaling is magic. I can take phone photos and turn them into 
                  billboard-quality prints. Game changer!"
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
                Simple, Transparent Pricing
              </h2>
              <p className="text-xl text-gray-600">
                Start free, upgrade when you need more
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {/* Free Plan */}
              <div className="bg-white rounded-xl p-8 border-2 border-gray-200">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Free</h3>
                <p className="text-gray-600 mb-6">Perfect to get started</p>
                <div className="text-4xl font-bold text-gray-900 mb-6">
                  $0<span className="text-lg font-normal text-gray-600">/month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span className="text-gray-700">2 credits per month</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span className="text-gray-700">All AI tools</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span className="text-gray-700">48-hour storage</span>
                  </li>
                </ul>
                <Link href="/auth/signup">
                  <Button variant="outline" className="w-full">Get Started</Button>
                </Link>
              </div>

              {/* Popular Plan */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-8 border-2 border-blue-500 relative">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Starter</h3>
                <p className="text-gray-600 mb-6">For growing businesses</p>
                <div className="text-4xl font-bold text-gray-900 mb-6">
                  $29<span className="text-lg font-normal text-gray-600">/month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span className="text-gray-700">100 credits per month</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span className="text-gray-700">Unlimited storage</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span className="text-gray-700">Priority processing</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span className="text-gray-700">Email support</span>
                  </li>
                </ul>
                <Link href="/auth/signup">
                  <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                    Start Free Trial
                  </Button>
                </Link>
              </div>

              {/* Pro Plan */}
              <div className="bg-white rounded-xl p-8 border-2 border-gray-200">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Professional</h3>
                <p className="text-gray-600 mb-6">For print shops</p>
                <div className="text-4xl font-bold text-gray-900 mb-6">
                  $79<span className="text-lg font-normal text-gray-600">/month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span className="text-gray-700">500 credits per month</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span className="text-gray-700">Unlimited storage</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span className="text-gray-700">Batch processing</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span className="text-gray-700">Priority support</span>
                  </li>
                </ul>
                <Link href="/auth/signup">
                  <Button variant="outline" className="w-full">Contact Sales</Button>
                </Link>
              </div>
            </div>

            <div className="text-center mt-12">
              <p className="text-gray-600">
                Need more credits? 
                <Link href="/pricing" className="text-blue-600 font-medium ml-2">
                  See pay-as-you-go options →
                </Link>
              </p>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Ready to Transform Your DTF Printing Business?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Join thousands of print shops delivering perfect quality every time
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/signup">
                <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3">
                  Start Your Free Trial
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/10 px-8 py-3">
                <Play className="mr-2 w-5 h-5" />
                Watch 2-Min Demo
              </Button>
            </div>
            <p className="text-blue-100 mt-6 text-sm">
              No credit card required • Cancel anytime • 2 free credits to start
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-gray-400 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-4 gap-8">
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg"></div>
                  <span className="font-bold text-xl text-white">DTF Editor</span>
                </div>
                <p className="text-sm">
                  Professional AI tools for DTF printing businesses.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold text-white mb-4">Product</h4>
                <ul className="space-y-2 text-sm">
                  <li><a href="#" className="hover:text-white">Features</a></li>
                  <li><a href="#" className="hover:text-white">Pricing</a></li>
                  <li><a href="#" className="hover:text-white">API</a></li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-white mb-4">Company</h4>
                <ul className="space-y-2 text-sm">
                  <li><a href="#" className="hover:text-white">About</a></li>
                  <li><a href="#" className="hover:text-white">Blog</a></li>
                  <li><a href="#" className="hover:text-white">Contact</a></li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-white mb-4">Legal</h4>
                <ul className="space-y-2 text-sm">
                  <li><Link href="/privacy" className="hover:text-white">Privacy</Link></li>
                  <li><Link href="/terms" className="hover:text-white">Terms</Link></li>
                  <li><a href="#" className="hover:text-white">Security</a></li>
                </ul>
              </div>
            </div>
            
            <div className="border-t border-gray-800 mt-12 pt-8 text-center text-sm">
              <p>&copy; 2024 DTF Editor. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </ClientOnly>
  );
}