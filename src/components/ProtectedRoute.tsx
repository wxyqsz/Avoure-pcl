// src/components/ProtectedRoute.tsx
import { useEffect, useState } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { checkAuth } from '../auth/authUtils';
import LoadingSpinner from '../components/LoadingSpinner'; // Create this component or use your own loader

type ProtectedRouteProps = {
  allowedRoles?: ('admin' | 'subscriber')[];
  redirectTo?: string;
  children?: React.ReactNode;
};

export default function ProtectedRoute({
  allowedRoles = ['admin', 'subscriber'],
  redirectTo = '/signin',
  children,
}: ProtectedRouteProps) {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const { role } = await checkAuth();
        
        if (!role) {
          // No session found
          navigate(redirectTo);
          return;
        }

        if (allowedRoles.includes(role)) {
          setIsAuthorized(true);
        } else {
          // Has session but not the right role
          navigate('/unauthorized');
        }
      } catch (error) {
        console.error('Authentication error:', error);
        navigate(redirectTo);
      }
    };

    verifyAuth();
  }, [navigate, allowedRoles, redirectTo]);

  if (isAuthorized === null) {
    return <LoadingSpinner />;
  }

  if (!isAuthorized) {
    return null; // Redirect will happen in useEffect
  }

  return children ? children : <Outlet />;
}