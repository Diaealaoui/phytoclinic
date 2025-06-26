// CatalogueViewPage.tsx  
import React from 'react';
import { useSearchParams } from 'react-router-dom';
import CatalogueViewer from '@/components/CatalogueViewer';

const CatalogueViewPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const userType = searchParams.get('type') as 'admin' | 'client' || 'client';

  return <CatalogueViewer userType={userType} />;
};

export default CatalogueViewPage;