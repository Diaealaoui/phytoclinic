import React, { useState } from 'react';
import { ChevronDown, ChevronRight, User, Calendar, ShoppingCart } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface NodeData {
  id: string;
  type: 'client' | 'name' | 'date' | 'purchase';
  label: string;
  children?: NodeData[];
  value?: string | number;
}

interface MindMapNodeProps {
  node: NodeData;
  level: number;
  onExpand?: (nodeId: string) => void;
}

const MindMapNode: React.FC<MindMapNodeProps> = ({ node, level, onExpand }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasChildren = node.children && node.children.length > 0;
  const indent = level * 24;

  const getIcon = () => {
    switch (node.type) {
      case 'client':
      case 'name':
        return <User className="w-4 h-4" />;
      case 'date':
        return <Calendar className="w-4 h-4" />;
      case 'purchase':
        return <ShoppingCart className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getColor = () => {
    switch (node.type) {
      case 'client': return 'bg-green-100 border-green-300 text-green-800';
      case 'name': return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'date': return 'bg-purple-100 border-purple-300 text-purple-800';
      case 'purchase': return 'bg-orange-100 border-orange-300 text-orange-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
    if (onExpand) onExpand(node.id);
  };

  return (
    <div className="relative">
      {level > 0 && (
        <div
          className="absolute left-0 top-0 w-px bg-gray-300"
          style={{ height: '100%', left: `${indent - 12}px` }}
        />
      )}

      <div className="flex items-center mb-2" style={{ marginLeft: `${indent}px` }}>
        {hasChildren && (
          <button
            onClick={handleToggle}
            className="mr-2 p-1 rounded hover:bg-gray-100 transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-600" />
            )}
          </button>
        )}
        {!hasChildren && level > 0 && <div className="w-6 h-6 mr-2" />}
        <Card className={`px-3 py-2 border-2 ${getColor()} hover:shadow-md transition-shadow cursor-pointer`}>
          <div className="flex items-center space-x-2">
            {getIcon()}
            <span className="font-medium text-sm">
              {node.label}
              {node.value && (
                <span className="ml-2 font-normal opacity-75">
                  {typeof node.value === 'number' ? `$${node.value}` : node.value}
                </span>
              )}
            </span>
          </div>
        </Card>
      </div>

      {isExpanded && hasChildren && (
        <div className="ml-4">
          {node.children!.map((child) => (
            <MindMapNode key={child.id} node={child} level={level + 1} onExpand={onExpand} />
          ))}
        </div>
      )}
    </div>
  );
};

export default MindMapNode;
