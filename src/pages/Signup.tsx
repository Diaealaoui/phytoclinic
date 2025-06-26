// pages/Signup.tsx
import SignupForm from '@/components/SignupForm';

export default function Signup() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="w-full max-w-md p-6 bg-white shadow-lg rounded-lg">
        <SignupForm />
      </div>
    </div>
  );
}
