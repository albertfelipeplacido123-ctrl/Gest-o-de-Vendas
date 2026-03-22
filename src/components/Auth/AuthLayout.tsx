import { ReactNode } from 'react';
import { ChefHat } from 'lucide-react';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="bg-orange-500 p-3 rounded-2xl shadow-lg">
            <ChefHat size={48} className="text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          DoceGestão
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {title}
          {subtitle && (
            <span className="block font-medium text-orange-600">
              {subtitle}
            </span>
          )}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl rounded-2xl sm:px-10 border border-gray-100">
          {children}
        </div>
      </div>
    </div>
  );
}
