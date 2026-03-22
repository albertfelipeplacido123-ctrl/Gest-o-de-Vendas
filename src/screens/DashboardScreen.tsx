import { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { formatCurrency } from '../utils/calculations';
import { TrendingUp, Package, AlertCircle, ShoppingBag, CalendarDays, TrendingDown, DollarSign, AlertTriangle, ChevronRight, BarChart as BarChartIcon, FileText, Download, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function DashboardScreen() {
  const { sales, products, ingredients, losses, recipes, productionLogs, ingredientEntries } = useStore();
  const [chartFilter, setChartFilter] = useState<'day' | 'week' | 'month' | 'custom'>('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportStartDate, setReportStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [reportEndDate, setReportEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const reportData = useMemo(() => {
    const monthSales = sales.filter(s => s.date.startsWith(selectedMonth));
    const monthLosses = (losses || []).filter(l => l.date.startsWith(selectedMonth));

    const revenue = monthSales.reduce((sum, s) => sum + s.totalPrice, 0);
    const grossProfit = monthSales.reduce((sum, s) => sum + s.profit, 0);
    const totalLosses = monthLosses.reduce((sum, l) => sum + l.costLoss, 0);
    const netProfit = grossProfit - totalLosses;

    const productSales = monthSales.reduce((acc, sale) => {
      if (!acc[sale.productId]) {
        acc[sale.productId] = { quantity: 0, revenue: 0, profit: 0 };
      }
      acc[sale.productId].quantity += sale.quantity;
      acc[sale.productId].revenue += sale.totalPrice;
      acc[sale.productId].profit += sale.profit;
      return acc;
    }, {} as Record<string, { quantity: number, revenue: number, profit: number }>);

    const topProducts = Object.entries(productSales)
      .map(([productId, stats]) => {
        const product = products.find(p => p.id === productId);
        const recipe = product ? recipes.find(r => r.id === product.recipeId) : null;
        return {
          id: productId,
          name: recipe?.name || 'Produto Excluído',
          ...stats
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    return { revenue, grossProfit, totalLosses, netProfit, topProducts, monthLosses };
  }, [sales, losses, products, recipes, selectedMonth]);

  const chartData = useMemo(() => {
    const productsToDisplay = selectedProductIds.length > 0 
      ? products.filter(p => selectedProductIds.includes(p.id))
      : [];

    const getProductRevenue = (salesList: typeof sales) => {
      const result: Record<string, number> = {};
      if (selectedProductIds.length === 0) {
        result['total'] = salesList.reduce((sum, s) => sum + s.totalPrice, 0);
      } else {
        selectedProductIds.forEach(id => {
          result[id] = salesList
            .filter(s => s.productId === id)
            .reduce((sum, s) => sum + s.totalPrice, 0);
        });
      }
      return result;
    };

    if (chartFilter === 'custom' && startDate && endDate) {
      const start = new Date(startDate + 'T00:00:00');
      const end = new Date(endDate + 'T23:59:59');
      
      const days = [];
      const curr = new Date(start);
      while (curr <= end) {
        days.push(curr.toISOString().split('T')[0]);
        curr.setDate(curr.getDate() + 1);
        if (days.length > 31) break;
      }

      return days.map(dateStr => {
        const daySales = sales.filter(s => s.date.startsWith(dateStr));
        const revenues = getProductRevenue(daySales);
        const date = new Date(dateStr + 'T12:00:00');
        const label = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        
        return { label, ...revenues, fullLabel: date.toLocaleDateString('pt-BR') };
      });
    }

    if (chartFilter === 'day') {
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().split('T')[0]);
      }

      return days.map(dateStr => {
        const daySales = sales.filter(s => s.date.startsWith(dateStr));
        const revenues = getProductRevenue(daySales);
        const date = new Date(dateStr + 'T12:00:00');
        const label = date.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase().replace('.', '');
        
        return { label, ...revenues, fullLabel: date.toLocaleDateString('pt-BR') };
      });
    }

    if (chartFilter === 'week') {
      const weeks = [];
      const now = new Date();
      for (let i = 3; i >= 0; i--) {
        const start = new Date(now);
        start.setDate(now.getDate() - (i * 7 + now.getDay()));
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        weeks.push({ start, end });
      }

      return weeks.map((week, idx) => {
        const weekSales = sales.filter(s => {
          const saleDate = new Date(s.date);
          return saleDate >= week.start && saleDate <= week.end;
        });
        const revenues = getProductRevenue(weekSales);
        const label = `SEM ${idx + 1}`;
        const fullLabel = `${week.start.toLocaleDateString('pt-BR')} - ${week.end.toLocaleDateString('pt-BR')}`;

        return { label, ...revenues, fullLabel };
      });
    }

    // Default: Month
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push(d.toISOString().split('T')[0].substring(0, 7));
    }

    return months.map(month => {
      const monthSales = sales.filter(s => s.date.startsWith(month));
      const revenues = getProductRevenue(monthSales);
      
      const [year, monthNum] = month.split('-');
      const date = new Date(parseInt(year), parseInt(monthNum) - 1);
      const label = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase();

      return {
        label,
        ...revenues,
        fullLabel: date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      };
    });
  }, [sales, chartFilter, startDate, endDate, selectedProductIds, products]);

  const lowStockIngredients = ingredients.filter(i => {
    if (i.unit === 'un') return i.stockQuantity < 10;
    return i.stockQuantity < 2; // For kg and l
  });

  const generatePDFReport = () => {
    const doc = new jsPDF();
    const start = new Date(reportStartDate + 'T00:00:00');
    const end = new Date(reportEndDate + 'T23:59:59');

    const filteredSales = sales.filter(s => {
      const d = new Date(s.date);
      return d >= start && d <= end;
    });

    const filteredLosses = (losses || []).filter(l => {
      const d = new Date(l.date);
      return d >= start && d <= end;
    });

    const filteredProductions = (productionLogs || []).filter(p => {
      const d = new Date(p.date);
      return d >= start && d <= end;
    });

    const filteredEntries = (ingredientEntries || []).filter(e => {
      const d = new Date(e.date);
      return d >= start && d <= end;
    });

    const revenue = filteredSales.reduce((sum, s) => sum + s.totalPrice, 0);
    const grossProfit = filteredSales.reduce((sum, s) => sum + s.profit, 0);
    const totalLosses = filteredLosses.reduce((sum, l) => sum + l.costLoss, 0);
    const netProfit = grossProfit - totalLosses;

    // Header
    doc.setFontSize(22);
    doc.setTextColor(249, 115, 22); // Orange
    doc.text('Relatório de Vendas e Lucros', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Período: ${start.toLocaleDateString('pt-BR')} até ${end.toLocaleDateString('pt-BR')}`, 14, 28);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 33);

    // Summary Table
    autoTable(doc, {
      startY: 40,
      head: [['Resumo Financeiro', 'Valor']],
      body: [
        ['Faturamento Total', formatCurrency(revenue)],
        ['Lucro Bruto', formatCurrency(grossProfit)],
        ['Total de Perdas', formatCurrency(totalLosses)],
        ['Lucro Líquido', formatCurrency(netProfit)],
      ],
      theme: 'striped',
      headStyles: { fillColor: '#F97316' },
    });

    // Top Products Table
    const productSales = filteredSales.reduce((acc, sale) => {
      if (!acc[sale.productId]) {
        acc[sale.productId] = { quantity: 0, revenue: 0 };
      }
      acc[sale.productId].quantity += sale.quantity;
      acc[sale.productId].revenue += sale.totalPrice;
      return acc;
    }, {} as Record<string, { quantity: number, revenue: number }>);

    const topProductsData = Object.entries(productSales)
      .map(([productId, stats]) => {
        const product = products.find(p => p.id === productId);
        const recipe = product ? recipes.find(r => r.id === product.recipeId) : null;
        return [recipe?.name || 'Produto Excluído', stats.quantity, formatCurrency(stats.revenue)];
      })
      .sort((a, b) => (b[2] as any) - (a[2] as any));

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Produto', 'Qtd Vendida', 'Faturamento']],
      body: topProductsData,
      theme: 'grid',
      headStyles: { fillColor: '#333333' },
    });

    // Production Table
    if (filteredProductions.length > 0) {
      const productionData = filteredProductions.map(p => [
        new Date(p.date).toLocaleDateString('pt-BR'),
        p.recipeName,
        p.batches,
        p.totalQuantity,
        new Date(p.expirationDate).toLocaleDateString('pt-BR')
      ]);

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Data', 'Receita Produzida', 'Fornadas', 'Total Unidades', 'Validade']],
        body: productionData,
        theme: 'grid',
        headStyles: { fillColor: '#10B981' }, // Green
      });
    }

    // Ingredient Entries Table
    if (filteredEntries.length > 0) {
      const entriesData = filteredEntries.map(e => [
        new Date(e.date).toLocaleDateString('pt-BR'),
        e.ingredientName,
        `${e.quantity} ${e.unit}`,
        formatCurrency(e.costPerUnit),
        formatCurrency(e.totalCost)
      ]);

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Data', 'Insumo (Entrada)', 'Quantidade', 'Custo Unit.', 'Custo Total']],
        body: entriesData,
        theme: 'grid',
        headStyles: { fillColor: '#3B82F6' }, // Blue
      });
    }

    // Losses Table
    if (filteredLosses.length > 0) {
      const lossesData = filteredLosses.map(l => {
        const product = products.find(p => p.id === l.productId);
        const recipe = product ? recipes.find(r => r.id === product.recipeId) : null;
        return [
          new Date(l.date).toLocaleDateString('pt-BR'),
          recipe?.name || 'Produto Excluído',
          l.quantity,
          formatCurrency(l.costLoss)
        ];
      });

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Data', 'Produto (Perda)', 'Qtd', 'Custo da Perda']],
        body: lossesData,
        theme: 'grid',
        headStyles: { fillColor: '#EF4444' },
      });
    }

    // Low Stock Table
    if (lowStockIngredients.length > 0) {
      const stockData = lowStockIngredients.map(ing => [
        ing.name,
        `${ing.stockQuantity.toFixed(2)} ${ing.unit}`
      ]);

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Ingrediente com Estoque Baixo', 'Quantidade Atual']],
        body: stockData,
        theme: 'grid',
        headStyles: { fillColor: '#F59E0B' },
      });
    }

    doc.save(`relatorio-vendas-${reportStartDate}-a-${reportEndDate}.pdf`);
    setIsReportModalOpen(false);
  };

  return (
    <div className="p-4 space-y-6 pb-24">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Painel de Controle</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="p-2 bg-orange-500 text-white rounded-xl shadow-sm hover:bg-orange-600 transition-colors flex items-center space-x-1"
            title="Gerar Relatório PDF"
          >
            <FileText size={18} />
            <span className="text-xs font-bold hidden sm:inline">Relatório</span>
          </button>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="p-2 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-orange-500 outline-none font-medium text-gray-700 text-sm"
          />
        </div>
      </div>

      {isReportModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800 flex items-center">
                <FileText className="text-orange-500 mr-2" size={24} />
                Gerar Relatório PDF
              </h3>
              <button onClick={() => setIsReportModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-500">Selecione o período para o relatório detalhado de vendas, lucros e perdas.</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase ml-1">Data Inicial</label>
                  <input
                    type="date"
                    value={reportStartDate}
                    onChange={(e) => setReportStartDate(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase ml-1">Data Final</label>
                  <input
                    type="date"
                    value={reportEndDate}
                    onChange={(e) => setReportEndDate(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                  />
                </div>
              </div>

              <button
                onClick={generatePDFReport}
                className="w-full py-4 bg-orange-500 text-white rounded-2xl font-bold shadow-lg shadow-orange-200 hover:bg-orange-600 transition-all flex items-center justify-center space-x-2 mt-4"
              >
                <Download size={20} />
                <span>Baixar Relatório PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-2 text-gray-500 mb-2">
            <TrendingUp size={18} className="text-orange-500" />
            <span className="text-xs font-medium">Faturamento</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(reportData.revenue)}</p>
        </div>
        
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-2 text-gray-500 mb-2">
            <DollarSign size={18} className="text-green-500" />
            <span className="text-xs font-medium">Lucro Bruto</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(reportData.grossProfit)}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-2 text-gray-500 mb-2">
            <TrendingDown size={18} className="text-red-500" />
            <span className="text-xs font-medium">Perdas</span>
          </div>
          <p className="text-lg font-bold text-red-600">{formatCurrency(reportData.totalLosses)}</p>
        </div>

        <div className="bg-black p-4 rounded-2xl shadow-sm border border-gray-800">
          <div className="flex items-center space-x-2 text-gray-400 mb-2">
            <DollarSign size={18} className="text-white" />
            <span className="text-xs font-medium">Lucro Líquido</span>
          </div>
          <p className="text-lg font-bold text-white">{formatCurrency(reportData.netProfit)}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col mb-6 gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-800 flex items-center">
              <BarChartIcon size={20} className="text-orange-500 mr-2" />
              Histórico de Vendas
            </h3>
            <div className="flex bg-gray-100 p-1 rounded-xl">
              {(['day', 'week', 'month', 'custom'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setChartFilter(filter)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                    chartFilter === filter
                      ? 'bg-white text-orange-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {filter === 'day' ? 'Dia' : filter === 'week' ? 'Semana' : filter === 'month' ? 'Mês' : 'Personalizado'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Produtos Selecionados</label>
              <div className="flex flex-wrap gap-2 p-2 bg-gray-50 border border-gray-100 rounded-xl min-h-[44px]">
                <button
                  onClick={() => setSelectedProductIds([])}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                    selectedProductIds.length === 0
                      ? 'bg-orange-500 text-white'
                      : 'bg-white text-gray-500 border border-gray-200 hover:border-orange-300'
                  }`}
                >
                  Todos
                </button>
                {products.map(p => {
                  const recipe = recipes.find(r => r.id === p.recipeId);
                  const isSelected = selectedProductIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedProductIds(selectedProductIds.filter(id => id !== p.id));
                        } else {
                          setSelectedProductIds([...selectedProductIds, p.id]);
                        }
                      }}
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                        isSelected
                          ? 'bg-orange-500 text-white'
                          : 'bg-white text-gray-500 border border-gray-200 hover:border-orange-300'
                      }`}
                    >
                      {recipe?.name || 'Produto Excluído'}
                    </button>
                  );
                })}
              </div>
            </div>

            {chartFilter === 'custom' && (
              <div className="flex gap-2">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Início</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Fim</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis 
                dataKey="label" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#9ca3af', fontSize: 10 }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#9ca3af', fontSize: 10 }}
                tickFormatter={(value) => `R$${value}`}
              />
              <Tooltip 
                cursor={{ fill: '#f9fafb' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', fontSize: '12px' }}
                labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                labelFormatter={(_, payload) => payload[0]?.payload?.fullLabel}
                formatter={(value: number, name: string) => {
                  const product = products.find(p => p.id === name);
                  const recipe = product ? recipes.find(r => r.id === product.recipeId) : null;
                  const label = name === 'total' ? 'Faturamento Total' : (recipe?.name || 'Produto');
                  return [formatCurrency(value), label];
                }}
              />
              {selectedProductIds.length === 0 ? (
                <Bar 
                  dataKey="total" 
                  fill="#f97316" 
                  radius={[4, 4, 0, 0]} 
                  barSize={30}
                  label={{ 
                    position: 'top', 
                    fill: '#4b5563', 
                    fontSize: 9, 
                    fontWeight: 'bold',
                    formatter: (value: number) => value > 0 ? value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : ''
                  }}
                />
              ) : (
                selectedProductIds.map((id, idx) => {
                  const colors = ['#f97316', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'];
                  return (
                    <Bar 
                      key={id}
                      dataKey={id}
                      fill={colors[idx % colors.length]}
                      radius={[4, 4, 0, 0]}
                      label={{ 
                        position: 'top', 
                        fill: '#4b5563', 
                        fontSize: 8, 
                        fontWeight: 'bold',
                        formatter: (value: number) => value > 0 ? value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : ''
                      }}
                    />
                  );
                })
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {lowStockIngredients.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
            <AlertCircle size={20} className="text-red-500 mr-2" />
            Estoque Baixo
          </h3>
          <div className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden">
            {lowStockIngredients.map((ing, idx) => (
              <div key={ing.id} className={`p-3 flex justify-between items-center ${idx !== lowStockIngredients.length - 1 ? 'border-b border-gray-100' : ''}`}>
                <span className="font-medium text-gray-800">{ing.name}</span>
                <span className="text-red-500 font-bold bg-red-50 px-2 py-1 rounded-lg text-sm">
                  {ing.stockQuantity.toFixed(2)} {ing.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {reportData.monthLosses.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-gray-800 flex items-center">
            <AlertTriangle size={20} className="text-red-500 mr-2" />
            Perdas do Mês
          </h3>
          <div className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden">
            {reportData.monthLosses.slice(0, 5).map((l, idx) => {
              const product = products.find(p => p.id === l.productId);
              const recipe = product ? recipes.find(r => r.id === product.recipeId) : null;
              const date = new Date(l.date);
              
              return (
                <div key={l.id} className={`p-4 flex justify-between items-center ${idx !== Math.min(reportData.monthLosses.length, 5) - 1 ? 'border-b border-red-50' : ''}`}>
                  <div>
                    <h4 className="font-bold text-gray-900">{recipe?.name || 'Produto Excluído'}</h4>
                    <p className="text-[10px] text-gray-500">{date.toLocaleDateString('pt-BR')} - {l.quantity} unidades</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-600">-{formatCurrency(l.costLoss)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
