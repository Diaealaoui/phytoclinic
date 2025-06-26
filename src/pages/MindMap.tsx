import React from 'react';
import MindMap from '../components/MindMap'; // Or '@/components/MindMap' depending on your alias

const MindMapPage: React.FC = () => {
  // This page component now only renders the MindMap component.
  // The MindMap component itself handles the full-screen layout and the "Back" button.
  return <MindMap />;
};

export default MindMapPage;