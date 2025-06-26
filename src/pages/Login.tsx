// pages/Login.tsx
import LoginForm from '@/components/LoginForm';

export default function Login() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="w-full max-w-md p-6 bg-white shadow-lg rounded-lg">
        <LoginForm />
      </div>
    </div>
  );
}
