import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { ScrollArea } from '../components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  LayoutDashboard, Package, Plus, TrendingUp, Heart, DollarSign,
  Send, Bot, User, Loader2, BarChart3, PieChart, LineChart,
  ShoppingBag, Menu, X, MessageSquare, Sparkles
} from 'lucide-react';
import {
  PieChart as RechartsPie, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart as RechartsLine, Line, Area, AreaChart
} from 'recharts';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const COLORS = ['#7c3aed', '#2563eb', '#06b6d4', '#10b981', '#f59e0b'];

export default function Dashboard() {
  const { user, token } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  
  // Analytics data
  const [overview, setOverview] = useState(null);
  const [categoryData, setCategoryData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  
  // Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  const fetchAnalytics = async () => {
    try {
      const [overviewRes, categoryRes, monthlyRes, topRes] = await Promise.all([
        axios.get(`${API_URL}/analytics/overview`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/analytics/category-distribution`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/analytics/monthly-sales`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/analytics/top-products`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      setOverview(overviewRes.data);
      setCategoryData(categoryRes.data);
      setMonthlyData(monthlyRes.data);
      setTopProducts(topRes.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChatHistory = async () => {
    try {
      const response = await axios.get(`${API_URL}/chat/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const history = response.data.map(h => ([
        { role: 'user', content: h.user_message, timestamp: h.created_at },
        { role: 'assistant', content: h.ai_response, timestamp: h.created_at }
      ])).flat();
      setChatMessages(history);
    } catch (error) {
      console.error('Failed to fetch chat history:', error);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAnalytics();
      fetchChatHistory();
    }
  }, [token]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const sendMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    
    const userMessage = { role: 'user', content: chatInput, timestamp: new Date().toISOString() };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);
    
    try {
      const response = await axios.post(`${API_URL}/chat`, 
        { message: chatInput },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const assistantMessage = { 
        role: 'assistant', 
        content: response.data.response, 
        timestamp: response.data.timestamp 
      };
      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      toast.error('Failed to get AI response');
      setChatMessages(prev => prev.slice(0, -1));
    } finally {
      setChatLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'products', label: 'My Products', icon: Package },
    { id: 'chat', label: 'AI Assistant', icon: Bot },
  ];

  const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl p-6"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen flex" data-testid="dashboard-page">
      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 glass-card border-r border-white/5 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-20'}`}>
        <div className="flex flex-col h-full pt-20 lg:pt-8">
          {/* Sidebar Header */}
          <div className="px-4 pb-6 border-b border-white/5">
            <div className={`flex items-center gap-3 ${!sidebarOpen && 'lg:justify-center'}`}>
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <LayoutDashboard className="w-5 h-5 text-white" />
              </div>
              {sidebarOpen && <span className="font-semibold">Seller Dashboard</span>}
            </div>
          </div>
          
          {/* Nav Items */}
          <nav className="flex-1 px-3 py-4 space-y-2">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  data-testid={`nav-${item.id}`}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive 
                      ? 'gradient-primary text-white' 
                      : 'hover:bg-white/5 text-muted-foreground hover:text-foreground'
                  } ${!sidebarOpen && 'lg:justify-center lg:px-3'}`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && <span className="font-medium">{item.label}</span>}
                </button>
              );
            })}
          </nav>
          
          {/* Quick Actions */}
          <div className="px-3 pb-4">
            <Link to="/add-product">
              <Button className={`w-full gradient-primary text-white rounded-xl ${!sidebarOpen && 'lg:px-3'}`}>
                <Plus className="w-5 h-5" />
                {sidebarOpen && <span className="ml-2">Add Product</span>}
              </Button>
            </Link>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-20 left-4 z-50 p-2 rounded-lg glass-card"
        data-testid="sidebar-toggle"
      >
        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Main Content */}
      <main className={`flex-1 p-4 lg:p-8 transition-all ${sidebarOpen ? 'lg:ml-0' : 'lg:ml-0'}`}>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, <span className="gradient-text">{user?.name}</span>
            </h1>
            <p className="text-muted-foreground">Here's what's happening with your listings</p>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Stats Grid */}
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard 
                    title="Total Listings" 
                    value={overview?.total_listings || 0}
                    icon={Package}
                    color="bg-violet-500"
                    subtitle={`${overview?.active_listings || 0} active`}
                  />
                  <StatCard 
                    title="Items Sold" 
                    value={overview?.sold_items || 0}
                    icon={ShoppingBag}
                    color="bg-green-500"
                  />
                  <StatCard 
                    title="Total Revenue" 
                    value={`₹${(overview?.total_revenue || 0).toLocaleString()}`}
                    icon={DollarSign}
                    color="bg-blue-500"
                  />
                  <StatCard 
                    title="Wishlist Saves" 
                    value={overview?.wishlist_count || 0}
                    icon={Heart}
                    color="bg-pink-500"
                    subtitle="People interested"
                  />
                </div>
              )}

              {/* Charts Row */}
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Category Distribution */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="glass-card rounded-2xl p-6"
                >
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-violet-400" />
                    Category Distribution
                  </h3>
                  {categoryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <RechartsPie>
                        <Pie
                          data={categoryData}
                          dataKey="count"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ category, count }) => `${category.split(' ')[0]}: ${count}`}
                        >
                          {categoryData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                        />
                      </RechartsPie>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      No data yet. Start listing products!
                    </div>
                  )}
                </motion.div>

                {/* Monthly Revenue */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="glass-card rounded-2xl p-6"
                >
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <LineChart className="w-5 h-5 text-blue-400" />
                    Revenue Over Time
                  </h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={monthlyData}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                        formatter={(value) => [`₹${value.toLocaleString()}`, 'Revenue']}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="#7c3aed" fillOpacity={1} fill="url(#colorRevenue)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </motion.div>
              </div>

              {/* Top Products */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="glass-card rounded-2xl p-6"
              >
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  Top Products by Interest
                </h3>
                {topProducts.length > 0 ? (
                  <div className="space-y-3">
                    {topProducts.map((product, index) => (
                      <div key={product.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-400 font-bold">
                            {index + 1}
                          </span>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-muted-foreground">{product.category}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">₹{product.price.toLocaleString()}</p>
                          <div className="flex items-center gap-1 text-sm text-pink-400">
                            <Heart className="w-3 h-3" />
                            {product.wishlist_count}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No products yet</p>
                )}
              </motion.div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-8">
              {/* Monthly Comparison Bar Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-2xl p-6"
              >
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-violet-400" />
                  Monthly Listings vs Sales
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Legend />
                    <Bar dataKey="listings" name="Listings" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="sold" name="Sold" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>

              {/* Category Revenue */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-card rounded-2xl p-6"
              >
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-400" />
                  Revenue by Category
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                    <YAxis dataKey="category" type="category" stroke="hsl(var(--muted-foreground))" width={120} fontSize={12} />
                    <Tooltip 
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                      formatter={(value) => [`₹${value.toLocaleString()}`, 'Revenue']}
                    />
                    <Bar dataKey="revenue" fill="#2563eb" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            </div>
          )}

          {/* Products Tab */}
          {activeTab === 'products' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Your Listings</h2>
                <Link to="/add-product">
                  <Button className="gradient-primary text-white rounded-full gap-2">
                    <Plus className="w-4 h-4" />
                    Add New
                  </Button>
                </Link>
              </div>
              <Link to="/my-listings" className="block">
                <div className="glass-card rounded-2xl p-8 text-center hover:border-violet-500/50 transition-all">
                  <Package className="w-16 h-16 mx-auto mb-4 text-violet-400" />
                  <h3 className="text-lg font-semibold mb-2">Manage Your Products</h3>
                  <p className="text-muted-foreground mb-4">View, edit, and manage all your listings</p>
                  <Button variant="outline" className="rounded-full">
                    Go to My Listings
                  </Button>
                </div>
              </Link>
            </motion.div>
          )}

          {/* AI Chat Tab */}
          {activeTab === 'chat' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card rounded-2xl overflow-hidden h-[calc(100vh-220px)] flex flex-col"
            >
              {/* Chat Header */}
              <div className="p-4 border-b border-white/5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">AI Sales Assistant</h3>
                  <p className="text-xs text-muted-foreground">Powered by Gemini</p>
                </div>
              </div>
              
              {/* Chat Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {chatMessages.length === 0 && (
                    <div className="text-center py-12">
                      <Bot className="w-16 h-16 mx-auto mb-4 text-violet-400 opacity-50" />
                      <h3 className="font-semibold mb-2">How can I help you today?</h3>
                      <p className="text-muted-foreground text-sm mb-6">
                        Ask me about pricing, listing tips, or your sales performance
                      </p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {[
                          "How should I price my laptop?",
                          "Which category sells best?",
                          "Tips to sell faster",
                          "Analyze my sales"
                        ].map((suggestion) => (
                          <button
                            key={suggestion}
                            onClick={() => setChatInput(suggestion)}
                            className="px-3 py-2 rounded-full text-sm bg-white/5 hover:bg-white/10 transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <AnimatePresence>
                    {chatMessages.map((msg, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          msg.role === 'user' 
                            ? 'bg-violet-500' 
                            : 'bg-gradient-to-br from-violet-500 to-blue-500'
                        }`}>
                          {msg.role === 'user' ? (
                            <User className="w-4 h-4 text-white" />
                          ) : (
                            <Bot className="w-4 h-4 text-white" />
                          )}
                        </div>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          msg.role === 'user' 
                            ? 'bg-violet-500 text-white' 
                            : 'bg-white/5'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  
                  {chatLoading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex gap-3"
                    >
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <div className="bg-white/5 rounded-2xl px-4 py-3">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </motion.div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>
              
              {/* Chat Input */}
              <div className="p-4 border-t border-white/5">
                <div className="flex gap-3">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask about pricing, sales tips, or your performance..."
                    className="flex-1 rounded-full"
                    data-testid="chat-input"
                  />
                  <Button 
                    onClick={sendMessage}
                    disabled={!chatInput.trim() || chatLoading}
                    className="rounded-full gradient-primary text-white"
                    data-testid="chat-send"
                  >
                    {chatLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
