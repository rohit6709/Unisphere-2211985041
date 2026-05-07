import React from 'react';
import { Compass, Home, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950 p-6 overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-5 dark:opacity-10">
         <Compass className="absolute -top-20 -left-20 h-96 w-96 rotate-12" />
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full border-[60px] border-indigo-600" />
      </div>

      <div className="max-w-2xl w-full text-center relative z-10 space-y-12">
         <div className="space-y-4">
            <h1 className="text-[12rem] font-black text-indigo-600 leading-none tracking-tighter drop-shadow-2xl">404</h1>
            <div className="inline-flex items-center gap-3 px-6 py-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-full border border-indigo-100 dark:border-indigo-800">
               <Compass className="h-5 w-5 text-indigo-600 animate-spin-slow" />
               <span className="text-xs font-black text-indigo-700 uppercase tracking-widest">Lost in the Universe</span>
            </div>
         </div>

         <div className="space-y-4">
            <h2 className="text-4xl font-black text-gray-900 dark:text-white">You've reached the Edge</h2>
            <p className="text-lg text-gray-500 dark:text-gray-400 font-medium max-w-lg mx-auto">
               The page you are looking for might have been moved, deleted, or simply never existed in this dimension.
            </p>
         </div>

         <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <Button 
              onClick={() => navigate(-1)}
              variant="outline"
              className="rounded-2xl h-14 px-10 border-2 font-black w-full md:w-auto"
            >
               <ArrowLeft className="mr-2 h-5 w-5" /> Go Back
            </Button>
            <Link to="/" className="w-full md:w-auto">
               <Button className="rounded-2xl h-14 px-10 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 font-black w-full">
                  <Home className="mr-2 h-5 w-5" /> Return to Unisphere
               </Button>
            </Link>
         </div>
      </div>
    </div>
  );
}
