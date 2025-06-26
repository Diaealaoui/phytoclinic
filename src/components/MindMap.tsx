import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactFlow, {
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    ConnectionLineType,
    MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Network, ArrowLeft, X, Calendar, Search, Filter, ChevronDown, ChevronUp, ZoomIn, ZoomOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Define the interface to match your exact facture table structure
type FactureItem = {
    id: string;
    invoice_id: string;
    "Client Name": string;
    "Date": string;
    "Product": string;
    "Quantity": number;
    "Price": number;
};

// IMPROVED LAYOUT ALGORITHM - Hierarchical with proper spacing
const buildImprovedLayout = (
    factureData: FactureItem[],
    products: any[],
    expandedNodes: Record<string, boolean>,
    viewportWidth: number = 1200,
    viewportHeight: number = 800
) => {
    const nodes = [];
    const edges = [];

    // Layout constants for better spacing (these remain fixed as per your instruction to not touch logic)
    const LEVEL_SPACING = 350; // Horizontal spacing between levels
    const NODE_SPACING = 120;  // Vertical spacing between nodes
    const CATEGORY_SPACING = 180; // Extra spacing for categories
    const PRODUCT_SPACING = 100; // Spacing for products

    const centerX = viewportWidth / 2;
    const centerY = viewportHeight / 2;

    // Root node - centered
    const rootId = 'root-business';
    const totalClients = [...new Set(factureData.map(item => item["Client Name"]))].length;
    const totalOrders = factureData.length;
    const totalRevenue = factureData.reduce((sum, item) => sum + (Number(item["Quantity"]) * Number(item["Price"])), 0);

    nodes.push({
        id: rootId,
        data: {
            label: `BUSINESS OVERVIEW\n${totalClients} Clients • ${totalOrders} Orders\nRevenue: ${totalRevenue.toLocaleString()} MAD`
        },
        position: { x: centerX - 150, y: centerY - 50 },
        style: {
            background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
            color: 'white',
            width: 300,
            height: 100,
            textAlign: 'center',
            fontSize: '14px',
            border: '3px solid #475569',
            borderRadius: '12px',
            fontWeight: '700',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        },
    });

    // Group by clients and arrange in a clean grid
    const clientGroups = groupByClient(factureData);
    const clients = Object.keys(clientGroups);

    // Calculate client positions in a vertical layout to the right of root
    const clientStartX = centerX + LEVEL_SPACING;
    const clientStartY = centerY - ((clients.length - 1) * NODE_SPACING) / 2;

    clients.forEach((clientName, clientIndex) => {
        const clientId = `client-${clientName}`;
        const clientY = clientStartY + (clientIndex * NODE_SPACING);

        const clientItems = clientGroups[clientName];
        const clientTotal = clientItems.reduce((sum, item) => sum + (Number(item["Quantity"]) * Number(item["Price"])), 0);
        const uniqueProducts = [...new Set(clientItems.map(item => item["Product"]))].length;

        nodes.push({
            id: clientId,
            data: {
                label: `${truncateText(clientName, 20)}\n${clientItems.length} orders • ${uniqueProducts} products\nTotal: ${clientTotal.toLocaleString()} MAD`
            },
            position: { x: clientStartX, y: clientY - 45 },
            style: {
                background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                color: '#1e293b',
                width: 250,
                height: 90,
                textAlign: 'center',
                border: '2px solid #cbd5e1',
                borderRadius: '10px',
                fontSize: '11px',
                fontWeight: '600',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
            }
        });

        // Smooth curved edge to client
        edges.push({
            id: `e-${rootId}-${clientId}`,
            source: rootId,
            target: clientId,
            type: 'smoothstep',
            style: { stroke: '#64748b', strokeWidth: 3 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' }
        });

        if (!expandedNodes[clientId]) return;

        // Group client items by product category
        const productGroups = groupByProductCategory(clientItems, products);
        const categories = Object.keys(productGroups);

        // Position categories to the right of client
        const categoryStartX = clientStartX + LEVEL_SPACING;
        const categoryStartY = clientY - ((categories.length - 1) * CATEGORY_SPACING) / 2;

        categories.forEach((category, categoryIndex) => {
            const categoryId = `category-${clientName}-${category}`;
            const categoryY = categoryStartY + (categoryIndex * CATEGORY_SPACING);

            const categoryItems = productGroups[category];
            const categoryTotal = categoryItems.reduce((sum, item) => sum + (Number(item["Quantity"]) * Number(item["Price"])), 0);
            const categoryQuantity = categoryItems.reduce((sum, item) => sum + Number(item["Quantity"]), 0);

            nodes.push({
                id: categoryId,
                data: {
                    label: `${truncateText(category, 16)}\n${categoryItems.length} items\nQty: ${categoryQuantity} • ${categoryTotal.toLocaleString()} MAD`
                },
                position: { x: categoryStartX, y: categoryY - 40 },
                style: {
                    background: `linear-gradient(135deg, ${getCategoryColor(category)} 0%, ${lightenColor(getCategoryColor(category))} 100%)`,
                    color: '#1e293b',
                    width: 200,
                    height: 80,
                    textAlign: 'center',
                    border: `3px solid ${getCategoryBorder(category)}`,
                    borderRadius: '10px',
                    fontSize: '10px',
                    fontWeight: '600',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                }
            });

            // Smooth edge from client to category
            edges.push({
                id: `e-${clientId}-${categoryId}`,
                source: clientId,
                target: categoryId,
                type: 'smoothstep',
                style: { stroke: getCategoryBorder(category), strokeWidth: 2.5 },
                markerEnd: { type: MarkerType.ArrowClosed, color: getCategoryBorder(category) }
            });

            if (!expandedNodes[categoryId]) return;

            // Position products to the right of category
            const productStartX = categoryStartX + LEVEL_SPACING;
            const productStartY = categoryY - ((categoryItems.length - 1) * PRODUCT_SPACING) / 2;

            categoryItems.forEach((item, productIndex) => {
                const productId = `product-${clientName}-${category}-${item.id}`;
                const productY = productStartY + (productIndex * PRODUCT_SPACING);

                // Format date safely
                let dateStr = 'No date';
                try {
                    if (item["Date"] && item["Date"] !== null) {
                        dateStr = new Date(item["Date"]).toLocaleDateString();
                    }
                } catch (e) {
                    dateStr = 'Invalid date';
                }

                const itemTotal = Number(item["Quantity"]) * Number(item["Price"]);

                nodes.push({
                    id: productId,
                    data: {
                        label: `${truncateText(item["Product"], 20)}\nQty: ${Number(item["Quantity"])} • Price: ${Number(item["Price"])} MAD\nTotal: ${itemTotal.toLocaleString()} MAD\nDate: ${dateStr}`
                    },
                    position: { x: productStartX, y: productY - 45 },
                    style: {
                        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                        color: '#374151',
                        width: 220,
                        height: 90,
                        fontSize: '9px',
                        textAlign: 'center',
                        border: '2px solid #d1d5db',
                        borderRadius: '8px',
                        fontWeight: '500',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease'
                    }
                });

                // Smooth edge from category to product
                edges.push({
                    id: `e-${categoryId}-${productId}`,
                    source: categoryId,
                    target: productId,
                    type: 'smoothstep',
                    style: { stroke: '#9ca3af', strokeWidth: 2 },
                    markerEnd: { type: MarkerType.ArrowClosed, color: '#9ca3af' }
                });
            });
        });
    });

    return { nodes, edges };
};

// Helper functions (unchanged)
const groupByClient = (factureData: FactureItem[]) => {
    const groups: { [key: string]: FactureItem[] } = {};
    factureData.forEach(item => {
        const clientName = item["Client Name"] || 'Unknown Client';
        if (!groups[clientName]) groups[clientName] = [];
        groups[clientName].push(item);
    });
    return groups;
};

const groupByProductCategory = (items: FactureItem[], products: any[]) => {
    const groups: { [key: string]: FactureItem[] } = {};

    if (products.length === 0) {
        items.forEach(item => {
            if (!groups['Uncategorized']) groups['Uncategorized'] = [];
            groups['Uncategorized'].push(item);
        });
        return groups;
    }

    items.forEach(item => {
        const factureProduct = item["Product"];

        // Try multiple matching strategies
        let product = products.find(p =>
            p["Item Name"]?.toLowerCase().trim() === factureProduct?.toLowerCase().trim()
        );

        if (!product) {
            const cleanFacture = factureProduct?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            product = products.find(p => {
                const cleanDB = p["Item Name"]?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                return cleanDB === cleanFacture;
            });
        }

        if (!product) {
            product = products.find(p => {
                const dbName = p["Item Name"]?.toLowerCase();
                const factureName = factureProduct?.toLowerCase();
                return dbName?.includes(factureName) || factureName?.includes(dbName);
            });
        }

        const category = product ? (product["CF.Category"] || 'Uncategorized') : 'Uncategorized';

        if (!groups[category]) groups[category] = [];
        groups[category].push(item);
    });

    return groups;
};

const truncateText = (text: string, maxLength: number) => {
    if (!text) return 'N/A';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
};

const getCategoryColor = (category: string): string => {
    const colors: { [key: string]: string } = {
        'Fertilizers': '#dcfce7', 'Pesticides': '#fee2e2', 'Fongicides': '#f3e8ff',
        'Herbicides': '#dbeafe', 'Insecticides': '#fef3c7', 'Seeds': '#f1f5f9',
        'Tools': '#f8fafc', 'Irrigation': '#e0f2fe', 'Uncategorized': '#f9fafb',
        'Engrais': '#dcfce7', 'Fongicide': '#f3e8ff', 'Insecticide': '#fef3c7'
    };
    return colors[category] || '#f9fafb';
};

const getCategoryBorder = (category: string): string => {
    const colors: { [key: string]: string } = {
        'Fertilizers': '#16a34a', 'Pesticides': '#dc2626', 'Fongicides': '#7c3aed',
        'Herbicides': '#2563eb', 'Insecticides': '#d97706', 'Seeds': '#64748b',
        'Tools': '#475569', 'Irrigation': '#0891b2', 'Uncategorized': '#6b7280',
        'Engrais': '#16a34a', 'Fongicide': '#7c3aed', 'Insecticide': '#d97706'
    };
    return colors[category] || '#6b7280';
};

const lightenColor = (color: string): string => {
    // Simple color lightening for gradient effect
    return color.replace(/[0-9a-f]{2}/gi, (match) => {
        const num = parseInt(match, 16);
        const lighter = Math.min(255, num + 30);
        return lighter.toString(16).padStart(2, '0');
    });
};

// Main Improved MindMap Component
const ImprovedMindMap = () => {
    const navigate = useNavigate();
    const [factureData, setFactureData] = useState<FactureItem[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [loading, setLoading] = useState(true);

    // Filter states
    const [showFilters, setShowFilters] = useState(false);
    const [clientSearch, setClientSearch] = useState('');
    const [productSearch, setProductSearch] = useState('');
    const [selectedClients, setSelectedClients] = useState<string[]>([]);
    const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
    const [dateRange, setDateRange] = useState({ from: '', to: '' });

    const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
        'root-business': true
    });
    const [viewportSize, setViewportSize] = useState({ width: window.innerWidth, height: window.innerHeight });

    // New state for mobile detection
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            setViewportSize({ width, height: window.innerHeight });
            setIsMobile(width < 768); // Define mobile as < 768px
        };

        // Set initial state
        handleResize();

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Fetch data with correct column names (unchanged logic)
    const fetchData = useCallback(async () => {
        setLoading(true);

        try {
            const [factureRes, productsRes] = await Promise.all([
                supabase
                    .from('facture')
                    .select('"Client Name", "Date", "Product", "Quantity", "Price", invoice_id, id')
                    .order('"Date"', { ascending: false }),
                supabase
                    .from('products')
                    .select('"Item Name", "Item ID", "CF.Category"')
            ]);

            if (factureRes.error) throw factureRes.error;
            if (productsRes.error) throw productsRes.error;

            console.log('📊 Loaded data:', {
                factures: factureRes.data?.length || 0,
                products: productsRes.data?.length || 0
            });

            setFactureData(factureRes.data || []);
            setProducts(productsRes.data || []);

        } catch (error) {
            console.error('❌ Fetch failed:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Apply filters and rebuild layout (unchanged logic)
    useEffect(() => {
        let filteredData = factureData;

        if (selectedClients.length > 0) {
            filteredData = filteredData.filter(item =>
                selectedClients.includes(item["Client Name"])
            );
        }

        if (selectedProducts.length > 0) {
            filteredData = filteredData.filter(item =>
                selectedProducts.includes(item["Product"])
            );
        }

        if (dateRange.from || dateRange.to) {
            filteredData = filteredData.filter(item => {
                if (!item["Date"]) return false;
                const itemDate = new Date(item["Date"]);
                const fromDate = dateRange.from ? new Date(dateRange.from) : new Date('1900-01-01');
                const toDate = dateRange.to ? new Date(dateRange.to) : new Date('2100-01-01');
                return itemDate >= fromDate && itemDate <= toDate;
            });
        }

        const { nodes: newNodes, edges: newEdges } = buildImprovedLayout(
            filteredData,
            products,
            expandedNodes,
            viewportSize.width,
            viewportSize.height
        );

        setNodes(newNodes);
        setEdges(newEdges);

    }, [factureData, products, selectedClients, selectedProducts, dateRange, expandedNodes, viewportSize, setNodes, setEdges]);

    const handleNodeClick = useCallback((_, node: { id: string }) => {
        setExpandedNodes(prev => ({ ...prev, [node.id]: !prev[node.id] }));
    }, []);

    const handleRefresh = useCallback(async () => {
        setClientSearch('');
        setProductSearch('');
        setSelectedClients([]);
        setSelectedProducts([]);
        setDateRange({ from: '', to: '' });
        setExpandedNodes({ 'root-business': true });
        setShowFilters(false);

        await fetchData();
    }, [fetchData]);

    // Get filter lists (unchanged logic)
    const allClients = [...new Set(factureData.map(item => item["Client Name"]))]
        .filter(client => client?.toLowerCase().includes(clientSearch.toLowerCase()));

    const allProducts = [...new Set(factureData.map(item => item["Product"]))]
        .filter(product => product?.toLowerCase().includes(productSearch.toLowerCase()));

    const totalRevenue = factureData.reduce((sum, item) => sum + (Number(item["Quantity"]) * Number(item["Price"])), 0);

    return (
        <div className="w-screen h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            {/* Enhanced Top Bar - Adjusted with responsive Tailwind classes for extreme compactness */}
            <div className={`absolute top-2 left-2 z-10 bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200
                        p-2 md:p-4
                        ${isMobile ? 'w-[calc(100vw-1rem)] right-2' : 'flex items-center gap-4'}`}>
                {/* Buttons Row - Compacted */}
                <div className={`flex items-center gap-1 md:gap-4 w-full justify-between md:justify-start
                            ${isMobile ? 'flex-row' : ''}`}> {/* Ensure buttons stay in a row on mobile */}
                    <Button onClick={() => navigate('/dashboard')} variant="outline" size="sm" className="bg-white shadow-sm flex-1 text-xs px-2 py-1 md:px-4 md:py-2"> {/* Smaller text, padding */}
                        <ArrowLeft className="w-3 h-3 mr-1 md:mr-2" /> {/* Smaller icon */}
                        Dashboard
                    </Button>

                    <Button onClick={handleRefresh} variant="outline" size="sm" disabled={loading} className="bg-blue-50 border-blue-200 hover:bg-blue-100 flex-1 text-xs px-2 py-1 md:px-4 md:py-2">
                        <RefreshCw className={`w-3 h-3 mr-1 md:mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>

                    <Button onClick={() => setShowFilters(!showFilters)} variant="outline" size="sm" className="bg-gray-50 border-gray-200 hover:bg-gray-100 flex-1 text-xs px-2 py-1 md:px-4 md:py-2">
                        <Filter className="w-3 h-3 mr-1 md:mr-2" />
                        Filters
                        {showFilters ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                    </Button>
                </div>

                {/* Statistics Row - Compacted */}
                <div className={`flex text-xs md:text-sm
                            ${isMobile ? 'flex-row justify-around w-full border-t border-gray-300 pt-2 mt-2' : 'gap-6 border-l border-gray-300 pl-4'}`}>
                    <div className="text-center px-1">
                        <div className="font-bold text-sm md:text-lg text-green-600">{factureData.length}</div> {/* Smaller font on mobile */}
                        <div className="text-xs text-gray-500">Orders</div>
                    </div>
                    <div className="text-center px-1">
                        <div className="font-bold text-sm md:text-lg text-blue-600">{[...new Set(factureData.map(item => item["Client Name"]))].length}</div>
                        <div className="text-xs text-gray-500">Clients</div>
                    </div>
                    <div className="text-center px-1">
                        <div className="font-bold text-sm md:text-lg text-purple-600">{totalRevenue.toLocaleString()} MAD</div>
                        <div className="text-xs text-gray-500">Revenue</div>
                    </div>
                </div>
            </div>

            {/* Enhanced Filter Panel - Adjusted for mobile positioning and size */}
            {showFilters && (
                <div className={`absolute z-10 bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200
                            p-3 md:p-6
                            ${isMobile ? 'top-[calc(10rem+10px)] left-2 right-2 w-[calc(100vw-1rem)] max-w-none max-h-[calc(100vh-12rem)] overflow-y-auto' : 'top-24 left-4 max-w-5xl'}`}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6"> {/* Smaller gap on mobile */}
                        {/* Date Range */}
                        <div className="space-y-2 md:space-y-3">
                            <label className="text-sm font-semibold text-gray-700 flex items-center">
                                <Calendar className="w-4 h-4 mr-2 text-blue-500" />
                                Date Range
                            </label>
                            <Input
                                type="date"
                                value={dateRange.from}
                                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                                className="text-sm"
                                placeholder="From date"
                            />
                            <Input
                                type="date"
                                value={dateRange.to}
                                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                                className="text-sm"
                                placeholder="To date"
                            />
                        </div>

                        {/* Clients Filter */}
                        <div className="space-y-2 md:space-y-3">
                            <label className="text-sm font-semibold text-gray-700 flex items-center">
                                <Search className="w-4 h-4 mr-2 text-green-500" />
                                Clients ({selectedClients.length} selected)
                            </label>
                            <Input
                                placeholder="Search clients..."
                                value={clientSearch}
                                onChange={(e) => setClientSearch(e.target.value)}
                                className="text-sm"
                            />
                            {clientSearch && (
                                <div className="max-h-32 md:max-h-40 overflow-y-auto border border-gray-200 rounded-lg bg-white shadow-sm">
                                    {allClients.slice(0, 8).map(client => (
                                        <div
                                            key={client}
                                            className="p-2 md:p-3 hover:bg-blue-50 cursor-pointer text-sm border-b border-gray-100 last:border-b-0 transition-colors"
                                            onClick={() => {
                                                if (!selectedClients.includes(client)) {
                                                    setSelectedClients([...selectedClients, client]);
                                                }
                                                setClientSearch('');
                                            }}
                                        >
                                            {client}
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="flex flex-wrap gap-1 md:gap-2 max-h-20 md:max-h-24 overflow-y-auto">
                                {selectedClients.map(client => (
                                    <Badge key={client} variant="secondary" className="text-xs bg-green-100 text-green-800">
                                        {truncateText(client, 10)}
                                        <X
                                            className="w-3 h-3 ml-1 cursor-pointer hover:text-red-600"
                                            onClick={() => setSelectedClients(selectedClients.filter(c => c !== client))}
                                        />
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        {/* Products Filter */}
                        <div className="space-y-2 md:space-y-3">
                            <label className="text-sm font-semibold text-gray-700 flex items-center">
                                <Search className="w-4 h-4 mr-2 text-purple-500" />
                                Products ({selectedProducts.length} selected)
                            </label>
                            <Input
                                placeholder="Search products..."
                                value={productSearch}
                                onChange={(e) => setProductSearch(e.target.value)}
                                className="text-sm"
                            />
                            {productSearch && (
                                <div className="max-h-32 md:max-h-40 overflow-y-auto border border-gray-200 rounded-lg bg-white shadow-sm">
                                    {allProducts.slice(0, 8).map(product => (
                                        <div
                                            key={product}
                                            className="p-2 md:p-3 hover:bg-purple-50 cursor-pointer text-sm border-b border-gray-100 last:border-b-0 transition-colors"
                                            onClick={() => {
                                                if (!selectedProducts.includes(product)) {
                                                    setSelectedProducts([...selectedProducts, product]);
                                                }
                                                setProductSearch('');
                                            }}
                                        >
                                            {truncateText(product, 25)}
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="flex flex-wrap gap-1 md:gap-2 max-h-20 md:max-h-24 overflow-y-auto">
                                {selectedProducts.map(product => (
                                    <Badge key={product} variant="secondary" className="text-xs bg-purple-100 text-purple-800">
                                        {truncateText(product, 10)}
                                        <X
                                            className="w-3 h-3 ml-1 cursor-pointer hover:text-red-600"
                                            onClick={() => setSelectedProducts(selectedProducts.filter(p => p !== product))}
                                        />
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className={`mt-4 pt-2 md:mt-6 md:pt-4 border-t border-gray-200 flex ${isMobile ? 'flex-col gap-2' : 'justify-between items-center'}`}>
                        <Button
                            onClick={() => {
                                setSelectedClients([]);
                                setSelectedProducts([]);
                                setDateRange({ from: '', to: '' });
                                setClientSearch('');
                                setProductSearch('');
                            }}
                            variant="outline"
                            size="sm"
                            className="text-sm text-red-600 border-red-200 hover:bg-red-50 w-full md:w-auto"
                        >
                            Clear All Filters
                        </Button>
                        <div className="text-xs md:text-sm text-gray-500 text-center md:text-right">
                            Click on nodes to expand/collapse • Use mouse wheel to zoom • Drag to pan
                        </div>
                    </div>
                </div>
            )}

            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={handleNodeClick}
                fitView
                fitViewOptions={{
                    padding: isMobile ? 0.05 : 0.1,
                    includeHiddenNodes: false,
                    minZoom: 0.1,
                    maxZoom: 1.5
                }}
                connectionLineType={ConnectionLineType.SmoothStep}
                defaultEdgeOptions={{
                    type: 'smoothstep',
                }}
                minZoom={0.05}
                maxZoom={2}
                attributionPosition="bottom-left"
            >
                {/* Conditionally hide MiniMap and Controls on very small screens */}
                {!isMobile && (
                    <>
                        <MiniMap
                            nodeStrokeColor="#64748b"
                            nodeColor="#f1f5f9"
                            className="bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 shadow-lg"
                            position="bottom-right"
                        />
                        <Controls
                            className="bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 shadow-lg"
                            position="bottom-left"
                        />
                    </>
                )}
                <Background
                    variant="dots"
                    gap={25}
                    size={1.5}
                    color="#e2e8f0"
                />
            </ReactFlow>

            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
                    <div className="flex flex-col items-center space-y-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                        <p className="text-gray-700 font-medium">Loading business data...</p>
                    </div>
                </div>
            )}

            {!loading && nodes.length <= 1 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 bg-white/60 backdrop-blur-sm p-4 text-center">
                    <Network className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 opacity-40" />
                    <h3 className="text-xl md:text-2xl font-bold mb-2 text-gray-700">No Data Available</h3>
                    <p className="text-base md:text-lg mb-4">Upload facture data or adjust your filters to see the mind map.</p>
                    <div className="flex flex-col md:flex-row gap-3 w-full max-w-sm">
                        <Button onClick={handleRefresh} variant="outline" className="bg-white shadow-sm w-full">
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Refresh Data
                        </Button>
                        <Button onClick={() => setShowFilters(true)} variant="outline" className="bg-white shadow-sm w-full">
                            <Filter className="w-4 h-4 mr-2" />
                            Adjust Filters
                        </Button>
                    </div>
                </div>
            )}

            {/* Navigation Help - Bottom Right (Hidden on mobile) */}
            {!isMobile && (
                <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-4 max-w-xs">
                    <div className="text-xs text-gray-600 space-y-2">
                        <div className="font-semibold text-gray-800 mb-3">Navigation Guide:</div>
                        <div className="flex items-center">
                            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                            <span>Click nodes to expand/collapse</span>
                        </div>
                        <div className="flex items-center">
                            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                            <span>Scroll wheel to zoom in/out</span>
                        </div>
                        <div className="flex items-center">
                            <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                            <span>Drag to pan around</span>
                        </div>
                        <div className="flex items-center">
                            <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
                            <span>Use filters to focus data</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImprovedMindMap;